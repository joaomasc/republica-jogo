import { clamp, round } from '../../core/math';
import { STATE_IDS, type IsoDate, type StateId } from '../../core/types';
import { GOOD_CATEGORY_LABELS, SECTOR_LABELS } from '../../executive/labels';
import { STATES } from '../../map/states';
import type { GameState } from '../../simulation/state';
import { canOrderConstruction, stateConstructionCost } from './actions';
import { BUILDINGS } from './buildings.data';
import { isInformal, methodInfo, PRODUCERS } from './catalog';
import { buildContext } from './context';
import { GOODS } from './goods.data';
import { STATE_RESOURCES } from './resources.data';
import { expectedReturn, methodAllowed, resourceRoom } from './simulate';
import {
  BUILDING_IDS,
  GOOD_IDS,
  SECTOR_IDS,
  type BuildingId,
  type GoodCategory,
  type GoodId,
  type OwnerKind,
  type ResourceId,
  type SectorId,
} from './types';

/**
 * Seletores da economia industrial para a interface. Puros e baratos; valores em R$ bi reais
 * (já convertidos pela escala do PIB) quando o rótulo diz "R$".
 */

export { SECTOR_LABELS, GOOD_CATEGORY_LABELS };

export const OWNER_LABELS: Record<OwnerKind, string> = {
  private: 'Privada',
  state: 'Estatal',
  cooperative: 'Cooperativa',
  foreign: 'Estrangeira',
};

export const RESOURCE_LABELS: Record<ResourceId, string> = {
  arable: 'Terra cultivável',
  pasture: 'Pastagens',
  forest: 'Florestas plantadas',
  iron: 'Minério de ferro',
  oil: 'Petróleo',
  hydro: 'Potencial hidrelétrico',
  wind_solar: 'Vento e sol',
};

function real(state: GameState, engine: number): number {
  return engine * (state.industry.gdpScale || 1) * (state.industry.priceLevel ?? 1);
}

export interface SectorRow {
  id: SectorId;
  name: string;
  valueAdded: number;
  share: number;
  employment: number;
}

export interface EconomyDashboard {
  gdp: number;
  growth: number;
  inflation: number;
  unemployment: number;
  interestRate: number;
  exchangeRate: number;
  cpi: number;
  confidence: number;
  debt: number;
  exports: number;
  imports: number;
  tradeBalance: number;
  manufacturingShare: number;
  techLevel: number;
  techProgress: number;
  constructionCapacity: number;
  constructionUsed: number;
  pools: { private: number; foreign: number; state: number };
  taxes: { label: string; value: number }[];
  sectors: SectorRow[];
  history: { date: IsoDate; manufacturing: number; exports: number; imports: number; unemployment: number; output: number }[];
}

/** Visão geral da economia (painel "Economia"). */
export function economyDashboard(state: GameState): EconomyDashboard {
  const ind = state.industry;
  const e = state.economy;
  const s = ind.stats;
  const t = s.taxes;
  const pl = ind.priceLevel ?? 1;
  const totalVA = Math.max(1e-9, s.realOutput);
  const sectors = SECTOR_IDS.map((id) => ({
    id,
    name: SECTOR_LABELS[id],
    valueAdded: real(state, s.valueAddedBySector[id] ?? 0),
    share: (s.valueAddedBySector[id] ?? 0) / totalVA,
    employment: s.employmentBySector[id] ?? 0,
  })).sort((a, b) => b.valueAdded - a.valueAdded);
  return {
    gdp: e.gdp,
    growth: e.growth,
    inflation: e.inflation,
    unemployment: e.unemployment,
    interestRate: e.interestRate,
    exchangeRate: state.market.exchangeRate,
    cpi: state.market.cpi,
    confidence: e.confidence,
    debt: e.debt,
    exports: real(state, s.exports),
    imports: real(state, s.imports),
    tradeBalance: real(state, s.tradeBalance),
    manufacturingShare: s.manufacturingShare,
    techLevel: ind.tech.level,
    techProgress: ind.tech.progress,
    constructionCapacity: ind.constructionCapacity,
    constructionUsed: s.constructionUsed,
    pools: { private: real(state, ind.investmentPool), foreign: real(state, ind.foreignPool), state: real(state, ind.statePool) },
    taxes: [
      { label: 'Imposto de renda', value: t.income * pl },
      { label: 'Impostos sobre lucros', value: t.corporate * pl },
      { label: 'Impostos sobre consumo', value: t.consumption * pl },
      { label: 'Tarifas de importação', value: t.tariffs * pl },
      { label: 'Imposto de exportação', value: t.exportTax * pl },
      { label: 'Dividendos e patrimônio', value: (t.dividends + t.wealth) * pl },
      { label: 'Lucro das estatais', value: t.stateCompanies * pl },
    ],
    sectors,
    history: ind.history.map((h) => ({
      date: h.date,
      manufacturing: h.manufacturingShare,
      exports: real(state, h.exports),
      imports: real(state, h.imports),
      unemployment: h.unemployment,
      output: real(state, h.realOutput),
    })),
  };
}

