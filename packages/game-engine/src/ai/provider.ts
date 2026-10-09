import type { IdeologyVector } from '../ideology/axes';
import type { AnswerStyle } from '../media/interactions';

/**
 * Abstração de IA generativa.
 *
 * A IA produz APENAS TEXTO (perguntas, notícias, descrições, feedback). Ela nunca decide
 * resultados: votos, efeitos de eventos e pontuações são calculados pelo motor de simulação.
 * Para respostas livres do jogador, a IA apenas CLASSIFICA o texto num estilo que o motor já conhece.
 */
export interface CandidateBrief {
  name: string;
  party: string;
  office: string;
  ideologySummary: string;
  ideology: IdeologyVector;
  background: string;
}

export interface InterviewQuestionContext {
  outlet: string;
  interviewType: string;
  topic: string;
  hostile: boolean;
  place: string;
  candidate: CandidateBrief;
  /** Memória política relevante (escândalos, promessas, vitórias). */
  memories: string[];
  /** Pergunta procedural de base (a IA reescreve preservando o tema). */
  baseQuestion: string;
}

export interface NewsContext {
  headline: string;
  body: string;
  category: string;
  sentiment: -1 | 0 | 1;
  candidate: CandidateBrief;
  date: string;
}

export interface DebateQuestionContext {
  host: string;
  topic: string;
  place: string;
  candidates: CandidateBrief[];
  baseQuestion: string;
}

export interface EventDescriptionContext {
  title: string;
  description: string;
  category: string;
  candidate: CandidateBrief;
}

export interface SpeechFeedbackContext {
  speech: string;
  topic: string;
  candidate: CandidateBrief;
  audience: string;
}

export interface FreeAnswerContext {
  question: string;
  answer: string;
  candidate: CandidateBrief;
}

export interface FreeAnswerClassification {
  style: AnswerStyle;
  /** Resumo neutro do que foi dito (para notícias). */
  summary: string;
  /** Deslocamento ideológico sugerido (o motor limita a magnitude). */
  ideologyShift?: Partial<IdeologyVector>;
}

export interface AIProvider {
  readonly name: string;
  readonly isExternal: boolean;
  generateInterviewQuestion(ctx: InterviewQuestionContext): Promise<string>;
  generateNews(ctx: NewsContext): Promise<{ headline: string; body: string }>;
  generateDebateQuestion(ctx: DebateQuestionContext): Promise<string>;
  generateEventDescription(ctx: EventDescriptionContext): Promise<string>;
  generateSpeechFeedback(ctx: SpeechFeedbackContext): Promise<string>;
  classifyFreeAnswer(ctx: FreeAnswerContext): Promise<FreeAnswerClassification>;
}
