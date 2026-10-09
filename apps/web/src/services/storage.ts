import {
  parseEnvelope,
  type SaveEnvelope,
  type SaveSlotInfo,
  type SaveStorage,
} from '@republica/game-engine';
import { API_ROUTES, type SaveListResponse, type SaveReadResponse } from '@republica/shared';

const INDEX_KEY = 'republica:saves';
const SLOT_KEY = (slotId: string) => `republica:save:${slotId}`;

function readIndex(): SaveSlotInfo[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as SaveSlotInfo[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(list: SaveSlotInfo[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
}

/** Saves no navegador (protótipo). Mesma interface do armazenamento em PostgreSQL. */
export class LocalStorageSaveStorage implements SaveStorage {
  async list(): Promise<SaveSlotInfo[]> {
    return readIndex().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  async write(slotId: string, envelope: SaveEnvelope): Promise<void> {
    try {
      localStorage.setItem(SLOT_KEY(slotId), JSON.stringify(envelope));
    } catch {
      throw new Error('Sem espaço no navegador para salvar. Apague saves antigos.');
    }
    const list = readIndex().filter((s) => s.slotId !== slotId);
    list.push({ slotId, savedAt: envelope.savedAt, summary: envelope.summary });
    writeIndex(list);
  }

  async read(slotId: string): Promise<SaveEnvelope | null> {
    const raw = localStorage.getItem(SLOT_KEY(slotId));
    return raw ? parseEnvelope(raw) : null;
  }

  async remove(slotId: string): Promise<void> {
    localStorage.removeItem(SLOT_KEY(slotId));
    writeIndex(readIndex().filter((s) => s.slotId !== slotId));
  }
}

/** Saves no servidor (PostgreSQL via API REST). */
export class ServerSaveStorage implements SaveStorage {
  async list(): Promise<SaveSlotInfo[]> {
    const res = await fetch(API_ROUTES.saves);
    if (!res.ok) throw new Error('Servidor indisponível');
    return ((await res.json()) as SaveListResponse).saves;
  }

  async write(slotId: string, envelope: SaveEnvelope): Promise<void> {
    const res = await fetch(API_ROUTES.save(slotId), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ envelope }),
    });
    if (!res.ok) throw new Error('Falha ao salvar no servidor');
  }

  async read(slotId: string): Promise<SaveEnvelope | null> {
    const res = await fetch(API_ROUTES.save(slotId));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Falha ao carregar do servidor');
    return parseEnvelope(((await res.json()) as SaveReadResponse).envelope);
  }

  async remove(slotId: string): Promise<void> {
    await fetch(API_ROUTES.save(slotId), { method: 'DELETE' });
  }
}

export const localSaves = new LocalStorageSaveStorage();
export const serverSaves = new ServerSaveStorage();

export function newSlotId(): string {
  return `slot_${Date.now().toString(36)}`;
}
