import type { Rng } from '../core/rng';
import type { PartyId, StateId } from '../core/types';
import type { Jurisdiction } from '../election/offices';
import type { GameState } from '../simulation/state';
import { CITY_SEEDS, type CitySeed, type RegicLevel } from './cities.generated';

/**
 * Cidades jogáveis (eleições municipais): capitais, metrópoles e capitais regionais da REGIC 2018
 * — as cidades-polo de cada estado — e municípios com 500 mil+ habitantes (Censo 2022).
 * Dados gerados por scripts/generate-map.mjs a partir de data/cidades-ibge.json.
 */
export type CityData = CitySeed;
export type { RegicLevel };

export const CITIES: Record<string, CityData> = Object.fromEntries(
  CITY_SEEDS.map((c) => [c.id, c]),
);

const BY_STATE = new Map<StateId, CityData[]>();
for (const c of CITY_SEEDS) {
  const list = BY_STATE.get(c.stateId) ?? [];
  list.push(c);
  BY_STATE.set(c.stateId, list);
}
// Capital primeiro, depois por população.
for (const list of BY_STATE.values())
  list.sort((a, b) => Number(b.capital) - Number(a.capital) || b.population - a.population);

/** Cidades jogáveis do estado (a capital vem primeiro). */
export function citiesOf(stateId: StateId): CityData[] {
  return BY_STATE.get(stateId) ?? [];
}

export function capitalOf(stateId: StateId): CityData {
  const capital = citiesOf(stateId)[0];
  if (!capital) throw new Error(`Estado sem capital cadastrada: ${stateId}`);
  return capital;
}

/** A cidade pedida, se for do estado; senão a capital (saves antigos e cenários não têm cidade). */
export function cityOf(stateId: StateId, cityId?: string | null): CityData {
  const city = cityId ? CITIES[cityId] : undefined;
  return city && city.stateId === stateId ? city : capitalOf(stateId);
}

/** Cidade de uma jurisdição municipal (null nas demais esferas). */
export function cityOfJurisdiction(
  j: Pick<Jurisdiction, 'level' | 'stateId' | 'cityId'>,
): CityData | null {
  if (j.level !== 'municipal' || !j.stateId) return null;
  return cityOf(j.stateId as StateId, j.cityId);
}

// prettier-ignore
const COUNCIL_BANDS: [maxThousands: number, seats: number][] = [
  [15, 9], [30, 11], [50, 13], [80, 15], [120, 17], [160, 19], [300, 21], [450, 23], [600, 25],
  [750, 27], [900, 29], [1050, 31], [1200, 33], [1350, 35], [1500, 37], [1800, 39], [2400, 41],
  [3000, 43], [4000, 45], [5000, 47], [6000, 49], [7000, 51], [8000, 53],
];

/** Vereadores: teto da Constituição (art. 29, IV, EC 58/2009) pela população da cidade. */
export function cityCouncilSeats(stateId: StateId, cityId?: string | null): number {
  const pop = cityOf(stateId, cityId).population;
  return COUNCIL_BANDS.find(([max]) => pop <= max)?.[1] ?? 55;
}

/** Partido do prefeito da cidade (capitais em `mayors`; demais cidades em `cityMayors`). */
export function mayorPartyOf(
  state: GameState,
  stateId: StateId,
  cityId?: string | null,
): PartyId | null {
  const city = cityOf(stateId, cityId);
  if (!city.capital) {
    const mayor = state.landscape.cityMayors?.[city.id];
    if (mayor) return mayor;
  }
  return state.landscape.mayors[stateId] ?? null;
}

export function setMayorParty(
  state: GameState,
  stateId: StateId,
  cityId: string | null | undefined,
  partyId: PartyId,
): void {
  const city = cityOf(stateId, cityId);
  if (city.capital) state.landscape.mayors[stateId] = partyId;
  else state.landscape.cityMayors = { ...state.landscape.cityMayors, [city.id]: partyId };
}

/**
 * Prefeitos das cidades que não são capitais (sorteio pela força dos partidos no estado), no
 * início do jogo e a cada eleição municipal sem o jogador.
 */
export function rollCityMayors(
  state: Pick<GameState, 'parties' | 'regions'>,
  rng: Rng,
): Record<string, PartyId> {
  const parties = Object.values(state.parties).filter((p) => p.provenance.kind !== 'player');
  const out: Record<string, PartyId> = {};
  for (const city of CITY_SEEDS) {
    if (city.capital) continue;
    const pick = rng.weightedPick(
      parties,
      (p) => (p.popularity * ((state.regions[city.stateId]?.partyStrength[p.id] ?? 50) / 50)) ** 2,
    );
    if (pick) out[city.id] = pick.id;
  }
  return out;
}
