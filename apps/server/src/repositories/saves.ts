import {
  MemorySaveStorage,
  parseEnvelope,
  type SaveEnvelope,
  type SaveSlotInfo,
  type SaveStorage,
} from '@republica/game-engine';
import type { PrismaClient } from '../generated/prisma/client.ts';

export type StorageKind = 'postgres' | 'memory';

export interface SaveRepository extends SaveStorage {
  readonly kind: StorageKind;
}

export class MemorySaveRepository extends MemorySaveStorage implements SaveRepository {
  readonly kind = 'memory' as const;
}

/** Saves no PostgreSQL. O estado completo vai num campo JSON; metadados ficam em colunas para listagem. */
export class PrismaSaveRepository implements SaveRepository {
  readonly kind = 'postgres' as const;

  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<SaveSlotInfo[]> {
    const rows = await this.prisma.saveGame.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { slotId: true, updatedAt: true, summary: true },
    });
    return rows.map((r) => ({
      slotId: r.slotId,
      savedAt: r.updatedAt.toISOString(),
      summary: r.summary as unknown as SaveSlotInfo['summary'],
    }));
  }

  async write(slotId: string, envelope: SaveEnvelope): Promise<void> {
    const data = {
      name: envelope.summary.name,
      playerName: envelope.summary.playerName,
      officeName: envelope.summary.officeName,
      phase: envelope.summary.phase,
      difficulty: envelope.summary.difficulty,
      saveVersion: envelope.version,
      summary: envelope.summary as object,
      state: envelope.state as object,
    };
    await this.prisma.saveGame.upsert({
      where: { slotId },
      create: { slotId, ...data },
      update: data,
    });
  }

  async read(slotId: string): Promise<SaveEnvelope | null> {
    const row = await this.prisma.saveGame.findUnique({ where: { slotId } });
    if (!row) return null;
    return parseEnvelope({
      format: 'republica-save',
      version: row.saveVersion,
      savedAt: row.updatedAt.toISOString(),
      summary: row.summary,
      state: row.state,
    });
  }

  async remove(slotId: string): Promise<void> {
    await this.prisma.saveGame.deleteMany({ where: { slotId } });
  }
}
