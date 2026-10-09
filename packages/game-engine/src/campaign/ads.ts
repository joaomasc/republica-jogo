import { GameConstants } from '../config/constants';
import { addDays, diffDays } from '../core/date';
import { clamp, clamp100, formatMoney, sum } from '../core/math';
import type { Rng } from '../core/rng';
import type { ActionResult, CandidateId, UnitId } from '../core/types';
import type { ElectoralUnit } from '../election/types';
import { addHistory } from '../history/history';
import type { IssueId } from '../ideology/issues';
import { CHANNELS, type MediaChannel } from '../media/channels';
import { publishNews } from '../media/news';
import { POP_TYPE_IDS, POP_TYPES, type PopTypeId } from '../population/popTypes';
import {
  getDifficulty,
  getPlayer,
  getPlayerStatus,
  nextId,
  requireCampaign,
  requireElection,
} from '../simulation/access';
import type { GameState } from '../simulation/state';
import { spend } from './finance';
import type { ImpactMeter } from './impact';
import { staffBonus } from './staff';
import { addKnowledge, addPopMomentum, addRegionalMomentum } from './statusOps';
import type { AdCampaign, AdTone } from './types';

const A = GameConstants.ads;

export interface AdCampaignInput {
  channel: MediaChannel;
  unitIds: UnitId[];
  targetPopTypes: PopTypeId[];
  tone: AdTone;
  targetCandidateId?: CandidateId | null;
  theme?: IssueId | null;
  days: number;
  /** Intensidade (0.5 = leve, 1 = normal, 2 = saturação). */
  intensity: number;
}

export const AD_TONES: Record<
  AdTone,
  {
    name: string;
    description: string;
    own: number;
    opponent: number;
    rejection: number;
    risk: number;
  }
> = {
  positive: {
    name: 'Propositiva',
    description: 'Fala das suas propostas. Seguro.',
    own: 1,
    opponent: 0,
    rejection: 0,
    risk: 1,
  },
  contrast: {
    name: 'Comparativa',
    description: 'Contrasta você com um adversário.',
    own: 0.7,
    opponent: A.contrastOpponentFactor,
    rejection: A.contrastRejectionPerDay,
    risk: 1.5,
  },
  attack: {
    name: 'Ataque',
    description: 'Desconstrói um adversário. Eficaz, mas aumenta sua rejeição.',
    own: 0.3,
    opponent: A.attackOpponentFactor,
    rejection: A.attackRejectionPerDay,
    risk: 2.5,
  },
};

function selectedUnits(units: ElectoralUnit[], ids: UnitId[]): ElectoralUnit[] {
  return ids.length === 0 ? units : units.filter((u) => ids.includes(u.id));
}

export function estimateAdCost(
  state: GameState,
  input: AdCampaignInput,
): { daily: number; total: number; coverage: number } {
  const election = requireElection(state);
  const campaign = requireCampaign(state);
  const channel = CHANNELS[input.channel];
  const unitIds = channel.regional ? input.unitIds : [];
  const coverage =
    sum(selectedUnits(election.units, unitIds).map((u) => u.voters)) /
    Math.max(1, election.totalVoters);
  const targeting =
    input.targetPopTypes.length > 0 && channel.targetable
      ? A.targetingCostMultiplier *
        (0.4 + 0.6 * (input.targetPopTypes.length / POP_TYPE_IDS.length))
      : 1;
  const daily = Math.round(
    channel.dailyCost *
      campaign.moneyScale *
      coverage ** A.costShareExponent *
      clamp(input.intensity, 0.5, 2) *
      targeting *
      getDifficulty(state).costs,
  );
  const days = clamp(Math.round(input.days), A.minDays, A.maxDays);
  return { daily, total: daily * days, coverage };
}

