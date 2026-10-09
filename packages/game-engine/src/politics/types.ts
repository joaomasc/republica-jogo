import type { IsoDate, PartyId } from '../core/types';
import type { IdeologyVector } from '../ideology/axes';
import type { IssueId } from '../ideology/issues';
import type { PopTypeId } from '../population/popTypes';

export const INTEREST_GROUP_IDS = [
  'business',
  'workers',
  'agribusiness',
  'unions',
  'civil_servants',
  'youth',
  'retirees',
  'social_movements',
  'industry',
  'tech',
  'commerce',
] as const;
export type InterestGroupId = (typeof INTEREST_GROUP_IDS)[number];

export interface InterestGroup {
  id: InterestGroupId;
  name: string;
  icon: string;
  /** Fração da sociedade representada (0..1). */
  size: number;
  /** Influência política (0..100). */
  influence: number;
  /** Aprovação ao jogador/governo (0..100). */
  approval: number;
  priorities: IssueId[];
  ideology: IdeologyVector;
  relatedPopTypes: PopTypeId[];
  /** Opções de lei preferidas (categoria → opção). */
  preferredLaws: Record<string, string>;
  leaderName: string;
  /** Poder de mobilização/pressão (0..100). */
  power: number;
  /** Peso político derivado da economia e da população (0..1; soma ≈ 1 entre os grupos). */
  clout?: number;
  /** Radicalismo (0..100): acima de ~70 o grupo faz greves, protestos e boicotes. */
  radicalism?: number;
}

export interface Chamber {
  id: string;
  name: string;
  totalSeats: number;
  seats: Record<PartyId, number>;
}

export interface NegotiationLogEntry {
  date: IsoDate;
  partyId: PartyId | null;
  kind: string;
  description: string;
}

export interface Minister {
  portfolio: string;
  name: string;
  partyId: PartyId;
  competence: number;
}

export interface CongressState {
  chambers: Chamber[];
  /** Partidos da base do governo/jogador. */
  coalition: PartyId[];
  /** Relação de cada partido com o jogador (-100..100). */
  relations: Record<PartyId, number>;
  log: NegotiationLogEntry[];
}
