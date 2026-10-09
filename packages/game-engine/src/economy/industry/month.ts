import type { StateId } from '../../core/types';
import type { MethodInfo } from './catalog';
import type { IndustryContext } from './context';
import type {
  BuildingDefinition,
  BuildingId,
  BuildingState,
  GoodId,
  LaborTypeId,
  SectorId,
} from './types';
import { GOOD_IDS } from './types';

/** Um edifício (estado × tipo) rodando no mês. Estrutura transitória (não vai para o estado). */
export interface BuildingRun {
  stateId: StateId;
  buildingId: BuildingId;
  def: BuildingDefinition;
  bs: BuildingState;
  info: MethodInfo;
  sector: SectorId;
  /** Postos ocupados (níveis × lotação × disponibilidade de mão de obra). */
  act: number;
  /** Atividade física (postos × greve × insumos). */
  run: number;
  /** Multiplicador de produtividade. */
  pm: number;
  /** Fração paga dos salários (greve). */
  paid: number;
  /** Pontos de construção disponíveis (só construção civil) e usados no mês. */
  capacity: number;
  used: number;
  /** Salário por tipo (R$/mês) neste edifício. */
  wages: Partial<Record<LaborTypeId, number>>;
  /** Resultados do mês (R$ bi/ano). */
  revenue: number;
  inputCost: number;
  wageBill: number;
  profit: number;
}

/** Fluxos de um mês, por bem (unidades/ano). */
export type GoodFlows = Record<GoodId, number>;

export function zeroFlows(): GoodFlows {
  const out = {} as GoodFlows;
  for (const g of GOOD_IDS) out[g] = 0;
  return out;
}

/** Acumuladores de renda por estado (R$ bi/ano). */
export interface StateIncome {
  /** Massa salarial por tipo de Pop (inclui cooperativa e participação nos lucros). */
  wages: Partial<Record<LaborTypeId, number>>;
  informal: number;
  dividends: number;
  /** Tributos (base do motor). */
  taxes: number;
  /** Consumo das famílias a preços correntes (sem imposto) e imposto sobre consumo. */
  consumption: number;
  consumptionTax: number;
  /** Valor adicionado real (preços-base) e da indústria. */
  va: number;
  vaIndustrial: number;
  wageBill: number;
  /** Pontos de construção aplicados em obras no estado. */
  points: number;
}

export function emptyStateIncome(): StateIncome {
  return {
    wages: {},
    informal: 0,
    dividends: 0,
    taxes: 0,
    consumption: 0,
    consumptionTax: 0,
    va: 0,
    vaIndustrial: 0,
    wageBill: 0,
    points: 0,
  };
}

/** Rascunho do mês, compartilhado pelas etapas do tick. */
export interface MonthScratch {
  ctx: IndustryContext;
  runs: BuildingRun[];
  supply: GoodFlows;
  demandPops: GoodFlows;
  demandIndustry: GoodFlows;
  demandGovernment: GoodFlows;
  demandConstruction: GoodFlows;
  /** Consumo das famílias por estado e bem (unidades/ano). */
  popDemandByState: Record<StateId, GoodFlows>;
  /** Pontos: capacidade, usados e custo (R$ bi do motor por ponto). */
  pointsCapacity: number;
  pointsUsed: number;
  pointCost: number;
  /** Gasto em obras no mês (R$ bi do motor, não anualizado) por dono. */
  constructionSpend: { state: number; private: number; foreign: number; cooperative: number };
  /** Insumos por ponto (unidades). */
  inputsPerPoint: [GoodId, number][];
  income: Record<StateId, StateIncome>;
  /** Fluxos financeiros nacionais (R$ bi/ano do motor). */
  remittances: number;
  stateCompanies: number;
  tariffs: number;
  exportTax: number;
  privateProfit: number;
  privateRevenue: number;
  transfers: number;
  dividendsPaid: number;
}
