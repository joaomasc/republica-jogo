import type { PartyId, PopId, StateId } from '../core/types';
import type { IdeologyVector } from '../ideology/axes';
import type { IssueId } from '../ideology/issues';
import type { PopTypeId } from './popTypes';

/** Grupo agregado de eleitores (tipo × estado). Não simulamos indivíduos. */
export interface Pop {
  id: PopId;
  typeId: PopTypeId;
  stateId: StateId;
  /** Número de eleitores. */
  size: number;
  income: number;
  education: number;
  avgAge: number;
  ideology: IdeologyVector;
  priorities: Record<IssueId, number>;
  turnout: number;
  /** Identificação partidária (0..1, soma < 1). */
  partyAffinity: Record<PartyId, number>;
  /** Satisfação com a situação atual (0..100). */
  satisfaction: number;
  /** Humor de curto prazo (-1..1), alterado por eventos. */
  mood: number;
  problems: IssueId[];
  /** Padrão de vida (0..100; 50 = referência do início da partida). Calculado pela economia industrial. */
  sol?: number;
  /** Composição da renda no último mês (R$/mês por pessoa). */
  incomeBreakdown?: { wages: number; dividends: number; transfers: number; informal: number };
}

export interface PopulationState {
  pops: Record<PopId, Pop>;
  totalVoters: number;
  /** Escala aplicada ao tamanho da população (sandbox). */
  scale: number;
}

export interface RegionState {
  id: StateId;
  unemployment: number;
  income: number;
  growth: number;
  /** Força de cada partido no estado (50 = média nacional). */
  partyStrength: Record<PartyId, number>;
  /** Partido que governa o estado (NPC). */
  governorPartyId: PartyId;
  problems: IssueId[];
  /** Ideologia agregada dos eleitores do estado. */
  ideology: IdeologyVector;
}
