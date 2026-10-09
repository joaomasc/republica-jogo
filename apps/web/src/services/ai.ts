import {
  candidateBrief,
  interviewQuestionContext,
  ProceduralAIProvider,
  type AnswerStyle,
  type FreeAnswerClassification,
  type GameState,
  type InterviewQuestion,
  type InterviewSession,
} from '@republica/game-engine';
import { API_ROUTES, type AIClassifyResponse, type AITextResponse } from '@republica/shared';
import { useSettings } from '../store/settingsStore';

/**
 * Cliente de IA do navegador. Nunca contém chaves de API: quando o modo "servidor" está ativo,
 * delega ao backend (que guarda a chave). Em qualquer falha, cai no provedor procedural local.
 * A IA só produz TEXTO — os efeitos continuam sendo calculados pelo motor.
 */
const local = new ProceduralAIProvider();

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`IA indisponível (${res.status})`);
  return (await res.json()) as T;
}

function serverModeEnabled(): boolean {
  return useSettings.getState().aiMode === 'server';
}

export async function rewriteInterviewQuestion(
  state: GameState,
  session: InterviewSession,
  question: InterviewQuestion,
): Promise<string> {
  const ctx = interviewQuestionContext(state, session, question);
  if (serverModeEnabled()) {
    try {
      return (await post<AITextResponse>(API_ROUTES.aiInterviewQuestion, ctx)).text;
    } catch {
      /* fallback local */
    }
  }
  return local.generateInterviewQuestion(ctx);
}

export async function classifyFreeAnswer(
  state: GameState,
  question: string,
  answer: string,
): Promise<FreeAnswerClassification & { provider: string }> {
  const ctx = { question, answer, candidate: candidateBrief(state) };
  if (serverModeEnabled()) {
    try {
      return await post<AIClassifyResponse>(API_ROUTES.aiClassifyAnswer, ctx);
    } catch {
      /* fallback local */
    }
  }
  return { ...(await local.classifyFreeAnswer(ctx)), provider: 'procedural' };
}

export const ANSWER_STYLE_LABELS: Record<AnswerStyle, string> = {
  firm: 'Firme',
  technical: 'Técnica',
  evasive: 'Evasiva',
  attack: 'Ataque',
  empathetic: 'Empática',
  promise: 'Promessa',
};
