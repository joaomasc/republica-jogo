import * as z from 'zod/v4';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3333),
  HOST: z.string().default('0.0.0.0'),
  /** Sem DATABASE_URL, os saves ficam em memória (o jogo continua funcionando). */
  DATABASE_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default('*'),
  /** auto = Anthropic se ANTHROPIC_API_KEY existir; caso contrário, procedural. */
  AI_PROVIDER: z.enum(['auto', 'procedural', 'anthropic', 'openai-compatible']).default('auto'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-opus-5-5'),
  /** Qualquer API compatível com OpenAI (OpenAI, Ollama, LM Studio...). */
  OPENAI_BASE_URL: z.string().default('https://api.openai.com/v1'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type ServerConfig = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) throw new Error(`Configuração inválida: ${parsed.error.message}`);
  return parsed.data;
}

export function resolveAIProvider(
  config: ServerConfig,
): 'procedural' | 'anthropic' | 'openai-compatible' {
  if (config.AI_PROVIDER !== 'auto') return config.AI_PROVIDER;
  return config.ANTHROPIC_API_KEY ? 'anthropic' : 'procedural';
}
