import type { IsoDate } from '../core/types';

export const BUDGET_CATEGORIES = [
  'health',
  'education',
  'security',
  'infrastructure',
  'pensions',
  'administration',
  'social',
  'industry',
  'science',
] as const;
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export interface EconomyShock {
  id: string;
  label: string;
  monthsLeft: number;
  growth: number;
  inflation: number;
  unemployment: number;
  confidence: number;
}

export interface EconomySnapshot {
  date: IsoDate;
  gdp: number;
  growth: number;
  inflation: number;
  unemployment: number;
  income: number;
  debt: number;
  deficit: number;
  interestRate: number;
  confidence: number;
}

/** Modelo econômico SIMPLIFICADO, voltado a gameplay — não é uma previsão real. */
export interface EconomyState {
  /** PIB nominal anual (R$ bilhões). */
  gdp: number;
  /** Crescimento real anualizado (%). */
  growth: number;
  /** Inflação anual (%). */
  inflation: number;
  /** Desemprego (%). */
  unemployment: number;
  /** Renda média mensal (R$). */
  income: number;
  /** Dívida pública (% do PIB). */
  debt: number;
  /** Resultado primário (% do PIB; negativo = déficit). */
  deficit: number;
  /** Investimento (% do PIB). */
  investment: number;
  /** Arrecadação anual (R$ bilhões). */
  revenue: number;
  /** Taxa básica de juros (%). */
  interestRate: number;
  /** Confiança dos agentes (0..100). */
  confidence: number;
  shocks: EconomyShock[];
  history: EconomySnapshot[];
  /** Referências do início da partida (para indicadores regionais). */
  baseUnemployment: number;
  baseIncome: number;
  /** Valores do início do mandato atual (para avaliar promessas). */
  termBaseline: EconomySnapshot | null;
}

export interface BudgetState {
  /** Receita anual (R$ bilhões) da esfera governada. */
  revenueTaxes: number;
  revenueOther: number;
  /** Gasto anual planejado por categoria (R$ bilhões). */
  spending: Record<BudgetCategory, number>;
  /** Nível de referência "adequado" por categoria. */
  baseline: Record<BudgetCategory, number>;
  /** Saldo acumulado do mandato (R$ bilhões). */
  balance: number;
  /** Emendas liberadas no mandato (R$ bilhões). */
  amendmentsSpent: number;
}
