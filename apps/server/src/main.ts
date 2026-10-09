import pino from 'pino';
import { createAIService } from './ai/index.ts';
import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createSaveRepository } from './db.ts';

const config = loadConfig();
const log = pino({ level: config.LOG_LEVEL });
const { repository, close } = await createSaveRepository(config.DATABASE_URL, log);
const ai = createAIService(config, log);
const app = await buildApp({
  saves: repository,
  ai,
  corsOrigin: config.CORS_ORIGIN,
  logLevel: config.LOG_LEVEL,
});

const shutdown = async () => {
  await app.close();
  await close();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

await app.listen({ port: config.PORT, host: config.HOST });
