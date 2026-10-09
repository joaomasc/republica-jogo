import type { DifficultyId } from '@republica/game-engine';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GameSpeed = 1 | 2 | 3 | 4 | 5;

/** Fração do intervalo-base (velocidade 1) em cada velocidade: ~1000/500/250/120/50 ms por dia. */
export const SPEED_FACTORS: Record<GameSpeed, number> = { 1: 1, 2: 0.5, 3: 0.25, 4: 0.12, 5: 0.05 };
export const GAME_SPEEDS: GameSpeed[] = [1, 2, 3, 4, 5];

/** Menor intervalo (ms) entre dias no avanço automático. */
export const MIN_TICK_MS = 30;

/** Intervalo (ms) entre dias no avanço automático. `baseMs` = velocidade 1 (configurável). */
export function speedIntervalMs(baseMs: number, speed: GameSpeed): number {
  // Valores inválidos vindos de saves/configurações antigas caem no padrão (sem NaN no timer).
  const base = Number.isFinite(baseMs) && baseMs > 0 ? baseMs : 1000;
  const factor = SPEED_FACTORS[speed] ?? SPEED_FACTORS[2];
  return Math.max(MIN_TICK_MS, Math.round(base * factor));
}

export interface Settings {
  autosave: boolean;
  animations: boolean;
  defaultDifficulty: DifficultyId;
  /** 'local' = textos procedurais; 'server' = tenta IA externa via servidor (com fallback local). */
  aiMode: 'local' | 'server';
  /** Onde ficam os saves manuais. */
  storage: 'local' | 'server';
  /** Duração de um dia na velocidade 1 (ms); as velocidades 2–5 são frações dela. */
  autoPlaySpeedMs: number;
  /** Velocidade do avanço automático (1 = lenta, 5 = muito rápida). */
  gameSpeed: GameSpeed;
  showTips: boolean;
}

interface SettingsStore extends Settings {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const DEFAULTS: Settings = {
  autosave: true,
  animations: true,
  defaultDifficulty: 'normal',
  aiMode: 'local',
  storage: 'local',
  autoPlaySpeedMs: 1000,
  gameSpeed: 2,
  showTips: true,
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      update: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    { name: 'republica:settings' },
  ),
);
