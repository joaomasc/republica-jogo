import type { IsoDate, PartyId } from '../core/types';
import type { OfficeId } from '../election/offices';
import type { TermEvaluation } from '../government/types';

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

export interface CareerState {
  offices: OfficeRecord[];
  elections: ElectionRecord[];
  partyHistory: { partyId: PartyId; from: IsoDate }[];
  /** Mandatos consecutivos no cargo atual (para limite de reeleição). */
  consecutiveTerms: number;
  lastOfficeId: OfficeId | null;
  /** Reputação geral (0..100). */
  reputation: number;
  lastEvaluation: TermEvaluation | null;
  retired: boolean;
}
