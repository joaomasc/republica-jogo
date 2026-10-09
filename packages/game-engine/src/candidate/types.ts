import type { CandidateId, PartyId, StateId } from '../core/types';
import type { OfficeId } from '../election/offices';
import type { IdeologyVector } from '../ideology/axes';
import type { AvatarConfig } from './appearance';
import type { CandidateAttributes } from './attributes';

export type Gender = 'male' | 'female' | 'nonbinary';

export interface Candidate {
  id: CandidateId;
  firstName: string;
  lastName: string;
  /** Nome de urna. */
  ballotName: string;
  age: number;
  gender: Gender;
  partyId: PartyId;
  homeStateId: StateId;
  appearance: AvatarConfig;
  attributes: CandidateAttributes;
  ideology: IdeologyVector;
  backgroundId: string;
  isPlayer: boolean;
  /** Conhecimento público de base (0..100), persiste entre eleições. */
  fame: number;
  /** Peso acumulado de escândalos (0..100), decai com o tempo. */
  scandal: number;
  /** Cargo que ocupa atualmente (NPCs incumbentes ou o jogador). */
  currentOffice: OfficeId | null;
  bio: string;
  /** Personagem do mundo paródia (chave do elenco). Nunca alvo de eventos de acusação. */
  parodyKey?: string;
  /** Bandeiras: leis que o político defende (categoria → opção). Sem isso, valem as do partido. */
  platform?: Record<string, string>;
}

/** Atributos derivados exibidos na ficha do candidato. */
export interface DerivedAttributes {
  rejection: number;
  publicKnowledge: number;
  trust: number;
  polarization: number;
  militantBase: number;
}
