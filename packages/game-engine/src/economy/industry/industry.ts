import { approach, clamp } from '../../core/math';
import { hashSeed, Rng } from '../../core/rng';
import { STATE_IDS, type StateId } from '../../core/types';
import { STATES } from '../../map/states';
import { popId } from '../../population/population';
import type { PopTypeId } from '../../population/popTypes';
import type { GameState } from '../../simulation/state';
import { BUILDINGS } from './buildings.data';
import {
  INDUSTRIAL_SECTORS,
  isConstruction,
  isInformal,
  methodInfo,
  PRODUCERS,
  normalizeOwnership,
  profileFactors,
} from './catalog';
import { IndustryConstants as K } from './constants';
import { buildContext, modsFor, taxRates, type IndustryContext } from './context';
import { GOODS } from './goods.data';
import { STATE_RESOURCES, STATE_SPECIALTIES } from './resources.data';
import { annualBill, formalJobs, newBuildingState, wageRef, WORKFORCE_TYPES } from './shared';
import {
  adjustBuildings,
  buildingWage,
  buildProjects,
  clearMarket,
  constructionUnit,
  driftOwnership,
  investorsDecide,
  laborTargets,
  migratePops,
  pointCost,
  produce,
  rawFinalDemand,
  settle,
  zero,
  type Finance,
  type Flows,
  type Run,
} from './simulate';
import {
  BUILDING_IDS,
  GOOD_IDS,
  LABOR_TYPE_IDS,
  SECTOR_IDS,
  type BuildingId,
  type GoodId,
  type GoodMarketState,
  type IndustryState,
  type LaborMarketState,
  type LaborTypeId,
  type MarketState,
  type OwnerKind,
  type SectorId,
} from './types';

/**
 * Motor da economia industrial: geração/calibração inicial (`bootstrapEconomy`) e o tick
 * mensal (`runIndustryMonth`). As etapas ficam em `simulate.ts`.
 */

function zeroSectors(): Record<SectorId, number> {
  return Object.fromEntries(SECTOR_IDS.map((s) => [s, 0])) as Record<SectorId, number>;
}

function emptyLabor(): LaborMarketState {
  return { laborForce: 0, formalJobs: 0, filledJobs: 0, informal: 0, unemployed: 0, jobsByType: {}, avgWage: 0 };
}

/** Estrutura vazia e válida (sem edifícios). */
export function createEmptyIndustry(): IndustryState {
  return {
    buildings: Object.fromEntries(STATE_IDS.map((id) => [id, {}])) as IndustryState['buildings'],
    queue: [],
    constructionCapacity: 0,
    constructionPointCost: 0,
    investmentPool: 0,
    foreignPool: 0,
    statePool: 0,
    tech: { level: 0, progress: 0 },
    informalAbsorption: Object.fromEntries(STATE_IDS.map((id) => [id, K.jobs.informalAbsorption])) as Record<StateId, number>,
    labor: Object.fromEntries(STATE_IDS.map((id) => [id, emptyLabor()])) as Record<StateId, LaborMarketState>,
    gdpScale: 1,
    taxScale: 1,
    stats: {
      realOutput: 0,
      valueAddedBySector: zeroSectors(),
      employmentBySector: zeroSectors(),
      manufacturingShare: 0,
      wageBill: 0,
      profits: 0,
      privateInvestment: 0,
      stateInvestment: 0,
      foreignInvestment: 0,
      taxes: { income: 0, corporate: 0, consumption: 0, tariffs: 0, exportTax: 0, dividends: 0, wealth: 0, stateCompanies: 0 },
      exports: 0,
      imports: 0,
      tradeBalance: 0,
      constructionUsed: 0,
    },
    history: [],
  };
}

/** Mercado com todos os bens no preço-base. */
export function createInitialMarket(): MarketState {
  const goods = {} as Record<GoodId, GoodMarketState>;
  for (const id of GOOD_IDS) {
    goods[id] = {
      price: 1,
      supply: 0,
      demand: 0,
      demandPops: 0,
      demandIndustry: 0,
      demandGovernment: 0,
      demandConstruction: 0,
      imports: 0,
      exports: 0,
      worldPrice: GOODS[id].worldPrice,
      tariff: 0,
      shortage: 0,
      history: [],
    };
  }
  return { goods, exchangeRate: 1, cpi: 1, cpiHistory: [], demandFactor: 1, exchangeHistory: [] };
}

// ---------------------------------------------------------------------------
// Geração inicial
// ---------------------------------------------------------------------------

/** Grupos de alocação: o Pop principal ocupa os edifícios do seu setor. */
const ALLOCATION: { type: LaborTypeId; buildings: BuildingId[] }[] = [
  { type: 'farmers', buildings: ['farm_grain', 'farm_soy', 'ranch', 'plantation', 'forestry'] },
  {
    type: 'industrial_workers',
    buildings: [
      'mine',
      'oil_field',
      'refinery',
      'steel_mill',
      'chemical_plant',
      'cement_plant',
      'food_industry',
      'textile_mill',
      'consumer_factory',
      'machinery_factory',
      'auto_plant',
      'electronics_factory',
      'pharma_plant',
      'aerospace',
    ],
  },
  { type: 'tech_workers', buildings: ['tech_hub'] },
  { type: 'health_workers', buildings: ['hospital'] },
  { type: 'civil_servants', buildings: ['public_admin', 'school'] },
  { type: 'merchants', buildings: ['commerce'] },
];

