import { personalAppeal } from '../candidate/candidate';
import { GameConstants } from '../config/constants';
import { diffDays } from '../core/date';
import { clamp, clamp01 } from '../core/math';
import type { CandidateId, PartyId } from '../core/types';
import { IDEOLOGY_AXES, type IdeologyVector } from '../ideology/axes';
import { ideologyDistance, ideologyExtremity, type AxisWeights } from '../ideology/ideology';
import { ISSUE_DEFINITIONS, ISSUES, type IssueId } from '../ideology/issues';
import { mayorPartyOf } from '../map/cities';
import { POP_TYPE_IDS, POP_TYPES, type PopTypeId } from '../population/popTypes';
import type { Pop } from '../population/types';
import type { GameState } from '../simulation/state';
import { OFFICES } from './offices';
import type { CampaignStatus, Election, ElectoralUnit, VoterSegments } from './types';
import { candidatePlatform, platformPopAppeal } from '../laws/platform';

const V = GameConstants.voter;

/** Chave usada para a opção "demais candidatos" em eleições proporcionais. */
export const OTHERS_KEY = '__others__';

export interface IntentionOptions {
  /** Dias até a eleição (controla a parcela de indecisos). */
  daysLeft: number;
  candidateIds: CandidateId[];
  /** Ruído aditivo na utilidade (pesquisas e dia da eleição). */
  utilityNoise?: (candidateId: CandidateId, unit: ElectoralUnit, pop: Pop) => number;
  /** Ruído multiplicativo no comparecimento. */
  turnoutNoise?: (unit: ElectoralUnit, pop: Pop) => number;
  /** Opção "demais candidatos" (eleição proporcional): fatia fixa do voto decidido. */
  others?: { share: number };
  includeSegments?: boolean;
}

export interface PopUnitIntention {
  shares: Record<string, number>;
  undecided: number;
  blankNull: number;
  turnout: number;
  rejection: Record<CandidateId, number>;
}

export interface AggregateIntention {
  voters: number;
  turnoutRate: number;
  /** Frações sobre quem comparece (somam 1 com indecisos e brancos/nulos). */
  shares: Record<string, number>;
  undecided: number;
  blankNull: number;
  /** Rejeição média de cada candidato no recorte. */
  rejection: Record<CandidateId, number>;
}

export interface IntentionSnapshot {
  total: AggregateIntention;
  /** Votos válidos projetados (apenas entre candidatos). */
  valid: Record<string, number>;
  rejection: Record<CandidateId, number>;
  knowledge: Record<CandidateId, number>;
  byUnit: Record<string, AggregateIntention>;
  byPopType: Record<PopTypeId, AggregateIntention>;
  segments: VoterSegments | null;
}

export interface CandidateContext {
  id: CandidateId;
  partyId: PartyId;
  appeal: number;
  ideology: IdeologyVector;
  baseRejection: number;
  polarization: number;
  scandal: number;
  issueFocus: Partial<Record<IssueId, number>>;
  status: CampaignStatus;
  incumbencyRole: 'incumbent' | 'incumbent_party' | 'opposition';
  /** Apelo das bandeiras (leis defendidas) para cada tipo de Pop (−1..1). */
  platformAppeal?: Partial<Record<PopTypeId, number>>;
}

export function salienceWeights(pop: Pop): AxisWeights {
  const w: AxisWeights = {};
  for (const axis of IDEOLOGY_AXES) w[axis] = 1;
  for (const issue of ISSUES) {
    const p = pop.priorities[issue];
    for (const axis of ISSUE_DEFINITIONS[issue].axes)
      w[axis] = (w[axis] ?? 1) + p * V.issueAxisSalience;
  }
  return w;
}

function issueMatch(pop: Pop, focus: Partial<Record<IssueId, number>>): number {
  let num = 0;
  let den = 0;
  for (const issue of ISSUES) {
    const p = pop.priorities[issue];
    den += p;
    num += p * ((focus[issue] ?? 0) / 100);
  }
  return den > 0 ? num / den : 0;
}

