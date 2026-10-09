import { ProceduralAIProvider, type AIProvider } from '@republica/game-engine';
import type { FastifyBaseLogger } from 'fastify';
import { resolveAIProvider, type ServerConfig } from '../config.ts';
import { AnthropicAIProvider } from './anthropic.ts';
import { OpenAICompatibleProvider } from './openaiCompatible.ts';

export interface AIService {
  provider: AIProvider;
  /** Executa no provedor externo; em qualquer erro, usa o procedural (o jogo nunca trava por causa da IA). */
  run<T>(task: (p: AIProvider) => Promise<T>): Promise<{ value: T; provider: string }>;
  status(): { provider: string; external: boolean; model?: string };
}

export function createAIService(config: ServerConfig, log: FastifyBaseLogger): AIService {
  const fallback = new ProceduralAIProvider();
  const kind = resolveAIProvider(config);
  let provider: AIProvider = fallback;
  let model: string | undefined;
  if (kind === 'anthropic') {
    provider = new AnthropicAIProvider(config.ANTHROPIC_MODEL, config.ANTHROPIC_API_KEY);
    model = config.ANTHROPIC_MODEL;
  } else if (kind === 'openai-compatible') {
    if (!config.OPENAI_MODEL) {
      log.warn('AI_PROVIDER=openai-compatible exige OPENAI_MODEL; usando textos procedurais.');
    } else {
      provider = new OpenAICompatibleProvider(
        config.OPENAI_BASE_URL,
        config.OPENAI_MODEL,
        config.OPENAI_API_KEY,
      );
      model = config.OPENAI_MODEL;
    }
  }
  log.info(`Provedor de IA: ${provider.name}${model ? ` (${model})` : ''}`);

  return {
    provider,
    async run(task) {
      if (provider === fallback) return { value: await task(fallback), provider: fallback.name };
      try {
        return { value: await task(provider), provider: provider.name };
      } catch (error) {
        log.warn({ err: error }, 'Falha no provedor de IA; usando texto procedural.');
        return { value: await task(fallback), provider: fallback.name };
      }
    },
    status: () => ({
      provider: provider.name,
      external: provider.isExternal,
      ...(model ? { model } : {}),
    }),
  };
}
