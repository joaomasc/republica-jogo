import { approach, clamp } from '../../core/math';
import { type Rng } from '../../core/rng';
import { STATE_IDS, type StateId } from '../../core/types';
import { popId } from '../../population/population';
import type { PopTypeId } from '../../population/popTypes';
import type { GameState } from '../../simulation/state';
import { BUILDINGS } from './buildings.data';
import {
  addJobsByType,
  isConstruction,
  isInformal,
  isMarketBuilding,
  isPublic,
  mainOutput,
  methodInfo,
  normalizeOwnership,
  type MethodInfo,
} from './catalog';
import { IndustryConstants as K } from './constants';
import { modsFor, taxRates, type IndustryContext } from './context';
import { GOODS } from './goods.data';
import { STATE_RESOURCES } from './resources.data';
import {
  annualBill,
  addLevels,
  basketShares,
  formalJobs,
  newBuildingState,
  savingsRate,
  wageRef,
  WORKFORCE_TYPES,
} from './shared';
import {
  BUILDING_IDS,
  GOOD_IDS,
  LABOR_TYPE_IDS,
  SECTOR_IDS,
  type BuildingId,
  type BuildingState,
  type ConstructionOwner,
  type ConstructionProject,
  type EconomyModifiers,
  type GoodId,
  type LaborTypeId,
  type OwnerKind,
  type SectorId,
} from './types';

const P = K.production;
const LOW_WAGE: ReadonlySet<LaborTypeId> = new Set<LaborTypeId>([
  'workers',
  'farmers',
  'industrial_workers',
  'merchants',
]);

export type Flows = Record<GoodId, number>;

export function zero(): Flows {
  const out = {} as Flows;
  for (const g of GOOD_IDS) out[g] = 0;
  return out;
}

/** Edifício rodando no mês (estrutura transitória). */
export interface Run {
  stateId: StateId;
  id: BuildingId;
  bs: BuildingState;
  info: MethodInfo;
  sector: SectorId;
  /** Atividade física: níveis × lotação × greve × disponibilidade de mão de obra/insumos. */
  run: number;
  /** Multiplicador de produtividade. */
  pm: number;
  /** Folha anual (R$ bi) e empregos por tipo efetivamente ocupados. */
  wageBill: number;
  jobs: Partial<Record<LaborTypeId, number>>;
}

/** Multiplicador do salário mínimo para salários baixos. */
function minWageMult(m: EconomyModifiers, t: LaborTypeId): number {
  if (!LOW_WAGE.has(t)) return 1;
  const mw = m.minimumWage ?? K.baseMinimumWage;
  return Math.max(0.6, 1 + (mw - K.baseMinimumWage) * K.jobs.minimumWageEffect);
}

/** Salário mensal pago a um tipo num edifício. */
export function buildingWage(
  state: GameState,
  ctx: IndustryContext,
  stateId: StateId,
  bs: BuildingState,
  t: LaborTypeId,
): number {
  const m = modsFor(ctx, stateId);
  const index = state.industry.wageIndex?.[stateId] ?? 1;
  return wageRef(stateId, t) * index * bs.wageFactor * (m.wageMult ?? 1) * minWageMult(m, t);
}

/** Produtividade efetiva de um edifício (leis, tecnologia, choques, poluição). */
function productivityOf(state: GameState, ctx: IndustryContext, r: Pick<Run, 'stateId' | 'bs' | 'info' | 'sector'>): number {
  const m = modsFor(ctx, r.stateId);
  const ind = state.industry;
  const bonus =
    (m.productivity ?? 0) +
    (m.productivityBySector?.[r.sector] ?? 0) +
    ind.tech.level * P.techBonusPerLevel +
    (ind.tfp ?? 0) +
    (ind.shockLevel ?? 0) -
    r.info.pollution * Math.max(0, m.pollutionPenalty ?? 0);
  return clamp(r.bs.productivity * (1 + bonus), P.productivityMin, P.productivityMax);
}

