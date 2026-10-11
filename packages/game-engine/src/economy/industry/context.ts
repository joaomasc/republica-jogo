import { clamp } from '../../core/math';
import { isStateId, STATE_IDS, type StateId } from '../../core/types';
import { aggregateLawEffects, type AggregatedLawEffects } from '../../laws/laws';
import { aggregateEconomyModifiers, mergeModifiers } from '../../laws/modifiers';
import { cityOf } from '../../map/cities';
import { STATES } from '../../map/states';
import type { GameState } from '../../simulation/state';
import { BUDGET_CATEGORIES, type BudgetCategory, type BudgetState } from '../types';
import { IndustryConstants as K } from './constants';
import { GOODS } from './goods.data';
import {
  GOOD_IDS,
  SECTOR_IDS,
  type EconomyModifiers,
  type GoodId,
  type SectorId,
} from './types';

/**
 * Contexto de um mês da economia industrial: modificadores (leis + decretos), alíquotas,
 * tarifas, greves e execução orçamentária. Calculado uma vez por tick (barato de consultar).
 */
export interface IndustryContext {
  /** Modificadores nacionais (leis federais + decretos). */
  M: EconomyModifiers;
  /** Estado da esfera subnacional do jogador (leis locais valem só nele, com meio peso). */
  localState: StateId | null;
  /** Modificadores nacionais + locais (só para `localState`). */
  ML: EconomyModifiers | null;
  /** Efeitos legados (`economy`) das leis federais e das locais. */
  legacy: AggregatedLawEffects['economy'];
  legacyLocal: AggregatedLawEffects['economy'];
  /** Intensidade de greve por setor (0..0,95). */
  strike: Record<SectorId, number>;
  /** Tarifa efetiva e imposto sobre consumo por bem (nacional). */
  tariff: Record<GoodId, number>;
  consumptionTax: Record<GoodId, number>;
  /** Imposto sobre consumo por bem no estado local (com leis locais). */
  consumptionTaxLocal: Record<GoodId, number> | null;
  exportTax: number;
  exportBans: ReadonlySet<GoodId>;
  frozen: ReadonlySet<GoodId>;
  priceControls: boolean;
  /** Execução orçamentária por categoria e estado (1 = referência; jogador mexe na sua esfera). */
  exec: Record<BudgetCategory, Record<StateId, number>>;
  /** Execução média nacional (ponderada pela população). */
  execNational: Record<BudgetCategory, number>;
  /** Orçamento do Executivo do jogador (para pagar obras) e sua esfera. */
  playerBudget: BudgetState | null;
  playerLevel: 'federal' | 'estadual' | 'municipal' | null;
  playerState: StateId | null;
}

/** Modificadores efetivos num estado (locais só no estado do jogador). */
export function modsFor(ctx: IndustryContext, stateId: StateId): EconomyModifiers {
  return ctx.ML && stateId === ctx.localState ? ctx.ML : ctx.M;
}

/** Estado da esfera das leis locais do jogador ('estadual:SP' → SP). */
export function localJurisdictionState(state: GameState): StateId | null {
  const key = state.laws.jurisdictionKey;
  if (key === 'federal') return null;
  const uf = key.split(':')[1] ?? '';
  return isStateId(uf) ? uf : null;
}

function cloneMods(m: EconomyModifiers): EconomyModifiers {
  return JSON.parse(JSON.stringify(m)) as EconomyModifiers;
}

function taxByGood(m: EconomyModifiers): Record<GoodId, number> {
  const out = {} as Record<GoodId, number>;
  for (const g of GOOD_IDS) {
    const cat = GOODS[g].category;
    out[g] = Math.max(
      0,
      K.baseConsumptionTax + (m.consumptionTax ?? 0) + (m.consumptionTaxByCategory?.[cat] ?? 0),
    );
  }
  return out;
}

/** Referência de gasto de uma categoria, ajustada pelos efeitos orçamentários das leis. */
export function requiredSpending(
  budget: BudgetState,
  category: BudgetCategory,
  lawBudget: Partial<Record<BudgetCategory, number>>,
): number {
  return Math.max(0, budget.baseline[category] * (1 + (lawBudget[category] ?? 0)));
}

