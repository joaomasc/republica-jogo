import type { GameState } from '@republica/game-engine';

/** Cor do partido de um candidato (para gráficos e mapas). */
export function candidateColor(state: GameState, id: string): string {
  return state.parties[state.candidates[id]?.partyId ?? '']?.color ?? '#94a3c4';
}
