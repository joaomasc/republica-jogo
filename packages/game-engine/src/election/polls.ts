import { GameConstants } from '../config/constants';
import { clamp, round } from '../core/math';
import { hashSeed, Rng, withRng } from '../core/rng';
import type { CandidateId } from '../core/types';
import { STATES } from '../map/states';
import { POLLSTERS } from '../media/outlets';
import { POP_TYPE_IDS, type PopTypeId } from '../population/popTypes';
import { getDifficulty, nextId, requireElection } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { OFFICES } from './offices';
import type { Poll, PollResultSet } from './types';
import {
  computeIntentions,
  OTHERS_KEY,
  type AggregateIntention,
  type IntentionSnapshot,
} from './voterModel';

const P = GameConstants.polls;

function houseEffect(
  pollster: string,
  candidateId: CandidateId,
  seed: number,
  uncertainty: number,
): number {
  const rng = new Rng(hashSeed(seed, pollster, candidateId));
  return rng.normal(0, P.houseEffectSd * uncertainty);
}

/** Aplica erro amostral a um conjunto de intenções. */
function sample(
  agg: Pick<AggregateIntention, 'shares' | 'undecided' | 'blankNull'>,
  n: number,
  rng: Rng,
  uncertainty: number,
  bias: (id: string) => number,
): PollResultSet {
  const sd = (p: number) =>
    Math.sqrt((p * (1 - p)) / Math.max(30, n)) * Math.sqrt(P.designEffect) * uncertainty;
  const shares: Record<string, number> = {};
  for (const [id, p] of Object.entries(agg.shares))
    shares[id] = clamp(p + rng.normal(0, sd(p)) + bias(id), 0, 1);
  const undecided = clamp(agg.undecided + rng.normal(0, sd(agg.undecided)), 0, 1);
  const blankNull = clamp(agg.blankNull + rng.normal(0, sd(agg.blankNull)), 0, 1);
  const total = Object.values(shares).reduce((a, b) => a + b, 0) + undecided + blankNull;
  for (const id of Object.keys(shares)) shares[id] = round((shares[id] ?? 0) / total, 4);
  return { shares, undecided: round(undecided / total, 4), blankNull: round(blankNull / total, 4) };
}

function regionalBreakdown(
  snapshot: IntentionSnapshot,
  isNational: boolean,
  units: { id: string; stateId: string }[],
): Record<string, AggregateIntention> {
  if (!isNational) return snapshot.byUnit;
  const out: Record<string, AggregateIntention> = {};
  for (const unit of units) {
    const region = STATES[unit.stateId as keyof typeof STATES].region;
    const agg = snapshot.byUnit[unit.id];
    if (!agg) continue;
    const target = (out[region] ??= {
      voters: 0,
      turnoutRate: 0,
      shares: {},
      undecided: 0,
      blankNull: 0,
      rejection: {},
    });
    const w = agg.voters * agg.turnoutRate;
    target.voters += agg.voters;
    target.turnoutRate += w;
    target.undecided += agg.undecided * w;
    target.blankNull += agg.blankNull * w;
    for (const [id, s] of Object.entries(agg.shares))
      target.shares[id] = (target.shares[id] ?? 0) + s * w;
  }
  for (const agg of Object.values(out)) {
    const w = agg.turnoutRate;
    agg.undecided /= w;
    agg.blankNull /= w;
    for (const id of Object.keys(agg.shares)) agg.shares[id] = (agg.shares[id] ?? 0) / w;
    agg.turnoutRate = w / agg.voters;
  }
  return out;
}

export interface RunPollOptions {
  kind: 'public' | 'internal';
  pollster?: string;
}

/**
 * Gera uma pesquisa a partir da intenção "real" do modelo + erro amostral + viés do instituto.
 * Pesquisas NÃO garantem o resultado: o dia da eleição tem ruído próprio e os indecisos ainda decidem.
 */