/** Execução (gasto/referência) de uma categoria do orçamento do jogador. */
export function executionRatio(
  budget: BudgetState,
  category: BudgetCategory,
  lawBudget: Partial<Record<BudgetCategory, number>>,
): number {
  const required = requiredSpending(budget, category, lawBudget);
  if (required <= K.epsilon) return 1;
  return clamp(
    budget.spending[category] / required,
    K.government.executionMin,
    K.government.executionMax,
  );
}

export function buildContext(state: GameState): IndustryContext {
  const M = aggregateEconomyModifiers(state, 'national');
  const localState = localJurisdictionState(state);
  let ML: EconomyModifiers | null = null;
  if (localState) {
    const local = aggregateEconomyModifiers(state, 'local');
    if (Object.keys(local).length > 0) ML = mergeModifiers(cloneMods(M), local, 0.5);
  }
  const legacy = aggregateLawEffects(state, 'national').economy;
  const legacyLocal = localState ? aggregateLawEffects(state, 'local').economy : {};

  const strike = Object.fromEntries(SECTOR_IDS.map((s) => [s, 0])) as Record<SectorId, number>;
  for (const st of state.nation?.strikes ?? []) {
    const intensity = clamp(st.intensity, 0, 1);
    if (st.sector) strike[st.sector] += intensity;
    else for (const s of SECTOR_IDS) strike[s] += intensity;
  }
  for (const s of SECTOR_IDS) strike[s] = clamp(strike[s], 0, 0.95);

  const tariff = {} as Record<GoodId, number>;
  for (const g of GOOD_IDS) {
    const cat = GOODS[g].category;
    tariff[g] = Math.max(0, K.baseTariff + (M.tariff ?? 0) + (M.tariffByCategory?.[cat] ?? 0));
  }

  // Execução orçamentária: só a esfera governada pelo jogador sai da referência.
  const gov = state.government;
  const budget = gov?.branch === 'executive' ? gov.budget : null;
  const playerLevel = budget ? gov!.jurisdiction.level : null;
  const playerState = budget ? (gov!.jurisdiction.stateId ?? null) : null;
  const lawBudget = budget ? aggregateLawEffects(state, 'any').budget : {};
  const exec = {} as Record<BudgetCategory, Record<StateId, number>>;
  const execNational = {} as Record<BudgetCategory, number>;
  let popTotal = 0;
  for (const id of STATE_IDS) popTotal += STATES[id].population;
  for (const c of BUDGET_CATEGORIES) {
    const r = budget ? executionRatio(budget, c, lawBudget) : 1;
    const [wf, ws, wm] = K.government.sphereWeights[c];
    const row = {} as Record<StateId, number>;
    let nat = 0;
    for (const id of STATE_IDS) {
      let v = 1;
      if (budget && playerLevel === 'federal') v += wf * (r - 1);
      else if (budget && playerState === id) {
        if (playerLevel === 'estadual') v += ws * (r - 1);
        else if (playerLevel === 'municipal') {
          const s = STATES[id];
          const city = cityOf(id, gov?.jurisdiction.cityId);
          v += wm * Math.min(0.95, city.population / Math.max(1, s.population)) * (r - 1);
        }
      }
      row[id] = Math.max(0, v);
      nat += row[id] * STATES[id].population;
    }
    exec[c] = row;
    execNational[c] = popTotal > 0 ? nat / popTotal : 1;
  }

  return {
    M,
    localState,
    ML,
    legacy,
    legacyLocal,
    strike,
    tariff,
    consumptionTax: taxByGood(M),
    consumptionTaxLocal: ML ? taxByGood(ML) : null,
    exportTax: Math.max(0, M.exportTax ?? 0),
    exportBans: new Set(M.exportBans ?? []),
    frozen: new Set(M.frozenGoods ?? []),
    priceControls: M.priceControls === true,
    exec,
    execNational,
    playerBudget: budget ?? null,
    playerLevel,
    playerState,
  };
}

/** Alíquotas efetivas num estado. */
export function taxRates(
  ctx: IndustryContext,
  stateId: StateId,
): { income: number; corporate: number; dividend: number; wealth: number } {
  const m = modsFor(ctx, stateId);
  return {
    income: clamp(K.baseIncomeTax + (m.incomeTax ?? 0), 0, 0.6),
    corporate: clamp(K.baseCorporateTax + (m.corporateTax ?? 0), 0, 0.7),
    dividend: clamp(K.baseDividendTax + (m.dividendTax ?? 0), 0, 0.7),
    wealth: clamp(m.wealthTax ?? 0, 0, 0.2),
  };
}