/** Etapa 1: atividade, produção e insumos de todos os edifícios. */
export function produce(
  state: GameState,
  ctx: IndustryContext,
): { runs: Run[]; supply: Flows; inputs: Flows } {
  const ind = state.industry;
  const market = state.market;
  const runs: Run[] = [];
  const supply = zero();
  const inputs = zero();
  for (const stateId of STATE_IDS) {
    const avail = ind.laborAvail?.[stateId] ?? 1;
    const informal0 = state.industry.calib?.people0[stateId]?.workers ?? 0;
    const informalNow = ind.labor[stateId]?.informal ?? 0;
    const buildings = ind.buildings[stateId];
    for (const id of BUILDING_IDS) {
      const bs = buildings[id];
      if (!bs || bs.level <= 0) continue;
      const info = methodInfo(id, bs.methodId);
      const sector = BUILDINGS[id].sector;
      const strike = ctx.strike[sector];
      // Escassez de insumos limita a atividade.
      let shortage = 0;
      for (const [g, share] of info.inputShares) shortage += share * (market.goods[g]?.shortage ?? 0);
      const inputAvail = Math.max(K.market.minInputAvailability, 1 - shortage);
      let activity = bs.level * bs.staffing;
      if (isInformal(id)) {
        const base = state.industry.labor[stateId]?.informal ?? 0;
        activity = bs.level * (informal0 > 0 && base > 0 ? clamp(informalNow / Math.max(1, base), 0.3, 2) : 1);
      }
      const run = activity * (1 - strike) * Math.min(avail, inputAvail);
      const r: Run = { stateId, id, bs, info, sector, run, pm: 1, wageBill: 0, jobs: {} };
      r.pm = productivityOf(state, ctx, r);
      if (!isConstruction(id)) {
        for (const [g, q] of info.outputs) supply[g] += q * run * r.pm;
        for (const [g, q] of info.inputs) inputs[g] += q * run;
      }
      // Empregos e folha (greve suspende parte dos salários).
      addJobsByType(info, bs.ownership, bs.level * bs.staffing * Math.min(1, avail), r.jobs);
      let bill = 0;
      if (!isInformal(id))
        for (const t of LABOR_TYPE_IDS) {
          const n = r.jobs[t] ?? 0;
          if (n > 0) bill += annualBill(n, buildingWage(state, ctx, stateId, bs, t));
        }
      r.wageBill = bill * (1 - strike * 0.7);
      runs.push(r);
    }
  }
  return { runs, supply, inputs };
}

/** Insumos e mão de obra por ponto de construção (média dos métodos ativos). */
export function constructionUnit(runs: Run[]): { capacity: number; perPoint: [GoodId, number][]; wagePerPoint: number } {
  let capacity = 0;
  let wage = 0;
  const totals = zero();
  for (const r of runs) {
    if (!isConstruction(r.id)) continue;
    const pts = r.info.points * r.run * r.pm;
    capacity += pts;
    wage += r.wageBill / 12;
    for (const [g, q] of r.info.inputs) totals[g] += (q * r.run) / 12;
  }
  const perPoint: [GoodId, number][] = [];
  if (capacity > 0) for (const g of GOOD_IDS) if (totals[g] > 0) perPoint.push([g, totals[g] / capacity]);
  return { capacity, perPoint, wagePerPoint: capacity > 0 ? wage / capacity : 0 };
}

/** Custo (R$ bi do motor) de 1 ponto de construção aos preços correntes. */
export function pointCost(state: GameState, perPoint: [GoodId, number][], wagePerPoint: number): number {
  let c = wagePerPoint;
  for (const [g, q] of perPoint) c += q * (state.market.goods[g]?.price ?? 1);
  return c * (1 + P.constructionMarkup);
}

/** Demanda final bruta (antes do multiplicador calibrado): famílias por estado e governo. */
export function rawFinalDemand(
  state: GameState,
  ctx: IndustryContext,
): { pops: Flows; gov: Flows; spend: number; byState: Record<StateId, number> } {
  const pops = zero();
  const gov = zero();
  const prices = state.market.goods;
  const demandFactor = state.market.demandFactor;
  let spend = 0;
  const byState = {} as Record<StateId, number>;
  for (const stateId of STATE_IDS) {
    const taxes = ctx.consumptionTaxLocal && stateId === ctx.localState ? ctx.consumptionTaxLocal : ctx.consumptionTax;
    let stSpend = 0;
    for (const t of [...WORKFORCE_TYPES, 'students', 'retirees'] as PopTypeId[]) {
      const pop = state.population.pops[popId(stateId, t)];
      if (!pop || pop.size <= 0) continue;
      const budget = annualBill(pop.size, pop.income) * (1 - savingsRate(pop.income)) * demandFactor;
      if (budget <= 0) continue;
      stSpend += budget;
      const shares = basketShares(pop.income);
      for (const g of GOOD_IDS) {
        const s = shares[g];
        if (s <= 0) continue;
        const price = (prices[g]?.price ?? 1) * (1 + (taxes[g] ?? 0));
        pops[g] += (budget * s) / Math.max(0.05, price);
      }
    }
    byState[stateId] = stSpend;
    spend += stSpend;
  }
  // Compras do governo (em quantidades reais), acompanhando a execução do orçamento.
  const out0 = state.industry.calib?.output0 ?? 0;
  for (const [cat, w] of Object.entries(K.government.weights) as [keyof typeof K.government.baskets, number][]) {
    const basket = K.government.baskets[cat];
    if (!basket) continue;
    const value = out0 * K.bootstrap.governmentPurchases * w * (ctx.execNational[cat] ?? 1);
    for (const [g, s] of Object.entries(basket) as [GoodId, number][]) gov[g] += value * s;
  }
  return { pops, gov, spend, byState };
}