/** Partido que ocupa o cargo em disputa (NPC) — base do voto retrospectivo. */
export function governingPartyFor(state: GameState, election: Election): PartyId | null {
  const level = OFFICES[election.officeId].level;
  const stateId = election.jurisdiction.stateId;
  if (level === 'federal' || !stateId) return state.landscape.presidentPartyId;
  if (election.jurisdiction.level === 'municipal')
    return mayorPartyOf(state, stateId, election.jurisdiction.cityId);
  return state.landscape.governors[stateId] ?? null;
}

export function buildCandidateContexts(
  state: GameState,
  election: Election,
  ids: CandidateId[],
): CandidateContext[] {
  const governing = governingPartyFor(state, election);
  return ids.map((id) => {
    const cand = state.candidates[id];
    const status = election.participants[id];
    if (!cand || !status) throw new Error(`Candidato fora da eleição: ${id}`);
    const role = status.isIncumbent
      ? 'incumbent'
      : cand.partyId === governing
        ? 'incumbent_party'
        : 'opposition';
    return {
      id,
      partyId: cand.partyId,
      appeal: personalAppeal(cand.attributes),
      ideology: status.perceivedIdeology,
      baseRejection:
        V.baseRejection +
        ((100 - cand.attributes.credibility) / 100) * V.rejectionCredibilityFactor,
      polarization:
        V.rejectionPolarizationFactor * (0.6 + ideologyExtremity(status.perceivedIdeology)),
      scandal: cand.scandal,
      issueFocus: status.issueFocus,
      status,
      incumbencyRole: role,
      platformAppeal: platformPopAppeal(candidatePlatform(state, id)),
    };
  });
}

function economyTerm(role: CandidateContext['incumbencyRole'], satisfaction: number): number {
  const s = (satisfaction - 50) / 50;
  if (role === 'incumbent') return s;
  if (role === 'incumbent_party') return 0.5 * s;
  return -0.25 * s;
}

export function undecidedShare(
  daysLeft: number,
  campaignDays: number,
  maxKnowledge: number,
  engagement: number,
): number {
  const time = clamp01(daysLeft / Math.max(1, campaignDays));
  const u =
    V.baseUndecided * (V.undecidedEndFactor + (1 - V.undecidedEndFactor) * time) +
    V.undecidedKnowledgeFactor * (1 - maxKnowledge) -
    V.undecidedEngagementFactor * engagement;
  return clamp(u, V.minUndecided, V.maxUndecided);
}

/** Intenção de voto de um Pop numa unidade. Função pura — o coração do modelo eleitoral. */
export function popIntention(
  election: Election,
  unit: ElectoralUnit,
  pop: Pop,
  contexts: CandidateContext[],
  opts: IntentionOptions,
  salience: AxisWeights,
): PopUnitIntention {
  const W = V.weights;
  const shares: Record<string, number> = {};
  const rejection: Record<CandidateId, number> = {};
  let total = 0;
  let maxK = 0;
  let rejSum = 0;
  const volatility = POP_TYPES[pop.typeId].volatility;
  // Pauta da semana: pesa mais para quem prioriza o tema (prioridade média ≈ 15).
  const trend = election.trend ?? null;
  const trendWeight = trend ? Math.min(2.5, (pop.priorities[trend] ?? 0) / 15) : 0;

  for (const c of contexts) {
    const k = clamp01((c.status.knowledge[unit.id] ?? 0) / 100);
    maxK = Math.max(maxK, k);
    const dist = ideologyDistance(pop.ideology, c.ideology, salience);
    const rej = clamp(
      k *
        (c.baseRejection +
          c.polarization * Math.max(0, dist - V.rejectionDistanceThreshold) +
          c.status.rejectionMod / 100 +
          c.scandal * V.rejectionScandalFactor),
      0,
      V.rejectionMax,
    );
    rejection[c.id] = rej;
    rejSum += rej;
    const momentum =
      ((c.status.popMomentum[pop.typeId] ?? 0) + (c.status.regionalMomentum[unit.id] ?? 0)) / 100;
    const utility =
      W.ideology * (1 - 2 * dist) +
      W.party * (pop.partyAffinity[c.partyId] ?? 0) +
      W.appeal * c.appeal +
      W.issues * issueMatch(pop, c.issueFocus) +
      W.platform * (c.platformAppeal?.[pop.typeId] ?? 0) * k +
      W.momentum * momentum * (0.6 + 0.8 * volatility) +
      W.presence * ((c.status.presence[unit.id] ?? 0) / 100) +
      W.economy * economyTerm(c.incumbencyRole, pop.satisfaction + pop.mood * 20) +
      (c.incumbencyRole === 'incumbent' ? W.incumbency : 0) +
      (trend ? W.trend * trendWeight * ((c.issueFocus[trend] ?? 0) / 100) : 0) -
      W.rejection * rej +
      (opts.utilityNoise?.(c.id, unit, pop) ?? 0);
    const weight =
      Math.max(V.minKnowledge, k) ** V.knowledgeExponent *
      Math.exp(utility / V.temperature) *
      (1 - rej);
    shares[c.id] = weight;
    total += weight;
  }

  const namedShare = opts.others ? 1 - opts.others.share : 1;
  for (const key of Object.keys(shares))
    shares[key] = total > 0 ? ((shares[key] ?? 0) / total) * namedShare : 0;
  if (opts.others) {
    shares[OTHERS_KEY] = opts.others.share;
    maxK = Math.max(maxK, 0.9);
  }

  const engagement = POP_TYPES[pop.typeId].engagement;
  const undecided = undecidedShare(opts.daysLeft, election.campaignDays, maxK, engagement);
  const meanRej = contexts.length > 0 ? rejSum / contexts.length : 0;
  const blankNull = clamp(V.blankNullBase + V.blankNullRejectionFactor * meanRej, 0, 0.3);
  const turnout = clamp(pop.turnout * (opts.turnoutNoise?.(unit, pop) ?? 1), 0.3, 0.98);
  return { shares, undecided, blankNull, turnout, rejection };
}

