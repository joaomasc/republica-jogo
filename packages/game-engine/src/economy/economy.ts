import { GameConstants } from '../config/constants';
import { processPublicWorksMonth } from './works/works';
import { approach, clamp, round } from '../core/math';
import type { Rng } from '../core/rng';
import { STATE_IDS } from '../core/types';
import { aggregateLawEffects } from '../laws/laws';
import { STATES } from '../map/states';
import type { GameState } from '../simulation/state';
import type { EconomySnapshot, EconomyState } from './types';
import { budgetTotals } from './budget';
import { IndustryConstants } from './industry/constants';
import { runIndustryMonth } from './industry/industry';
import { aggregateEconomyModifiers } from '../laws/modifiers';

const C = GameConstants.economy;

export type EconomicSituation = 'boom' | 'normal' | 'slowdown' | 'crisis';

export const ECONOMIC_SITUATIONS: Record<
  EconomicSituation,
  {
    name: string;
    growth: number;
    inflation: number;
    unemployment: number;
    confidence: number;
    debt: number;
  }
> = {
  boom: { name: 'Bonança', growth: 4, inflation: 5, unemployment: 5.5, confidence: 70, debt: 70 },
  normal: {
    name: 'Estável',
    growth: 2,
    inflation: 4.5,
    unemployment: 7.5,
    confidence: 52,
    debt: 77,
  },
  slowdown: {
    name: 'Desaceleração',
    growth: 0.5,
    inflation: 6,
    unemployment: 9.5,
    confidence: 40,
    debt: 82,
  },
  crisis: { name: 'Crise', growth: -2, inflation: 9, unemployment: 13, confidence: 25, debt: 90 },
};

export function initEconomy(situation: EconomicSituation, date: string): EconomyState {
  const s = ECONOMIC_SITUATIONS[situation];
  const gdp = 12_000;
  const state: EconomyState = {
    gdp,
    growth: s.growth,
    inflation: s.inflation,
    unemployment: s.unemployment,
    income: 3200,
    debt: s.debt,
    deficit: -0.6,
    investment: 17,
    revenue: round(gdp * C.baseTaxRate, 0),
    interestRate: round(C.taylorBase + C.taylorFactor * s.inflation, 1),
    confidence: s.confidence,
    shocks: [],
    history: [],
    termBaseline: null,
    baseUnemployment: s.unemployment,
    baseIncome: 3200,
  };
  state.history.push(snapshot(state, date));
  return state;
}

export function snapshot(e: EconomyState, date: string): EconomySnapshot {
  return {
    date,
    gdp: round(e.gdp, 0),
    growth: round(e.growth, 2),
    inflation: round(e.inflation, 2),
    unemployment: round(e.unemployment, 2),
    income: round(e.income, 0),
    debt: round(e.debt, 1),
    deficit: round(e.deficit, 2),
    interestRate: round(e.interestRate, 2),
    confidence: round(e.confidence, 1),
  };
}

/** Soma dos choques ativos (eventos). */
function activeShocks(e: EconomyState): {
  growth: number;
  inflation: number;
  unemployment: number;
  confidence: number;
} {
  return e.shocks.reduce(
    (acc, s) => ({
      growth: acc.growth + s.growth,
      inflation: acc.inflation + s.inflation,
      unemployment: acc.unemployment + s.unemployment,
      confidence: acc.confidence + s.confidence,
    }),
    { growth: 0, inflation: 0, unemployment: 0, confidence: 0 },
  );
}

/** Resultado fiscal: do orçamento do jogador (Executivo federal) ou do governo NPC. */
function updateDeficit(state: GameState, rng: Rng): void {
  const e = state.economy;
  const gov = state.government;
  if (gov?.budget && gov.jurisdiction.level === 'federal' && gov.branch === 'executive') {
    const t = budgetTotals(gov.budget);
    e.deficit = ((t.revenue - t.spending) / e.gdp) * 100;
  } else {
    e.deficit = approach(e.deficit, -0.5, 0.1) + rng.normal(0, 0.05);
  }
}

function updateDebtAndConfidence(state: GameState, shocks: ReturnType<typeof activeShocks>): void {
  const e = state.economy;
  const law = aggregateLawEffects(state, 'national');
  e.debt = clamp(
    e.debt + (-e.deficit + (e.interestRate - e.inflation - e.growth) * (e.debt / 100) * 0.3) / 12,
    20,
    200,
  );
  const approval = state.government ? state.government.approval : 50;
  const confidenceTarget =
    50 +
    (law.economy.confidence ?? 0) +
    (approval - 50) / 4 -
    Math.max(0, e.debt - 80) / 2 -
    Math.max(0, e.inflation - 6) * 2 +
    shocks.confidence;
  e.confidence = clamp(approach(e.confidence, confidenceTarget, C.confidenceAdjustRate), 0, 100);
  for (const s of e.shocks) s.monthsLeft -= 1;
  e.shocks = e.shocks.filter((s) => s.monthsLeft > 0);
}