interface MarketOutcome {
  imports: Flows;
  exports: Flows;
}

/** Etapa de mercado: preços, comércio exterior e escassez. */
export function clearMarket(
  state: GameState,
  ctx: IndustryContext,
  supply: Flows,
  demand: Flows,
  parts: { pops: Flows; industry: Flows; gov: Flows; construction: Flows },
  smooth: boolean,
): MarketOutcome {
  const imports = zero();
  const exports = zero();
  const fx = state.market.exchangeRate;
  const openness = clamp(ctx.M.tradeOpenness ?? 1, 0, 2);
  for (const g of GOOD_IDS) {
    const gm = state.market.goods[g];
    const def = GOODS[g];
    const S = supply[g];
    const D = demand[g];
    const imbalance = (D - S) / Math.max(Math.min(D, S), K.epsilon + 1e-6);
    let target = 1 + K.priceImbalanceFactor * clamp(imbalance, -1, 1);
    let imp = 0;
    let exp = 0;
    const tariff = ctx.tariff[g] ?? 0;
    if (def.tradeable && openness > 0) {
      const cap = openness * K.market.tradeCapacity * Math.max(D, S);
      const pi = gm.worldPrice * fx * (1 + tariff + def.transportCost);
      const pe = gm.worldPrice * fx * (1 - def.transportCost - ctx.exportTax);
      if (target > pi && D > S) {
        imp = Math.min(cap, D - S);
        const rest = D - S - imp;
        target = rest > 0 ? Math.max(pi, 1 + K.priceImbalanceFactor * clamp(rest / Math.max(S + imp, 1e-6), -1, 1)) : pi;
      } else if (target < pe && S > D && !ctx.exportBans.has(g)) {
        exp = Math.min(cap, S - D);
        const rest = S - D - exp;
        target = rest > 0 ? Math.min(pe, 1 - K.priceImbalanceFactor * clamp(rest / Math.max(D + exp, 1e-6), -1, 1)) : pe;
      }
    }
    let price = smooth ? gm.price + K.priceAdjustRate * (target - gm.price) : target;
    if (ctx.frozen.has(g)) price = gm.price;
    else if (ctx.priceControls) price = clamp(price, 1 - K.market.priceControlBand, 1 + K.market.priceControlBand);
    price = clamp(price, K.priceMin, K.priceMax);
    const available = S + imp;
    const shortage = D > 0 ? clamp((D - available) / D, 0, 1) : 0;
    imports[g] = imp;
    exports[g] = exp;
    gm.price = price;
    gm.supply = S;
    gm.demand = D;
    gm.demandPops = parts.pops[g];
    gm.demandIndustry = parts.industry[g];
    gm.demandGovernment = parts.gov[g];
    gm.demandConstruction = parts.construction[g];
    gm.imports = imp;
    gm.exports = exp;
    gm.tariff = tariff;
    gm.shortage = shortage;
  }
  return { imports, exports };
}

/** Acumuladores financeiros do mês (R$ bi/ano do motor). */
export interface Finance {
  va: number;
  vaSector: Record<SectorId, number>;
  empSector: Record<SectorId, number>;
  vaState: Record<StateId, number>;
  wageBill: number;
  privateProfit: number;
  privateRevenue: number;
  dividends: Record<StateId, number>;
  coop: Record<StateId, number>;
  remittances: number;
  stateCompanies: number;
  corporate: number;
  reinvest: number;
  foreignReinvest: number;
  stateReinvest: number;
  highTechVA: number;
}

function emptyFinance(): Finance {
  const sec = () => Object.fromEntries(SECTOR_IDS.map((s) => [s, 0])) as Record<SectorId, number>;
  const st = () => Object.fromEntries(STATE_IDS.map((s) => [s, 0])) as Record<StateId, number>;
  return {
    va: 0,
    vaSector: sec(),
    empSector: sec(),
    vaState: st(),
    wageBill: 0,
    privateProfit: 0,
    privateRevenue: 0,
    dividends: st(),
    coop: st(),
    remittances: 0,
    stateCompanies: 0,
    corporate: 0,
    reinvest: 0,
    foreignReinvest: 0,
    stateReinvest: 0,
    highTechVA: 0,
  };
}

