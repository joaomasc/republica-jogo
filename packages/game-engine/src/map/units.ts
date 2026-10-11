import { sum } from '../core/math';
import type { Rng } from '../core/rng';
import { STATE_IDS, type StateId } from '../core/types';
import type { OfficeId } from '../election/offices';
import { OFFICES } from '../election/offices';
import type { ElectoralUnit, ZoneDirection } from '../election/types';
import { POP_TYPE_IDS, type PopTypeId } from '../population/popTypes';
import { popId, popsOfState } from '../population/population';
import type { PopulationState } from '../population/types';
import { cityOf } from './cities';
import { STATES } from './states';

type ZoneProfile = Partial<Record<PopTypeId, number>>;

const CAPITAL_PROFILE: ZoneProfile = {
  tech_workers: 1.6,
  civil_servants: 1.4,
  students: 1.3,
  middle_class: 1.3,
  business: 1.3,
  health_workers: 1.3,
  farmers: 0.1,
  industrial_workers: 0.8,
  retirees: 0.9,
};
const METRO_PROFILE: ZoneProfile = {
  industrial_workers: 1.5,
  workers: 1.3,
  unemployed: 1.3,
  farmers: 0.3,
  tech_workers: 0.8,
  business: 0.8,
};
const INTERIOR_PROFILE: ZoneProfile = {
  farmers: 1.8,
  retirees: 1.15,
  merchants: 1.1,
  tech_workers: 0.5,
  civil_servants: 0.8,
  students: 0.8,
  business: 0.8,
};
const CITY_PROFILE: ZoneProfile = {
  farmers: 0.05,
  tech_workers: 1.5,
  civil_servants: 1.3,
  students: 1.2,
  business: 1.2,
  middle_class: 1.2,
  health_workers: 1.2,
};
/** Cidade-polo do interior: mais agro e comércio, menos máquina pública que a capital. */
const REGIONAL_CITY_PROFILE: ZoneProfile = {
  farmers: 0.45,
  merchants: 1.3,
  industrial_workers: 1.15,
  business: 1.1,
  students: 1.1,
  civil_servants: 0.9,
  tech_workers: 0.9,
};
const CITY_ZONE_PROFILES: ZoneProfile[] = [
  {
    middle_class: 1.5,
    tech_workers: 1.6,
    health_workers: 1.3,
    business: 1.3,
    unemployed: 0.6,
    workers: 0.8,
  },
  { workers: 1.3, unemployed: 1.3, retirees: 1.1 },
  { workers: 1.3, unemployed: 1.5, industrial_workers: 1.2, middle_class: 0.7 },
  { industrial_workers: 1.5, workers: 1.2, merchants: 1.1 },
];
const CITY_CENTER_PROFILE: ZoneProfile = {
  business: 1.5,
  civil_servants: 1.4,
  merchants: 1.4,
  middle_class: 1.2,
  unemployed: 0.8,
  students: 1.3,
};

const DIRECTIONS: { dir: ZoneDirection; label: string }[] = [
  { dir: 'n', label: 'Norte' },
  { dir: 's', label: 'Sul' },
  { dir: 'l', label: 'Leste' },
  { dir: 'o', label: 'Oeste' },
];

interface ZoneSpec {
  id: string;
  name: string;
  share: number;
  profile: ZoneProfile;
  zone: NonNullable<ElectoralUnit['zone']>;
}

/** Distribui os eleitores de cada Pop entre as zonas, preservando o total por Pop. */
function distribute(
  population: PopulationState,
  stateId: StateId,
  zones: ZoneSpec[],
  baseProfile: ZoneProfile | null,
  electorateShare: number,
): ElectoralUnit[] {
  const pops = popsOfState(population, stateId);
  const scaled: Record<PopTypeId, number> = {} as Record<PopTypeId, number>;
  for (const pop of pops)
    scaled[pop.typeId] = pop.size * electorateShare * (baseProfile?.[pop.typeId] ?? 1);
  // Mantém o eleitorado total da área após aplicar o perfil (só muda a composição).
  const target = sum(pops.map((p) => p.size)) * electorateShare;
  const current = sum(Object.values(scaled));
  const fix = current > 0 ? target / current : 1;

  const units: ElectoralUnit[] = zones.map((z) => ({
    id: z.id,
    name: z.name,
    stateId,
    kind: 'zone',
    zone: z.zone,
    voters: 0,
    pops: [],
  }));

  for (const typeId of POP_TYPE_IDS) {
    const total = (scaled[typeId] ?? 0) * fix;
    const weights = zones.map((z) => z.share * (z.profile[typeId] ?? 1));
    const wsum = sum(weights);
    zones.forEach((_, i) => {
      const voters = Math.round((total * (weights[i] ?? 0)) / wsum);
      const unit = units[i];
      if (!unit || voters <= 0) return;
      unit.pops.push({ popId: popId(stateId, typeId), voters });
      unit.voters += voters;
    });
  }
  return units;
}

