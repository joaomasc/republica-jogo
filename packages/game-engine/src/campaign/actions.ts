import { attributeFactor } from '../candidate/attributes';
import { GameConstants } from '../config/constants';
import { clamp, clamp100, formatMoney } from '../core/math';
import { withRng } from '../core/rng';
import type { ActionResult, UnitId } from '../core/types';
import { addHistory } from '../history/history';
import { CHANNELS } from '../media/channels';
import { publishNews, pickHeadline } from '../media/news';
import { POP_TYPE_IDS, POP_TYPES, type PopTypeId } from '../population/popTypes';
import {
  getDifficulty,
  getPlayer,
  getPlayerStatus,
  requireCampaign,
  requireElection,
} from '../simulation/access';
import type { GameState } from '../simulation/state';
import { getCampaignAction, type CampaignActionDefinition } from './actions.data';
import { earn, spend } from './finance';
import { describeImpact, diffStanding, playerStanding, recordImpact } from './impact';
import { applyProposal } from './promises';
import { getProposal } from './proposals';
import { staffBonus } from './staff';
import {
  addKnowledge,
  addKnowledgeEverywhere,
  addPopMomentum,
  addPresence,
  addRegionalMomentum,
  spillover,
} from './statusOps';
import type { LedgerCategory } from './types';

const C = GameConstants.campaign;

export interface CampaignActionInput {
  actionId: string;
  unitId?: UnitId;
  popTypeId?: PopTypeId;
  proposalId?: string;
}

export interface ActionOutcome {
  result: ActionResult;
  /** Dias que a ação consome (o orquestrador avança o tempo). */
  days: number;
}

const ACTION_LEDGER: Record<string, LedgerCategory> = {
  rally: 'events',
  caravan: 'travel',
  street_event: 'events',
  door_to_door: 'events',
  regional_blitz: 'travel',
  group_meeting: 'events',
  social_media: 'ads',
  speech: 'events',
  proposal: 'other',
  fundraiser: 'fundraising',
  volunteer_drive: 'events',
  media_training: 'other',
};

const RALLY_HEADLINES = [
  '{player} reúne multidão em {unit}',
  'Comício de {player} movimenta {unit}',
  'Em {unit}, {player} promete "virar o jogo"',
];
const GAFFE_HEADLINES = [
  'Gafe de {player} em {place} viraliza nas redes',
  '{player} se complica ao responder eleitor em {place}',
  'Frase de {player} gera polêmica',
];

export function actionCost(state: GameState, def: CampaignActionDefinition): number {
  const campaign = requireCampaign(state);
  return Math.round(def.cost * campaign.moneyScale * getDifficulty(state).costs);
}

/** Valida se a ação pode ser executada agora (sem alterar o estado). */
export function canPerformAction(state: GameState, input: CampaignActionInput): string | null {
  if (state.phase !== 'campaign' || !state.election || !state.campaign)
    return 'Não há campanha em andamento.';
  if (state.events.pending.length > 0) return 'Resolva o evento pendente primeiro.';
  if (state.interactions.debate || state.interactions.interview)
    return 'Termine a entrevista/debate em andamento.';
  const def = getCampaignAction(input.actionId);
  if (!def) return 'Ação desconhecida.';
  if (
    (def.target === 'unit' || def.target === 'unitAndProposal') &&
    !state.election.units.some((u) => u.id === input.unitId)
  )
    return 'Escolha uma região.';
  if (def.target === 'popType' && !input.popTypeId) return 'Escolha um grupo social.';
  if (
    (def.target === 'proposal' || def.target === 'unitAndProposal') &&
    !getProposal(input.proposalId ?? '')
  )
    return 'Escolha uma proposta.';
  if (state.campaign.energy < def.energy) return 'Energia insuficiente. Descanse.';
  if (state.campaign.money < actionCost(state, def)) return 'Dinheiro insuficiente.';
  const daysLeft = (Date.parse(state.election.date) - Date.parse(state.date)) / 86_400_000;
  if (def.days > 0 && daysLeft < def.days) return 'Não há dias suficientes antes da eleição.';
  return null;
}