export type MarketStatus = 'escassez' | 'importado' | 'exportado' | 'excedente' | 'equilibrio';

export interface MarketRow {
  id: GoodId;
  name: string;
  icon: string;
  color: string;
  category: GoodCategory;
  categoryName: string;
  price: number;
  /** Variação do preço em 6 meses (fração). */
  change: number;
  displayPrice: number;
  displayUnit: string;
  supply: number;
  demand: number;
  imports: number;
  exports: number;
  worldPrice: number;
  tariff: number;
  shortage: number;
  tradeable: boolean;
  status: MarketStatus;
  /** Explicação curta do preço. */
  reason: string;
}

function statusOf(row: Pick<MarketRow, 'shortage' | 'imports' | 'exports' | 'supply' | 'demand'>): MarketStatus {
  if (row.shortage > 0.02) return 'escassez';
  if (row.imports > 0.05 * row.demand) return 'importado';
  if (row.exports > 0.05 * row.supply) return 'exportado';
  if (row.supply > row.demand * 1.05) return 'excedente';
  return 'equilibrio';
}

function reasonOf(row: MarketRow): string {
  switch (row.status) {
    case 'escassez':
      return `Falta ${Math.round(row.shortage * 100)}% do que o país demanda: preço sobe e a produção que usa o bem cai.`;
    case 'importado':
      return `O país importa ${Math.round((row.imports / Math.max(1e-9, row.demand)) * 100)}% do consumo; o preço segue o importado com tarifa de ${Math.round(row.tariff * 100)}%.`;
    case 'exportado':
      return `O país exporta ${Math.round((row.exports / Math.max(1e-9, row.supply)) * 100)}% da produção; o preço segue o mercado mundial.`;
    case 'excedente':
      return 'Produção acima do consumo e sem saída externa: preço em queda.';
    default:
      return 'Oferta e demanda equilibradas.';
  }
}

/** Linhas do mercado nacional (painel "Mercado"). */
export function marketRows(state: GameState): MarketRow[] {
  const fx = state.market.exchangeRate;
  return GOOD_IDS.map((id) => {
    const gm = state.market.goods[id];
    const def = GOODS[id];
    const old = gm.history.length > 6 ? gm.history[gm.history.length - 7]?.price ?? gm.price : gm.history[0]?.price ?? gm.price;
    const row: MarketRow = {
      id,
      name: def.name,
      icon: def.icon,
      color: def.color,
      category: def.category,
      categoryName: GOOD_CATEGORY_LABELS[def.category],
      price: gm.price,
      change: old > 0 ? gm.price / old - 1 : 0,
      displayPrice: def.displayPrice * gm.price,
      displayUnit: def.displayUnit,
      supply: real(state, gm.supply),
      demand: real(state, gm.demand),
      imports: real(state, gm.imports),
      exports: real(state, gm.exports),
      worldPrice: gm.worldPrice * fx,
      tariff: gm.tariff,
      shortage: gm.shortage,
      tradeable: def.tradeable,
      status: 'equilibrio',
      reason: '',
    };
    row.status = statusOf(row);
    row.reason = reasonOf(row);
    return row;
  });
}

export interface GoodDetail {
  row: MarketRow;
  description: string;
  history: { date: IsoDate; price: number; supply: number; demand: number; imports: number; exports: number }[];
  demandBreakdown: { label: string; value: number }[];
  producers: { stateId: StateId; stateName: string; buildingId: BuildingId; buildingName: string; output: number }[];
  /** Edifícios que usam o bem como insumo (somados no país): quem sofre se ele encarecer ou faltar. */
  users: { buildingId: BuildingId; buildingName: string; sectorName: string; amount: number }[];
}