function randomShares(rng: Rng, count: number, total: number, spread = 0.35): number[] {
  const raw = Array.from({ length: count }, () => 1 + rng.range(-spread, spread));
  const s = sum(raw);
  return raw.map((r) => (r / s) * total);
}

export function buildStateZones(
  population: PopulationState,
  stateId: StateId,
  rng: Rng,
): ElectoralUnit[] {
  const s = STATES[stateId];
  if (stateId === 'DF') return buildCityZones(population, stateId, rng, 1);
  const capitalShare = Math.min(0.6, s.capitalPopulation / s.population);
  const metroShare = Math.min(0.2, (1 - capitalShare) * 0.25);
  const interior = 1 - capitalShare - metroShare;
  const sectorShares = randomShares(rng, 4, interior);
  const zones: ZoneSpec[] = [
    {
      id: `${stateId}:capital`,
      name: s.capital,
      share: capitalShare,
      profile: CAPITAL_PROFILE,
      zone: { type: 'capital' },
    },
    {
      id: `${stateId}:metro`,
      name: 'Região Metropolitana',
      share: metroShare,
      profile: METRO_PROFILE,
      zone: { type: 'metro' },
    },
    ...DIRECTIONS.map((d, i) => ({
      id: `${stateId}:${d.dir}`,
      name: `Interior ${d.label}`,
      share: sectorShares[i] ?? interior / 4,
      profile: INTERIOR_PROFILE,
      zone: { type: 'sector' as const, direction: d.dir },
    })),
  ];
  return distribute(population, stateId, zones, null, 1);
}

export function buildCityZones(
  population: PopulationState,
  stateId: StateId,
  rng: Rng,
  electorateShare?: number,
  cityId?: string | null,
): ElectoralUnit[] {
  const s = STATES[stateId];
  const city = cityOf(stateId, cityId);
  const share = electorateShare ?? Math.min(0.95, city.population / s.population);
  const profiles = rng.shuffle(CITY_ZONE_PROFILES);
  const sectorShares = randomShares(rng, 4, 0.88, 0.25);
  const zones: ZoneSpec[] = [
    {
      id: `${stateId}:c:centro`,
      name: 'Centro',
      share: 0.12,
      profile: CITY_CENTER_PROFILE,
      zone: { type: 'center' },
    },
    ...DIRECTIONS.map((d, i) => ({
      id: `${stateId}:c:${d.dir}`,
      name: `Zona ${d.label}`,
      share: sectorShares[i] ?? 0.22,
      profile: profiles[i] ?? {},
      zone: { type: 'sector' as const, direction: d.dir },
    })),
  ];
  return distribute(
    population,
    stateId,
    zones,
    city.capital ? CITY_PROFILE : REGIONAL_CITY_PROFILE,
    share,
  );
}

export function buildNationalUnits(population: PopulationState): ElectoralUnit[] {
  return STATE_IDS.map((stateId) => {
    const pops = popsOfState(population, stateId);
    return {
      id: stateId,
      name: STATES[stateId].name,
      stateId,
      kind: 'state' as const,
      voters: sum(pops.map((p) => p.size)),
      pops: pops.map((p) => ({ popId: p.id, voters: p.size })),
    };
  });
}

export function buildUnits(
  population: PopulationState,
  officeId: OfficeId,
  stateId: StateId,
  rng: Rng,
  cityId?: string | null,
): ElectoralUnit[] {
  switch (OFFICES[officeId].unitsKind) {
    case 'states':
      return buildNationalUnits(population);
    case 'stateZones':
      return buildStateZones(population, stateId, rng);
    case 'cityZones':
      return buildCityZones(population, stateId, rng, undefined, cityId);
  }
}
