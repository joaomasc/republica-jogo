import { createEnvelope } from '@republica/game-engine';
import { API_ROUTES } from '@republica/shared';
import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAIService } from '../src/ai/index.ts';
import { buildApp } from '../src/app.ts';
import { loadConfig, resolveAIProvider } from '../src/config.ts';
import { MemorySaveRepository } from '../src/repositories/saves.ts';
import { newGame } from '../../../packages/game-engine/tests/helpers.ts';

const silent = pino({ level: 'silent' });
const brief = {
  name: 'Ana Lima',
  party: 'UDC',
  office: 'Presidente',
  ideologySummary: 'Centro',
  ideology: { economy: 50 },
  background: 'Advogada',
};

describe('API do servidor', () => {
  const config = loadConfig({ AI_PROVIDER: 'procedural' });
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp({
      saves: new MemorySaveRepository(),
      ai: createAIService(config, silent),
    });
  });
  afterAll(async () => {
    await app.close();
  });

  it('health informa banco e provedor de IA', async () => {
    const res = await app.inject({ method: 'GET', url: API_ROUTES.health });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      ok: true,
      database: 'memory',
      ai: { provider: 'procedural', external: false },
    });
  });

  it('CRUD de saves', async () => {
    const state = newGame('prefeito', 'PE', 3);
    const envelope = createEnvelope(state, '2026-10-01T00:00:00Z');
    const put = await app.inject({
      method: 'PUT',
      url: API_ROUTES.save('slot-a'),
      payload: { envelope },
    });
    expect(put.statusCode).toBe(204);
    const list = await app.inject({ method: 'GET', url: API_ROUTES.saves });
    expect(list.json().saves).toHaveLength(1);
    const get = await app.inject({ method: 'GET', url: API_ROUTES.save('slot-a') });
    expect(get.json().envelope.state).toEqual(state);
    const del = await app.inject({ method: 'DELETE', url: API_ROUTES.save('slot-a') });
    expect(del.statusCode).toBe(204);
    expect((await app.inject({ method: 'GET', url: API_ROUTES.save('slot-a') })).statusCode).toBe(
      404,
    );
  });

  it('rejeita saves inválidos e ids malformados', async () => {
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: API_ROUTES.save('slot-b'),
          payload: { envelope: { format: 'x' } },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await app.inject({ method: 'GET', url: '/api/saves/../etc' })).statusCode,
    ).toBeGreaterThanOrEqual(400);
  });

  it('IA procedural gera perguntas e classifica respostas livres sem chave externa', async () => {
    const q = await app.inject({
      method: 'POST',
      url: API_ROUTES.aiInterviewQuestion,
      payload: {
        outlet: 'TV Horizonte',
        interviewType: 'tv',
        topic: 'Saúde',
        hostile: false,
        place: 'Brasil',
        candidate: brief,
        memories: [],
        baseQuestion: 'Qual sua proposta para a saúde?',
      },
    });
    expect(q.statusCode).toBe(200);
    expect(q.json().text).toContain('saúde');
    const c = await app.inject({
      method: 'POST',
      url: API_ROUTES.aiClassifyAnswer,
      payload: {
        question: 'E a saúde?',
        answer: 'Vamos investir com metas, dados e um plano de gestão claro.',
        candidate: brief,
      },
    });
    expect(c.json()).toMatchObject({ style: 'technical', provider: 'procedural' });
  });

  it('valida o contexto enviado à IA', async () => {
    const res = await app.inject({
      method: 'POST',
      url: API_ROUTES.aiNews,
      payload: { headline: 'x' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('dados de referência indicam fonte e partidos fictícios', async () => {
    const res = await app.inject({ method: 'GET', url: API_ROUTES.reference });
    const body = res.json();
    expect(body.parties.every((p: { provenance: string }) => p.provenance === 'fictional')).toBe(
      true,
    );
    expect(body.states).toHaveLength(27);
    expect(body.source.demographics).toContain('IBGE');
  });
});

describe('Configuração', () => {
  it('modo auto usa Anthropic apenas quando há chave', () => {
    expect(resolveAIProvider(loadConfig({}))).toBe('procedural');
    expect(resolveAIProvider(loadConfig({ ANTHROPIC_API_KEY: 'sk-test' }))).toBe('anthropic');
  });
});
