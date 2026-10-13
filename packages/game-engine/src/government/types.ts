import type { RunningMate } from '../campaign/runningMate';
import type { ObjectivesState } from './objectives';
import type { Effect } from '../events/types';
import type { IssueId } from '../ideology/issues';
import type { IsoDate } from '../core/types';
import type { BudgetState } from '../economy/types';
import type { Jurisdiction, OfficeId } from '../election/offices';
import type { Minister } from '../politics/types';

export interface GovernmentState {
  officeId: OfficeId;
  jurisdiction: Jurisdiction;
  branch: 'executive' | 'legislative';
  startDate: IsoDate;
  endDate: IsoDate;
  termNumber: number;
  approval: number;
  approvalHistory: { date: IsoDate; value: number }[];
  politicalCapital: number;
  /** Executivo: orçamento da esfera governada. */
  budget: BudgetState | null;
  ministers: Minister[];
  stability: number;
  monthsInOffice: number;
  /** Projetos aprovados de autoria do jogador. */
  billsPassed: number;
  /** Votações do jogador como legislador. */
  votesCast: number;
  partyLoyalty: number;
  /** Desgaste acumulado do governo (pontos tirados da aprovação-alvo). Ausente em saves antigos. */
  wear?: number;
  /** Objetivos do mandato (oferecidos e escolhidos). */
  objectives?: ObjectivesState;
  /** Cartas do gabinete já escolhidas (chaves). */
  decisions?: string[];
  /** Houve greve de servidores neste mandato. */
  hadServantsStrike?: boolean;
  /** Cassação decidida: o mandato acaba no próximo dia (motivo). */
  removal?: string | null;
  /** Vice eleito na chapa (governo executivo). */
  vice?: RunningMate | null;
  /** Reunião de gabinete do mês (governo executivo). */
  cabinet?: CabinetMeeting | null;
  /** O que moveu a aprovação, com causa (mais recente primeiro). Ausente em saves antigos. */
  approvalImpact?: ApprovalImpactEntry[];
  /** Soma de tudo o que já foi registrado em `approvalImpact` (para conferir a cobertura). */
  approvalCum?: number;
  /** Composição do alvo da aprovação no último mês ("para onde a aprovação está indo"). */
  approvalTarget?: ApprovalTarget;
}

export type ApprovalCauseKind =
  | 'satisfaction'
  | 'honeymoon'
  | 'wear'
  | 'scandal'
  | 'deficit'
  | 'record'
  | 'decision'
  | 'event'
  | 'street'
  | 'congress'
  | 'works'
  | 'cabinet'
  | 'other';

export interface ApprovalImpactEntry {
  date: IsoDate;
  kind: ApprovalCauseKind;
  label: string;
  /** Pontos de aprovação. */
  delta: number;
}

export interface ApprovalTargetPart {
  label: string;
  value: number;
  /** Sub-itens (ex.: a satisfação da população por desemprego, serviços, leis). */
  parts?: { label: string; value: number }[];
}

export interface ApprovalTarget {
  date: IsoDate;
  target: number;
  parts: ApprovalTargetPart[];
}

export interface CabinetCard {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  /** Probabilidade de dar certo (1 = garantido). */
  chance: number;
  effects: Effect[];
  failure?: Effect[];
}

/** Reunião mensal de gabinete: balanço, pauta do mês, oposição e 3 cartas de decisão. */
export interface CabinetMeeting {
  date: IsoDate;
  /** Mês de mandato (1, 2, ...). */
  index: number;
  trend: IssueId;
  opposition: string;
  briefing: {
    approval: number;
    approvalDelta: number;
    balance: number;
    wear: number;
    worksActive: number;
    monthsLeft: number;
    /** Repasses voluntários do mês (governador/presidente). */
    transfers?: number;
  };
  cards: CabinetCard[];
  pending: boolean;
  outcome: { cardId: string | null; success: boolean; details: string[] } | null;
}

export interface TermEvaluation {
  officeId: OfficeId;
  endDate: IsoDate;
  approval: number;
  promisesTotal: number;
  promisesFulfilled: number;
  promisesPartial: number;
  promisesBroken: number;
  fulfillmentRate: number;
  economySummary: string;
  reputationDelta: number;
  canRunForReelection: boolean;
  /** Objetivos do mandato e se foram cumpridos. */
  objectives?: { id: string; title: string; done: boolean }[];
}