/** Finanças dos edifícios: receita, custos, lucro e sua divisão entre os donos. */
export function settle(
  state: GameState,
  ctx: IndustryContext,
  runs: Run[],
  constructionRevenue: number,
  constructionCapacity: number,
): Finance {
  const f = emptyFinance();
  const prices = state.market.goods;
  for (const r of runs) {
    const { bs, info } = r;
    let revenue = 0;
    let inputCost = 0;
    let realOut = 0;
    let realIn = 0;
    for (const [g, q] of info.outputs) {
      revenue += q * r.run * r.pm * (prices[g]?.price ?? 1);
      realOut += q * r.run * r.pm;
    }
    let inputScale = 1;
    if (isConstruction(r.id)) {
      const pts = info.points * r.run * r.pm;
      const share = constructionCapacity > 0 ? pts / constructionCapacity : 0;
      revenue = constructionRevenue * share;
      const util = constructionCapacity > 0 ? Math.min(1, (state.industry.stats.constructionUsed || 0) / constructionCapacity) : 0;
      inputScale = util;
      realOut = revenue;
    }
    for (const [g, q] of info.inputs) {
      inputCost += q * r.run * inputScale * (prices[g]?.price ?? 1);
      realIn += q * r.run * inputScale;
    }
    const m = modsFor(ctx, r.stateId);
    const profit = revenue - inputCost - r.wageBill;
    bs.revenue = revenue;
    bs.inputCost = inputCost;
    bs.wageBill = r.wageBill;
    bs.subsidy = 0;
    const va = isPublic(r.id) ? r.wageBill : isInformal(r.id) ? realOut : Math.max(0, realOut - realIn);
    f.va += va;
    f.vaSector[r.sector] += va;
    f.vaState[r.stateId] += va;
    f.wageBill += r.wageBill;
    let emp = 0;
    for (const t of LABOR_TYPE_IDS) emp += r.jobs[t] ?? 0;
    f.empSector[r.sector] += emp;
    if (r.sector === 'high_tech') f.highTechVA += va;
    if (!isMarketBuilding(r.id) && !isConstruction(r.id)) {
      bs.profit = 0;
      continue;
    }
    // Margem e destino do lucro.
    const margin = revenue > K.epsilon ? profit / revenue : 0;
    bs.profit = profit;
    bs.avgMargin = approach(bs.avgMargin, margin, P.marginSmoothing);
    if (profit <= 0) {
      // Estatais majoritárias têm o prejuízo coberto pelo Tesouro.
      if (bs.ownership.state >= P.stateMajority) f.stateCompanies += profit * bs.ownership.state;
      continue;
    }
    const tr = taxRates(ctx, r.stateId);
    const own = bs.ownership;
    const sharing = clamp(m.profitSharing ?? 0, 0, 0.8);
    const toWorkers = profit * (own.private + own.foreign) * sharing;
    f.coop[r.stateId] += toWorkers + profit * own.cooperative;
    const priv = profit * own.private * (1 - sharing);
    const forn = profit * own.foreign * (1 - sharing);
    const corp = (priv + forn) * tr.corporate;
    f.corporate += corp;
    f.privateProfit += priv * (1 - tr.corporate);
    f.privateRevenue += revenue * own.private;
    const reinvestRate = clamp(K.baseReinvestment + (m.reinvestment ?? 0), 0, K.investment.reinvestmentMax);
    const netPriv = priv * (1 - tr.corporate);
    f.reinvest += netPriv * reinvestRate;
    f.dividends[r.stateId] += netPriv * (1 - reinvestRate);
    const netForn = forn * (1 - tr.corporate);
    f.foreignReinvest += netForn * P.foreignReinvestment;
    f.remittances += netForn * (1 - P.foreignReinvestment);
    const st = profit * own.state;
    f.stateReinvest += st * P.stateRetention;
    f.stateCompanies += st * (1 - P.stateRetention);
  }
  return f;
}

