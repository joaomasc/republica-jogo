import { GameConstants } from '../config/constants';
import { clamp, clamp100, round, sum } from '../core/math';
import type { Rng } from '../core/rng';
import { STATE_IDS, type PartyId, type PopId, type StateId } from '../core/types';
import { IDEOLOGY_AXES, type IdeologyVector } from '../ideology/axes';
import {
  averageIdeology,
  ideologyAffinity,
  jitterIdeology,
  shiftIdeology,
} from '../ideology/ideology';
import { ISSUES, type IssueId } from '../ideology/issues';
import { STATES, type StateData } from '../map/states';
import type { Party } from '../parties/types';
import { POP_TYPE_IDS, POP_TYPES, type PopTypeId, type RegionalFactor } from './popTypes';
import type { Pop, PopulationState, RegionState } from './types';

const C = GameConstants.population;

export function popId(stateId: StateId, typeId: PopTypeId): PopId {
  return `${stateId}:${typeId}`;
}

export function stateFactors(s: StateData): Record<RegionalFactor, number> {
  return {
    urbanization: s.profile.urbanization,
    agro: s.profile.agro,
    industry: s.profile.industry,
    publicSector: s.profile.publicSector,
    tech: s.profile.tech,
    income: s.gdpPerCapita / 60,
    unemployment: s.unemployment / 10,
  };
}

function nationalFactorAverages(): Record<RegionalFactor, number> {
  const totals: Record<RegionalFactor, number> = {
    urbanization: 0,
    agro: 0,
    industry: 0,
    publicSector: 0,
    tech: 0,
    income: 0,
    unemployment: 0,
  };
  let pop = 0;
  for (const id of STATE_IDS) {
    const s = STATES[id];
    const f = stateFactors(s);
    for (const k of Object.keys(totals) as RegionalFactor[]) totals[k] += f[k] * s.population;
    pop += s.population;
  }
  for (const k of Object.keys(totals) as RegionalFactor[]) totals[k] /= pop;
  return totals;
}

/** Composição demográfica de um estado (participação de cada tipo de Pop, soma = 1). */
export function popShares(
  s: StateData,
  avg: Record<RegionalFactor, number>,
): Record<PopTypeId, number> {
  const f = stateFactors(s);
  const raw = {} as Record<PopTypeId, number>;
  for (const id of POP_TYPE_IDS) {
    const def = POP_TYPES[id];
    let mult = 1;
    for (const [factor, coef] of Object.entries(def.regional) as [RegionalFactor, number][]) {
      mult += coef * (f[factor] - avg[factor]);
    }
    raw[id] = def.baseShare * Math.max(C.shareFloor, mult);
  }
  const total = sum(Object.values(raw));
  for (const id of POP_TYPE_IDS) raw[id] /= total;
  return raw;
}

function stateIdeologyShift(
  s: StateData,
  avg: Record<RegionalFactor, number>,
  rng: Rng,
): Partial<IdeologyVector> {
  const f = stateFactors(s);
  const k = C.stateShift;
  const shift: Partial<IdeologyVector> = {
    economy:
      (f.publicSector - avg.publicSector) * k.publicToEconomy +
      (f.income - avg.income) * k.incomeToEconomy,
    fiscal: (f.income - avg.income) * k.incomeToFiscal,
    environment: (f.agro - avg.agro) * k.agroToEnvironment,
    trade: (f.agro - avg.agro) * k.agroToTrade + (f.industry - avg.industry) * k.industryToTrade,
    social: (avg.urbanization - f.urbanization) * k.ruralToSocial,
    security: (avg.urbanization - f.urbanization) * k.ruralToSecurity,
  };
  // Ruído por partida: cada jogo tem uma geografia política ligeiramente diferente.
  for (const axis of IDEOLOGY_AXES)
    shift[axis] = (shift[axis] ?? 0) + rng.normal(0, C.stateIdeologyNoiseSd);
  return shift;
}

function buildPriorities(typeId: PopTypeId, s: StateData, rng: Rng): Record<IssueId, number> {
  const def = POP_TYPES[typeId];
  const out = {} as Record<IssueId, number>;
  for (const issue of ISSUES) {
    const base = def.priorities[issue] ?? C.defaultPriority;
    const bonus = s.mainIssues.includes(issue) ? C.stateIssueBonus : 0;
    out[issue] = Math.round(clamp100(base + bonus + rng.normal(0, C.priorityNoise)));
  }
  return out;
}

