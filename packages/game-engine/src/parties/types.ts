import type { PartyId, RegionId, StateId } from '../core/types';
import type { IdeologyVector } from '../ideology/axes';
import type { IssueId } from '../ideology/issues';
import type { PopTypeId } from '../population/popTypes';

export const PARTY_SYMBOLS = [
  'star',
  'rose',
  'sun',
  'tree',
  'dove',
  'gear',
  'wheat',
  'bolt',
  'book',
  'shield',
  'torch',
  'compass',
  'anchor',
  'leaf',
  'mountain',
  'flag',
] as const;
export type PartySymbol = (typeof PARTY_SYMBOLS)[number];

export interface PartyFaction {
  id: string;
  name: string;
  /** Deslocamento ideológico da facção em relação à linha do partido. */
  ideologyShift: Partial<IdeologyVector>;
  /** Fração do partido (soma ≈ 1). */
  size: number;
  /** Satisfação da facção (0..100). */
  satisfaction: number;
}

/** Origem dos dados — permite futuramente misturar dados históricos reais e fictícios. */
export interface DataProvenance {
  kind: 'fictional' | 'historical' | 'player';
  source?: string;
  sourceDate?: string;
}

export interface Party {
  id: PartyId;
  name: string;
  acronym: string;
  symbol: PartySymbol;
  color: string;
  ideology: IdeologyVector;
  /** Popularidade nacional (0..100). */
  popularity: number;
  /** Influência institucional (0..100) — tempo de TV, cargos, máquina. */
  influence: number;
  /** Recursos financeiros relativos (0..100). */
  money: number;
  /** Força da militância (0..100). */
  militancy: number;
  unity: number;
  strongRegions: RegionId[];
  weakRegions: RegionId[];
  priorities: IssueId[];
  priorityPopTypes: PopTypeId[];
  factions: PartyFaction[];
  leaderName: string;
  /** Posições explícitas sobre leis (categoria → opção). Se ausente, deriva-se da ideologia. */
  lawPositions: Record<string, string>;
  candidateIds: string[];
  provenance: DataProvenance;
  description: string;
}

export interface PartyStrengthByState {
  stateId: StateId;
  strength: number;
}
