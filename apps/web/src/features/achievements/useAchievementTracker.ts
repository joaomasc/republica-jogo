import { ACHIEVEMENTS, satisfiedAchievements } from '@republica/game-engine';
import { useEffect } from 'react';
import { useAchievements } from '../../store/achievementsStore';
import { useGame } from '../../store/gameStore';

/**
 * Observa o jogo e desbloqueia conquistas assim que o estado as satisfaz (uma vez por perfil),
 * avisando com um toast.
 */
export function useAchievementTracker(): void {
  const game = useGame((s) => s.game);
  const toast = useGame((s) => s.toast);
  const unlock = useAchievements((s) => s.unlock);
  useEffect(() => {
    if (!game) return;
    const fresh = unlock(satisfiedAchievements(game), game.date);
    for (const id of fresh.slice(0, 3)) {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) toast({ tone: 'good', title: `Conquista: ${a.name}`, details: [a.description] });
    }
  }, [game, unlock, toast]);
}
