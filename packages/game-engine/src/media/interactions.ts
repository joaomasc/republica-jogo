import type { CandidateId } from '../core/types';
import type { IdeologyVector } from '../ideology/axes';
import type { IssueId } from '../ideology/issues';
import type { PopTypeId } from '../population/popTypes';

export const DEBATE_STRATEGIES = [
  'technical',
  'popular',
  'aggressive',
  'conciliatory',
  'emotional',
  'evasive',
] as const;
export type DebateStrategy = (typeof DEBATE_STRATEGIES)[number];

export type DebateStage = 'answer' | 'attack' | 'reply' | 'counter' | 'finished';

export interface DebateExchange {
  round: number;
  stage: DebateStage;
  speakerId: CandidateId;
  targetId?: CandidateId;
  text: string;
  strategy?: DebateStrategy;
  score?: number;
}

export interface DebateSession {
  id: string;
  debateId: string;
  host: string;
  participants: CandidateId[];
  topics: (IssueId | 'record')[];
  currentRound: number;
  totalRounds: number;
  stage: DebateStage;
  /** Quem ataca nesta rodada (o jogador ataca nas rodadas ímpares). */
  attackerId: CandidateId | null;
  defenderId: CandidateId | null;
  /** Texto que o jogador precisa responder agora. */
  prompt: string;
  scores: Record<CandidateId, number>;
  log: DebateExchange[];
  /** Impacto acumulado no jogador. */
  popImpact: Partial<Record<PopTypeId, number>>;
  rejectionImpact: number;
  credibilityImpact: number;
  enthusiasmImpact: number;
}

export const INTERVIEW_TYPES = [
  'tv',
  'radio',
  'newspaper',
  'podcast',
  'street',
  'press_conference',
] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export type AnswerStyle = 'firm' | 'technical' | 'evasive' | 'attack' | 'empathetic' | 'promise';

export interface InterviewAnswer {
  id: string;
  text: string;
  style: AnswerStyle;
  ideologyShift?: Partial<IdeologyVector>;
  issue?: IssueId;
  /** Proposta que vira promessa ao ser escolhida. */
  proposalId?: string;
}

export interface InterviewQuestion {
  id: string;
  topic: string;
  issue?: IssueId;
  text: string;
  /** Pergunta sobre um ponto fraco (escândalo, promessa, crise). */
  hostile: boolean;
  answers: InterviewAnswer[];
}

export interface InterviewResult {
  questionId: string;
  answerId: string;
  score: number;
  summary: string;
}

export interface InterviewSession {
  id: string;
  type: InterviewType;
  outlet: string;
  host: string;
  questions: InterviewQuestion[];
  index: number;
  results: InterviewResult[];
  finished: boolean;
}

export interface InteractionsState {
  debate: DebateSession | null;
  interview: InterviewSession | null;
}
