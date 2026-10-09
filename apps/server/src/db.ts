import { PrismaPg } from '@prisma/adapter-pg';
import type { FastifyBaseLogger } from 'fastify';
import { PrismaClient } from './generated/prisma/client.ts';
import {
  MemorySaveRepository,
  PrismaSaveRepository,
  type SaveRepository,
} from './repositories/saves.ts';

/**
 * Conecta ao PostgreSQL se houver DATABASE_URL. Se o banco estiver indisponível,
 * cai para armazenamento em memória — o jogo nunca depende do banco para funcionar.
 */
export async function createSaveRepository(
  databaseUrl: string | undefined,
  log: FastifyBaseLogger,
): Promise<{ repository: SaveRepository; close: () => Promise<void> }> {
  if (!databaseUrl) {
    log.warn('DATABASE_URL não definida: saves do servidor ficarão em memória.');
    return { repository: new MemorySaveRepository(), close: async () => undefined };
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    await prisma.$queryRaw`SELECT 1`;
    log.info('Conectado ao PostgreSQL.');
    return { repository: new PrismaSaveRepository(prisma), close: () => prisma.$disconnect() };
  } catch (error) {
    log.warn({ err: error }, 'PostgreSQL indisponível: usando armazenamento em memória.');
    await prisma.$disconnect().catch(() => undefined);
    return { repository: new MemorySaveRepository(), close: async () => undefined };
  }
}