export function computeProblems(
  pop: Pick<Pop, 'priorities'>,
  region?: Pick<RegionState, 'unemployment'>,
): IssueId[] {
  const scored = ISSUES.map((issue) => {
    let score = pop.priorities[issue];
    if (region && issue === 'jobs') score *= 1 + (region.unemployment - 8) / 20;
    return { issue, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.issue);
}

/** Calcula a identificação partidária de um Pop (valores somam `partyIdentificationTotal`). */
export function computePartyAffinity(
  pop: Pick<Pop, 'ideology' | 'typeId'>,
  parties: Record<PartyId, Party>,
  strength: Record<PartyId, number>,
): Record<PartyId, number> {
  const raw: Record<PartyId, number> = {};
  let total = 0;
  for (const party of Object.values(parties)) {
    const aff = ideologyAffinity(pop.ideology, party.ideology) ** C.partyAffinityExponent;
    const popularity = Math.max(1, party.popularity) / 50;
    const local = (strength[party.id] ?? 50) / 50;
    const priority = party.priorityPopTypes.includes(pop.typeId) ? C.priorityPopBonus : 1;
    const value = aff * popularity * local * priority;
    raw[party.id] = value;
    total += value;
  }
  const engagement = POP_TYPES[pop.typeId].engagement;
  const identified = C.partyIdentificationTotal * (0.6 + 0.8 * engagement);
  const out: Record<PartyId, number> = {};
  for (const [id, v] of Object.entries(raw))
    out[id] = total > 0 ? round((v / total) * identified, 4) : 0;
  return out;
}

export function initialPartyStrength(party: Party, s: StateData, rng: Rng): number {
  let mult = 1;
  if (party.strongRegions.includes(s.region)) mult = 1.4;
  else if (party.weakRegions.includes(s.region)) mult = 0.65;
  return clamp(50 * mult * rng.range(0.8, 1.2), 5, 100);
}

export function generatePopulation(
  rng: Rng,
  parties: Record<PartyId, Party>,
  scale: number,
): { population: PopulationState; regions: Record<StateId, RegionState> } {
  const avg = nationalFactorAverages();
  const pops: Record<PopId, Pop> = {};
  const regions = {} as Record<StateId, RegionState>;
  const partyIds = Object.keys(parties);
  let totalVoters = 0;

  for (const stateId of STATE_IDS) {
    const s = STATES[stateId];
    const shares = popShares(s, avg);
    const shift = stateIdeologyShift(s, avg, rng);
    const strength: Record<PartyId, number> = {};
    for (const party of Object.values(parties))
      strength[party.id] = initialPartyStrength(party, s, rng);

    const electorate = s.population * 1000 * C.voterRatio * scale;
    const statePops: Pop[] = [];
    for (const typeId of POP_TYPE_IDS) {
      const def = POP_TYPES[typeId];
      const size = Math.round(electorate * shares[typeId]);
      const ideology = roundVector(
        jitterIdeology(shiftIdeology(def.ideology, shift), rng, C.popIdeologyNoiseSd),
      );
      const priorities = buildPriorities(typeId, s, rng);
      const incomeFactor = s.gdpPerCapita / 40;
      const pop: Pop = {
        id: popId(stateId, typeId),
        typeId,
        stateId,
        size,
        income: Math.round(def.income * (0.6 + 0.4 * incomeFactor)),
        education: clamp100(def.education + (s.profile.urbanization - 0.8) * 20),
        avgAge: def.avgAge,
        ideology,
        priorities,
        turnout: clamp(def.turnout + rng.normal(0, 0.02), 0.5, 0.95),
        partyAffinity: {},
        satisfaction: clamp100(
          C.baseSatisfaction -
            (s.unemployment - C.satisfactionReferenceUnemployment) *
              C.satisfactionUnemploymentFactor +
            rng.normal(0, 4),
        ),
        mood: 0,
        problems: [],
      };
      pop.partyAffinity = computePartyAffinity(pop, parties, strength);
      pop.problems = computeProblems(pop, { unemployment: s.unemployment });
      pops[pop.id] = pop;
      statePops.push(pop);
      totalVoters += size;
    }

    regions[stateId] = {
      id: stateId,
      unemployment: s.unemployment,
      income: Math.round(2800 * (s.gdpPerCapita / 40)),
      growth: 2,
      partyStrength: strength,
      governorPartyId:
        partyIds.length > 0
          ? (rng.weightedPick(
              partyIds,
              (id) => (strength[id] ?? 0) * (parties[id]?.popularity ?? 0),
            ) ?? partyIds[0]!)
          : '',
      problems: aggregateProblems(statePops),
      ideology: averageIdeology(statePops.map((p) => ({ ideology: p.ideology, weight: p.size }))),
    };
  }

  return { population: { pops, totalVoters, scale }, regions };
}

export function aggregateProblems(pops: readonly Pop[]): IssueId[] {
  const totals = {} as Record<IssueId, number>;
  for (const issue of ISSUES) totals[issue] = 0;
  for (const pop of pops)
    for (const issue of ISSUES) totals[issue] += pop.priorities[issue] * pop.size;
  return ISSUES.map((issue) => ({ issue, score: totals[issue] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.issue);
}

export function popsOfState(population: PopulationState, stateId: StateId): Pop[] {
  return POP_TYPE_IDS.map((t) => population.pops[popId(stateId, t)]).filter(
    (p): p is Pop => p !== undefined,
  );
}

export function getPop(population: PopulationState, id: PopId): Pop {
  const pop = population.pops[id];
  if (!pop) throw new Error(`Pop inexistente: ${id}`);
  return pop;
}

/** Recalcula a identificação partidária (ex.: após mudança de popularidade ou novo partido). */
export function refreshPartyAffinities(
  population: PopulationState,
  regions: Record<StateId, RegionState>,
  parties: Record<PartyId, Party>,
  blend = 1,
): void {
  for (const pop of Object.values(population.pops)) {
    const region = regions[pop.stateId];
    if (!region) continue;
    const fresh = computePartyAffinity(pop, parties, region.partyStrength);
    const next: Record<PartyId, number> = {};
    for (const id of Object.keys(parties)) {
      const old = pop.partyAffinity[id] ?? 0;
      next[id] = round(old + ((fresh[id] ?? 0) - old) * blend, 4);
    }
    pop.partyAffinity = next;
  }
}

export function popsByType(
  population: PopulationState,
): Record<PopTypeId, { size: number; pops: Pop[] }> {
  const out = {} as Record<PopTypeId, { size: number; pops: Pop[] }>;
  for (const t of POP_TYPE_IDS) out[t] = { size: 0, pops: [] };
  for (const pop of Object.values(population.pops)) {
    out[pop.typeId].size += pop.size;
    out[pop.typeId].pops.push(pop);
  }
  return out;
}

function roundVector(v: IdeologyVector): IdeologyVector {
  const out = { ...v };
  for (const axis of IDEOLOGY_AXES) out[axis] = round(v[axis], 1);
  return out;
}