/** Detalhe de um bem: histórico, quem produz e quem consome. */
export function goodDetail(state: GameState, goodId: GoodId): GoodDetail {
  const row = marketRows(state).find((r) => r.id === goodId)!;
  const gm = state.market.goods[goodId];
  const producers: GoodDetail['producers'] = [];
  for (const stateId of STATE_IDS)
    for (const b of PRODUCERS[goodId]) {
      const bs = state.industry.buildings[stateId][b];
      if (!bs || bs.level <= 0) continue;
      const q = methodInfo(b, bs.methodId).outputs.find(([g]) => g === goodId)?.[1] ?? 0;
      const out = q * bs.level * bs.staffing * bs.productivity;
      if (out > 0) producers.push({ stateId, stateName: STATES[stateId].name, buildingId: b, buildingName: BUILDINGS[b].name, output: real(state, out) });
    }
  producers.sort((a, b) => b.output - a.output);
  const use = new Map<BuildingId, number>();
  for (const stateId of STATE_IDS)
    for (const b of BUILDING_IDS) {
      const bs = state.industry.buildings[stateId][b];
      if (!bs || bs.level <= 0) continue;
      const q = methodInfo(b, bs.methodId).inputs.find(([g]) => g === goodId)?.[1] ?? 0;
      if (q > 0) use.set(b, (use.get(b) ?? 0) + q * bs.level * bs.staffing);
    }
  const users = [...use.entries()]
    .map(([b, q]) => ({ buildingId: b, buildingName: BUILDINGS[b].name, sectorName: SECTOR_LABELS[BUILDINGS[b].sector], amount: real(state, q) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);
  return {
    row,
    description: GOODS[goodId].description,
    history: gm.history.map((h) => ({ ...h, supply: real(state, h.supply), demand: real(state, h.demand), imports: real(state, h.imports), exports: real(state, h.exports) })),
    demandBreakdown: [
      { label: 'Famílias', value: real(state, gm.demandPops) },
      { label: 'Indústria e serviços (insumos)', value: real(state, gm.demandIndustry) },
      { label: 'Governo', value: real(state, gm.demandGovernment) },
      { label: 'Obras', value: real(state, gm.demandConstruction) },
    ],
    producers: producers.slice(0, 8),
    users,
  };
}

export interface BuildingRow {
  id: BuildingId;
  name: string;
  icon: string;
  sector: SectorId;
  sectorName: string;
  levels: number;
  employment: number;
  staffing: number;
  margin: number;
  ownership: Record<OwnerKind, number>;
  topStates: { stateId: StateId; levels: number }[];
  underConstruction: number;
}

/** Edifícios agregados no país (painel "Indústria"). */
export function buildingRows(state: GameState): BuildingRow[] {
  const rows: BuildingRow[] = [];
  for (const id of BUILDING_IDS) {
    const def = BUILDINGS[id];
    let levels = 0;
    let employment = 0;
    let staffNum = 0;
    let marginNum = 0;
    let revenue = 0;
    const own: Record<OwnerKind, number> = { private: 0, state: 0, cooperative: 0, foreign: 0 };
    const tops: { stateId: StateId; levels: number }[] = [];
    for (const stateId of STATE_IDS) {
      const bs = state.industry.buildings[stateId][id];
      if (!bs || bs.level <= 0) continue;
      levels += bs.level;
      employment += methodInfo(id, bs.methodId).totalJobs * bs.level * bs.staffing;
      staffNum += bs.staffing * bs.level;
      marginNum += bs.profit;
      revenue += bs.revenue;
      for (const k of Object.keys(own) as OwnerKind[]) own[k] += bs.ownership[k] * bs.level;
      tops.push({ stateId, levels: bs.level });
    }
    if (levels > 0) for (const k of Object.keys(own) as OwnerKind[]) own[k] /= levels;
    tops.sort((a, b) => b.levels - a.levels);
    rows.push({
      id,
      name: def.name,
      icon: def.icon,
      sector: def.sector,
      sectorName: SECTOR_LABELS[def.sector],
      levels: round(levels, 1),
      employment: Math.round(employment),
      staffing: levels > 0 ? staffNum / levels : 0,
      margin: revenue > 0 ? marginNum / revenue : 0,
      ownership: own,
      topStates: tops.slice(0, 5),
      underConstruction: state.industry.queue.filter((q) => q.buildingId === id).length,
    });
  }
  return rows;
}

export interface StateBuildingView {
  id: BuildingId;
  name: string;
  icon: string;
  sector: SectorId;
  level: number;
  staffing: number;
  margin: number;
  profit: number;
  productivity: number;
  ownership: Record<OwnerKind, number>;
  methodId: string;
  methodName: string;
  methods: { id: string; name: string; description: string; available: boolean; reason: string | null }[];
  jobs: number;
  outputs: { good: GoodId; name: string; amount: number }[];
  inputs: { good: GoodId; name: string; amount: number }[];
  /** O jogador pode trocar o método (estatal majoritária ou economia planificada). */
  canChangeMethod: boolean;
}

export interface StateEconomyView {
  stateId: StateId;
  name: string;
  share: number;
  unemployment: number;
  laborForce: number;
  informal: number;
  avgWage: number;
  avgIncome: number;
  buildings: StateBuildingView[];
  resources: { id: ResourceId; name: string; potential: number; used: number }[];
  queue: ConstructionQueueItem[];
}

/** Economia de um estado (painel de região). */
export function stateEconomy(state: GameState, stateId: StateId): StateEconomyView {
  const ind = state.industry;
  const lab = ind.labor[stateId];
  const gov = state.government;
  const planned = buildContext(state).M.banPrivateInvestment === true;
  const executive = !!gov && gov.branch === 'executive' && (gov.jurisdiction.level === 'federal' || gov.jurisdiction.stateId === stateId);
  const buildings: StateBuildingView[] = [];
  let totalLevels = 0;
  for (const id of BUILDING_IDS) {
    const bs = ind.buildings[stateId][id];
    if (!bs || bs.level <= 0) continue;
    totalLevels += bs.level;
    const info = methodInfo(id, bs.methodId);
    const def = BUILDINGS[id];
    buildings.push({
      id,
      name: def.name,
      icon: def.icon,
      sector: def.sector,
      level: round(bs.level, 1),
      staffing: bs.staffing,
      margin: bs.revenue > 0 ? bs.profit / bs.revenue : 0,
      profit: real(state, bs.profit),
      productivity: bs.productivity,
      ownership: { ...bs.ownership },
      methodId: bs.methodId,
      methodName: info.method.name,
      methods: def.methods.map((m) => {
        const reason = methodAllowed(state, id, m.id);
        return { id: m.id, name: m.name, description: m.description, available: !reason, reason };
      }),
      jobs: Math.round(info.totalJobs * bs.level * bs.staffing),
      outputs: info.outputs.map(([g, q]) => ({ good: g, name: GOODS[g].name, amount: real(state, q * bs.level * bs.staffing * bs.productivity) })),
      inputs: info.inputs.map(([g, q]) => ({ good: g, name: GOODS[g].name, amount: real(state, q * bs.level * bs.staffing) })),
      canChangeMethod: executive && !isInformal(id) && (planned || bs.ownership.state >= 0.5) && def.methods.length > 1,
    });
  }
  buildings.sort((a, b) => b.jobs - a.jobs);
  const resources = (Object.entries(STATE_RESOURCES[stateId] ?? {}) as [ResourceId, number][]).map(([id, potential]) => {
    let used = 0;
    for (const b of BUILDING_IDS) if (BUILDINGS[b].resource === id) used += ind.buildings[stateId][b]?.level ?? 0;
    return { id, name: RESOURCE_LABELS[id], potential, used: round(used, 1) };
  });
  let all = 0;
  for (const s of STATE_IDS) for (const b of Object.values(ind.buildings[s])) all += b?.level ?? 0;
  return {
    stateId,
    name: STATES[stateId].name,
    share: all > 0 ? totalLevels / all : 0,
    unemployment: state.regions[stateId]?.unemployment ?? 0,
    laborForce: lab?.laborForce ?? 0,
    informal: lab && lab.laborForce > 0 ? lab.informal / lab.laborForce : 0,
    avgWage: lab?.avgWage ?? 0,
    avgIncome: state.regions[stateId]?.income ?? 0,
    buildings,
    resources,
    queue: constructionQueueView(state).filter((q) => q.stateId === stateId),
  };
}

export interface ConstructionOption {
  id: BuildingId;
  name: string;
  icon: string;
  sector: SectorId;
  sectorName: string;
  /** Motivo de bloqueio (ou `null` se pode construir). */
  blocked: string | null;
  /** Custo estimado de 1 nível (R$ bi). */
  cost: number;
  /** Retorno anual esperado (lucro/custo). */
  expectedReturn: number;
  jobsPerLevel: number;
  resourceRoom: number | null;
}

/** O que o jogador pode mandar construir num estado. */
export function constructionOptions(state: GameState, stateId: StateId): ConstructionOption[] {
  const ctx = buildContext(state);
  const pc = state.industry.constructionPointCost;
  return BUILDING_IDS.filter((id) => BUILDINGS[id].buildableBy.includes('state')).map((id) => {
    const def = BUILDINGS[id];
    const room = resourceRoom(state, ctx, stateId, id);
    return {
      id,
      name: def.name,
      icon: def.icon,
      sector: def.sector,
      sectorName: SECTOR_LABELS[def.sector],
      blocked: canOrderConstruction(state, stateId, id),
      cost: stateConstructionCost(state, id),
      expectedReturn: def.sector === 'public' ? 0 : expectedReturn(state, ctx, stateId, id, pc),
      jobsPerLevel: methodInfo(id, def.methods[0]?.id ?? '').totalJobs,
      resourceRoom: Number.isFinite(room) ? Math.max(0, Math.floor(room)) : null,
    };
  });
}

export interface ConstructionQueueItem {
  id: string;
  stateId: StateId;
  stateName: string;
  buildingId: BuildingId;
  buildingName: string;
  icon: string;
  owner: string;
  origin: string;
  progress: number;
  /** Meses estimados até concluir (pela capacidade atual). */
  eta: number;
  mine: boolean;
}

/** Fila de obras do país. */
export function constructionQueueView(state: GameState): ConstructionQueueItem[] {
  const ind = state.industry;
  const cap = Math.max(1, ind.constructionCapacity);
  let ahead = 0;
  const origins: Record<string, string> = { player: 'Sua ordem', plan: 'Plano nacional', market: 'Mercado', npc_gov: 'Governo' };
  return ind.queue.map((p) => {
    const remaining = p.totalPoints - p.progress;
    ahead += remaining;
    return {
      id: p.id,
      stateId: p.stateId,
      stateName: STATES[p.stateId].name,
      buildingId: p.buildingId,
      buildingName: BUILDINGS[p.buildingId].name,
      icon: BUILDINGS[p.buildingId].icon,
      owner: OWNER_LABELS[p.owner as OwnerKind] ?? p.owner,
      origin: origins[p.origin] ?? p.origin,
      progress: clamp(p.progress / Math.max(1, p.totalPoints), 0, 1),
      eta: Math.max(1, Math.ceil(Math.max(remaining / Math.max(1, p.totalPoints * 0.25), ahead / cap))),
      mine: p.origin === 'player',
    };
  });
}

export interface TradeOverview {
  exports: { id: GoodId; name: string; value: number }[];
  imports: { id: GoodId; name: string; value: number }[];
  balance: number;
  exchangeRate: number;
  exchangeTarget: number;
  exchangeHistory: { date: IsoDate; value: number }[];
}

/** Comércio exterior: pauta de exportação e importação e câmbio. */
export function tradeOverview(state: GameState): TradeOverview {
  const fx = state.market.exchangeRate;
  const exp: TradeOverview['exports'] = [];
  const imp: TradeOverview['imports'] = [];
  for (const id of GOOD_IDS) {
    const gm = state.market.goods[id];
    if (gm.exports > 0) exp.push({ id, name: GOODS[id].name, value: real(state, gm.exports * gm.worldPrice * fx) });
    if (gm.imports > 0) imp.push({ id, name: GOODS[id].name, value: real(state, gm.imports * gm.worldPrice * fx) });
  }
  exp.sort((a, b) => b.value - a.value);
  imp.sort((a, b) => b.value - a.value);
  return {
    exports: exp,
    imports: imp,
    balance: real(state, state.industry.stats.tradeBalance),
    exchangeRate: fx,
    exchangeTarget: state.market.exchangeTarget ?? fx,
    exchangeHistory: state.market.exchangeHistory ?? [],
  };
}