/** Ajustes dos edifícios após o mês: lotação, salários, fechamento e troca de método. */
export function adjustBuildings(state: GameState, ctx: IndustryContext, runs: Run[], rng: Rng): void {
  const ind = state.industry;
  for (const r of runs) {
    const { bs } = r;
    const m = modsFor(ctx, r.stateId);
    const flex = clamp(m.laborFlexibility ?? 1, 0.2, 3);
    if (isPublic(r.id)) {
      const cat = BUILDINGS[r.id].budgetCategory;
      const exec = cat ? (ctx.exec[cat]?.[r.stateId] ?? 1) : 1;
      bs.staffing = approach(bs.staffing, clamp(exec, 0.35, 1.3), 0.25);
      continue;
    }
    if (isInformal(r.id)) continue;
    const ref = ind.calib?.privateMargin0 ?? 0.12;
    const gap = bs.avgMargin - P.staffingMarginFloor;
    if (gap < 0) bs.staffing -= Math.min(P.fireRate, -gap * 0.5) * flex;
    else bs.staffing += Math.min(P.hireRate, gap * 0.3) * flex;
    bs.staffing = clamp(bs.staffing, P.staffingMin, 1);
    const wageTarget = clamp(1 + P.wageMarginSlope * (bs.avgMargin - ref), P.wageFactorMin, P.wageFactorMax);
    bs.wageFactor = approach(bs.wageFactor, wageTarget, P.wageFactorRate);
    if (bs.avgMargin < P.severeLossMargin && bs.ownership.state < P.stateMajority) {
      bs.lossMonths += 1;
      if (bs.lossMonths >= P.lossMonthsToClose) {
        bs.level = Math.max(0, bs.level - Math.max(1, bs.level * 0.08));
        bs.lossMonths = 0;
        bs.avgMargin = 0;
      }
    } else bs.lossMonths = Math.max(0, bs.lossMonths - 1);
    // Empresas privadas experimentam métodos mais lucrativos (devagar).
    if (bs.ownership.private + bs.ownership.foreign > 0.5 && rng.chance(P.methodSwitchChance))
      switchMethodIfBetter(state, ctx, r);
  }
}

/** Lucro por nível de um método aos preços e salários correntes. */
export function methodProfitPerLevel(
  state: GameState,
  ctx: IndustryContext,
  stateId: StateId,
  id: BuildingId,
  methodId: string,
  bs: BuildingState,
): { profit: number; revenue: number } {
  const info = methodInfo(id, methodId);
  const prices = state.market.goods;
  const pm = productivityOf(state, ctx, { stateId, bs, info, sector: BUILDINGS[id].sector });
  let revenue = 0;
  let cost = 0;
  for (const [g, q] of info.outputs) revenue += q * pm * (prices[g]?.price ?? 1);
  for (const [g, q] of info.inputs) cost += q * (prices[g]?.price ?? 1);
  const jobs: Partial<Record<LaborTypeId, number>> = {};
  addJobsByType(info, bs.ownership, 1, jobs);
  for (const t of LABOR_TYPE_IDS) {
    const n = jobs[t] ?? 0;
    if (n > 0) cost += annualBill(n, buildingWage(state, ctx, stateId, bs, t));
  }
  return { profit: revenue - cost, revenue };
}

/** Métodos que podem ser usados agora (tecnologia e leis). */
export function methodAllowed(state: GameState, id: BuildingId, methodId: string): string | null {
  const method = BUILDINGS[id].methods.find((m) => m.id === methodId);
  if (!method) return 'Método inexistente.';
  if ((method.minTech ?? 0) > state.industry.tech.level)
    return `Exige nível tecnológico ${method.minTech}.`;
  if (method.requiresLaws?.length) {
    const enacted = new Set(Object.values(state.laws.enacted));
    const fed = state.nation.federalLaws ? Object.values(state.nation.federalLaws.enacted) : [];
    for (const v of fed) enacted.add(v);
    if (!method.requiresLaws.some((l) => enacted.has(l))) return 'Exige outra lei em vigor.';
  }
  return null;
}

function switchMethodIfBetter(state: GameState, ctx: IndustryContext, r: Run): void {
  const current = methodProfitPerLevel(state, ctx, r.stateId, r.id, r.bs.methodId, r.bs).profit;
  let best = r.bs.methodId;
  let bestProfit = current;
  for (const m of BUILDINGS[r.id].methods) {
    if (m.id === r.bs.methodId || methodAllowed(state, r.id, m.id)) continue;
    const p = methodProfitPerLevel(state, ctx, r.stateId, r.id, m.id, r.bs).profit;
    if (p > bestProfit * (1 + P.methodSwitchGain) && p > 0) {
      best = m.id;
      bestProfit = p;
    }
  }
  r.bs.methodId = best;
}

