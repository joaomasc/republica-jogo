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
}
