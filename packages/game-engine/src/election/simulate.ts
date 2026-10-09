import { GameConstants } from '../config/constants';
import { clamp, sum } from '../core/math';
import { hashSeed, Rng } from '../core/rng';
import type { CandidateId, PartyId } from '../core/types';
import { STATES } from '../map/states';
import type { PopTypeId } from '../population/popTypes';
import { DIFFICULTIES } from '../config/difficulty';
import type { GameState } from '../simulation/state';
import { OFFICES } from './offices';
import { resolveProportional } from './proportional';
import type { Election, ElectionResult, UnitResult } from './types';
import { buildCandidateContexts, OTHERS_KEY, popIntention, salienceWeights } from './voterModel';

const E = GameConstants.election;

export interface SimulateOptions {
  /** Seed explícita (padrão: derivada da seed da partida + id da eleição + turno). */
  seed?: number;
  /** Simula com outro conjunto de candidatos (ex.: 2º turno entre NPCs). */
  candidateIds?: CandidateId[];
  round?: 1 | 2;
}

export function electionSeed(state: GameState, election: Election, round: number): number {
  return hashSeed(state.meta.seed, election.id, round);
}

/**
 * Simula a votação. Função PURA: não altera o estado e, com a mesma seed, produz o mesmo resultado.
 * Considera identificação partidária, ideologia, candidato, rejeição, campanha, economia, região,
 * grupos demográficos, comparecimento e aleatoriedade controlada.
 */
