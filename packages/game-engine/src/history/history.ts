import type { IsoDate } from '../core/types';
import { nextId } from '../simulation/access';
import type { GameState } from '../simulation/state';
import type { HistoryEntry, HistoryKind } from './types';

const HISTORY_LIMIT = 300;

export interface HistoryInput {
  kind: HistoryKind;
  title: string;
  description?: string;
  importance?: 1 | 2 | 3;
  sentiment?: -1 | 0 | 1;
  tags?: string[];
  date?: IsoDate;
}

/** Registra um acontecimento na memória política do jogador. */
export function addHistory(state: GameState, input: HistoryInput): HistoryEntry {
  const entry: HistoryEntry = {
    id: nextId(state, 'hist'),
    date: input.date ?? state.date,
    kind: input.kind,
    title: input.title,
    description: input.description ?? '',
    importance: input.importance ?? 1,
    sentiment: input.sentiment ?? 0,
    tags: input.tags ?? [],
  };
  state.history.unshift(entry);
  if (state.history.length > HISTORY_LIMIT) {
    // Esquece primeiro o que é menos marcante.
    const idx = state.history.map((h) => h.importance).lastIndexOf(1);
    state.history.splice(idx >= 0 ? idx : state.history.length - 1, 1);
  }
  return entry;
}

export function findMemories(
  state: GameState,
  kinds: HistoryKind[],
  minImportance: 1 | 2 | 3 = 1,
): HistoryEntry[] {
  return state.history.filter((h) => kinds.includes(h.kind) && h.importance >= minImportance);
}

/** Lembrança negativa mais marcante (usada por adversários e jornalistas). */
export function worstMemory(state: GameState): HistoryEntry | null {
  const negatives = state.history.filter((h) => h.sentiment < 0);
  negatives.sort((a, b) => b.importance - a.importance);
  return negatives[0] ?? null;
}