function weightOf(stateId: StateId, id: BuildingId): number {
  const f = profileFactors(stateId);
  let w = 0.03;
  for (const [k, v] of Object.entries(BUILDINGS[id].profileWeights) as [keyof typeof f, number][]) w += v * f[k];
  return Math.max(0, w) * (STATE_SPECIALTIES[stateId]?.[id] ?? 1);
}

function jobsPerLevel(id: BuildingId, t: LaborTypeId): number {
  const info = methodInfo(id, BUILDINGS[id].methods[0]?.id ?? '');
  if (t === 'business') return info.business;
  return info.jobs.find(([j]) => j === t)?.[1] ?? 0;
}

function initialOwnership(id: BuildingId): Record<OwnerKind, number> {
  const o: Record<OwnerKind, number> = { private: 1, state: 0, cooperative: 0, foreign: 0 };
  const seed = K.initialOwnership[id];
  if (BUILDINGS[id].sector === 'public') return { private: 0, state: 1, cooperative: 0, foreign: 0 };
  if (isInformal(id)) return o;
  if (seed) {
    o.state = seed.state ?? 0;
    o.cooperative = seed.cooperative ?? 0;
    o.foreign = seed.foreign ?? 0;
    o.private = Math.max(0, 1 - o.state - o.cooperative - o.foreign);
  }
  normalizeOwnership(o);
  return o;
}

function setLevel(state: GameState, stateId: StateId, id: BuildingId, levels: number, staffing: number, rng: Rng): void {
  if (levels < K.bootstrap.minFractionalLevel) return;
  const bs = newBuildingState(BUILDINGS[id].methods[0]?.id ?? '', initialOwnership(id));
  bs.level = Math.round(levels * 10) / 10;
  bs.staffing = staffing;
  bs.productivity = clamp(1 + rng.normal(0, K.bootstrap.productivityNoise), 0.9, 1.1);
  state.industry.buildings[stateId][id] = bs;
}

/** Margem inicial a preços 1; corrige a produtividade para garantir margem mínima. */
function calibrateProductivity(state: GameState, ctx: IndustryContext): void {
  for (const stateId of STATE_IDS)
    for (const id of BUILDING_IDS) {
      const bs = state.industry.buildings[stateId][id];
      if (!bs || BUILDINGS[id].sector === 'public' || isInformal(id) || isConstruction(id)) continue;
      const info = methodInfo(id, bs.methodId);
      if (info.baseOutputValue <= 0) continue;
      let wages = 0;
      const jobs: Partial<Record<LaborTypeId, number>> = {};
      for (const [t, n] of info.jobs) jobs[t] = n;
      if (info.business) jobs.business = info.business;
      for (const t of LABOR_TYPE_IDS) wages += annualBill(jobs[t] ?? 0, buildingWage(state, ctx, stateId, bs, t));
      const cost = info.baseInputValue + wages;
      const margin = 1 - cost / (info.baseOutputValue * bs.productivity);
      if (margin < K.bootstrap.minStartMargin)
        bs.productivity = cost / ((1 - K.bootstrap.minStartMargin) * info.baseOutputValue);
      else if (margin > K.bootstrap.maxRefMargin)
        bs.productivity = cost / ((1 - K.bootstrap.maxRefMargin) * info.baseOutputValue);
    }
}

/**
 * Bens extrativos que o país exporta (absorção-alvo < 1, ex.: petróleo): se a demanda intermediária
 * já supera a oferta, os campos e minas crescem até o potencial de recursos do estado e o que faltar
 * vira produtividade — a renda do recurso (pré-sal, minério de alto teor).
 */
function sizeExportables(state: GameState, supply: Record<GoodId, number>, inputs: Record<GoodId, number>): void {
  const B = K.bootstrap;
  for (const g of GOOD_IDS) {
    const a = K.absorption[g] ?? 1;
    if (a >= 1 || !GOODS[g].tradeable || supply[g] <= 0) continue;
    const need = inputs[g] / a;
    if (supply[g] >= need) continue;
    const k = Math.min(B.exportableMaxScale, need / supply[g]);
    for (const stateId of STATE_IDS)
      for (const id of PRODUCERS[g]) {
        const bs = state.industry.buildings[stateId][id];
        if (!bs || isInformal(id)) continue;
        // Só a extração: escalar indústrias tiraria trabalhadores de outros setores na largada.
        const res = BUILDINGS[id].resource;
        if (!res) continue;
        const cap = (STATE_RESOURCES[stateId]?.[res] ?? 0) * B.resourceUseCap;
        const level = Math.min(bs.level * k, Math.max(bs.level, cap));
        bs.productivity *= Math.min(B.resourceRentMax, (bs.level * k) / Math.max(1e-9, level));
        bs.level = level;
      }
  }
}

/**
 * Gera a economia inicial (edifícios por estado a partir dos Pops, do perfil dos estados e dos
 * recursos) e calibra mercado, comércio, salários, impostos e PIB para o ponto de partida.
 * Usa só o `rng` recebido (derivado da seed) para não alterar o RNG principal do jogo.
 */