/**
 * Atualização mensal da economia. Com o motor industrial calibrado, os indicadores agregados
 * (crescimento, desemprego, renda, PIB, arrecadação) saem dele; inflação, juros, dívida e
 * confiança seguem as regras macro. Sem o motor (estado sem calibração), usa o modelo agregado.
 */
export function updateEconomy(state: GameState, rng: Rng): void {
  processPublicWorksMonth(state);
  const ind = state.industry;
  const prevOutput = ind?.stats.realOutput ?? 0;
  runIndustryMonth(state, rng);
  if (!ind?.calib || prevOutput <= 0) {
    updateEconomyAggregate(state, rng);
    return;
  }
  const e = state.economy;
  const X = IndustryConstants.macro;
  const law = aggregateLawEffects(state, 'national');
  const shocks = activeShocks(e);
  updateDeficit(state, rng);

  // Crescimento: variação real do produto (anualizada e suavizada).
  const out = ind.stats.realOutput;
  const monthly = clamp(out / prevOutput - 1, -0.2, 0.2);
  const annual = (Math.pow(1 + monthly, 12) - 1) * 100;
  e.growth = clamp(approach(e.growth, annual, 0.2), -15, 15);

  // Desemprego: taxas estaduais medidas pelo mercado de trabalho, ancoradas na taxa inicial.
  let num = 0;
  let den = 0;
  for (const id of STATE_IDS) {
    const lf = ind.labor[id]?.laborForce ?? 0;
    num += (state.regions[id]?.unemployment ?? 0) * lf;
    den += (ind.calib.unemploymentRate0[id] ?? 0) * lf;
  }
  if (den > 0)
    e.unemployment = clamp(
      (ind.calib.nationalUnemployment0 * num) / den,
      C.minUnemployment,
      C.maxUnemployment,
    );

  // Renda média: renda corrente sobre a renda inicial (mesmos tamanhos de Pop).
  let inc = 0;
  let inc0 = 0;
  for (const pop of Object.values(state.population.pops)) {
    inc += pop.income * pop.size;
    inc0 += (ind.calib.income0[pop.id] ?? pop.income) * pop.size;
  }
  e.income = e.baseIncome * (inc0 > 0 ? inc / inc0 : 1);

  // Inflação: componente monetário + pressão de custos do mercado (IPC de 12 meses).
  const hist = state.market.cpiHistory;
  const cpi12 = hist.length > 12 ? (hist[hist.length - 13]?.value ?? 1) : (hist[0]?.value ?? 1);
  const costPush = clamp(
    (state.market.cpi / Math.max(0.01, cpi12) - 1) * 100 * X.costPassThrough,
    -5,
    X.costPressureMax,
  );
  const taylor = C.taylorBase + C.taylorFactor * e.inflation;
  const bank = aggregateEconomyModifiers(state).centralBank ?? 'independent';
  const selic =
    bank === 'government'
      ? (state.executive.selicTarget ?? taylor)
      : bank === 'dual'
        ? taylor - X.dualMandateWeight * (e.unemployment - e.baseUnemployment)
        : taylor;
  const monetaryExcess = Math.max(0, taylor - selic) * 0.25;
  const inflationTarget =
    C.inflationTarget +
    (law.economy.inflation ?? 0) +
    (e.growth - C.potentialGrowth) * C.overheatInflationFactor * 0.5 +
    Math.max(0, -e.deficit) * C.deficitInflationFactor +
    shocks.inflation +
    costPush +
    monetaryExcess;
  e.inflation = clamp(
    approach(e.inflation, inflationTarget, C.inflationAdjustRate) +
      rng.normal(0, C.inflationNoiseSd),
    -2,
    40,
  );
  e.interestRate = clamp(
    approach(
      e.interestRate,
      selic,
      bank === 'government' ? X.executiveSelicRate : C.interestAdjustRate,
    ),
    2,
    30,
  );

  // PIB nominal e arrecadação acompanham o produto real e o nível de preços.
  ind.priceLevel = (ind.priceLevel ?? 1) * (1 + e.inflation / 1200);
  e.gdp = ind.gdpScale * out * ind.priceLevel;
  const t = ind.stats.taxes;
  e.revenue =
    (t.income +
      t.corporate +
      t.consumption +
      t.tariffs +
      t.exportTax +
      t.dividends +
      t.wealth +
      t.stateCompanies) *
    ind.priceLevel;
  const flow = ind.stats.investmentFlow ?? 0;
  e.investment = clamp(approach(e.investment, (flow / Math.max(1e-6, out)) * 100 * 3, 0.2), 5, 40);

  // Demanda agregada: confiança, juro real e choques.
  const realRate = e.interestRate - e.inflation;
  const dfTarget = clamp(
    1 +
      0.15 * ((e.confidence - 50) / 50) -
      X.demandRealRate * (realRate - X.realNeutral) +
      shocks.growth * X.demandShock,
    X.demandMin,
    X.demandMax,
  );
  state.market.demandFactor = approach(state.market.demandFactor, dfTarget, X.demandAdjustRate);

  updateDebtAndConfidence(state, shocks);
  for (const id of STATE_IDS) {
    const region = state.regions[id];
    if (region) region.growth = round(e.growth + rng.normal(0, 0.3), 2);
  }
  e.history.push(snapshot(e, state.date));
  if (e.history.length > C.historyLimit) e.history.shift();
}

