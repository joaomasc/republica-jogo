import type { PlayerPromise, PromiseStatus } from '../campaign/types';
import type { BudgetCategory } from '../economy/types';
import type { GameState } from '../simulation/state';

const STATUS_LABEL: Record<PromiseStatus, string> = {
  pending: 'Em andamento',
  fulfilled: 'Cumprida',
  partial: 'Parcialmente cumprida',
  broken: 'Não cumprida',
};

export function promiseStatusLabel(status: PromiseStatus): string {
  return STATUS_LABEL[status];
}

/** Valor atual do indicador usado por uma promessa (regional quando o mandato é estadual/municipal). */
export function indicatorValue(
  state: GameState,
  indicator: 'unemployment' | 'inflation' | 'growth' | 'income',
): number {
  const stateId = state.government?.jurisdiction.stateId ?? null;
  const region = stateId ? state.regions[stateId] : undefined;
  switch (indicator) {
    case 'unemployment':
      return region?.unemployment ?? state.economy.unemployment;
    case 'income':
      return region?.income ?? state.economy.income;
    case 'growth':
      return region?.growth ?? state.economy.growth;
    case 'inflation':
      return state.economy.inflation;
  }
}

/** Avalia (sem alterar o estado) a situação atual de uma promessa. */
export function evaluatePromise(state: GameState, promise: PlayerPromise): PromiseStatus {
  const t = promise.target;
  const gov = state.government;
  switch (t.kind) {
    case 'law': {
      const enacted = state.laws.enacted[t.categoryId];
      if (enacted && t.optionIds.includes(enacted)) return 'fulfilled';
      if (
        state.laws.implementing.some(
          (i) => i.categoryId === t.categoryId && t.optionIds.includes(i.optionId),
        )
      )
        return 'fulfilled';
      if (
        state.laws.bills.some(
          (b) => b.categoryId === t.categoryId && t.optionIds.includes(b.optionId),
        )
      )
        return 'partial';
      return 'broken';
    }
    case 'noLaw': {
      const enacted = state.laws.enacted[t.categoryId];
      return enacted && t.forbiddenOptionIds.includes(enacted) ? 'broken' : 'fulfilled';
    }
    case 'budget': {
      const b = gov?.budget;
      if (!b) return 'partial';
      const cat = t.category as BudgetCategory;
      const ratio = (b.spending[cat] ?? 0) / Math.max(0.0001, b.baseline[cat] ?? 1);
      if (ratio >= t.minRatio) return 'fulfilled';
      if (ratio >= 1 + (t.minRatio - 1) / 2) return 'partial';
      return 'broken';
    }
    case 'indicator': {
      if (promise.baseline === null) return 'pending';
      const now = indicatorValue(state, t.indicator);
      const change = now - promise.baseline;
      const target = t.indicator === 'income' ? (promise.baseline * t.amount) / 100 : t.amount;
      const progress = t.direction === 'down' ? -change : change;
      if (progress >= target) return 'fulfilled';
      if (progress > 0) return 'partial';
      return 'broken';
    }
    case 'billProposed': {
      const mine = state.laws.bills.filter(
        (b) => b.categoryId === t.categoryId && b.authorId === state.playerId,
      );
      if (mine.some((b) => b.status === 'passed')) return 'fulfilled';
      if (mine.length > 0) return 'partial';
      return 'broken';
    }
  }
}

/** Define a linha de base dos indicadores no início do mandato. */
export function setPromiseBaselines(state: GameState): void {
  for (const p of state.promises) {
    if (p.status === 'pending' && p.target.kind === 'indicator')
      p.baseline = indicatorValue(state, p.target.indicator);
  }
}

export function finalizePromises(state: GameState): {
  fulfilled: number;
  partial: number;
  broken: number;
  total: number;
} {
  let fulfilled = 0;
  let partial = 0;
  let broken = 0;
  for (const p of state.promises) {
    if (p.status !== 'pending') continue;
    const status = evaluatePromise(state, p);
    p.status = status === 'pending' ? 'partial' : status;
    p.evaluatedOn = state.date;
    if (p.status === 'fulfilled') fulfilled++;
    else if (p.status === 'partial') partial++;
    else broken++;
  }
  return { fulfilled, partial, broken, total: fulfilled + partial + broken };
}