export function bootstrapEconomy(state: GameState, rng: Rng): void {
  state.industry = createEmptyIndustry();
  state.market = createInitialMarket();
  const ind = state.industry;
  const B = K.bootstrap;
  const staffing = clamp(1 - B.staffingUnemploymentSlope * Math.max(0, state.economy.unemployment - 7.5), B.staffingMin, 1);

  // 1) Edifícios a partir dos Pops.
  for (const stateId of STATE_IDS) {
    const people = (t: string) => state.population.pops[popId(stateId, t as PopTypeId)]?.size ?? 0;
    for (const group of ALLOCATION) {
      const total = people(group.type) * (B.mainTypeShare[group.type] ?? 0.85);
      const weights = group.buildings.map((id) => ({ id, w: jobsPerLevel(id, group.type) > 0 ? weightOf(stateId, id) : 0 }));
      const sumW = weights.reduce((a, x) => a + x.w, 0);
      if (sumW <= 0 || total <= 0) continue;
      for (const { id, w } of weights) {
        if (w <= 0) continue;
        let levels = (total * (w / sumW)) / jobsPerLevel(id, group.type);
        const res = BUILDINGS[id].resource;
        if (res) levels = Math.min(levels, (STATE_RESOURCES[stateId]?.[res] ?? 0) * B.resourceUseCap);
        setLevel(state, stateId, id, levels, staffing, rng);
      }
    }
    // Energia: mix nacional limitado pelos recursos do estado (dimensionada depois pela demanda).
    const workers = people('workers');
    for (const [id, share] of Object.entries(B.powerMix) as [BuildingId, number][]) {
      let levels = (workers * 0.012 * share) / Math.max(1, methodInfo(id, BUILDINGS[id].methods[0]?.id ?? '').totalJobs);
      const res = BUILDINGS[id].resource;
      if (res) levels = Math.min(levels, (STATE_RESOURCES[stateId]?.[res] ?? 0) * B.resourceUseCap);
      setLevel(state, stateId, id, Math.max(levels, id === 'power_thermal' ? 0.5 : 0), staffing, rng);
    }
    // Logística, bancos, construção (provisórios) e economia informal.
    const urban = STATES[stateId].profile.urbanization;
    setLevel(state, stateId, 'logistics', (workers * 0.05 * urban) / Math.max(1, jobsPerLevel('logistics', 'workers')), staffing, rng);
    setLevel(state, stateId, 'bank', (people('middle_class') * 0.08) / Math.max(1, jobsPerLevel('bank', 'middle_class')), staffing, rng);
    setLevel(state, stateId, 'construction_sector', (workers * 0.06) / Math.max(1, jobsPerLevel('construction_sector', 'workers')), staffing, rng);
    const formal = formalJobs(ind.buildings[stateId]).workers ?? 0;
    const informalPeople = Math.max(0, workers - formal) * 0.6;
    setLevel(state, stateId, 'informal', informalPeople / Math.max(1, jobsPerLevel('informal', 'workers')), 1, rng);
  }

  // 2) Calibração de produtividade e dimensionamento dos não comercializáveis.
  let ctx = buildContext(state);
  calibrateProductivity(state, ctx);
  for (let iter = 0; iter < B.sizingIterations; iter++) {
    const { supply, inputs } = produce(state, ctx);
    for (const g of ['electricity', 'transport', 'finance', 'services'] as GoodId[]) {
      const need = inputs[g] / 0.55;
      if (supply[g] >= need || supply[g] <= 0) continue;
      const k = Math.min(3, need / supply[g]);
      for (const stateId of STATE_IDS)
        for (const id of BUILDING_IDS) {
          const bs = ind.buildings[stateId][id];
          if (!bs || isInformal(id)) continue;
          if (methodInfo(id, bs.methodId).outputs.some(([o]) => o === g)) bs.level *= k;
        }
    }
    sizeExportables(state, supply, inputs);
  }

  // 3) Construção civil dimensionada pelo investimento inicial.
  let first = produce(state, ctx);
  let unit = constructionUnit(first.runs);
  const pc0 = pointCost(state, unit.perPoint, unit.wagePerPoint);
  const prelim = settle(state, ctx, first.runs, 0, unit.capacity);
  const neededPoints = (B.investmentShare * prelim.va) / 12 / Math.max(1e-6, pc0) / B.constructionUtilization;
  if (unit.capacity > 0) {
    const k = clamp(neededPoints / unit.capacity, 0.2, 5);
    for (const stateId of STATE_IDS) {
      const bs = ind.buildings[stateId].construction_sector;
      if (bs) bs.level *= k;
    }
  }
  first = produce(state, ctx);
  unit = constructionUnit(first.runs);
  const pc = pointCost(state, unit.perPoint, unit.wagePerPoint);
  ind.constructionCapacity = unit.capacity;
  ind.constructionPointCost = pc;

  // 4) Fila inicial de obras (investimento em curso).
  const monthlyInvest = unit.capacity * B.constructionUtilization * pc;
  ind.investmentPool = monthlyInvest * B.initialQueueMonths * 0.7;
  ind.foreignPool = monthlyInvest * B.initialQueueMonths * 0.2;
  ind.statePool = monthlyInvest * B.initialQueueMonths * 0.1;
  investorsDecide(state, ctx, pc, rng);

  // 5) Mercado: demanda final calibrada para a absorção-alvo e preços mundiais-âncora.
  const used = unit.capacity * B.constructionUtilization;
  const construction = zero();
  for (const [g, q] of unit.perPoint) construction[g] = q * used * 12;
  const raw = rawFinalDemand(state, ctx);
  const mult = {} as Record<GoodId, number>;
  const worldAnchor = {} as Record<GoodId, number>;
  for (const g of GOOD_IDS) {
    const S = first.supply[g];
    const target = (K.absorption[g] ?? 1) * S;
    const fixed = first.inputs[g] + construction[g];
    const finalRaw = raw.pops[g] + raw.gov[g];
    const finalWanted = Math.max(target - fixed, 0.08 * Math.max(target, fixed));
    mult[g] = finalRaw > 0 ? finalWanted / finalRaw : 1;
    const def = GOODS[g];
    const a = K.absorption[g] ?? 1;
    const tariff = ctx.tariff[g] ?? 0;
    worldAnchor[g] = !def.tradeable
      ? def.worldPrice
      : a < 0.98
        ? 1 / Math.max(0.5, 1 - def.transportCost - ctx.exportTax)
        : a > 1.02
          ? 1 / (1 + tariff + def.transportCost)
          : def.worldPrice;
    state.market.goods[g].worldPrice = worldAnchor[g];
  }
  const pops = zero();
  const gov = zero();
  const demand = zero();
  for (const g of GOOD_IDS) {
    pops[g] = raw.pops[g] * mult[g];
    gov[g] = raw.gov[g] * mult[g];
    demand[g] = pops[g] + gov[g] + first.inputs[g] + construction[g];
  }
  ind.stats.constructionUsed = used;
  const trade = clearMarket(state, ctx, first.supply, demand, { pops, industry: first.inputs, gov, construction }, false);
  for (const g of GOOD_IDS) state.market.goods[g].price = 1;

  // 6) Finanças, impostos e âncoras.
  const fin = settle(state, ctx, first.runs, used * pc * 12, unit.capacity);
  const taxBase = taxBaseOf(state, ctx, first.runs, fin, pops, trade);
  const cpiWeights: Partial<Record<GoodId, number>> = {};
  for (const g of GOOD_IDS) if (pops[g] > 0) cpiWeights[g] = pops[g];
  const people0 = {} as Record<StateId, Partial<Record<string, number>>>;
  const jobs0 = {} as Record<StateId, Partial<Record<LaborTypeId, number>>>;
  const slack0 = {} as Record<StateId, number>;
  for (const stateId of STATE_IDS) {
    const p: Partial<Record<string, number>> = {};
    let lf = 0;
    let employed = 0;
    for (const t of WORKFORCE_TYPES) {
      const v = state.population.pops[popId(stateId, t)]?.size ?? 0;
      p[t] = v;
      lf += v;
      if (t !== 'unemployed') employed += v;
    }
    people0[stateId] = p;
    jobs0[stateId] = formalJobs(ind.buildings[stateId]);
    slack0[stateId] = lf - Math.min(employed, lf * K.jobs.maxEmployment);
  }
  const income0: Record<string, number> = {};
  for (const pop of Object.values(state.population.pops)) income0[pop.id] = pop.income;
  const transfer0: Partial<Record<string, number>> = {};
  for (const [t, v] of Object.entries(ctx.M.transfers ?? {})) transfer0[t] = v ?? 0;
  let marginNum = 0;
  let marginDen = 0;
  for (const stateId of STATE_IDS)
    for (const id of BUILDING_IDS) {
      const bs = ind.buildings[stateId][id];
      if (!bs || bs.revenue <= 0) continue;
      marginNum += bs.profit;
      marginDen += bs.revenue;
      bs.avgMargin = bs.revenue > 0 ? bs.profit / bs.revenue : 0;
    }
  ind.calib = {
    finalDemandMult: mult,
    worldAnchor,
    cpiWeights,
    jobs0,
    people0,
    slack0,
    income0,
    transfer0,
    dividends0: { ...fin.dividends },
    output0: fin.va,
    taxBase0: taxBase.total,
    highTechVA0: Math.max(1e-6, fin.highTechVA),
    privateMargin0: marginDen > 0 ? marginNum / marginDen : 0.12,
    realRate0: state.economy.interestRate - state.economy.inflation,
    confidence0: state.economy.confidence,
    tradeBalance0: 0,
    unemploymentRate0: Object.fromEntries(STATE_IDS.map((s) => [s, state.regions[s]?.unemployment ?? state.economy.unemployment])) as Record<StateId, number>,
    nationalUnemployment0: state.economy.unemployment,
  };
  ind.gdpScale = fin.va > 0 ? state.economy.gdp / fin.va : 1;
  ind.taxScale = taxBase.total > 0 ? state.economy.revenue / taxBase.total : 1;
  ind.priceLevel = 1;
  ind.tfp = 0;
  ind.shockLevel = 0;
  ind.unemploymentShock = 0;
  ind.wageIndex = Object.fromEntries(STATE_IDS.map((s) => [s, 1])) as Record<StateId, number>;
  ind.laborAvail = Object.fromEntries(STATE_IDS.map((s) => [s, 1])) as Record<StateId, number>;
  ctx = buildContext(state);
  recordLabor(state, ctx, first.runs, 0);
  recordStats(state, ctx, first.runs, fin, trade, taxBase, used, 0);
  ind.calib.tradeBalance0 = ind.stats.tradeBalance / Math.max(1e-6, fin.va);
  for (const pop of Object.values(state.population.pops)) pop.sol = 50;
  // A situação inicial (crise, bonança) entra como demanda agregada fora do equilíbrio calibrado.
  state.market.demandFactor = clamp(1 + (state.economy.growth - 2) * 0.02, 0.85, 1.1);
}

