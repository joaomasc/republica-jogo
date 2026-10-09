import { clamp100 } from '../core/math';
import type { InterestGroupId } from '../politics/types';
import type { GameState } from '../simulation/state';
import { NationConstants as NC } from './constants';

/** Radicalismo atual de um grupo (grupos antigos, sem o campo, partem do valor inicial). */
export function groupRadicalism(state: GameState, id: InterestGroupId): number {
  return state.interestGroups[id]?.radicalism ?? NC.initialRadicalism;
}

/** Soma pontos de aprovação ao grupo (0..100). */
export function shiftGroupApproval(state: GameState, id: InterestGroupId, delta: number): void {
  const group = state.interestGroups[id];
  if (group) group.approval = clamp100(group.approval + delta);
}

/** Soma pontos de radicalismo ao grupo (0..100). */
export function shiftGroupRadicalism(state: GameState, id: InterestGroupId, delta: number): void {
  const group = state.interestGroups[id];
  if (group) group.radicalism = clamp100(groupRadicalism(state, id) + delta);
}

/** Aplica um conjunto de variações de aprovação (grupo → pontos). */
export function shiftGroups(
  state: GameState,
  deltas: Partial<Record<InterestGroupId, number>>,
): void {
  for (const [id, delta] of Object.entries(deltas) as [InterestGroupId, number][])
    shiftGroupApproval(state, id, delta);
}

/** Aplica um conjunto de variações de radicalismo (grupo → pontos). */
export function shiftRadicalisms(
  state: GameState,
  deltas: Partial<Record<InterestGroupId, number>>,
): void {
  for (const [id, delta] of Object.entries(deltas) as [InterestGroupId, number][])
    shiftGroupRadicalism(state, id, delta);
}

/** Registra um marco na linha do tempo nacional (sem repetir título na mesma data). */
export function recordMilestone(state: GameState, title: string, description: string): void {
  const list = state.nation.milestones;
  if (list.some((m) => m.title === title && m.date === state.date)) return;
  list.push({ date: state.date, title, description });
  if (list.length > NC.milestoneLimit) list.splice(0, list.length - NC.milestoneLimit);
}