/** Movimento da propriedade pelas leis (estatização, cooperativas, privatização, reforma agrária). */
export function driftOwnership(state: GameState, ctx: IndustryContext): void {
  for (const stateId of STATE_IDS) {
    const m = modsFor(ctx, stateId);
    for (const id of BUILDING_IDS) {
      const bs = state.industry.buildings[stateId][id];
      if (!bs || bs.level <= 0 || !isMarketBuilding(id)) continue;
      const o = bs.ownership;
      const nat = clamp(m.nationalizationRate ?? 0, 0, 1);
      const coop = clamp(m.cooperativizationRate ?? 0, 0, 1);
      const priv = clamp(m.privatizationRate ?? 0, 0, 1);
      const expr = clamp(m.expropriationRate ?? 0, 0, 1);
      const moveN = o.private * nat;
      const moveC = (o.private - moveN) * coop;
      o.private -= moveN + moveC;
      o.state += moveN;
      o.cooperative += moveC;
      const moveF = o.foreign * expr;
      o.foreign -= moveF;
      o.state += moveF;
      if (priv > 0) {
        const back = o.state * priv;
        o.state -= back;
        o.private += back;
      }
      // Pisos estatais (setores estratégicos e recursos naturais).
      let floor = m.stateShareFloor?.[id] ?? 0;
      if ((K.ownership.resourceBuildings as readonly BuildingId[]).includes(id))
        floor = Math.max(floor, m.resourceStateShare ?? 0);
      if (floor > o.state) {
        const need = (floor - o.state) * K.ownership.floorRate * 4;
        const fromP = Math.min(o.private, need);
        o.private -= fromP;
        o.state += fromP;
      }
      if ((m.landReform ?? 0) > 0 && BUILDINGS[id].sector === 'agro') {
        const move = o.private * K.ownership.landReformRate * (m.landReform ?? 0);
        o.private -= move;
        o.cooperative += move;
      }
      normalizeOwnership(o);
    }
  }
}

/** Retorno esperado de um nível novo (usado por investidores e pela interface). */
export function expectedReturn(
  state: GameState,
  ctx: IndustryContext,
  stateId: StateId,
  id: BuildingId,
  pointCostNow: number,
): number {
  const def = BUILDINGS[id];
  const bs = state.industry.buildings[stateId][id] ?? newBuildingState(def.methods[0]?.id ?? '', { private: 1, state: 0, cooperative: 0, foreign: 0 });
  const { profit } = methodProfitPerLevel(state, ctx, stateId, id, bs.methodId, bs);
  const cost = Math.max(1e-6, def.constructionCost * pointCostNow);
  let roi = profit / cost;
  const out = mainOutput(id);
  if (out) {
    const gm = state.market.goods[out];
    if (gm.demand > 0) roi += K.investment.importBonus * (gm.imports / gm.demand) + K.investment.shortageBonus * gm.shortage;
  }
  const credit = modsFor(ctx, stateId).creditSubsidy?.[def.sector] ?? 0;
  roi += (credit * K.investment.creditSubsidyPoints) / 100;
  return roi;
}

/** Recurso natural ainda disponível para o edifício no estado (níveis). */
export function resourceRoom(state: GameState, ctx: IndustryContext, stateId: StateId, id: BuildingId): number {
  const def = BUILDINGS[id];
  if (!def.resource) return Infinity;
  const potential = (STATE_RESOURCES[stateId]?.[def.resource] ?? 0) * clamp(modsFor(ctx, stateId).resourceExpansion ?? 1, 0.3, 2);
  let used = 0;
  for (const b of BUILDING_IDS) {
    if (BUILDINGS[b].resource !== def.resource) continue;
    used += state.industry.buildings[stateId][b]?.level ?? 0;
  }
  for (const p of state.industry.queue) if (p.stateId === stateId && BUILDINGS[p.buildingId].resource === def.resource) used += 1;
  return potential - used;
}

/** Cria uma obra na fila. */
export function queueProject(
  state: GameState,
  stateId: StateId,
  id: BuildingId,
  owner: ConstructionOwner,
  origin: ConstructionProject['origin'],
  costPerPoint: number,
): ConstructionProject {
  const ind = state.industry;
  ind.nextProjectId = (ind.nextProjectId ?? 0) + 1;
  const total = BUILDINGS[id].constructionCost;
  const project: ConstructionProject = {
    id: `obra_${ind.nextProjectId.toString(36)}`,
    stateId,
    buildingId: id,
    owner,
    origin,
    totalPoints: total,
    progress: 0,
    estimatedCost: total * costPerPoint,
    spent: 0,
    startedOn: state.date,
  };
  ind.queue.push(project);
  return project;
}

