import { sigmoid } from '../core/math';
import type { Rng } from '../core/rng';
import { getLawOption } from '../laws/laws.data';
import type { Bill } from '../laws/types';
import type { GameState } from '../simulation/state';
import { LegislatureConstants as LC } from './constants';
import { baselineOptionId, executiveInfo, isExecutiveBill, isPlayerBill } from './context';
import { ideologicalGain } from './voting';

/**
 * Plebiscito: voto dos Pops ponderado por tamanho e comparecimento. Cada Pop compara a opção com
 * a vigente pela afinidade ideológica; a aprovação do governo pesa quando a proposta é dele.
 */

/** Satisfação média nacional dos Pops (proxy de aprovação de um governo NPC). */
export function nationalSatisfaction(state: GameState): number {
  let total = 0;
  let weight = 0;
  for (const pop of Object.values(state.population.pops)) {
    total += pop.satisfaction * pop.size;
    weight += pop.size;
  }
  return weight > 0 ? total / weight : 50;
}

export interface PlebisciteOutcome {
  /** Fração de "sim" nos votos válidos. */
  yesShare: number;
  /** Comparecimento (votantes / eleitorado). */
  turnout: number;
  approved: boolean;
}

export function plebisciteResult(state: GameState, bill: Bill, rng: Rng): PlebisciteOutcome {
  const option = getLawOption(bill.categoryId, bill.optionId);
  const currentId = baselineOptionId(state, bill);
  const current = currentId ? getLawOption(bill.categoryId, currentId) : undefined;
  if (!option) return { yesShare: 0, turnout: 0, approved: false };
  let govTerm = 0;
  if (isExecutiveBill(bill)) {
    const exec = executiveInfo(state);
    const approval =
      exec.isPlayer && isPlayerBill(state, bill)
        ? (state.government?.approval ?? 50)
        : nationalSatisfaction(state);
    govTerm = (approval - 50) * LC.plebisciteApprovalFactor;
  }
  let yes = 0;
  let voters = 0;
  let electorate = 0;
  for (const pop of Object.values(state.population.pops)) {
    const gain = ideologicalGain(pop.ideology, option, current);
    const p = sigmoid(
      gain * LC.plebisciteIdeologyFactor + govTerm + rng.normal(0, LC.plebisciteNoiseSd),
    );
    const v = pop.size * pop.turnout;
    yes += v * p;
    voters += v;
    electorate += pop.size;
  }
  const yesShare = voters > 0 ? yes / voters : 0;
  return {
    yesShare,
    turnout: electorate > 0 ? voters / electorate : 0,
    approved: yesShare > 0.5,
  };
}
