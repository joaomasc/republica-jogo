import {
  ProceduralAIProvider,
  type AIProvider,
  type DebateQuestionContext,
  type EventDescriptionContext,
  type FreeAnswerClassification,
  type FreeAnswerContext,
  type InterviewQuestionContext,
  type NewsContext,
  type SpeechFeedbackContext,
} from '@republica/game-engine';
import { briefText, SYSTEM_RULES } from './prompts.ts';

/**
 * Provedor genérico para APIs compatíveis com o formato "chat/completions"
 * (OpenAI, ou modelos locais via Ollama / LM Studio). Usado apenas para redação de textos.
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly name = 'openai-compatible';
  readonly isExternal = true;
  private readonly local = new ProceduralAIProvider();

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly apiKey?: string,
  ) {}

  private async text(prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_RULES },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Provedor respondeu ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Resposta vazia');
    return text;
  }

  generateInterviewQuestion(ctx: InterviewQuestionContext): Promise<string> {
    return this.text(
      `Reescreva esta pergunta de entrevista do veículo "${ctx.outlet}" mantendo o tema (máx. 2 frases). Entrevistado(a): ${briefText(ctx.candidate)}\nPergunta: ${ctx.baseQuestion}`,
    );
  }

  async generateNews(ctx: NewsContext): Promise<{ headline: string; body: string }> {
    const body = await this.text(
      `Escreva um parágrafo curto (até 3 frases) para a notícia "${ctx.headline}", sem acrescentar fatos. Texto base: ${ctx.body || '(sem texto)'}`,
    );
    return { headline: ctx.headline, body };
  }

  generateDebateQuestion(ctx: DebateQuestionContext): Promise<string> {
    return this.text(
      `Reescreva a pergunta do mediador (uma frase, neutra), tema "${ctx.topic}": ${ctx.baseQuestion}`,
    );
  }

  generateEventDescription(ctx: EventDescriptionContext): Promise<string> {
    return this.text(
      `Reescreva com mais cor narrativa, sem mudar os fatos (até 3 frases): ${ctx.description}`,
    );
  }

  generateSpeechFeedback(ctx: SpeechFeedbackContext): Promise<string> {
    return this.text(
      `Dê um retorno curto (até 3 frases) sobre clareza e tom deste discurso para "${ctx.audience}": ${ctx.speech.slice(0, 4000)}`,
    );
  }

  // Classificação estruturada é delegada à heurística local neste provedor genérico.
  classifyFreeAnswer(ctx: FreeAnswerContext): Promise<FreeAnswerClassification> {
    return this.local.classifyFreeAnswer(ctx);
  }
}
