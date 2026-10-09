import { clamp, sum } from '../core/math';
import { SECTOR_IDS, type SectorId } from '../economy/industry/types';
import { federalOption } from '../laws/federal';
import { INTEREST_GROUP_SEEDS } from '../politics/interestGroups.data';
import type { InterestGroupId } from '../politics/types';
import { POP_TYPES, POP_TYPE_IDS, type PopTypeId } from '../population/popTypes';
import type { GameState } from '../simulation/state';
import { NationConstants as NC } from './constants';

/** Influência-base de cada grupo (a do cenário padrão) e sua fatia no total. */
const BASE_INFLUENCE = Object.fromEntries(
  INTEREST_GROUP_SEEDS.map((g) => [g.id, g.influence]),
) as Record<InterestGroupId, number>;
const BASE_TOTAL = sum(Object.values(BASE_INFLUENCE));

export function baseInfluenceOf(id: InterestGroupId): number {
  return BASE_INFLUENCE[id] ?? 50;
}

function baseShareOf(id: InterestGroupId): number {
  return baseInfluenceOf(id) / BASE_TOTAL;
}

function ratio(now: number, reference: number): number {
  if (!(reference > 0) || !(now >= 0)) return 1;
  return clamp(
    (now / reference) ** NC.cloutRatioExponent,
    NC.cloutRatioMin,
    NC.cloutRatioMax,
  );
}

/** Participação (tamanho × renda) dos tipos de Pop no total, vista nos Pops vivos. */
function livePopShare(state: GameState, types: readonly PopTypeId[]): number | null {
  let total = 0;
  let mine = 0;
  for (const pop of Object.values(state.population.pops)) {
    const weight = pop.size * pop.income;
    total += weight;
    if (types.includes(pop.typeId)) mine += weight;
  }
  return total > 0 ? mine / total : null;
}

/** Participação dos mesmos tipos de Pop na população de referência (definições). */
function referencePopShare(types: readonly PopTypeId[]): number {
  const weight = (t: PopTypeId) => POP_TYPES[t].baseShare * POP_TYPES[t].income;
  const total = sum(POP_TYPE_IDS.map(weight));
  return sum(types.map(weight)) / total;
}

/** Participação de cada setor no valor adicionado (ou no emprego), ou `null` sem dados. */
function liveSectorShares(state: GameState): Record<SectorId, number> | null {
  const stats = state.industry.stats;
  for (const source of [stats.valueAddedBySector, stats.employmentBySector]) {
    const total = sum(SECTOR_IDS.map((s) => source[s] ?? 0));
    if (total > 0)
      return Object.fromEntries(SECTOR_IDS.map((s) => [s, (source[s] ?? 0) / total])) as Record<
        SectorId,
        number
      >;
  }
  return null;
}

function econScore(
  links: Partial<Record<SectorId, number>>,
  shares: Record<SectorId, number>,
): number {
  return sum(SECTOR_IDS.map((s) => (links[s] ?? 0) * (shares[s] ?? 0)));
}

/** Fator das leis federais sobre o peso do grupo (sindicatos proibidos perdem força). */
function lawFactor(state: GameState, id: InterestGroupId): number {
  if (id !== 'unions') return 1;
  let factor = NC.unionLawFactor[federalOption(state, 'unions') ?? ''] ?? 1;
  if (federalOption(state, 'labor') === 'labor_councils') factor *= NC.laborCouncilsUnionFactor;
  return factor;
}

export interface CloutResult {
  /** Peso político normalizado (soma 1). */
  clout: Record<InterestGroupId, number>;
  /** Influência-alvo (0..100) em torno da base do grupo. */
  influenceTarget: Record<InterestGroupId, number>;
}

/**
 * Peso dos grupos de interesse (seção 7): a base histórica combinada ao tamanho×renda dos Pops
 * ligados e ao peso econômico do setor, ajustada pelas leis (sindicatos proibidos).
 */
export function computeClout(state: GameState): CloutResult {
  const shares = liveSectorShares(state);
  const raw = {} as Record<InterestGroupId, number>;
  const influenceTarget = {} as Record<InterestGroupId, number>;
  const ids = Object.keys(state.interestGroups) as InterestGroupId[];
  for (const id of ids) {
    const group = state.interestGroups[id];
    if (!group) continue;
    const popNow = livePopShare(state, group.relatedPopTypes);
    const mPop = popNow === null ? 1 : ratio(popNow, referencePopShare(group.relatedPopTypes));
    const links = NC.groupSectorLinks[id];
    let mEcon = 1;
    if (links && shares) {
      const refShares = NC.referenceSectorShares;
      mEcon = ratio(econScore(links, shares), econScore(links, refShares));
    }
    const multiplier =
      (NC.cloutWeights.base + NC.cloutWeights.pop * mPop + NC.cloutWeights.econ * mEcon) *
      lawFactor(state, id);
    raw[id] = baseShareOf(id) * multiplier;
    influenceTarget[id] = clamp(baseInfluenceOf(id) * multiplier, NC.influenceMin, NC.influenceMax);
  }
  const total = sum(Object.values(raw));
  const clout = {} as Record<InterestGroupId, number>;
  for (const id of ids) clout[id] = total > 0 ? (raw[id] ?? 0) / total : 1 / ids.length;
  return { clout, influenceTarget };
}