export function createPoll(state: GameState, options: RunPollOptions): Poll {
  const election = requireElection(state);
  const diff = getDifficulty(state);
  const hasAnalyst = state.campaign?.staff.some((s) => s.roleId === 'analyst') ?? false;
  const n =
    options.kind === 'public'
      ? P.publicSampleSize
      : Math.round(
          P.internalSampleSize * (hasAnalyst ? GameConstants.campaign.analystSampleBonus : 1),
        );
  const snapshot = computeIntentions(state, election);
  const pollster =
    options.pollster ?? (options.kind === 'internal' ? 'Pesquisa interna' : POLLSTERS[0]);
  const uncertainty = diff.uncertainty;
  const bias = (id: string) =>
    id === OTHERS_KEY || options.kind === 'internal'
      ? 0
      : houseEffect(pollster, id, state.meta.seed, uncertainty);

  return withRng(state, (rng) => {
    const total = sample(snapshot.total, n, rng, uncertainty, bias);
    const office = OFFICES[election.officeId];
    const isNational = office.unitsKind === 'states';
    const regions = regionalBreakdown(snapshot, isNational, election.units);
    const byRegion: Record<string, PollResultSet> = {};
    const regionCount = Object.keys(regions).length || 1;
    for (const [key, agg] of Object.entries(regions))
      byRegion[key] = sample(agg, n / regionCount, rng, uncertainty, bias);

    const byUnit: Record<string, PollResultSet> = {};
    for (const unit of election.units) {
      const agg = snapshot.byUnit[unit.id];
      if (!agg) continue;
      const subsample = Math.max(
        120,
        (n * (options.kind === 'internal' ? 2 : 1) * unit.voters) /
          Math.max(1, election.totalVoters),
      );
      byUnit[unit.id] = sample(agg, subsample, rng, uncertainty, bias);
    }

    const byPopType: Partial<Record<PopTypeId, PollResultSet>> = {};
    for (const t of POP_TYPE_IDS)
      byPopType[t] = sample(snapshot.byPopType[t], n / POP_TYPE_IDS.length, rng, uncertainty, bias);

    const runoffScenarios: Poll['runoffScenarios'] = [];
    if (office.runoff && election.round === 1) {
      const top = Object.entries(snapshot.valid)
        .filter(([id]) => id !== OTHERS_KEY)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id);
      const pairs: [string, string][] = [];
      if (top.includes(state.playerId)) {
        for (const other of top) if (other !== state.playerId) pairs.push([state.playerId, other]);
      }
      if (
        top[0] &&
        top[1] &&
        !pairs.some(([a, b]) => (a === top[0] && b === top[1]) || (a === top[1] && b === top[0]))
      )
        pairs.push([top[0], top[1]]);
      for (const [a, b] of pairs.slice(0, 3)) {
        const h2h = computeIntentions(state, election, {
          candidateIds: [a, b],
          includeSegments: false,
        });
        const aShare = clamp((h2h.valid[a] ?? 0.5) + rng.normal(0, 0.012 * uncertainty), 0, 1);
        runoffScenarios.push({ a, b, aShare: round(aShare, 4), bShare: round(1 - aShare, 4) });
      }
    }

    const rejection: Record<CandidateId, number> = {};
    const knowledge: Record<CandidateId, number> = {};
    for (const id of election.candidateIds) {
      rejection[id] = round(
        clamp((snapshot.rejection[id] ?? 0) + rng.normal(0, 0.01 * uncertainty), 0, 1),
        4,
      );
      knowledge[id] = round(
        clamp((snapshot.knowledge[id] ?? 0) / 100 + rng.normal(0, 0.01), 0, 1),
        4,
      );
    }

    return {
      id: nextId(state, 'poll'),
      date: state.date,
      round: election.round,
      pollster,
      kind: options.kind,
      sampleSize: n,
      marginOfError: round(1.96 * Math.sqrt(0.25 / n) * Math.sqrt(P.designEffect) * uncertainty, 4),
      total,
      rejection,
      knowledge,
      byRegion,
      byUnit,
      byPopType: options.kind === 'internal' ? byPopType : pickPublicDemographics(byPopType),
      runoffScenarios,
      ...(options.kind === 'internal' && snapshot.segments
        ? { playerSegments: snapshot.segments }
        : {}),
    };
  });
}

function pickPublicDemographics(
  all: Partial<Record<PopTypeId, PollResultSet>>,
): Partial<Record<PopTypeId, PollResultSet>> {
  const keep: PopTypeId[] = [
    'workers',
    'middle_class',
    'students',
    'retirees',
    'business',
    'unemployed',
  ];
  const out: Partial<Record<PopTypeId, PollResultSet>> = {};
  for (const k of keep) if (all[k]) out[k] = all[k];
  return out;
}

export function addPoll(state: GameState, poll: Poll): void {
  const election = requireElection(state);
  election.polls.push(poll);
  if (election.polls.length > P.historyLimit) election.polls.shift();
}

export function latestPoll(state: GameState, kind?: Poll['kind']): Poll | null {
  const polls = state.election?.polls ?? [];
  for (let i = polls.length - 1; i >= 0; i--) {
    const p = polls[i];
    if (p && (!kind || p.kind === kind)) return p;
  }
  return null;
}

export function pickPollster(state: GameState): string {
  const count = state.election?.polls.filter((p) => p.kind === 'public').length ?? 0;
  return POLLSTERS[count % POLLSTERS.length] ?? 'Instituto Census';
}

/** Ordena candidatos por intenção numa pesquisa. */
export function rankByPoll(poll: Poll): CandidateId[] {
  return Object.entries(poll.total.shares)
    .filter(([id]) => id !== OTHERS_KEY)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