/** Quantas vezes a ação foi feita nos últimos 3 dias (fadiga de repetição). */
function recentRepeats(state: GameState, actionId: string): number {
  const campaign = requireCampaign(state);
  const limit = Date.parse(state.date) - 3 * 86_400_000;
  return campaign.log.filter((l) => l.actionId === actionId && Date.parse(l.date) >= limit).length;
}

/** Executa uma ação de campanha no rascunho do estado. */
export function performCampaignAction(state: GameState, input: CampaignActionInput): ActionOutcome {
  const error = canPerformAction(state, input);
  if (error) return { result: { ok: false, message: error }, days: 0 };
  const def = getCampaignAction(input.actionId) as CampaignActionDefinition;
  const election = requireElection(state);
  const campaign = requireCampaign(state);
  const player = getPlayer(state);
  const status = getPlayerStatus(state);
  if (!status) return { result: { ok: false, message: 'Você não está nesta eleição.' }, days: 0 };
  const before = playerStanding(state);

  const cost = actionCost(state, def);
  if (cost > 0) spend(state, cost, ACTION_LEDGER[def.id] ?? 'other', def.name);
  campaign.energy = clamp(campaign.energy - def.energy, 0, C.energyMax);

  const details: string[] = [];
  const unit = election.units.find((u) => u.id === input.unitId);
  const fx = def.effects;

  const mult = withRng(state, (rng) => {
    const attr = attributeFactor(
      player.attributes,
      def.attributes,
      C.attributeEffectMin,
      C.attributeEffectRange,
    );
    const isDigital =
      fx.channel === 'social' || fx.channel === 'podcast' || fx.channel === 'internet';
    const staff =
      1 +
      staffBonus(campaign.staff, 'actionEffect') +
      (isDigital ? staffBonus(campaign.staff, 'socialEffect') : 0);
    const enthusiasm = 0.8 + (0.4 * campaign.enthusiasm) / 100;
    const tired = campaign.energy < 15 ? 0.75 : 1;
    const fatigue = 1 / (1 + C.repeatFatigue * recentRepeats(state, def.id));
    return (
      (Object.keys(def.attributes).length > 0 ? attr : 1) *
      staff *
      enthusiasm *
      tired *
      fatigue *
      rng.range(C.variationMin, C.variationMax)
    );
  });

  if (unit) {
    const militantFactor = fx.militantPowered
      ? clamp(campaign.militants / Math.max(1, unit.voters / 400), 0.4, 2.5)
      : 1;
    if (fx.presence)
      details.push(
        `Presença em ${unit.name} +${addPresence(status, unit.id, fx.presence * mult * militantFactor).toFixed(1)}`,
      );
    if (fx.knowledge)
      details.push(
        `Conhecimento em ${unit.name} +${addKnowledge(status, unit.id, fx.knowledge * mult).toFixed(1)}`,
      );
    if (fx.regionalMomentum)
      addRegionalMomentum(status, unit.id, fx.regionalMomentum * mult * militantFactor);
    if (fx.spillover)
      spillover(status, election, unit.id, (fx.presence ?? 0) * mult, (fx.knowledge ?? 0) * mult);
  }
  if (fx.knowledgeAll) {
    addKnowledgeEverywhere(status, election, fx.knowledgeAll * mult);
    details.push('Seu nome ficou mais conhecido');
  }
  if (fx.popMomentum && input.popTypeId) {
    addPopMomentum(status, input.popTypeId, fx.popMomentum * mult);
    details.push(`Apoio entre ${POP_TYPES[input.popTypeId].plural} aumentou`);
  }
  if (fx.audienceMomentum && fx.channel) {
    const channel = fx.channel;
    for (const t of POP_TYPE_IDS)
      addPopMomentum(status, t, fx.audienceMomentum * mult * POP_TYPES[t].media[channel]);
    details.push(`Público de ${CHANNELS[channel].name} alcançado`);
  }
  if (fx.enthusiasm) campaign.enthusiasm = clamp100(campaign.enthusiasm + fx.enthusiasm * mult);
  if (fx.militants) {
    const gain = Math.round(campaign.militants * (fx.militants / 100) * mult);
    campaign.militants += gain;
    details.push(`+${gain} militantes`);
  }
  if (fx.fundraising) {
    const raised = Math.round(
      fx.fundraising *
        campaign.moneyScale *
        mult *
        (1 + staffBonus(campaign.staff, 'fundraising')) *
        getDifficulty(state).resources,
    );
    earn(state, raised, 'fundraising', def.name);
    details.push(`Arrecadou ${formatMoney(raised)}`);
  }
  if (fx.energyRestore) campaign.energy = clamp(campaign.energy + fx.energyRestore, 0, C.energyMax);
  if (fx.prep) campaign.prepBonus = clamp(campaign.prepBonus + fx.prep, 0, 0.3);

  if (def.target === 'proposal' || def.target === 'unitAndProposal') {
    const proposal = getProposal(input.proposalId ?? '');
    if (proposal)
      details.push(...applyProposal(state, proposal, def.target === 'unitAndProposal' ? 1.3 : 1));
  }

  // Risco: gafes e repercussões negativas.
  const gaffe = withRng(state, (rng) => {
    const risk =
      def.risk *
      (1 - Math.min(0.8, staffBonus(campaign.staff, 'gaffeRisk'))) *
      (1.3 - player.attributes.experience / 100) *
      getDifficulty(state).negativeEventBias;
    return rng.chance(risk);
  });
  let message = `${def.name} realizado(a).`;
  if (gaffe) {
    status.rejectionMod += C.gaffeRejection;
    player.attributes.credibility = clamp100(player.attributes.credibility + C.gaffeCredibility);
    const headline = pickHeadline(state, GAFFE_HEADLINES, {
      player: player.ballotName,
      place: unit?.name ?? 'evento',
    });
    publishNews(state, {
      headline,
      category: 'campaign',
      sentiment: -1,
      importance: 2,
      ...(unit ? { unitId: unit.id } : {}),
    });
    addHistory(state, {
      kind: 'event',
      title: headline,
      importance: 1,
      sentiment: -1,
      tags: ['gafe'],
    });
    details.push('Gafe! Rejeição subiu e credibilidade caiu');
    message = `${def.name}: houve uma gafe.`;
  } else if (unit && (def.id === 'rally' || def.id === 'regional_blitz')) {
    const newsRoll = withRng(state, (rng) => rng.chance(GameConstants.news.actionNewsChance));
    if (newsRoll)
      publishNews(state, {
        headline: pickHeadline(state, RALLY_HEADLINES, {
          player: player.ballotName,
          unit: unit.name,
        }),
        category: 'campaign',
        sentiment: 1,
        unitId: unit.id,
      });
  }

  // Efeito imediato da ação (antes de o tempo passar), para o jogador ver o quanto rendeu.
  const after = before ? playerStanding(state) : null;
  const impact = before && after ? diffStanding(after, before) : undefined;
  if (impact) {
    const where = unit
      ? ` — ${unit.name}`
      : input.popTypeId
        ? ` — ${POP_TYPES[input.popTypeId].plural}`
        : '';
    recordImpact(state, 'action', `${def.name}${where}`, impact);
  }

  campaign.log.unshift({
    date: state.date,
    actionId: def.id,
    label: def.name,
    summary: details.join(' · '),
    cost,
    ...(impact ? { impact } : {}),
  });
  if (impact) details.push(describeImpact(impact));
  if (campaign.log.length > 120) campaign.log.length = 120;
  return { result: { ok: true, message, details }, days: def.days };
}
