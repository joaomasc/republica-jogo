import type { GameState } from '../simulation/state';
import { initLawsState } from './laws';
import type { LawsState } from './types';

/**
 * Leis FEDERAIS vigentes. Quando o jogador legisla/governa na esfera federal elas ficam em
 * `state.laws`; caso contrário ficam guardadas em `state.nation.federalLaws` (o governo
 * federal NPC as administra). Use sempre este helper para ler a política nacional.
 */
export function federalLaws(state: GameState): LawsState {
  if (state.laws.jurisdictionKey === 'federal') return state.laws;
  if (!state.nation.federalLaws) state.nation.federalLaws = initLawsState('federal');
  return state.nation.federalLaws;
}

/** Opção federal vigente numa categoria (ou `null` se a categoria não existir). */
export function federalOption(state: GameState, categoryId: string): string | null {
  return federalLaws(state).enacted[categoryId] ?? null;
}

/** Leis da esfera subnacional do jogador (estado/município), se houver. */
export function localLaws(state: GameState): LawsState | null {
  return state.laws.jurisdictionKey === 'federal' ? null : state.laws;
}

/**
 * Troca a esfera das leis do jogador ao assumir um cargo, preservando as leis federais.
 * `key` é a chave da nova esfera ('federal', 'estadual:SP', 'municipal:SP').
 */
export function switchLawJurisdiction(state: GameState, key: string): void {
  if (state.laws.jurisdictionKey === key) return;
  if (state.laws.jurisdictionKey === 'federal') state.nation.federalLaws = state.laws;
  if (key === 'federal') {
    state.laws = state.nation.federalLaws ?? initLawsState('federal');
    state.nation.federalLaws = null;
  } else {
    state.laws = initLawsState(key);
  }
}