// ---------------------------------------------------------------------------
// Tick mensal
// ---------------------------------------------------------------------------

interface TaxBase {
  income: number;
  corporate: number;
  consumption: number;
  tariffs: number;
  exportTax: number;
  dividends: number;
  wealth: number;
  stateCompanies: number;
  total: number;
}

function taxBaseOf(
  state: GameState,
  ctx: IndustryContext,
  runs: Run[],
  fin: Finance,
  pops: Flows,
  trade: { imports: Flows; exports: Flows },
): TaxBase {
  const goods = state.market.goods;
  const fx = state.market.exchangeRate;
  let income = 0;
  for (const r of runs) income += r.wageBill * taxRates(ctx, r.stateId).income;
  let consumption = 0;
  let tariffs = 0;
  let exportTax = 0;
  for (const g of GOOD_IDS) {
    consumption += pops[g] * goods[g].price * (ctx.consumptionTax[g] ?? 0);
    tariffs += trade.imports[g] * goods[g].worldPrice * fx * (ctx.tariff[g] ?? 0);
    exportTax += trade.exports[g] * goods[g].worldPrice * fx * ctx.exportTax;
  }
  let dividends = 0;
  let wealth = 0;
  for (const stateId of STATE_IDS) {
    const tr = taxRates(ctx, stateId);
    dividends += fin.dividends[stateId] * tr.dividend;
    wealth += fin.dividends[stateId] * tr.wealth * 4;
  }
  const out = { income, corporate: fin.corporate, consumption, tariffs, exportTax, dividends, wealth, stateCompanies: fin.stateCompanies, total: 0 };
  out.total = income + out.corporate + consumption + tariffs + exportTax + dividends + wealth + out.stateCompanies;
  return out;
}