function emptyAggregate(): AggregateIntention {
  return { voters: 0, turnoutRate: 0, shares: {}, undecided: 0, blankNull: 0, rejection: {} };
}

function accumulate(agg: AggregateIntention, voters: number, intent: PopUnitIntention): void {
  const turnoutVoters = voters * intent.turnout;
  const decided = 1 - intent.undecided - intent.blankNull;
  agg.voters += voters;
  agg.turnoutRate += turnoutVoters;
  agg.undecided += turnoutVoters * intent.undecided;
  agg.blankNull += turnoutVoters * intent.blankNull;
  for (const [id, s] of Object.entries(intent.shares))
    agg.shares[id] = (agg.shares[id] ?? 0) + turnoutVoters * decided * s;
  for (const [id, r] of Object.entries(intent.rejection))
    agg.rejection[id] = (agg.rejection[id] ?? 0) + voters * r;
}

function finalize(agg: AggregateIntention): AggregateIntention {
  const t = agg.turnoutRate;
  const rejection: Record<string, number> = {};
  for (const [id, v] of Object.entries(agg.rejection))
    rejection[id] = agg.voters > 0 ? v / agg.voters : 0;
  if (t <= 0) return { ...agg, turnoutRate: 0, rejection };
  const shares: Record<string, number> = {};
  for (const [id, v] of Object.entries(agg.shares)) shares[id] = v / t;
  return {
    voters: agg.voters,
    turnoutRate: t / agg.voters,
    shares,
    undecided: agg.undecided / t,
    blankNull: agg.blankNull / t,
    rejection,
  };
}