/** Investidores (privados, estrangeiros, estatais do plano e governo NPC) escolhem novas obras. */
export function investorsDecide(state: GameState, ctx: IndustryContext, pc: number, rng: Rng): void {
  const ind = state.industry;
  const capacity = Math.max(1, ind.constructionCapacity);
  const pending = () => ind.queue.reduce((a, p) => a + (p.totalPoints - p.progress), 0);
  const scale = state.population.scale || 1;
  const M = ctx.M;
  const candidates: { stateId: StateId; id: BuildingId; roi: number }[] = [];
  for (const stateId of STATE_IDS) {
    for (const id of BUILDING_IDS) {
      if (!isMarketBuilding(id) && !isConstruction(id)) continue;
      if (resourceRoom(state, ctx, stateId, id) < 1) continue;
      const roi = expectedReturn(state, ctx, stateId, id, pc);
      const spec = 1 + K.investment.specialtyWeight * ((ind.buildings[stateId][id]?.level ?? 0) > 0 ? 1 : 0);
      candidates.push({ stateId, id, roi: roi * spec });
    }
  }
  candidates.sort((a, b) => b.roi - a.roi);
  const top = candidates.slice(0, K.investment.topCandidates);
  const realRate = state.economy.interestRate - state.economy.inflation;
  const hurdle = Math.max(0.01, (realRate + (M.interestRateOffset ?? 0)) / 100) * K.investment.hurdleFactor;

  // Fila saturada e dinheiro sobrando: o mercado amplia a própria construção civil (obra na frente).
  const saturated = pending() >= K.investment.queueMonths * capacity * 0.9;
  if (saturated && !M.banPrivateInvestment) {
    const cost = BUILDINGS.construction_sector.constructionCost * pc;
    const ranked = [...STATE_IDS].sort((a, b) => (ind.buildings[b].construction_sector?.level ?? 0) - (ind.buildings[a].construction_sector?.level ?? 0));
    for (const stateId of ranked.slice(0, 2)) {
      if (ind.investmentPool < cost * 4) break;
      ind.investmentPool -= cost;
      const p = queueProject(state, stateId, 'construction_sector', 'private', 'market', pc);
      p.spent = cost;
      ind.queue.unshift(ind.queue.pop()!);
    }
  }

  const spend = (pool: 'investmentPool' | 'foreignPool' | 'statePool', owner: ConstructionOwner, origin: ConstructionProject['origin'], max: number, filter: (c: { id: BuildingId; roi: number }) => boolean) => {
    let made = 0;
    while (made < max * scale && pending() < K.investment.queueMonths * capacity) {
      const options = top.filter((c) => filter(c) && c.roi > hurdle);
      if (!options.length) break;
      const pick = rng.weightedPick(options, (c) => Math.max(0.0001, c.roi - hurdle));
      if (!pick) break;
      const cost = BUILDINGS[pick.id].constructionCost * pc;
      if (ind[pool] < cost) break;
      ind[pool] -= cost;
      const p = queueProject(state, pick.stateId, pick.id, owner, origin, pc);
      p.spent = cost; // pago adiantado pelo fundo
      made += 1;
    }
  };
  if (!M.banPrivateInvestment)
    spend('investmentPool', M.newPrivateAsCooperative ? 'cooperative' : 'private', 'market', K.investment.maxNewPrivate, (c) => BUILDINGS[c.id].buildableBy.includes('private'));
  if ((M.foreignInvestmentMult ?? 1) > 0)
    spend('foreignPool', 'foreign', 'market', K.investment.maxNewForeign, (c) => BUILDINGS[c.id].buildableBy.includes('private'));
  // Fundo das estatais/plano: segue os pesos do plano (ou do governo NPC).
  const weights = state.executive.plan?.weights ?? npcWeights(state);
  spend('statePool', 'state', state.executive.plan ? 'plan' : 'npc_gov', K.investment.maxNewState, (c) => {
      if (M.banStateIndustry) return false;
      const w = weights[BUILDINGS[c.id].sector] ?? 0;
      return w > 0 && BUILDINGS[c.id].buildableBy.includes('state');
    });
}

function npcWeights(state: GameState): Partial<Record<SectorId, number>> {
  const party = state.parties[state.landscape.presidentPartyId];
  const econ = party?.ideology.economy ?? 50;
  if (econ < K.investment.npcLeftThreshold) return K.investment.npcLeftWeights;
  if (econ > K.investment.npcRightThreshold) return {};
  return K.investment.npcCenterWeights;
}

/**
 * Construção: distribui os pontos do mês entre as obras (estatais primeiro, limitadas pelo dinheiro
 * do orçamento de investimento do jogador) e conclui as que terminarem.
 */