/** Modelo agregado original (estado sem o motor industrial calibrado). */
function updateEconomyAggregate(state: GameState, rng: Rng): void {
  const e = state.economy;
  const law = aggregateLawEffects(state, 'national');
  const shocks = activeShocks(e);
  updateDeficit(state, rng);
  const investment = 17 + (law.economy.investment ?? 0) + (e.confidence - 50) * 0.04;
  e.investment = approach(e.investment, investment, 0.2);
  const potential = C.potentialGrowth + (e.investment - 17) * 0.08;
  const growthTarget =
    potential +
    (law.economy.growth ?? 0) +
    ((e.confidence - 50) / 50) * C.confidenceGrowthFactor +
    -e.deficit * C.fiscalStimulusFactor -
    (e.interestRate - C.neutralInterest) * C.interestDragFactor -
    Math.max(0, e.debt - 80) * C.debtGrowthDrag +
    shocks.growth;
  e.growth = clamp(
    approach(e.growth, growthTarget, C.growthAdjustRate) + rng.normal(0, C.growthNoiseSd),
    -8,
    10,
  );
  const inflationTarget =
    C.inflationTarget +
    (law.economy.inflation ?? 0) +
    (e.growth - potential) * C.overheatInflationFactor +
    Math.max(0, -e.deficit) * C.deficitInflationFactor +
    shocks.inflation;
  e.inflation = clamp(
    approach(e.inflation, inflationTarget, C.inflationAdjustRate) +
      rng.normal(0, C.inflationNoiseSd),
    -1,
    30,
  );
  e.interestRate = clamp(
    approach(e.interestRate, C.taylorBase + C.taylorFactor * e.inflation, C.interestAdjustRate),
    2,
    25,
  );
  e.unemployment = clamp(
    e.unemployment -
      (e.growth - potential) * C.okunFactor +
      ((law.economy.unemployment ?? 0) + shocks.unemployment) / 12,
    C.minUnemployment,
    C.maxUnemployment,
  );
  e.income = e.income * (1 + (e.growth * 0.6) / 1200);
  e.gdp = e.gdp * (1 + (e.growth + e.inflation) / 1200);
  e.revenue = e.gdp * C.baseTaxRate * (1 + (law.economy.revenue ?? 0));
  updateDebtAndConfidence(state, shocks);
  updateRegionalEconomy(state, rng);
  e.history.push(snapshot(e, state.date));
  if (e.history.length > C.historyLimit) e.history.shift();
}

/** Indicadores estaduais acompanham o nacional, com ruído e efeito de leis estaduais. */
export function updateRegionalEconomy(state: GameState, rng: Rng): void {
  const e = state.economy;
  const ratio = e.unemployment / Math.max(1, e.baseUnemployment);
  const incomeRatio = e.income / Math.max(1, e.baseIncome);
  const localLaw = aggregateLawEffects(state, 'local');
  const govState = state.government?.jurisdiction.stateId ?? null;
  for (const id of STATE_IDS) {
    const region = state.regions[id];
    if (!region) continue;
    const base = STATES[id];
    const local = govState === id ? localLaw.economy : {};
    const target = base.unemployment * ratio ** C.regionalSensitivity + (local.unemployment ?? 0);
    region.unemployment = clamp(
      approach(region.unemployment, target, 0.3) + rng.normal(0, C.regionalNoiseSd),
      1.5,
      30,
    );
    region.growth = round(e.growth + (local.growth ?? 0) + rng.normal(0, 0.3), 2);
    region.income = Math.round(2800 * (base.gdpPerCapita / 40) * incomeRatio);
  }
}

export function economySummary(e: EconomyState): string {
  const parts = [
    `PIB ${e.growth >= 0 ? 'cresce' : 'encolhe'} ${round(Math.abs(e.growth), 1)}%`,
    `inflação de ${round(e.inflation, 1)}%`,
    `desemprego de ${round(e.unemployment, 1)}%`,
  ];
  return parts.join(', ');
}
