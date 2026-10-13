import { GameConstants } from '../config/constants';
import { diffDays } from '../core/date';
import type { Rng } from '../core/rng';
import type { CandidateId } from '../core/types';
import { OFFICES } from '../election/offices';
import { publishNews } from '../media/news';
import { POP_TYPE_IDS } from '../population/popTypes';
import { getDifficulty } from '../simulation/access';
import type { GameState } from '../simulation/state';
import type { ImpactMeter } from './impact';
import { STYLE_POPS } from './weekly';
import {
  addKnowledge,
  addKnowledgeEverywhere,
  addPopMomentum,
  addPresence,
  addRegionalMomentum,
} from './statusOps';

const O = GameConstants.opponents;

/** Por que um adversário partiu para o ataque (vai na notícia e no medidor de impacto). */
function attackReason(tacticTarget: boolean, isLeader: boolean, targetIsPlayer: boolean): string {
  if (tacticTarget) return 'tática da semana';
  if (isLeader) return targetIsPlayer ? 'você encostou na liderança' : 'defende a liderança';
  return 'tenta tirar votos do líder';
}

/**
 * IA dos adversários: cada dia gastam parte do orçamento em agenda (presença), mídia
 * (conhecimento) e persuasão, e eventualmente atacam o líder (ou o jogador, se ele estiver
 * crescendo). Os ganhos diários são determinísticos (orçamento × habilidade × estilo); só o
 * ataque é um sorteio, com chance dada pela agressividade e pela tática. Com `meter`, cada rival
 * vira uma linha própria no medidor de impacto ("Campanha de Fulano", "Fulano atacou você").
 */
export function opponentsDailyTick(
  state: GameState,
  rng: Rng,
  standings: Record<CandidateId, number>,
  meter?: ImpactMeter,
): void {
  const election = state.election;
  if (!election) return;
  const diff = getDifficulty(state);
  const leader = Object.entries(standings).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const step = (source: 'opponents', label: string, fn: () => void, key: string): void => {
    if (meter) meter.step(source, label, fn, key);
    else fn();
  };

  const day = Math.max(0, diffDays(election.roundStartDate, state.date));
  for (const [index, id] of election.candidateIds.entries()) {
    if (id === state.playerId) continue;
    const status = election.participants[id];
    const cand = state.candidates[id];
    if (!status || !cand) continue;
    const party = state.parties[cand.partyId];
    const spendToday = status.money * O.dailySpendShare;
    status.money -= spendToday;
    const budgetFactor = Math.min(
      2,
      spendToday / Math.max(1, (state.campaign?.moneyScale ?? 1) * 20_000),
    );
    const skill =
      (0.6 + (cand.attributes.campaignCapacity + cand.attributes.communication) / 250) *
      diff.opponentStrength;
    const power = skill * (0.5 + 0.5 * budgetFactor);
    // Campanha dinâmica: o estilo muda onde o rival rende mais; a tática vale pela semana.
    const style = status.style;
    const tactic = status.tactic;
    const knowledgeMult = style === 'digital' ? 1.4 : 1;
    const presenceMult = style === 'machine' ? 1.4 : 1;

    // Agenda do dia: as regiões-foco, mais uma região em rodízio (cada dia uma) e, na tática
    // de disputa, as regiões do jogador (em dobro).
    const targets = [...status.focusUnits];
    const tour = election.units[(day + index * 3) % election.units.length];
    if (tour) targets.push(tour.id);
    if (tactic?.kind === 'contest' && tactic.units) targets.push(...tactic.units, ...tactic.units);
    const focusPops = style
      ? [...new Set([...(party?.priorityPopTypes ?? []), ...STYLE_POPS[style]])]
      : party?.priorityPopTypes.length
        ? party.priorityPopTypes
        : POP_TYPE_IDS;
    const what =
      tactic?.kind === 'contest'
        ? 'disputa as suas regiões'
        : style === 'digital'
          ? 'redes e vídeos'
          : style === 'machine'
            ? 'estrutura partidária nas regiões'
            : 'agenda e propaganda';
    step(
      'opponents',
      `Campanha de ${cand.ballotName} (${what})`,
      () => {
        for (const unit of election.units)
          addKnowledge(status, unit.id, O.knowledgeGrowth * power * knowledgeMult);
        for (const unitId of targets) {
          addPresence(status, unitId, O.presenceGain * power * presenceMult * 0.85);
          addRegionalMomentum(status, unitId, O.momentumGain * 2 * power * 0.75);
        }
        for (const t of focusPops) addPopMomentum(status, t, O.momentumGain * power * 0.85);
      },
      `opp:${id}`,
    );

    // Ataques: quem está atrás ataca o líder; o líder ataca quem cresce.
    const myShare = standings[id] ?? 0;
    const playerShare = standings[state.playerId] ?? 0;
    const tacticMult =
      (tactic?.kind === 'attack' ? 3 : 1) *
      (style === 'attacker' ? 1.6 : style === 'technocrat' ? 0.6 : 1);
    const attackChance =
      O.attackChance * (0.5 + status.aggressiveness) * diff.opponentStrength * tacticMult;
    if (!rng.chance(attackChance)) continue;
    const fromTactic = tactic?.kind === 'attack' && !!tactic.targetId && tactic.targetId !== id;
    const target = fromTactic
      ? tactic.targetId!
      : id === leader
        ? playerShare > myShare * 0.6
          ? state.playerId
          : null
        : leader;
    if (!target || target === id) continue;
    const targetStatus = election.participants[target];
    if (!targetStatus) continue;
    const victim = state.candidates[target];
    const onPlayer = target === state.playerId;
    const reason = attackReason(fromTactic, id === leader, onPlayer);
    step(
      'opponents',
      `${cand.ballotName} atacou ${onPlayer ? 'você' : (victim?.ballotName ?? 'um adversário')} (${reason})`,
      () => {
        for (const t of POP_TYPE_IDS) addPopMomentum(targetStatus, t, O.attackMomentum);
        targetStatus.rejectionMod += 0.6;
        status.rejectionMod += 0.3;
        publishNews(state, {
          headline: `${cand.ballotName} parte para o ataque contra ${victim?.ballotName ?? 'adversário'}`,
          body: `Motivo: ${reason}.`,
          category: 'opponent',
          sentiment: onPlayer ? -1 : 0,
        });
      },
      `oppatk:${id}`,
    );
  }
}

/** Horário eleitoral gratuito: todos ganham exposição proporcional ao tempo de TV do partido. */
export function freeAirtimeTick(state: GameState): void {
  const election = state.election;
  if (!election) return;
  const daysLeft = diffDays(state.date, election.date);
  if (daysLeft > GameConstants.campaign.freeAirtimeDaysBefore) return;
  const proportional = OFFICES[election.officeId].system === 'proportional';
  for (const id of election.candidateIds) {
    const status = election.participants[id];
    const party = state.parties[status?.partyId ?? ''];
    if (!status || !party) continue;
    // Nas proporcionais, o tempo de TV do partido é dividido entre centenas de candidatos.
    const share =
      (election.round === 2 ? 1 : 0.4 + party.influence / 100) *
      (proportional ? GameConstants.campaign.freeAirtimeProportionalFactor : 1);
    addKnowledgeEverywhere(
      status,
      election,
      GameConstants.campaign.freeAirtimeKnowledgeGain * share,
    );
  }
}