export function buildProjects(
  state: GameState,
  ctx: IndustryContext,
  capacity: number,
  pc: number,
): { used: number; stateSpend: number } {
  const ind = state.industry;
  let left = capacity;
  let stateSpend = 0;
  const gdpScale = ind.gdpScale || 1;
  // Dinheiro do mês para obras estatais do jogador (R$ bi reais → motor).
  const budget = ctx.playerBudget;
  let playerMoney = budget ? Math.max(0, budget.spending.industry) / 12 / gdpScale : 0;
  const discount = clamp(ctx.M.stateConstructionDiscount ?? 0, 0, 0.6);
  const order = [...ind.queue].sort((a, b) => Number(b.owner === 'state') - Number(a.owner === 'state'));
  const done: string[] = [];
  for (const p of order) {
    if (left <= 0) break;
    const remaining = p.totalPoints - p.progress;
    let pts = Math.min(remaining, left, Math.max(1, p.totalPoints * K.investment.maxProjectShare));
    if (p.owner === 'state' && p.origin === 'player') {
      const costPerPt = pc * (1 - discount);
      const affordable = costPerPt > 0 ? playerMoney / costPerPt : pts;
      pts = Math.min(pts, affordable);
      playerMoney -= pts * costPerPt;
      p.spent += pts * costPerPt * gdpScale;
      stateSpend += pts * costPerPt;
    }
    if (pts <= 0) continue;
    p.progress += pts;
    left -= pts;
    if (p.progress >= p.totalPoints - 1e-6) done.push(p.id);
  }
  for (const id of done) {
    const p = ind.queue.find((q) => q.id === id);
    if (!p) continue;
    const def = BUILDINGS[p.buildingId];
    const buildings = ind.buildings[p.stateId];
    let bs = buildings[p.buildingId];
    if (!bs) {
      bs = newBuildingState(def.methods[0]?.id ?? '', { private: 0, state: 0, cooperative: 0, foreign: 0 });
      buildings[p.buildingId] = bs;
    }
    addLevels(bs, 1, p.owner as OwnerKind);
    normalizeOwnership(bs.ownership);
  }
  ind.queue = ind.queue.filter((q) => !done.includes(q.id));
  return { used: capacity - left, stateSpend };
}

/** Composição-alvo dos Pops de trabalho e desemprego por estado (modelo aditivo). */
export function laborTargets(
  state: GameState,
  ctx: IndustryContext,
  stateId: StateId,
): { targets: Partial<Record<string, number>>; jobs: Partial<Record<LaborTypeId, number>>; informal: number; unemployed: number; laborForce: number; avail: number } {
  const calib = state.industry.calib;
  const people0 = calib?.people0[stateId] ?? {};
  const jobs0 = calib?.jobs0[stateId] ?? {};
  const jobs = formalJobs(state.industry.buildings[stateId]);
  let laborForce = 0;
  for (const t of WORKFORCE_TYPES) laborForce += state.population.pops[popId(stateId, t)]?.size ?? 0;
  const raw: Partial<Record<string, number>> = {};
  let employed = 0;
  for (const t of LABOR_TYPE_IDS) {
    // Empresários acompanham proporcionalmente os postos de dono (estatizar some com a classe);
    // os demais tipos mudam pelo saldo de postos (modelo aditivo).
    const v =
      t === 'business' && (jobs0[t] ?? 0) > 0
        ? (people0[t] ?? 0) * clamp((jobs[t] ?? 0) / (jobs0[t] ?? 1), 0, 3)
        : Math.max(0, (people0[t] ?? 0) + (jobs[t] ?? 0) - (jobs0[t] ?? 0));
    raw[t] = v;
    employed += v;
  }
  const maxEmp = laborForce * K.jobs.maxEmployment;
  const avail = employed > maxEmp && employed > 0 ? maxEmp / employed : 1;
  if (avail < 1) for (const t of LABOR_TYPE_IDS) raw[t] = (raw[t] ?? 0) * avail;
  employed = Math.min(employed, maxEmp);
  const slack = laborForce - employed;
  const slack0 = calib?.slack0[stateId] ?? slack;
  const m = modsFor(ctx, stateId);
  const phi = clamp(K.jobs.informalAbsorption + (m.informality ?? 0), K.labor.informalMin, K.labor.informalMax);
  const unemployed0 = people0.unemployed ?? 0;
  const shock = ((state.industry.unemploymentShock ?? 0) / 100) * laborForce;
  let unemployed = unemployed0 + (1 - phi) * (slack - slack0) + shock;
  unemployed = clamp(unemployed, unemployed0 * K.labor.minUnemploymentShare, slack);
  const workersExtra = slack - unemployed;
  raw.workers = (raw.workers ?? 0) + workersExtra;
  raw.unemployed = unemployed;
  const informal = Math.max(0, (raw.workers ?? 0) - (jobs.workers ?? 0));
  return { targets: raw, jobs, informal, unemployed, laborForce, avail };
}

/** Pops migram para a composição-alvo preservando o total do estado. */
export function migratePops(state: GameState, stateId: StateId, targets: Partial<Record<string, number>>, rate: number): void {
  let before = 0;
  let after = 0;
  const pops = WORKFORCE_TYPES.map((t) => state.population.pops[popId(stateId, t)]);
  for (const p of pops) if (p) before += p.size;
  for (const p of pops) {
    if (!p) continue;
    const target = targets[p.typeId] ?? p.size;
    p.size = Math.max(0, p.size + rate * (target - p.size));
    after += p.size;
  }
  if (after > 0 && before > 0) {
    const k = before / after;
    for (const p of pops) if (p) p.size = Math.round(p.size * k);
  }
}