export function computeIntentions(
  state: GameState,
  election: Election,
  options?: Partial<IntentionOptions>,
): IntentionSnapshot {
  // Eleições proporcionais: os "demais candidatos" aparecem como uma opção agregada.
  const proportional = OFFICES[election.officeId].system === 'proportional';
  const opts: IntentionOptions = {
    daysLeft: options?.daysLeft ?? Math.max(0, diffDays(state.date, election.date)),
    candidateIds: options?.candidateIds ?? election.candidateIds,
    ...(proportional ? { others: { share: GameConstants.election.proportional.othersShare } } : {}),
    ...options,
  } as IntentionOptions;
  const contexts = buildCandidateContexts(state, election, opts.candidateIds);
  const salienceCache = new Map<string, AxisWeights>();
  const total = emptyAggregate();
  const byUnit: Record<string, AggregateIntention> = {};
  const byPopType = {} as Record<PopTypeId, AggregateIntention>;
  for (const t of POP_TYPE_IDS) byPopType[t] = emptyAggregate();
  const rejection: Record<CandidateId, number> = {};
  const knowledge: Record<CandidateId, number> = {};
  for (const c of contexts) {
    rejection[c.id] = 0;
    knowledge[c.id] = 0;
  }
  let totalVoters = 0;

  const player = state.playerId;
  const playerIn = opts.candidateIds.includes(player);
  const playerParty = state.candidates[player]?.partyId ?? '';
  const enthusiasm = state.campaign?.enthusiasm ?? GameConstants.campaign.baseEnthusiasm;
  const seg: VoterSegments = {
    loyal: 0,
    sympathizers: 0,
    independents: 0,
    undecided: 0,
    antiCandidate: 0,
    abstention: 0,
  };

  for (const unit of election.units) {
    const unitAgg = emptyAggregate();
    for (const up of unit.pops) {
      const pop = state.population.pops[up.popId];
      if (!pop || up.voters <= 0) continue;
      let sal = salienceCache.get(pop.id);
      if (!sal) {
        sal = salienceWeights(pop);
        salienceCache.set(pop.id, sal);
      }
      const intent = popIntention(election, unit, pop, contexts, opts, sal);
      accumulate(unitAgg, up.voters, intent);
      accumulate(total, up.voters, intent);
      accumulate(byPopType[pop.typeId], up.voters, intent);
      totalVoters += up.voters;
      for (const c of contexts) {
        rejection[c.id] = (rejection[c.id] ?? 0) + (intent.rejection[c.id] ?? 0) * up.voters;
        knowledge[c.id] = (knowledge[c.id] ?? 0) + (c.status.knowledge[unit.id] ?? 0) * up.voters;
      }
      if (playerIn && opts.includeSegments !== false) {
        const w = up.voters;
        const rest = intent.turnout;
        const und = intent.undecided * rest;
        const blank = intent.blankNull * rest;
        const decided = rest - und - blank;
        const mine = (intent.shares[player] ?? 0) * decided;
        const loyalty = clamp01(
          (pop.partyAffinity[playerParty] ?? 0) * V.loyaltyPartyFactor +
            (enthusiasm / 100) * V.loyaltyEnthusiasmFactor,
        );
        const anti = Math.min(intent.rejection[player] ?? 0, 1) * (decided - mine);
        seg.loyal += w * mine * loyalty;
        seg.sympathizers += w * mine * (1 - loyalty);
        seg.antiCandidate += w * anti;
        seg.independents += w * Math.max(0, decided - mine - anti);
        seg.undecided += w * und;
        seg.abstention += w * (1 - rest + blank);
      }
    }
    byUnit[unit.id] = finalize(unitAgg);
  }

  for (const c of contexts) {
    rejection[c.id] = totalVoters > 0 ? (rejection[c.id] ?? 0) / totalVoters : 0;
    knowledge[c.id] = totalVoters > 0 ? (knowledge[c.id] ?? 0) / totalVoters : 0;
  }
  const totalAgg = finalize(total);
  const decidedTotal = Object.values(totalAgg.shares).reduce((a, b) => a + b, 0);
  const valid: Record<string, number> = {};
  for (const [id, s] of Object.entries(totalAgg.shares))
    valid[id] = decidedTotal > 0 ? s / decidedTotal : 0;

  let segments: VoterSegments | null = null;
  if (playerIn && totalVoters > 0) {
    segments = {
      loyal: seg.loyal / totalVoters,
      sympathizers: seg.sympathizers / totalVoters,
      independents: seg.independents / totalVoters,
      undecided: seg.undecided / totalVoters,
      antiCandidate: seg.antiCandidate / totalVoters,
      abstention: seg.abstention / totalVoters,
    };
  }

  const popTypeOut = {} as Record<PopTypeId, AggregateIntention>;
  for (const t of POP_TYPE_IDS) popTypeOut[t] = finalize(byPopType[t]);
  return { total: totalAgg, valid, rejection, knowledge, byUnit, byPopType: popTypeOut, segments };
}
