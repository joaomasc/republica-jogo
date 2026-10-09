import { GameConstants } from '../config/constants';
import { clamp, round, sum } from '../core/math';
import type { ActionResult } from '../core/types';
import type { Jurisdiction } from '../election/offices';
import type { IssueId } from '../ideology/issues';
import { STATE_LIST, STATES } from '../map/states';
import type { GameState } from '../simulation/state';
import { BUDGET_CATEGORIES, type BudgetCategory, type BudgetState } from './types';

const B = GameConstants.budget;

export const BUDGET_INFO: Record<
  BudgetCategory,
  { name: string; icon: string; issues: IssueId[] }
> = {
  health: { name: 'Saúde', icon: 'heart-pulse', issues: ['healthcare'] },
  education: { name: 'Educação', icon: 'graduation-cap', issues: ['education'] },
  security: { name: 'Segurança', icon: 'shield', issues: ['security'] },
  infrastructure: {
    name: 'Infraestrutura',
    icon: 'construction',
    issues: ['infrastructure', 'transport', 'housing'],
  },
  pensions: { name: 'Previdência', icon: 'piggy-bank', issues: ['pensions'] },
  administration: {
    name: 'Administração',
    icon: 'building-2',
    issues: ['regulation', 'corruption'],
  },
  social: { name: 'Programas sociais', icon: 'hand-heart', issues: ['welfare', 'housing'] },
  // Investimento público e fomento: financia as obras estatais da fila de construção e as estatais.
  industry: { name: 'Investimento e fomento', icon: 'factory', issues: [] },
  // Ciência e tecnologia: acelera o avanço tecnológico nacional (métodos de produção).
  science: { name: 'Ciência e tecnologia', icon: 'flask-conical', issues: [] },
};

const SHARES: Record<Jurisdiction['level'], Record<BudgetCategory, number>> = {
  federal: {
    health: 0.1,
    education: 0.08,
    security: 0.02,
    infrastructure: 0.05,
    pensions: 0.42,
    administration: 0.15,
    social: 0.15,
    industry: 0.02,
    science: 0.01,
  },
  estadual: {
    health: 0.14,
    education: 0.22,
    security: 0.16,
    infrastructure: 0.1,
    pensions: 0.17,
    administration: 0.13,
    social: 0.06,
    industry: 0.015,
    science: 0.005,
  },
  municipal: {
    health: 0.25,
    education: 0.27,
    security: 0.04,
    infrastructure: 0.14,
    pensions: 0.06,
    administration: 0.145,
    social: 0.08,
    industry: 0.01,
    science: 0.005,
  },
};

function stateGdpShare(stateId: keyof typeof STATES): number {
  const total = sum(STATE_LIST.map((s) => s.population * s.gdpPerCapita));
  const s = STATES[stateId];
  return (s.population * s.gdpPerCapita) / total;
}

/** Orçamento inicial da esfera governada (valores anuais em R$ bilhões). */
export function initBudget(state: GameState, jurisdiction: Jurisdiction): BudgetState {
  const national = state.economy.revenue;
  let revenue: number;
  if (jurisdiction.level === 'federal' || !jurisdiction.stateId) revenue = national * 0.62;
  else if (jurisdiction.level === 'estadual')
    revenue = national * 0.27 * stateGdpShare(jurisdiction.stateId) * 1.1;
  else {
    const s = STATES[jurisdiction.stateId];
    revenue =
      national *
      0.11 *
      stateGdpShare(jurisdiction.stateId) *
      (s.capitalPopulation / s.population) *
      1.6;
  }
  const shares = SHARES[jurisdiction.level];
  const total = revenue * 0.98;
  const baseline = {} as Record<BudgetCategory, number>;
  for (const c of BUDGET_CATEGORIES) baseline[c] = round(total * shares[c], 3);
  return {
    revenueTaxes: round(revenue * 0.9, 3),
    revenueOther: round(revenue * 0.1, 3),
    spending: { ...baseline },
    baseline,
    balance: 0,
    amendmentsSpent: 0,
  };
}

export function budgetTotals(b: BudgetState): {
  revenue: number;
  spending: number;
  balance: number;
} {
  const revenue = b.revenueTaxes + b.revenueOther;
  const spending = sum(Object.values(b.spending));
  return { revenue, spending, balance: revenue - spending };
}

/** Qualidade do serviço (0.5..1.6) — gasto relativo à referência, ajustado pela gestão. */
export function serviceQuality(state: GameState, category: BudgetCategory): number {
  const b = state.government?.budget;
  if (!b) return 1;
  const ratio = b.spending[category] / Math.max(0.0001, b.baseline[category]);
  const management = state.candidates[state.playerId]?.attributes.management ?? 50;
  const ministers = state.government?.ministers ?? [];
  const competence =
    ministers.length > 0 ? sum(ministers.map((m) => m.competence)) / ministers.length : 50;
  const efficiency = 0.75 + management / 200 + (competence - 50) / 400;
  return clamp(1 + (ratio - 1) * efficiency, B.qualityFloor, B.qualityCeiling);
}

export function setBudgetAllocation(
  state: GameState,
  category: BudgetCategory,
  amount: number,
): ActionResult {
  const b = state.government?.budget;
  if (!b || state.phase !== 'governing')
    return { ok: false, message: 'Só o Executivo define o orçamento.' };
  if (!BUDGET_CATEGORIES.includes(category)) return { ok: false, message: 'Categoria inválida.' };
  const min = b.baseline[category] * (1 - B.maxAdjustment);
  const max = b.baseline[category] * (1 + B.maxAdjustment);
  b.spending[category] = round(clamp(amount, min, max), 3);
  return { ok: true, message: `Orçamento de ${BUDGET_INFO[category].name} ajustado.` };
}

/** Execução mensal: o saldo acumula; leis alteram a arrecadação e a referência de gastos. */
export function executeBudgetMonthly(state: GameState, revenueFactor: number): void {
  const b = state.government?.budget;
  if (!b) return;
  const t = budgetTotals(b);
  b.balance += (t.revenue * revenueFactor - t.spending) / 12;
}