export function createAdCampaign(state: GameState, input: AdCampaignInput): ActionResult {
  if (state.phase !== 'campaign' || !state.election)
    return { ok: false, message: 'Propaganda só durante a campanha.' };
  const channel = CHANNELS[input.channel];
  if (!channel) return { ok: false, message: 'Canal inválido.' };
  if (input.tone !== 'positive' && !input.targetCandidateId)
    return { ok: false, message: 'Escolha o adversário-alvo.' };
  if (input.targetCandidateId && !state.election.candidateIds.includes(input.targetCandidateId))
    return { ok: false, message: 'Adversário fora da disputa.' };
  const daysLeft = diffDays(state.date, state.election.date);
  const days = Math.min(clamp(Math.round(input.days), A.minDays, A.maxDays), Math.max(1, daysLeft));
  const cost = estimateAdCost(state, { ...input, days });
  if (!spend(state, cost.total, 'ads', `Propaganda: ${channel.name}`))
    return { ok: false, message: `Dinheiro insuficiente (custa ${formatMoney(cost.total)}).` };
  const ad: AdCampaign = {
    id: nextId(state, 'ad'),
    channel: input.channel,
    unitIds: channel.regional ? [...input.unitIds] : [],
    targetPopTypes: channel.targetable ? [...input.targetPopTypes] : [],
    tone: input.tone,
    targetCandidateId: input.tone === 'positive' ? null : (input.targetCandidateId ?? null),
    theme: input.theme ?? null,
    intensity: clamp(input.intensity, 0.5, 2),
    startDate: state.date,
    endDate: addDays(state.date, days - 1),
    dailyCost: cost.daily,
    totalCost: cost.total,
    active: true,
  };
  requireCampaign(state).ads.unshift(ad);
  if (input.tone === 'attack') {
    const target = state.candidates[ad.targetCandidateId ?? ''];
    addHistory(state, {
      kind: 'event',
      title: `Campanha de ataque contra ${target?.ballotName ?? 'adversário'}`,
      importance: 1,
      sentiment: 0,
      tags: ['ataque'],
    });
  }
  return {
    ok: true,
    message: `Campanha de ${channel.name} no ar por ${days} dia(s).`,
    details: [`Custo total: ${formatMoney(cost.total)}`],
  };
}

export function cancelAdCampaign(state: GameState, adId: string): ActionResult {
  const campaign = requireCampaign(state);
  const ad = campaign.ads.find((a) => a.id === adId);
  if (!ad || !ad.active) return { ok: false, message: 'Campanha não encontrada.' };
  // Reembolso parcial dos dias não veiculados (multa contratual de 30%).
  const remaining = Math.max(0, diffDays(state.date, ad.endDate));
  const refund = Math.round(ad.dailyCost * remaining * 0.7);
  ad.active = false;
  ad.endDate = state.date;
  if (refund > 0) {
    campaign.money += refund;
    campaign.ledger.unshift({
      date: state.date,
      amount: refund,
      category: 'ads',
      description: 'Reembolso de propaganda cancelada',
    });
  }
  return {
    ok: true,
    message: 'Propaganda retirada do ar.',
    details: refund > 0 ? [`Reembolso: ${formatMoney(refund)}`] : [],
  };
}

function unitMediaAffinity(
  state: GameState,
  unit: ElectoralUnit,
  channel: MediaChannel,
  targets: PopTypeId[],
): number {
  let num = 0;
  let den = 0;
  for (const up of unit.pops) {
    const pop = state.population.pops[up.popId];
    if (!pop) continue;
    const targeted = targets.length === 0 || targets.includes(pop.typeId);
    const w = up.voters * (targeted ? 1 : 0.25);
    num += POP_TYPES[pop.typeId].media[channel] * w;
    den += up.voters;
  }
  return den > 0 ? num / den : 0;
}

function adLabel(state: GameState, ad: AdCampaign): string {
  const tone = AD_TONES[ad.tone].name.toLowerCase();
  const target = ad.targetCandidateId ? state.candidates[ad.targetCandidateId]?.ballotName : null;
  return `${CHANNELS[ad.channel].name} (${tone}${target ? ` contra ${target}` : ''}, desde ${ad.startDate.split('-').reverse().slice(0, 2).join('/')})`;
}

