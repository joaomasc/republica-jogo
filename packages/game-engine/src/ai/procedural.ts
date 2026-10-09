import { hashSeed, Rng } from '../core/rng';
import type { AnswerStyle } from '../media/interactions';
import type {
  AIProvider,
  DebateQuestionContext,
  EventDescriptionContext,
  FreeAnswerClassification,
  FreeAnswerContext,
  InterviewQuestionContext,
  NewsContext,
  SpeechFeedbackContext,
} from './provider';

const OPENERS = [
  'Vamos direto ao ponto.',
  'O eleitor quer saber:',
  'Uma pergunta que não quer calar:',
  'Muita gente nos escreveu sobre isso.',
];
const NEWS_LEADS = [
  'Segundo apuração exclusiva,',
  'De acordo com fontes ouvidas pela reportagem,',
  'Em meio à disputa,',
  'Nos bastidores,',
];

const STYLE_KEYWORDS: [AnswerStyle, string[]][] = [
  ['attack', ['culpa', 'mentira', 'adversário', 'corrupto', 'incompetente', 'perseguição', 'eles']],
  [
    'technical',
    ['dados', 'plano', 'meta', 'orçamento', 'estudo', 'percentual', '%', 'gestão', 'técnic'],
  ],
  [
    'empathetic',
    ['família', 'sinto', 'entendo', 'dor', 'cuidar', 'pessoas', 'mãe', 'pai', 'desculp'],
  ],
  ['promise', ['vou', 'prometo', 'compromisso', 'garanto', 'farei', 'vamos']],
  [
    'evasive',
    ['depois', 'estudar', 'momento certo', 'não é hora', 'próxima pergunta', 'sem comentários'],
  ],
];

/**
 * Provedor procedural (padrão): gera textos com modelos e sorteio determinístico.
 * Garante que o jogo funcione 100% sem IA externa.
 */
export class ProceduralAIProvider implements AIProvider {
  readonly name = 'procedural';
  readonly isExternal = false;

  private rng(...parts: (string | number)[]): Rng {
    return new Rng(hashSeed(...parts));
  }

  async generateInterviewQuestion(ctx: InterviewQuestionContext): Promise<string> {
    const r = this.rng(ctx.baseQuestion, ctx.outlet);
    const memory = ctx.hostile && ctx.memories[0] ? ` Lembrando: "${ctx.memories[0]}".` : '';
    return `${r.pick(OPENERS)} ${ctx.baseQuestion}${memory}`;
  }

  async generateNews(ctx: NewsContext): Promise<{ headline: string; body: string }> {
    const r = this.rng(ctx.headline, ctx.date);
    const body =
      ctx.body ||
      `${r.pick(NEWS_LEADS)} o episódio envolvendo ${ctx.candidate.name} (${ctx.candidate.party}) deve repercutir nos próximos dias.`;
    return { headline: ctx.headline, body };
  }

  async generateDebateQuestion(ctx: DebateQuestionContext): Promise<string> {
    return ctx.baseQuestion;
  }

  async generateEventDescription(ctx: EventDescriptionContext): Promise<string> {
    return ctx.description;
  }

  async generateSpeechFeedback(ctx: SpeechFeedbackContext): Promise<string> {
    const words = ctx.speech.trim().split(/\s+/).filter(Boolean).length;
    if (words < 15) return 'Discurso curto demais: faltou desenvolver as propostas.';
    if (words > 250) return 'Discurso longo: a plateia dispersou no meio.';
    return `Discurso bem recebido pelo público de ${ctx.audience}. Tema central: ${ctx.topic}.`;
  }

  async classifyFreeAnswer(ctx: FreeAnswerContext): Promise<FreeAnswerClassification> {
    const text = ctx.answer.toLowerCase();
    let best: AnswerStyle = 'firm';
    let bestScore = 0;
    for (const [style, keywords] of STYLE_KEYWORDS) {
      const score = keywords.reduce((acc, k) => acc + (text.includes(k) ? 1 : 0), 0);
      if (score > bestScore) {
        best = style;
        bestScore = score;
      }
    }
    if (text.length < 25) best = 'evasive';
    return { style: best, summary: ctx.answer.slice(0, 160) };
  }
}