/** Mercado de trabalho, migração dos Pops e desemprego regional. */
function recordLabor(state: GameState, ctx: IndustryContext, runs: Run[], rate: number): void {
  const ind = state.industry;
  const wageSum = {} as Record<StateId, number>;
  const jobSum = {} as Record<StateId, number>;
  for (const r of runs) {
    let n = 0;
    for (const t of LABOR_TYPE_IDS) n += r.jobs[t] ?? 0;
    if (isInformal(r.id)) continue;
    wageSum[r.stateId] = (wageSum[r.stateId] ?? 0) + (r.wageBill * 1e9) / 12;
    jobSum[r.stateId] = (jobSum[r.stateId] ?? 0) + n;
  }
  for (const stateId of STATE_IDS) {
    const lt = laborTargets(state, ctx, stateId);
    if (rate > 0) migratePops(state, stateId, lt.targets, rate);
    let formal = 0;
    for (const t of LABOR_TYPE_IDS) formal += lt.jobs[t] ?? 0;
    ind.labor[stateId] = {
      laborForce: lt.laborForce,
      formalJobs: formal,
      filledJobs: formal * lt.avail,
      informal: lt.informal,
      unemployed: lt.unemployed,
      jobsByType: lt.jobs,
      avgWage: (jobSum[stateId] ?? 0) > 0 ? (wageSum[stateId] ?? 0) / (jobSum[stateId] ?? 1) : 0,
    };
    ind.laborAvail![stateId] = lt.avail;
    // Taxa medida ancorada na taxa inicial do estado (o tamanho do Pop de desempregados é uma
    // proporção demográfica, não a taxa oficial).
    const region = state.regions[stateId];
    const u0 = ind.calib?.people0[stateId]?.unemployed ?? 0;
    const rate0 = ind.calib?.unemploymentRate0[stateId];
    if (region && rate0 !== undefined && u0 > 0) region.unemployment = clamp((rate0 * lt.unemployed) / u0, 1, 40);
  }
}

