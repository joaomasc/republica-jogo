import { GameConstants } from '../config/constants';
import { diffDays } from '../core/date';
import type { Rng } from '../core/rng';
import type { CandidateId } from '../core/types';
import { OFFICES } from '../election/offices';
import { publishNews } from '../media/news';
import { POP_TYPE_IDS } from '../population/popTypes';
import { getDifficulty } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { STYLE_POPS } from './weekly';
import {
  addKnowledge,
  addKnowledgeEverywhere,
  addPopMomentum,
  addPresence,
  addRegionalMomentum,
} from './statusOps';

const O = GameConstants.opponents;

/**
 * IA simples dos adversários: cada dia gastam parte do orçamento em presença, mídia e persuasão,
 * e eventualmente atacam o líder (ou o jogador, se ele estiver crescendo).
 */
export function opponentsDailyTick(
  state: GameState,
  rng: Rng,
  standings: Record<CandidateId, number>,
): void {
  const election = state.election;
  if (!election) return;
  const diff = getDifficulty(state);
  const leader = Object.entries(standings).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  for (const id of election.candidateIds) {
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

    for (const unit of election.units)
      addKnowledge(
        status,
        unit.id,
        O.knowledgeGrowth * power * knowledgeMult * rng.range(0.6, 1.4),
      );
    const targets = [...status.focusUnits];
    const extra = rng.pick(election.units);
    targets.push(extra.id);
    if (tactic?.kind === 'contest' && tactic.units) targets.push(...tactic.units, ...tactic.units);
    for (const unitId of targets) {
      addPresence(status, unitId, O.presenceGain * power * presenceMult * rng.range(0.5, 1.2));
      addRegionalMomentum(status, unitId, O.momentumGain * 2 * power * rng.range(0.3, 1.2));
    }
    const focusPops = style
      ? [...new Set([...(party?.priorityPopTypes ?? []), ...STYLE_POPS[style]])]
      : party?.priorityPopTypes.length
        ? party.priorityPopTypes
        : POP_TYPE_IDS;
    for (const t of focusPops)
      addPopMomentum(status, t, O.momentumGain * power * rng.range(0.4, 1.3));

    // Ataques: quem está atrás ataca o líder; o líder ataca quem cresce.
    const myShare = standings[id] ?? 0;
    const playerShare = standings[state.playerId] ?? 0;
    const tacticMult =
      (tactic?.kind === 'attack' ? 3 : 1) *
      (style === 'attacker' ? 1.6 : style === 'technocrat' ? 0.6 : 1);
    const attackChance =
      O.attackChance * (0.5 + status.aggressiveness) * diff.opponentStrength * tacticMult;
    if (rng.chance(attackChance)) {
      const target =
        tactic?.kind === 'attack' && tactic.targetId && tactic.targetId !== id
          ? tactic.targetId
          : id === leader
            ? playerShare > myShare * 0.6
              ? state.playerId
              : null
            : leader;
      if (target && target !== id) {
        const targetStatus = election.participants[target];
        if (targetStatus) {
          for (const t of POP_TYPE_IDS)
            addPopMomentum(targetStatus, t, O.attackMomentum * rng.range(0.5, 1.5));
          targetStatus.rejectionMod += 0.6;
          status.rejectionMod += 0.3;
          const victim = state.candidates[target];
          publishNews(state, {
            headline: `${cand.ballotName} parte para o ataque contra ${victim?.ballotName ?? 'adversário'}`,
            category: 'opponent',
            sentiment: target === state.playerId ? -1 : 0,
          });
        }
      }
    }
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
