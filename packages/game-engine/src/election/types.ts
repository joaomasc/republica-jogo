import type { CandidateId, IsoDate, PartyId, PopId, StateId, UnitId } from '../core/types';
import type { IdeologyVector } from '../ideology/axes';
import type { IssueId } from '../ideology/issues';
import type { PopTypeId } from '../population/popTypes';
import type { Jurisdiction, OfficeId } from './offices';

export interface UnitPop {
  popId: PopId;
  voters: number;
}

export type ZoneDirection = 'n' | 's' | 'l' | 'o';

/** Unidade territorial de apuração: um estado (eleição nacional) ou uma zona (estadual/municipal). */
export interface ElectoralUnit {
  id: UnitId;
  name: string;
  stateId: StateId;
  kind: 'state' | 'zone';
  zone?: { type: 'capital' | 'metro' | 'sector' | 'center'; direction?: ZoneDirection };
  voters: number;
  pops: UnitPop[];
}

/** Situação de campanha de um candidato numa eleição (jogador ou NPC). */
export type RivalStyle = 'populist' | 'technocrat' | 'attacker' | 'machine' | 'digital';

export interface RivalTactic {
  kind: 'attack' | 'contest' | 'trend' | 'base';
  /** Alvo do ataque. */
  targetId?: CandidateId;
  /** Regiões disputadas. */
  units?: UnitId[];
}

export interface CampaignStatus {
  candidateId: CandidateId;
  partyId: PartyId;
  /** Conhecimento do nome por unidade (0..100). */
  knowledge: Record<UnitId, number>;
  /** Presença de campanha (corpo a corpo, estrutura) por unidade (0..100). */
  presence: Record<UnitId, number>;
  /** Persuasão acumulada por unidade (-50..50). */
  regionalMomentum: Record<UnitId, number>;
  /** Persuasão acumulada por grupo demográfico (-50..50). */
  popMomentum: Record<PopTypeId, number>;
  /** Como o eleitorado percebe as posições do candidato. */
  perceivedIdeology: IdeologyVector;
  /** Ênfase em temas (0..100), vinda de propostas e discursos. */
  issueFocus: Partial<Record<IssueId, number>>;
  /** Modificador aditivo de rejeição (pontos percentuais). */
  rejectionMod: number;
  debateScore: number;
  /** Orçamento de campanha (usado pelos NPCs; o do jogador fica em `campaign.money`). */
  money: number;
  isIncumbent: boolean;
  /** NPC: agressividade (0..1) e unidades prioritárias. */
  aggressiveness: number;
  focusUnits: UnitId[];
  /** Campanha dinâmica: estilo do rival e tática da semana. */
  style?: RivalStyle;
  tactic?: RivalTactic | null;
  /** Candidaturas proporcionais: nome de urna para exibição. */
  eliminated: boolean;
}

export interface PollResultSet {
  shares: Record<CandidateId, number>;
  undecided: number;
  blankNull: number;
}

export interface Poll {
  id: string;
  date: IsoDate;
  round: 1 | 2;
  pollster: string;
  kind: 'public' | 'internal';
  sampleSize: number;
  marginOfError: number;
  total: PollResultSet;
  rejection: Record<CandidateId, number>;
  knowledge: Record<CandidateId, number>;
  byRegion?: Record<string, PollResultSet>;
  /** Estimativas por unidade do mapa (subamostras pequenas = erro maior). */
  byUnit?: Record<string, PollResultSet>;
  byPopType?: Partial<Record<PopTypeId, PollResultSet>>;
  /** Simulações de 2º turno (apenas em pesquisas de 1º turno com runoff). */
  runoffScenarios?: { a: CandidateId; b: CandidateId; aShare: number; bShare: number }[];
  /** Segmentos do eleitorado em relação ao jogador (apenas pesquisa interna). */
  playerSegments?: VoterSegments;
}

export interface VoterSegments {
  loyal: number;
  sympathizers: number;
  independents: number;
  undecided: number;
  antiCandidate: number;
  abstention: number;
}

export interface ScheduledDebate {
  id: string;
  date: IsoDate;
  round: 1 | 2;
  host: string;
  status: 'scheduled' | 'done' | 'declined';
  participantIds: CandidateId[];
  winnerId?: CandidateId;
  playerScore?: number;
}

export interface UnitResult {
  votes: Record<CandidateId, number>;
  validVotes: number;
  turnoutRate: number;
  winnerId: CandidateId | null;
  partyVotes?: Record<PartyId, number>;
}

export interface ProportionalListEntry {
  name: string;
  partyId: PartyId;
  votes: number;
  elected: boolean;
  candidateId?: CandidateId;
}

export interface ProportionalOutcome {
  seats: number;
  partyVotes: Record<PartyId, number>;
  partySeats: Record<PartyId, number>;
  playerVotes: number;
  playerRankInParty: number;
  playerPartySeats: number;
  cutLine: number;
  playerElected: boolean;
  topList: ProportionalListEntry[];
}

export interface ElectionResult {
  round: 1 | 2;
  date: IsoDate;
  seed: number;
  totalVoters: number;
  turnout: number;
  turnoutRate: number;
  blankNull: number;
  validVotes: number;
  votes: Record<CandidateId, number>;
  pct: Record<CandidateId, number>;
  ranking: CandidateId[];
  byUnit: Record<UnitId, UnitResult>;
  byPopType: Partial<Record<PopTypeId, Record<CandidateId, number>>>;
  winnerId: CandidateId | null;
  runoff: [CandidateId, CandidateId] | null;
  proportional?: ProportionalOutcome;
  playerElected: boolean;
}

export interface Election {
  id: string;
  /** Pauta da semana (campanha dinâmica): tema que favorece quem dá ênfase a ele. */
  trend?: IssueId | null;
  officeId: OfficeId;
  year: number;
  jurisdiction: Jurisdiction;
  round: 1 | 2;
  startDate: IsoDate;
  date: IsoDate;
  firstRoundDate: IsoDate;
  campaignDays: number;
  roundStartDate: IsoDate;
  units: ElectoralUnit[];
  totalVoters: number;
  /** Candidatos ainda na disputa (no 2º turno, apenas dois). */
  candidateIds: CandidateId[];
  participants: Record<CandidateId, CampaignStatus>;
  polls: Poll[];
  debates: ScheduledDebate[];
  results: ElectionResult[];
  seats: number;
  status: 'campaign' | 'election_day' | 'finished';
  outcome: { won: boolean; pct: number; round: 1 | 2 } | null;
  /** Ideologia agregada do eleitorado (útil para IA e notícias). */
  electorateIdeology: IdeologyVector;
}