/** Renda dos Pops (salários, dividendos, transferências) e padrão de vida. */
function updateIncomes(state: GameState, ctx: IndustryContext, runs: Run[], fin: Finance, shortage: number): void {
  const ind = state.industry;
  const calib = ind.calib!;
  // Salário médio pago por tipo e estado, relativo à referência.
  const paid = {} as Record<string, number>;
  const count = {} as Record<string, number>;
  for (const r of runs) {
    if (isInformal(r.id)) continue;
    for (const t of LABOR_TYPE_IDS) {
      const n = r.jobs[t] ?? 0;
      if (n <= 0) continue;
      const key = `${r.stateId}:${t}`;
      paid[key] = (paid[key] ?? 0) + n * buildingWage(state, ctx, r.stateId, r.bs, t);
      count[key] = (count[key] ?? 0) + n;
    }
  }
  const cpi = state.market.cpi || 1;
  for (const stateId of STATE_IDS) {
    const m = modsFor(ctx, stateId);
    const social = ctx.exec.social?.[stateId] ?? 1;
    const pensions = ctx.exec.pensions?.[stateId] ?? 1;
    let employed = 0;
    for (const t of LABOR_TYPE_IDS) employed += state.population.pops[popId(stateId, t)]?.size ?? 0;
    const coopBonus = employed > 0 ? (fin.coop[stateId] * 1e9) / 12 / employed : 0;
    const div0 = calib.dividends0[stateId] ?? 0;
    const divRatio = div0 > 1e-9 ? fin.dividends[stateId] / div0 : 1;
    const tr = taxRates(ctx, stateId);
    for (const t of [...WORKFORCE_TYPES, 'students', 'retirees'] as PopTypeId[]) {
      const pop = state.population.pops[popId(stateId, t)];
      if (!pop) continue;
      const base = calib.income0[pop.id] ?? pop.income;
      const transfer = (m.transfers?.[t] ?? 0) * social - (calib.transfer0[t] ?? 0);
      let target: number;
      if (t === 'business') target = base * clamp(0.35 + 0.65 * divRatio, 0.15, 3) * (1 - tr.wealth);
      else if (t === 'unemployed' || t === 'students') target = base;
      else if (t === 'retirees') target = base * clamp(pensions, 0.4, 1.6);
      else {
        const key = `${stateId}:${t}`;
        const ref = wageRef(stateId, t as LaborTypeId);
        const ratio = (count[key] ?? 0) > 0 ? (paid[key] ?? 0) / (count[key] ?? 1) / ref : 1;
        target = base * clamp(ratio, 0.4, 2.5) + coopBonus;
      }
      target = Math.max(K.labor.incomeFloor, target + transfer);
      pop.income = Math.round(approach(pop.income, target, K.labor.incomeSmoothing));
      const real = pop.income / cpi;
      pop.sol = clamp(50 + K.labor.solIncomeFactor * Math.log(Math.max(1, real) / Math.max(1, base)) - K.labor.solShortagePenalty * shortage, 0, 100);
    }
    // Renda média do estado (indicador regional).
    const region = state.regions[stateId];
    if (region) {
      let num = 0;
      let den = 0;
      for (const t of LABOR_TYPE_IDS) {
        const pop = state.population.pops[popId(stateId, t)];
        if (!pop) continue;
        num += pop.income * pop.size;
        den += pop.size;
      }
      if (den > 0) region.income = Math.round(num / den);
    }
  }
}

function recordStats(
  state: GameState,
  ctx: IndustryContext,
  runs: Run[],
  fin: Finance,
  trade: { imports: Flows; exports: Flows },
  tax: TaxBase,
  used: number,
  investmentFlow: number,
): void {
  const ind = state.industry;
  const goods = state.market.goods;
  const fx = state.market.exchangeRate;
  let exports = 0;
  let imports = 0;
  for (const g of GOOD_IDS) {
    exports += trade.exports[g] * goods[g].worldPrice * fx;
    imports += trade.imports[g] * goods[g].worldPrice * fx;
  }
  let industrial = 0;
  for (const s of INDUSTRIAL_SECTORS) industrial += fin.vaSector[s];
  const k = ind.taxScale;
  ind.stats = {
    realOutput: fin.va,
    valueAddedBySector: fin.vaSector,
    employmentBySector: fin.empSector,
    manufacturingShare: fin.va > 0 ? industrial / fin.va : 0,
    wageBill: fin.wageBill,
    profits: fin.privateProfit,
    privateInvestment: fin.reinvest,
    stateInvestment: fin.stateReinvest,
    foreignInvestment: fin.foreignReinvest,
    taxes: {
      income: tax.income * k,
      corporate: tax.corporate * k,
      consumption: tax.consumption * k,
      tariffs: tax.tariffs * k,
      exportTax: tax.exportTax * k,
      dividends: tax.dividends * k,
      wealth: tax.wealth * k,
      stateCompanies: tax.stateCompanies * k,
    },
    exports,
    imports,
    tradeBalance: exports - imports,
    constructionUsed: used,
    remittances: fin.remittances,
    dividends: Object.values(fin.dividends).reduce((a, b) => a + b, 0),
    investmentFlow,
  };
  void runs;
  void ctx;
  let lf = 0;
  let un = 0;
  let wage = 0;
  let jobs = 0;
  for (const s of STATE_IDS) {
    lf += ind.labor[s].laborForce;
    un += ind.labor[s].unemployed;
    wage += ind.labor[s].avgWage * ind.labor[s].formalJobs;
    jobs += ind.labor[s].formalJobs;
  }
  ind.history.push({
    date: state.date,
    realOutput: fin.va,
    manufacturingShare: ind.stats.manufacturingShare,
    exports,
    imports,
    unemployment: lf > 0 ? (un / lf) * 100 : 0,
    avgWage: jobs > 0 ? wage / jobs : 0,
    constructionCapacity: ind.constructionCapacity,
    investment: investmentFlow,
  });
  if (ind.history.length > K.historyMonths) ind.history.shift();
}

