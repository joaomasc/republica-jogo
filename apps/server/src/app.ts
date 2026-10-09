import cors from '@fastify/cors';
import {
  DATA_SOURCE,
  DEFAULT_PARTIES,
  parseEnvelope,
  SaveFormatError,
  STATE_LIST,
  type CandidateBrief,
} from '@republica/game-engine';
import {
  API_ROUTES,
  SLOT_ID_PATTERN,
  type HealthResponse,
  type ReferenceDataResponse,
} from '@republica/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import * as z from 'zod/v4';
import type { AIService } from './ai/index.ts';
import type { SaveRepository } from './repositories/saves.ts';

export interface AppDeps {
  saves: SaveRepository;
  ai: AIService;
  corsOrigin?: string;
  logLevel?: string;
}

const VERSION = '0.1.0';

// Validação leve dos contextos enviados à IA: limita tamanhos para evitar abuso do provedor externo.
const str = (max = 600) => z.string().max(max);
const Brief = z.object({
  name: str(80),
  party: str(120),
  office: str(80),
  ideologySummary: str(120),
  ideology: z.record(z.string(), z.number()),
  background: str(80),
});
const InterviewCtx = z.object({
  outlet: str(120),
  interviewType: str(40),
  topic: str(80),
  hostile: z.boolean(),
  place: str(120),
  candidate: Brief,
  memories: z.array(str(200)).max(5),
  baseQuestion: str(600),
});
const NewsCtx = z.object({
  headline: str(200),
  body: str(1200),
  category: str(40),
  sentiment: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  candidate: Brief,
  date: str(20),
});
const DebateCtx = z.object({
  host: str(80),
  topic: str(80),
  place: str(120),
  candidates: z.array(Brief).max(8),
  baseQuestion: str(600),
});
const EventCtx = z.object({
  title: str(200),
  description: str(1200),
  category: str(40),
  candidate: Brief,
});
const SpeechCtx = z.object({
  speech: str(5000),
  topic: str(80),
  candidate: Brief,
  audience: str(120),
});
const FreeAnswerCtx = z.object({ question: str(600), answer: str(2000), candidate: Brief });

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: deps.logLevel ? { level: deps.logLevel } : false,
    bodyLimit: 20 * 1024 * 1024,
  });
  await app.register(cors, {
    origin: deps.corsOrigin === '*' || !deps.corsOrigin ? true : deps.corsOrigin.split(','),
  });

  app.get(API_ROUTES.health, async (): Promise<HealthResponse> => ({
    ok: true,
    version: VERSION,
    database: deps.saves.kind,
    ai: deps.ai.status(),
  }));

  /* ───────── Saves ───────── */

  app.get(API_ROUTES.saves, async () => ({ saves: await deps.saves.list() }));

  app.get<{ Params: { slotId: string } }>('/api/saves/:slotId', async (req, reply) => {
    if (!SLOT_ID_PATTERN.test(req.params.slotId))
      return reply.code(400).send({ error: 'slotId inválido' });
    const envelope = await deps.saves.read(req.params.slotId);
    if (!envelope) return reply.code(404).send({ error: 'Save não encontrado' });
    return { envelope };
  });

  app.put<{ Params: { slotId: string }; Body: { envelope?: unknown } }>(
    '/api/saves/:slotId',
    async (req, reply) => {
      if (!SLOT_ID_PATTERN.test(req.params.slotId))
        return reply.code(400).send({ error: 'slotId inválido' });
      try {
        const envelope = parseEnvelope(req.body?.envelope);
        await deps.saves.write(req.params.slotId, envelope);
        return reply.code(204).send();
      } catch (error) {
        if (error instanceof SaveFormatError || error instanceof SyntaxError)
          return reply.code(400).send({ error: error.message });
        throw error;
      }
    },
  );

  app.delete<{ Params: { slotId: string } }>('/api/saves/:slotId', async (req, reply) => {
    if (!SLOT_ID_PATTERN.test(req.params.slotId))
      return reply.code(400).send({ error: 'slotId inválido' });
    await deps.saves.remove(req.params.slotId);
    return reply.code(204).send();
  });

  /* ───────── IA (somente texto) ───────── */

  app.get(API_ROUTES.aiStatus, async () => deps.ai.status());

  const aiRoute = <S extends z.ZodType>(
    path: string,
    schema: S,
    run: (ctx: z.infer<S>) => ReturnType<AIService['run']>,
  ) => {
    app.post(path, async (req, reply) => {
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'Contexto inválido' });
      const { value, provider } = await run(parsed.data);
      return typeof value === 'string'
        ? { text: value, provider }
        : { ...(value as object), provider };
    });
  };
  const brief = (b: z.infer<typeof Brief>): CandidateBrief => b as CandidateBrief;

  aiRoute(API_ROUTES.aiInterviewQuestion, InterviewCtx, (ctx) =>
    deps.ai.run((p) => p.generateInterviewQuestion({ ...ctx, candidate: brief(ctx.candidate) })),
  );
  aiRoute(API_ROUTES.aiNews, NewsCtx, (ctx) =>
    deps.ai.run((p) => p.generateNews({ ...ctx, candidate: brief(ctx.candidate) })),
  );
  aiRoute(API_ROUTES.aiDebateQuestion, DebateCtx, (ctx) =>
    deps.ai.run((p) => p.generateDebateQuestion({ ...ctx, candidates: ctx.candidates.map(brief) })),
  );
  aiRoute(API_ROUTES.aiEventDescription, EventCtx, (ctx) =>
    deps.ai.run((p) => p.generateEventDescription({ ...ctx, candidate: brief(ctx.candidate) })),
  );
  aiRoute(API_ROUTES.aiSpeechFeedback, SpeechCtx, (ctx) =>
    deps.ai.run((p) => p.generateSpeechFeedback({ ...ctx, candidate: brief(ctx.candidate) })),
  );
  aiRoute(API_ROUTES.aiClassifyAnswer, FreeAnswerCtx, (ctx) =>
    deps.ai.run((p) => p.classifyFreeAnswer({ ...ctx, candidate: brief(ctx.candidate) })),
  );

  /* ───────── Dados de referência ───────── */

  app.get(API_ROUTES.reference, async (): Promise<ReferenceDataResponse> => ({
    parties: DEFAULT_PARTIES.map((p) => ({
      id: p.id,
      name: p.name,
      acronym: p.acronym,
      provenance: p.provenance.kind,
    })),
    states: STATE_LIST.map((s) => ({ id: s.id, name: s.name, population: s.population })),
    source: { ...DATA_SOURCE },
  }));

  return app;
}
