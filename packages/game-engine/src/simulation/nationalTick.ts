import type { Rng } from '../core/rng';
import { processExecutiveMonth } from '../executive/executive';
import { processNationMonth } from '../nation/nation';
import { evaluateObjectives } from '../scenarios/objectives';
import type { GameState } from './state';

/**
 * Etapas nacionais do tick mensal do mandato, depois da economia, dos Pops e do Legislativo:
 * decretos do Executivo → Nação (grupos, greves, legitimidade, regime) → objetivos do cenário.
 */
export function nationalMonthlyTick(state: GameState, rng: Rng): void {
  processExecutiveMonth(state, rng);
  processNationMonth(state, rng);
  evaluateObjectives(state);
}