export function simulateElection(state: GameState, options: SimulateOptions = {}): ElectionResult {
  const election = state.election;
  if (!election) throw new Error('Não há eleição para simular');
  const round = options.round ?? election.round;
  const seed = options.seed ?? electionSeed(state, election, round);
  const rng = new Rng(seed);
  const office = OFFICES[election.officeId];
  const proportional = office.system === 'proportional';
  const vol = DIFFICULTIES[state.settings.difficulty].volatility;
  const ids = options.candidateIds ?? election.candidateIds;
  const contexts = buildCandidateContexts(state, election, ids);

  // Choques correlacionados: nacional, regional e por grupo (pré-sorteados para reprodutibilidade).
  const national: Record<string, number> = {};
  for (const id of ids) national[id] = rng.normal(0, E.nationalSwingSd * vol);
  const regionalCache = new Map<string, number>();
  const regional = (id: string, key: string) => {
    const k = `${id}|${key}`;
    let v = regionalCache.get(k);
    if (v === undefined) {
      v = new Rng(hashSeed(seed, 'reg', k)).normal(0, E.regionalSwingSd * vol);
      regionalCache.set(k, v);
    }
    return v;
  };
  const popSwing = (id: string, unitId: string, typeId: string) =>
    new Rng(hashSeed(seed, 'pop', id, unitId, typeId)).normal(0, E.popSwingSd * vol);
  const turnoutUnit: Record<string, number> = {};
  for (const unit of election.units)
    turnoutUnit[unit.id] = 1 + rng.normal(0, E.turnoutNoiseSd * vol);
  const othersShare = proportional
    ? clamp(
        E.proportional.othersShare + rng.normal(0, E.proportional.othersShareNoiseSd * vol),
        0.35,
        0.8,
      )
    : 0;

  const regionKey = (stateId: keyof typeof STATES, unitId: string) =>
    election.units.length > 20 ? STATES[stateId].region : unitId;

  // Força relativa das chapas partidárias por estado (normalizada).
  const listCache = new Map<string, Record<PartyId, number>>();
  const listStrength = (stateId: keyof typeof STATES): Record<PartyId, number> => {
    let cached = listCache.get(stateId);
    if (!cached) {
      const raw: Record<PartyId, number> = {};
      for (const party of Object.values(state.parties)) {
        raw[party.id] =
          (party.popularity *
            ((state.regions[stateId]?.partyStrength[party.id] ?? 50) / 50) *
            (0.6 + party.influence / 125)) **
          E.proportional.listExponent;
      }
      const total = sum(Object.values(raw)) || 1;
      cached = Object.fromEntries(Object.entries(raw).map(([k, val]) => [k, val / total]));
      listCache.set(stateId, cached);
    }
    return cached;
  };

  const votes: Record<string, number> = {};
  const byUnit: Record<string, UnitResult> = {};
  const popTypeVotes: Partial<Record<PopTypeId, Record<string, number>>> = {};
  const othersByParty: Record<PartyId, number> = {};
  let totalVoters = 0;
  let turnout = 0;
  let blankNull = 0;
  const enthusiasm = state.campaign?.enthusiasm ?? 50;
  const playerParty = state.candidates[state.playerId]?.partyId ?? '';

  for (const unit of election.units) {
    const unitVotes: Record<string, number> = {};
    const unitParty: Record<PartyId, number> = {};
    let unitTurnout = 0;
    let unitBlank = 0;
    let unitVoters = 0;
    const rk = regionKey(unit.stateId, unit.id);
    for (const up of unit.pops) {
      const pop = state.population.pops[up.popId];
      if (!pop || up.voters <= 0) continue;
      const intent = popIntention(
        election,
        unit,
        pop,
        contexts,
        {
          daysLeft: 0,
          candidateIds: ids,
          utilityNoise: (cid) =>
            (national[cid] ?? 0) + regional(cid, rk) + popSwing(cid, unit.id, pop.typeId),
          turnoutNoise: () =>
            (turnoutUnit[unit.id] ?? 1) *
            (1 +
              (((pop.partyAffinity[playerParty] ?? 0) * (enthusiasm - 50)) / 50) *
                E.enthusiasmTurnoutBonus),
          ...(proportional ? { others: { share: othersShare } } : {}),
        },
        salienceWeights(pop),
      );

      const turnoutVoters = up.voters * intent.turnout;
      const u = intent.undecided;
      const decided = 1 - u - intent.blankNull;
      const concentrated: Record<string, number> = {};
      let csum = 0;
      for (const [id, s] of Object.entries(intent.shares)) {
        const v = s ** E.undecidedConcentration;
        concentrated[id] = v;
        csum += v;
      }
      const ptVotes = (popTypeVotes[pop.typeId] ??= {});
      for (const [id, s] of Object.entries(intent.shares)) {
        const share =
          decided * s + u * (1 - E.undecidedAbstainShare) * ((concentrated[id] ?? 0) / (csum || 1));
        const v = turnoutVoters * share;
        if (id === OTHERS_KEY) {
          // Votos "dos demais" se distribuem entre os partidos: metade pela identificação partidária do Pop,
          // metade pela força das chapas no estado (popularidade × presença local).
          const lists = listStrength(unit.stateId);
          let affSum = 0;
          for (const party of Object.values(state.parties))
            affSum += pop.partyAffinity[party.id] ?? 0;
          for (const party of Object.values(state.parties)) {
            const weight =
              E.proportional.affinityWeight * ((pop.partyAffinity[party.id] ?? 0) / (affSum || 1)) +
              (1 - E.proportional.affinityWeight) * (lists[party.id] ?? 0);
            const part = v * weight;
            othersByParty[party.id] = (othersByParty[party.id] ?? 0) + part;
            unitParty[party.id] = (unitParty[party.id] ?? 0) + part;
          }
          continue;
        }
        unitVotes[id] = (unitVotes[id] ?? 0) + v;
        ptVotes[id] = (ptVotes[id] ?? 0) + v;
        const cand = state.candidates[id];
        if (cand) unitParty[cand.partyId] = (unitParty[cand.partyId] ?? 0) + v;
      }
      const blank = turnoutVoters * (intent.blankNull + u * E.undecidedAbstainShare);
      unitTurnout += turnoutVoters;
      unitBlank += blank;
      unitVoters += up.voters;
    }
    const validUnit = sum(Object.values(proportional ? unitParty : unitVotes));
    const winner = Object.entries(unitVotes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const rounded: Record<string, number> = {};
    for (const [id, v] of Object.entries(unitVotes)) {
      rounded[id] = Math.round(v);
      votes[id] = (votes[id] ?? 0) + v;
    }
    byUnit[unit.id] = {
      votes: rounded,
      validVotes: Math.round(validUnit),
      turnoutRate: unitVoters > 0 ? unitTurnout / unitVoters : 0,
      winnerId: winner,
      ...(proportional
        ? {
            partyVotes: Object.fromEntries(
              Object.entries(unitParty).map(([k, v]) => [k, Math.round(v)]),
            ),
          }
        : {}),
    };
    totalVoters += unitVoters;
    turnout += unitTurnout;
    blankNull += unitBlank;
  }

  const namedValid = Object.values(votes).reduce((a, b) => a + b, 0);
  const othersTotal = Object.values(othersByParty).reduce((a, b) => a + b, 0);
  const validVotes = namedValid + othersTotal;
  const pct: Record<string, number> = {};
  const roundedVotes: Record<string, number> = {};
  for (const id of ids) {
    roundedVotes[id] = Math.round(votes[id] ?? 0);
    pct[id] = validVotes > 0 ? (votes[id] ?? 0) / validVotes : 0;
  }
  const ranking = [...ids].sort((a, b) => (votes[b] ?? 0) - (votes[a] ?? 0));

  const byPopType: ElectionResult['byPopType'] = {};
  for (const [t, rec] of Object.entries(popTypeVotes) as [PopTypeId, Record<string, number>][]) {
    const tot = Object.values(rec).reduce((a, b) => a + b, 0);
    byPopType[t] = Object.fromEntries(
      Object.entries(rec).map(([id, v]) => [id, tot > 0 ? v / tot : 0]),
    );
  }

  let winnerId: CandidateId | null = null;
  let runoff: [CandidateId, CandidateId] | null = null;
  let proportionalOutcome: ElectionResult['proportional'];
  let playerElected: boolean;

  if (proportional) {
    const candidateParty: Record<string, PartyId> = {};
    const names: Record<string, string> = {};
    for (const id of ids) {
      const c = state.candidates[id];
      if (c) {
        candidateParty[id] = c.partyId;
        names[id] = c.ballotName;
      }
    }
    proportionalOutcome = resolveProportional(
      {
        seats: election.seats,
        candidateVotes: roundedVotes,
        candidateParty,
        candidateNames: names,
        othersByParty: Object.fromEntries(
          Object.entries(othersByParty).map(([k, v]) => [k, Math.round(v)]),
        ),
        playerId: state.playerId,
      },
      new Rng(hashSeed(seed, 'lists')),
    );
    playerElected = proportionalOutcome.playerElected;
    winnerId = ranking[0] ?? null;
  } else {
    const first = ranking[0] ?? null;
    const second = ranking[1] ?? null;
    const needsRunoff =
      office.runoff &&
      round === 1 &&
      first !== null &&
      second !== null &&
      (pct[first] ?? 0) <= E.runoffThreshold;
    if (needsRunoff && first && second) runoff = [first, second];
    else winnerId = first;
    playerElected = winnerId === state.playerId;
  }

  return {
    round,
    date: election.date,
    seed,
    totalVoters,
    turnout: Math.round(turnout),
    turnoutRate: totalVoters > 0 ? turnout / totalVoters : 0,
    blankNull: Math.round(blankNull),
    validVotes: Math.round(validVotes),
    votes: roundedVotes,
    pct,
    ranking,
    byUnit,
    byPopType,
    winnerId,
    runoff,
    ...(proportionalOutcome ? { proportional: proportionalOutcome } : {}),
    playerElected,
  };
}