/** Preços mundiais (passeio aleatório com reversão) e câmbio. */
function updateWorld(state: GameState, rng: Rng): void {
  const calib = state.industry.calib!;
  for (const g of GOOD_IDS) {
    const gm = state.market.goods[g];
    const anchor = calib.worldAnchor[g] ?? 1;
    const vol = GOODS[g].worldVolatility;
    const drift = K.world.meanReversion * Math.log(anchor / Math.max(1e-6, gm.worldPrice));
    gm.worldPrice = clamp(gm.worldPrice * Math.exp(drift + (vol > 0 ? rng.normal(0, vol) : 0)), K.world.worldPriceMin, K.world.worldPriceMax);
  }
  const ind = state.industry;
  const E = K.exchange;
  const out = Math.max(1e-6, ind.stats.realOutput);
  const tb = ind.stats.tradeBalance / out - calib.tradeBalance0;
  const rem = (ind.stats.remittances ?? 0) / out;
  const realRate = state.economy.interestRate - state.economy.inflation - calib.realRate0;
  const conf = (calib.confidence0 - state.economy.confidence) / 50;
  const target = clamp(1 - E.tradeBalance * tb + E.remittances * rem * 0.2 - E.realRate * realRate + E.confidence * conf, E.min, E.max);
  state.market.exchangeTarget = target;
  state.market.exchangeRate = clamp(approach(state.market.exchangeRate, target, E.adjustRate), E.min, E.max);
  state.market.exchangeHistory = [...(state.market.exchangeHistory ?? []), { date: state.date, value: state.market.exchangeRate }].slice(-K.historyMonths);
}

/**
 * Um mês da economia industrial: produção, obras, mercado, comércio exterior, finanças, impostos,
 * investimento, emprego, renda dos Pops e tecnologia. Chamado por `updateEconomy`.
 * Usa um RNG derivado da seed e da data (não perturba o RNG principal).
 */
