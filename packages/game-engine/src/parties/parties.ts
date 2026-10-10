import { deepClone } from '../core/clone';
import { GameConstants } from '../config/constants';
import { clamp, clamp100, round } from '../core/math';
import type { Rng } from '../core/rng';
import type { PartyId } from '../core/types';
import type { IdeologyVector } from '../ideology/axes';
import { ideologyAffinity, ideologyDistance, shiftIdeology } from '../ideology/ideology';
import type { IssueId } from '../ideology/issues';
import type { PopTypeId } from '../population/popTypes';
import { PARODY_PARTY_SKINS, type WorldId } from '../world/parody';
import { DEFAULT_PARTIES } from './parties.data';
import { REAL_PARTIES, REAL_PARTY_EQUIVALENTS } from './realParties.data';
import type { Party, PartySymbol } from './types';

const C = GameConstants.party;

export function computeUnity(party: Pick<Party, 'factions'>): number {
  let total = 0;
  let size = 0;
  for (const f of party.factions) {
    total += f.satisfaction * f.size;
    size += f.size;
  }
  return size === 0 ? 70 : round(total / size, 1);
}

/**
 * Sementes dos partidos do mundo escolhido. A paródia só troca nome, sigla, cor e líder;
 * o mundo real tem o próprio elenco (os 30 partidos registrados no TSE).
 */
export function partySeeds(world: WorldId = 'fictional'): typeof DEFAULT_PARTIES {
  if (world === 'real') return REAL_PARTIES;
  if (world !== 'parody') return DEFAULT_PARTIES;
  return DEFAULT_PARTIES.map((seed) => {
    const skin = PARODY_PARTY_SKINS[seed.id];
    if (!skin) return seed;
    return {
      ...seed,
      name: skin.name,
      acronym: skin.acronym,
      color: skin.color ?? seed.color,
      symbol: skin.symbol ?? seed.symbol,
      leaderName: skin.leaderName,
      description: skin.description,
    };
  });
}

/** Partido pré-selecionado no assistente de cada mundo (um grande partido de centro). */
export function defaultPartyId(world: WorldId = 'fictional'): PartyId {
  return world === 'real' ? 'mdb' : 'udc';
}

/**
 * Traduz um partido para o mundo escolhido: mantém se já existe lá, troca pelo equivalente
 * real/fictício quando houver, senão cai no padrão do mundo.
 */
export function partyIdForWorld(
  partyId: PartyId | undefined,
  world: WorldId = 'fictional',
): PartyId {
  if (partyId && partySeeds(world).some((p) => p.id === partyId)) return partyId;
  if (partyId && world === 'real' && REAL_PARTY_EQUIVALENTS[partyId])
    return REAL_PARTY_EQUIVALENTS[partyId];
  if (partyId && world !== 'real') {
    const model = Object.entries(REAL_PARTY_EQUIVALENTS).find(([, real]) => real === partyId);
    if (model) return model[0];
  }
  return defaultPartyId(world);
}

export function initParties(world: WorldId = 'fictional'): Record<PartyId, Party> {
  const out: Record<PartyId, Party> = {};
  for (const seed of partySeeds(world)) {
    const party: Party = {
      ...deepClone(seed),
      unity: 0,
      lawPositions: {},
      candidateIds: [],
    };
    party.unity = computeUnity(party);
    out[party.id] = party;
  }
  return out;
}

/**
 * Compatibilidade candidato–partido (0..100): afinidade ideológica com a linha do partido,
 * ponderada pelos eixos que o partido considera prioritários.
 */
export function partyCompatibility(
  candidateIdeology: IdeologyVector,
  party: Pick<Party, 'ideology'>,
): number {
  return round(clamp100(ideologyAffinity(candidateIdeology, party.ideology) ** 1.5 * 100), 0);
}

export function factionIdeology(party: Party, factionIndex: number): IdeologyVector {
  const f = party.factions[factionIndex];
  return f ? shiftIdeology(party.ideology, f.ideologyShift) : party.ideology;
}

/** Reação das facções quando o candidato do partido muda de posição percebida. */
export function factionReaction(party: Party, perceived: IdeologyVector): void {
  party.factions.forEach((faction, i) => {
    const dist = ideologyDistance(perceived, factionIdeology(party, i));
    const target = clamp100(85 - dist * C.factionDistanceFactor * 2);
    faction.satisfaction = clamp100(faction.satisfaction + (target - faction.satisfaction) * 0.1);
  });
  party.unity = computeUnity(party);
}

export function shiftUnity(party: Party, delta: number): void {
  for (const f of party.factions) f.satisfaction = clamp100(f.satisfaction + delta);
  party.unity = computeUnity(party);
}

export interface CreatePartyInput {
  name: string;
  acronym: string;
  color: string;
  symbol: PartySymbol;
  ideology: IdeologyVector;
  priorities: IssueId[];
  priorityPopTypes: PopTypeId[];
  leaderName: string;
  description?: string;
  /** Bandeiras do partido (categoria de lei → opção defendida). */
  lawPositions?: Record<string, string>;
}

export function validatePartyInput(
  input: CreatePartyInput,
  existing: Record<PartyId, Party>,
): string | null {
  if (input.name.trim().length < 3) return 'O nome do partido precisa de ao menos 3 letras.';
  const acronym = input.acronym.trim().toUpperCase();
  if (acronym.length < 2 || acronym.length > 8) return 'A sigla deve ter entre 2 e 8 caracteres.';
  if (Object.values(existing).some((p) => p.acronym.toUpperCase() === acronym))
    return 'Essa sigla já existe.';
  if (input.priorities.length === 0) return 'Escolha ao menos uma prioridade.';
  return null;
}

export function createPartyFromInput(input: CreatePartyInput, id: PartyId): Party {
  const party: Party = {
    id,
    name: input.name.trim(),
    acronym: input.acronym.trim().toUpperCase(),
    symbol: input.symbol,
    color: input.color,
    ideology: { ...input.ideology },
    popularity: GameConstants.career.partyFoundingPopularity,
    influence: 6,
    money: 12,
    militancy: 35,
    unity: 0,
    strongRegions: [],
    weakRegions: [],
    priorities: [...input.priorities],
    priorityPopTypes: [...input.priorityPopTypes],
    factions: [
      { id: 'fundadores', name: 'Fundadores', ideologyShift: {}, size: 1, satisfaction: 85 },
    ],
    leaderName: input.leaderName,
    lawPositions: { ...(input.lawPositions ?? {}) },
    candidateIds: [],
    provenance: { kind: 'player' },
    description: input.description ?? 'Partido fundado pelo jogador.',
  };
  party.unity = computeUnity(party);
  return party;
}

/** Deriva diária da vida partidária: popularidade oscila, unidade tende a se acomodar. */
export function driftParties(parties: Record<PartyId, Party>, rng: Rng, days: number): void {
  for (const party of Object.values(parties)) {
    party.popularity = clamp(
      party.popularity + rng.normal(0, C.popularityDriftSd * Math.sqrt(days / 30)),
      3,
      95,
    );
    for (const f of party.factions)
      f.satisfaction = clamp100(f.satisfaction + (60 - f.satisfaction) * C.unityDecayPerDay * days);
    party.unity = computeUnity(party);
  }
}
