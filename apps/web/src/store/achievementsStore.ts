import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Conquistas desbloqueadas no perfil local (valem entre partidas). */
interface AchievementsStore {
  unlocked: Record<string, string>;
  unlock: (ids: string[], at: string) => string[];
  reset: () => void;
}

export const useAchievements = create<AchievementsStore>()(
  persist(
    (set, get) => ({
      unlocked: {},
      unlock: (ids, at) => {
        const current = get().unlocked;
        const fresh = ids.filter((id) => !current[id]);
        if (fresh.length > 0)
          set({ unlocked: { ...current, ...Object.fromEntries(fresh.map((id) => [id, at])) } });
        return fresh;
      },
      reset: () => set({ unlocked: {} }),
    }),
    { name: 'republica:achievements' },
  ),
);