export function runIndustryMonth(state: GameState, _rng: Rng): void {
  const ind = state.industry;
  if (!ind?.calib) return;
  const rng = new Rng(hashSeed(state.meta.seed, 'industry', state.date));
  const calib = ind.calib;
  const ctx = buildContext(state);
  const M = ctx.M;
  updateWorld(state, rng);

  // Choques dos eventos e difusão tecnológica.
  let growthShock = 0;
  let unemploymentShock = 0;
  for (const s of state.economy.shocks) {
    growthShock += s.growth;
    unemploymentShock += s.unemployment;
  }
  ind.shockLevel = clamp((ind.shockLevel ?? 0) * 0.97 + growthShock * K.macro.shockProductivity, K.macro.shockLevelMin, K.macro.shockLevelMax);
  ind.unemploymentShock = (ind.unemploymentShock ?? 0) * (1 - K.macro.unemploymentShockDecay) + unemploymentShock / 12;
  ind.tfp = (ind.tfp ?? 0) + K.production.tfpDrift / 12 + ((ctx.legacy.growth ?? 0) * K.macro.legacyGrowthToTfp) / 12;

  // 1) Produção e 2) obras.
  const { runs, supply, inputs } = produce(state, ctx);
  const unit = constructionUnit(runs);
  const pc = pointCost(state, unit.perPoint, unit.wagePerPoint);
  ind.constructionCapacity = unit.capacity;
  ind.constructionPointCost = pc;
  investorsDecide(state, ctx, pc, rng);
  const built = buildProjects(state, ctx, unit.capacity, pc);
  const construction = zero();
  for (const [g, q] of unit.perPoint) construction[g] = q * built.used * 12;
  ind.stats.constructionUsed = built.used;

  // 3) Demanda final e 4) mercado.
  const raw = rawFinalDemand(state, ctx);
  const pops = zero();
  const gov = zero();
  const demand = zero();
  for (const g of GOOD_IDS) {
    const k = calib.finalDemandMult[g] ?? 1;
    pops[g] = raw.pops[g] * k;
    gov[g] = raw.gov[g] * k;
    demand[g] = pops[g] + gov[g] + inputs[g] + construction[g];
  }
  const trade = clearMarket(state, ctx, supply, demand, { pops, industry: inputs, gov, construction }, true);

  // 5) Finanças, subsídios e impostos.
  const fin = settle(state, ctx, runs, built.used * pc * 12, unit.capacity);
  applySubsidies(state, ctx, runs, fin);
  const tax = taxBaseOf(state, ctx, runs, fin, pops, trade);

  // 6) Fundos de investimento.
  const realRate = state.economy.interestRate - state.economy.inflation;
  const climate = clamp(
    1 - K.investment.interestSensitivity * (realRate + (M.interestRateOffset ?? 0) - calib.realRate0) + K.investment.confidenceSensitivity * (state.economy.confidence - calib.confidence0),
    0.3,
    1.8,
  );
  const legacyInv = 1 + (ctx.legacy.investment ?? 0) / K.investment.legacyInvestmentBase;
  if (!M.banPrivateInvestment) ind.investmentPool += (fin.reinvest / 12) * (M.privateInvestmentMult ?? 1) * climate * legacyInv;
  else for (const s of STATE_IDS) fin.dividends[s] += fin.reinvest * (fin.dividends[s] / Math.max(1e-9, Object.values(fin.dividends).reduce((a, b) => a + b, 0)));
  ind.foreignPool += ((fin.foreignReinvest + K.investment.fdiShare * calib.output0) / 12) * clamp(M.foreignInvestmentMult ?? 1, 0, 2) * climate;
  ind.statePool += fin.stateReinvest / 12;
  const leak = K.investment.poolLeak;
  ind.investmentPool *= 1 - leak;
  ind.foreignPool *= 1 - leak;
  ind.statePool *= 1 - leak;

  // 7) Ajustes dos edifícios e da propriedade.
  adjustBuildings(state, ctx, runs, rng);
  driftOwnership(state, ctx);

  // 8) Trabalho, Pops e salários.
  const rate = state.phase === 'governing' || state.phase === 'legislating' ? K.labor.migrationRate : K.labor.migrationRateSlow;
  recordLabor(state, ctx, runs, rate);
  for (const s of STATE_IDS) {
    const lf = ind.labor[s].laborForce;
    const u = lf > 0 ? ind.labor[s].unemployed / lf : 0;
    const p0 = calib.people0[s] ?? {};
    let lf0 = 0;
    for (const t of WORKFORCE_TYPES) lf0 += p0[t] ?? 0;
    const u0 = lf0 > 0 ? (p0.unemployed ?? 0) / lf0 : u;
    const tight = K.labor.wageTightness * ((u0 - u) / Math.max(0.02, u0));
    const prod = K.labor.wageProductivityPassThrough * ((ind.tfp ?? 0) + ind.tech.level * K.production.techBonusPerLevel);
    ind.wageIndex![s] = clamp(approach(ind.wageIndex![s] ?? 1, 1 + tight + prod, K.labor.wageIndexRate), K.labor.wageIndexMin, K.labor.wageIndexMax);
  }
  let shortage = 0;
  let wsum = 0;
  for (const [g, w] of Object.entries(calib.cpiWeights) as [GoodId, number][]) {
    shortage += w * state.market.goods[g].shortage;
    wsum += w;
  }
  shortage = wsum > 0 ? shortage / wsum : 0;
  updateIncomes(state, ctx, runs, fin, shortage);

  // 9) Tecnologia.
  const T = K.tech;
  const highTech = calib.highTechVA0 > 0 ? fin.highTechVA / calib.highTechVA0 : 1;
  const effort = T.scienceWeight * (ctx.execNational.science ?? 1) + T.educationWeight * (ctx.execNational.education ?? 1) + T.highTechWeight * highTech;
  if (ind.tech.level < T.maxLevel) {
    ind.tech.progress += (T.baseProgress * effort * clamp(M.techRate ?? 1, 0.2, 3)) / (1 + T.levelCostGrowth * ind.tech.level);
    if (ind.tech.progress >= 1) {
      ind.tech.level += 1;
      ind.tech.progress = 0;
    }
  }

  // 10) Índice de preços e estatísticas.
  let cpiNum = 0;
  for (const [g, w] of Object.entries(calib.cpiWeights) as [GoodId, number][]) cpiNum += w * state.market.goods[g].price;
  state.market.cpi = wsum > 0 ? cpiNum / wsum : 1;
  state.market.cpiHistory.push({ date: state.date, value: state.market.cpi });
  if (state.market.cpiHistory.length > K.historyMonths) state.market.cpiHistory.shift();
  for (const g of GOOD_IDS) {
    const gm = state.market.goods[g];
    gm.history.push({ date: state.date, price: gm.price, supply: gm.supply, demand: gm.demand, imports: gm.imports, exports: gm.exports });
    if (gm.history.length > K.historyMonths) gm.history.shift();
  }
  const investmentFlow = built.used * pc * 12;
  recordStats(state, ctx, runs, fin, trade, tax, built.used, investmentFlow);
  void built.stateSpend;
}

/** Subsídios setoriais (decretos): somam ao lucro dos edifícios do setor. */
function applySubsidies(state: GameState, ctx: IndustryContext, runs: Run[], fin: Finance): void {
  const subsidies = ctx.M.subsidies;
  if (!subsidies) return;
  const gdpScale = state.industry.gdpScale || 1;
  for (const [sector, amount] of Object.entries(subsidies) as [SectorId, number][]) {
    if (!amount) continue;
    const inSector = runs.filter((r) => r.sector === sector && r.run > 0 && r.bs.revenue > 0);
    const total = inSector.reduce((a, r) => a + r.run, 0);
    if (total <= 0) continue;
    const engine = amount / gdpScale;
    for (const r of inSector) {
      const s = (engine * r.run) / total;
      r.bs.subsidy = s;
      r.bs.profit += s;
      r.bs.avgMargin = approach(r.bs.avgMargin, r.bs.revenue > 0 ? r.bs.profit / r.bs.revenue : 0, 0.2);
      fin.dividends[r.stateId] += s * (r.bs.ownership.private + r.bs.ownership.cooperative) * 0.5;
      fin.reinvest += s * r.bs.ownership.private * 0.5;
    }
  }
}