/** Processa um dia de propaganda no ar. Com `meter`, mede o efeito de cada peça. */
export function processAdsDaily(state: GameState, rng: Rng, meter?: ImpactMeter): void {
  const campaign = state.campaign;
  const election = state.election;
  const status = getPlayerStatus(state);
  if (!campaign || !election || !status) return;
  const player = getPlayer(state);
  const diff = getDifficulty(state);
  const comm = 0.7 + (0.6 * player.attributes.communication) / 100;

  for (const ad of campaign.ads) {
    if (!ad.active) continue;
    if (state.date > ad.endDate) {
      ad.active = false;
      continue;
    }
    const run = () => airAd(ad);
    if (meter) meter.step('ad', adLabel(state, ad), run, `ad:${ad.id}`);
    else run();
  }

  function airAd(ad: AdCampaign): void {
    if (!campaign || !election || !status) return;
    const channel = CHANNELS[ad.channel];
    const tone = AD_TONES[ad.tone];
    const digital =
      ad.channel === 'social' ||
      ad.channel === 'internet' ||
      ad.channel === 'influencer' ||
      ad.channel === 'podcast';
    const eff =
      (1 +
        staffBonus(campaign.staff, 'adEffect') +
        (digital ? staffBonus(campaign.staff, 'socialEffect') : 0)) *
      comm;
    const intensity = ad.intensity ** 0.8;
    const units = selectedUnits(election.units, ad.unitIds);
    const coverage = sum(units.map((u) => u.voters)) / Math.max(1, election.totalVoters);
    const targetBoost = ad.targetPopTypes.length > 0 ? A.targetingEfficiency : 1;
    const opponent = ad.targetCandidateId ? election.participants[ad.targetCandidateId] : undefined;

    for (const unit of units) {
      const media = unitMediaAffinity(state, unit, ad.channel, ad.targetPopTypes);
      addKnowledge(
        status,
        unit.id,
        A.knowledgeGain * channel.knowledge * channel.reach * media * eff * intensity,
      );
      const persuasion =
        A.momentumGain *
        channel.persuasion *
        channel.reach *
        media *
        eff *
        intensity *
        A.regionalShare;
      addRegionalMomentum(status, unit.id, persuasion * tone.own);
      if (opponent && tone.opponent > 0)
        addRegionalMomentum(opponent, unit.id, -persuasion * tone.opponent);
    }
    const types = ad.targetPopTypes.length > 0 ? ad.targetPopTypes : POP_TYPE_IDS;
    for (const t of types) {
      const persuasion =
        A.momentumGain *
        channel.persuasion *
        channel.reach *
        POP_TYPES[t].media[ad.channel] *
        eff *
        intensity *
        (1 - A.regionalShare) *
        coverage *
        targetBoost;
      addPopMomentum(status, t, persuasion * tone.own);
      if (opponent && tone.opponent > 0) addPopMomentum(opponent, t, -persuasion * tone.opponent);
    }
    if (ad.theme)
      status.issueFocus[ad.theme] = clamp((status.issueFocus[ad.theme] ?? 0) + 0.6, 0, 100);
    if (channel.enthusiasm > 0)
      campaign.enthusiasm = clamp100(campaign.enthusiasm + channel.enthusiasm * 0.5);
    status.rejectionMod += tone.rejection;

    if (rng.chance(channel.risk * tone.risk * diff.negativeEventBias)) {
      status.rejectionMod += 1.5;
      const fined = ad.tone === 'attack' && rng.chance(0.35);
      if (fined) {
        const fine = Math.round(ad.dailyCost * 3);
        spend(state, Math.min(fine, campaign.money), 'fines', 'Multa da Justiça Eleitoral');
        ad.active = false;
        publishNews(state, {
          headline: `Justiça Eleitoral manda retirar propaganda de ${player.ballotName}`,
          category: 'campaign',
          sentiment: -1,
          importance: 2,
        });
      } else {
        publishNews(state, {
          headline: `Peça publicitária de ${player.ballotName} em ${channel.name.toLowerCase()} gera críticas`,
          category: 'campaign',
          sentiment: -1,
        });
      }
    }
  }
}
