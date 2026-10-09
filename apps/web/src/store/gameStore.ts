import {
  dispatch,
  saveGame,
  startGame,
  type ActionResult,
  type GameAction,
  type GameState,
  type NewGameConfig,
  type SaveSlotInfo,
} from '@republica/game-engine';
import { create } from 'zustand';
import { localSaves, newSlotId, serverSaves } from '../services/storage';
import { useSettings } from './settingsStore';

export const AUTOSAVE_SLOT = 'autosave';

export interface Toast {
  id: number;
  tone: 'good' | 'bad' | 'info' | 'warn';
  title: string;
  details?: string[];
}

interface GameStore {
  game: GameState | null;
  /** Slot do último save manual (para "Salvar" rápido). */
  slotId: string | null;
  toasts: Toast[];
  lastSavedAt: string | null;
  start: (config: NewGameConfig) => void;
  load: (state: GameState, slotId: string | null) => void;
  act: (action: GameAction, opts?: { quiet?: boolean }) => ActionResult;
  save: (slotId?: string) => Promise<SaveSlotInfo>;
  exit: () => void;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}

let toastSeq = 0;
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

/** Ações de "rotina" que não merecem notificação quando dão certo. */
const QUIET_ACTIONS = new Set<GameAction['type']>([
  'interview/answer',
  'debate/move',
  'alerts/read',
  'interview/rewrite',
  'news/rewrite',
  'gov/budget',
  'agenda/update',
]);

function scheduleAutosave(get: () => GameStore): void {
  if (!useSettings.getState().autosave) return;
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    const game = get().game;
    if (!game) return;
    saveGame(localSaves, AUTOSAVE_SLOT, game, new Date().toISOString()).catch(() => undefined);
  }, 1200);
}

export const useGame = create<GameStore>()((set, get) => ({
  game: null,
  slotId: null,
  toasts: [],
  lastSavedAt: null,

  start: (config) => {
    const game = startGame({
      ...config,
      now: new Date().toISOString(),
      seed: config.seed ?? Math.floor(Math.random() * 2 ** 31),
    });
    set({ game, slotId: null, lastSavedAt: null });
    scheduleAutosave(get);
  },

  load: (state, slotId) => {
    set({ game: state, slotId, lastSavedAt: null });
  },

  act: (action, opts) => {
    const game = get().game;
    if (!game) return { ok: false, message: 'Nenhum jogo em andamento.' };
    const { state, result } = dispatch(game, action);
    if (state !== game) set({ game: state });
    const quiet =
      opts?.quiet ||
      QUIET_ACTIONS.has(action.type) ||
      (action.type === 'time/advance' &&
        result.ok &&
        !result.details?.length &&
        !/evento|debate|eleição|mandato/i.test(result.message));
    if (!result.ok) get().toast({ tone: 'bad', title: result.message });
    else if (!quiet)
      get().toast({
        tone: 'good',
        title: result.message,
        ...(result.details?.length ? { details: result.details } : {}),
      });
    if (result.ok) scheduleAutosave(get);
    return result;
  },

  save: async (slotId) => {
    const game = get().game;
    if (!game) throw new Error('Nenhum jogo em andamento.');
    const target = slotId ?? get().slotId ?? newSlotId();
    const storage = useSettings.getState().storage === 'server' ? serverSaves : localSaves;
    const now = new Date().toISOString();
    const info = await saveGame(storage, target, game, now);
    set({ slotId: target, lastSavedAt: now });
    return info;
  },

  exit: () => {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    const game = get().game;
    if (game && useSettings.getState().autosave)
      saveGame(localSaves, AUTOSAVE_SLOT, game, new Date().toISOString()).catch(() => undefined);
    set({ game: null, slotId: null });
  },

  toast: (t) => {
    const id = ++toastSeq;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
    setTimeout(() => get().dismiss(id), t.tone === 'bad' ? 5000 : 3800);
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Atalho: estado atual do jogo (garantido não nulo dentro das telas do jogo). */
export function useGameState(): GameState {
  const game = useGame((s) => s.game);
  if (!game) throw new Error('useGameState fora de um jogo');
  return game;
}
