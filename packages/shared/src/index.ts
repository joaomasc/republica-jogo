import type { FreeAnswerClassification, SaveEnvelope, SaveSlotInfo } from '@republica/game-engine';

/** Rotas REST do servidor. Mantidas aqui para cliente e servidor nunca divergirem. */
export const API_ROUTES = {
  health: '/api/health',
  saves: '/api/saves',
  save: (slotId: string) => `/api/saves/${encodeURIComponent(slotId)}`,
  aiStatus: '/api/ai/status',
  aiInterviewQuestion: '/api/ai/interview-question',
  aiNews: '/api/ai/news',
  aiDebateQuestion: '/api/ai/debate-question',
  aiEventDescription: '/api/ai/event-description',
  aiSpeechFeedback: '/api/ai/speech-feedback',
  aiClassifyAnswer: '/api/ai/classify-answer',
  reference: '/api/reference',
} as const;

export type DatabaseStatus = 'postgres' | 'memory';

export interface HealthResponse {
  ok: boolean;
  version: string;
  database: DatabaseStatus;
  ai: AIStatusResponse;
}

export interface AIStatusResponse {
  provider: string;
  external: boolean;
  model?: string;
}

export interface SaveListResponse {
  saves: SaveSlotInfo[];
}

export interface SaveWriteRequest {
  envelope: SaveEnvelope;
}

export interface SaveReadResponse {
  envelope: SaveEnvelope;
}

export interface AITextResponse {
  text: string;
  provider: string;
}

export interface AINewsResponse {
  headline: string;
  body: string;
  provider: string;
}

export interface AIClassifyResponse extends FreeAnswerClassification {
  provider: string;
}

export interface ReferenceDataResponse {
  parties: { id: string; name: string; acronym: string; provenance: string }[];
  states: { id: string; name: string; population: number }[];
  source: Record<string, string>;
}

export interface ApiError {
  error: string;
}

export const SLOT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
