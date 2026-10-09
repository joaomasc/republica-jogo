import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type {
  AIProvider,
  DebateQuestionContext,
  EventDescriptionContext,
  FreeAnswerClassification,
  FreeAnswerContext,
  InterviewQuestionContext,
  NewsContext,
  SpeechFeedbackContext,
} from '@republica/game-engine';
import * as z from 'zod/v4';
import { briefText, SYSTEM_RULES } from './prompts.ts';

const ClassificationSchema = z.object({
  style: z.enum(['firm', 'technical', 'evasive', 'attack', 'empathetic', 'promise']),
  summary: z.string(),
});

const NewsSchema = z.object({ headline: z.string(), body: z.string() });

/**
 * Provedor Anthropic (Claude) via SDK oficial. A chave fica SOMENTE no servidor.
 * Pedidos curtos de redação: esforço baixo; recusas e erros devolvem `null` (o chamador usa o texto procedural).
 */
export class AnthropicAIProvider implements AIProvider {
  readonly name = 'anthropic';
  readonly isExternal = true;
  private readonly client: Anthropic;

  constructor(
    private readonly model: string,
    apiKey?: string,
  ) {
    // Sem apiKey explícita, o SDK resolve as credenciais do ambiente (ANTHROPIC_API_KEY, perfil do `ant`...).
    this.client = new Anthropic(apiKey ? { apiKey } : {});
  }

  private async text(prompt: string): Promise<string> {
    const response = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 4000,
      // Fallback no servidor: se o modelo recusar por política, a API reencaminha a mesma requisição.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: SYSTEM_RULES,
      messages: [{ role: 'user', content: prompt }],
    });
    if (response.stop_reason === 'refusal') throw new Error('Pedido recusado pelo modelo');
    const text = response.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('')
      .trim();
    if (!text) throw new Error('Resposta vazia');
    return text;
  }

  async generateInterviewQuestion(ctx: InterviewQuestionContext): Promise<string> {
    return this.text(
      `Reescreva a pergunta de entrevista abaixo para soar natural na voz de um(a) jornalista do veículo "${ctx.outlet}" (${ctx.interviewType}).
Mantenha exatamente o mesmo tema e intenção${ctx.hostile ? ' (é uma pergunta incômoda: seja firme, mas respeitoso)' : ''}. No máximo 2 frases.
Local: ${ctx.place}. Entrevistado(a): ${briefText(ctx.candidate)}
${ctx.memories.length ? `Fatos que o jornalista pode lembrar: ${ctx.memories.join('; ')}.` : ''}
Pergunta original: ${ctx.baseQuestion}`,
    );
  }

  async generateNews(ctx: NewsContext): Promise<{ headline: string; body: string }> {
    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(NewsSchema) },
      system: SYSTEM_RULES,
      messages: [
        {
          role: 'user',
          content: `Escreva uma manchete (até 12 palavras) e um parágrafo curto (até 3 frases) para esta notícia do jogo, sem acrescentar fatos novos.
Categoria: ${ctx.category}. Data: ${ctx.date}. Envolvido(a): ${briefText(ctx.candidate)}
Manchete base: ${ctx.headline}
Texto base: ${ctx.body || '(sem texto)'}`,
        },
      ],
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output)
      throw new Error('Notícia não gerada');
    return response.parsed_output;
  }

  async generateDebateQuestion(ctx: DebateQuestionContext): Promise<string> {
    return this.text(
      `Reescreva a pergunta do(a) mediador(a) do debate da ${ctx.host}, mantendo o tema "${ctx.topic}". Uma frase, neutra, dirigida a todos os candidatos.
Local: ${ctx.place}. Pergunta original: ${ctx.baseQuestion}`,
    );
  }

  async generateEventDescription(ctx: EventDescriptionContext): Promise<string> {
    return this.text(
      `Reescreva a descrição deste acontecimento do jogo com mais cor narrativa, sem mudar os fatos (até 3 frases).
Categoria: ${ctx.category}. Título: ${ctx.title}. Envolvido(a): ${briefText(ctx.candidate)}
Descrição original: ${ctx.description}`,
    );
  }

  async generateSpeechFeedback(ctx: SpeechFeedbackContext): Promise<string> {
    return this.text(
      `Dê um retorno curto (até 3 frases) de um assessor de comunicação sobre a clareza e o tom deste discurso para o público "${ctx.audience}", tema "${ctx.topic}".
Não preveja votos nem resultados. Orador(a): ${briefText(ctx.candidate)}
Discurso: ${ctx.speech.slice(0, 4000)}`,
    );
  }

  async classifyFreeAnswer(ctx: FreeAnswerContext): Promise<FreeAnswerClassification> {
    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(ClassificationSchema) },
      system: SYSTEM_RULES,
      messages: [
        {
          role: 'user',
          content: `Classifique o ESTILO da resposta do(a) candidato(a) a uma pergunta de entrevista. Estilos possíveis:
firm (posição clara e firme), technical (dados, planos, gestão), evasive (foge do tema), attack (ataca adversários/imprensa), empathetic (acolhe, pede desculpas, fala de pessoas), promise (faz promessas concretas).
Também escreva um resumo neutro de uma frase do que foi dito.
Pergunta: ${ctx.question}
Resposta: ${ctx.answer.slice(0, 2000)}`,
        },
      ],
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output)
      throw new Error('Classificação indisponível');
    return response.parsed_output;
  }
}
