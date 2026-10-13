import type { IsoDate, PartyId, StateId } from '../core/types';
import type { OfficeId } from '../election/offices';
import type { TermEvaluation } from '../government/types';
import type { OccupationId } from './occupations';

export interface OfficeRecord {
  officeId: OfficeId;
  jurisdictionLabel: string;
  start: IsoDate;
  end: IsoDate | null;
  termNumber: number;
}

export interface ElectionRecord {
  year: number;
  officeId: OfficeId;
  jurisdictionLabel: string;
  round: 1 | 2;
  won: boolean;
  pct: number;
  partyId: PartyId;
}

/** Eleição que o jogador está preparando na entressafra. */
export interface InterludeTarget {
  officeId: OfficeId;
  stateId: StateId;
  /** Cidade (código IBGE) nas disputas municipais; null = capital. */
  cityId: string | null;
  year: number;
}

export interface InterludeChange {
  label: string;
  before: number;
  after: number;
  /** Formato: pontos (''), percentual do caixa inicial ('%'). */
  unit: '' | '%';
}

/** Resumo de um bloco da entressafra (o que mudou até o marco). */
export interface InterludeSummary {
  from: IsoDate;
  to: IsoDate;
  milestone: string;
  changes: InterludeChange[];
  notes: string[];
}

/** Entressafra jogável: alvo, recursos da pré-campanha e histórico dos blocos. */
export interface InterludeState {
  startedOn: IsoDate;
  target: InterludeTarget | null;
  /** Base eleitoral (0..100) no lugar do alvo: vira presença e conhecimento na campanha. */
  base: number;
  /** Onde a base foi construída ("municipal:BA:2927408"). */
  baseKey: string | null;
  /** Caixa da pré-campanha, como fração do caixa inicial (0,2 = +20%). */
  warChest: number;
  /** Partidos com apoio fechado (coligação: não lançam candidato e transferem eleitores). */
  allies: PartyId[];
  /** A preparação deste bloco já foi feita. */
  prepDone: boolean;
  /** Mais recente primeiro. */
  summaries: InterludeSummary[];
}

export interface CareerState {
  offices: OfficeRecord[];
  elections: ElectionRecord[];
  partyHistory: { partyId: PartyId; from: IsoDate }[];
  /** Mandatos consecutivos no cargo atual (para limite de reeleição). */
  consecutiveTerms: number;
  lastOfficeId: OfficeId | null;
  /** Reputação geral (0..100): pesa no fundo partidário e nas alianças. */
  reputation: number;
  lastEvaluation: TermEvaluation | null;
  retired: boolean;
  /** Inelegível (Ficha Limpa) até este ano, inclusive. */
  ineligibleUntil?: number;
  /** Ocupação fora do cargo (entressafra). */
  occupation?: OccupationId | null;
  /** Entressafra em andamento (ausente em saves antigos e fora da fase de carreira). */
  interlude?: InterludeState | null;
}
