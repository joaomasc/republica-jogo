import { clamp } from '../../core/math';
import type { StateId } from '../../core/types';
import { popId } from '../../population/population';
import { POP_TYPES, type PopTypeId } from '../../population/popTypes';
import type { GameState } from '../../simulation/state';
import { addJobsByType, isInformal, methodInfo, regionalIncomeFactor } from './catalog';
import { IndustryConstants as K } from './constants';
import {
  BUILDING_IDS,
  GOOD_IDS,
  LABOR_TYPE_IDS,
  type BuildingId,
  type BuildingState,
  type GoodId,
  type LaborTypeId,
  type OwnerKind,
} from './types';

/** Tipos de Pop que formam a força de trabalho (empregáveis + desempregados). */
export const WORKFORCE_TYPES: readonly PopTypeId[] = [...LABOR_TYPE_IDS, 'unemployed'];

/** Salário de referência (R$/mês) de um tipo de Pop num estado (mesma regra da renda dos Pops). */
export function wageRef(stateId: StateId, t: LaborTypeId): number {
  return POP_TYPES[t].income * regionalIncomeFactor(stateId);
}

/** R$ bi/ano pagos a `people` pessoas com salário `wage` (R$/mês). */
export function annualBill(people: number, wage: number): number {
  return (people * wage * 12) / 1e9;
}

/** Cesta de consumo (participações somando 1) para uma renda mensal por pessoa. */
export function basketShares(income: number): Record<GoodId, number> {
  const [a, b, c] = K.baskets.anchors;
  const li = Math.log(Math.max(1, income));
  const la = Math.log(a);
  const lb = Math.log(b);
  const lc = Math.log(c);
  let wPoor = 0;
  let wMid = 0;
  let wRich = 0;
  if (li <= la) wPoor = 1;
  else if (li <= lb) {
    wMid = (li - la) / (lb - la);
    wPoor = 1 - wMid;
  } else if (li <= lc) {
    wRich = (li - lb) / (lc - lb);
    wMid = 1 - wRich;
  } else wRich = 1;
  const out = {} as Record<GoodId, number>;
  let total = 0;
  for (const g of GOOD_IDS) {
    const v =
      wPoor * (K.baskets.poor[g] ?? 0) +
      wMid * (K.baskets.middle[g] ?? 0) +
      wRich * (K.baskets.rich[g] ?? 0);
    out[g] = v;
    total += v;
  }
  for (const g of GOOD_IDS) out[g] = total > 0 ? out[g] / total : 0;
  return out;
}

/** Fração da renda poupada (cresce com a renda). */
export function savingsRate(income: number): number {
  const [a, b, c] = K.baskets.anchors;
  const [sa, sb, sc] = K.baskets.savings;
  if (income <= a) return sa;
  if (income <= b) return sa + ((sb - sa) * (income - a)) / (b - a);
  if (income <= c) return sb + ((sc - sb) * (income - b)) / (c - b);
  return sc;
}

/** Tamanho dos Pops da força de trabalho de um estado. */
export function workforcePeople(state: GameState, stateId: StateId): Partial<Record<string, number>> {
  const out: Partial<Record<string, number>> = {};
  for (const t of WORKFORCE_TYPES) out[t] = state.population.pops[popId(stateId, t)]?.size ?? 0;
  return out;
}

/** Empregos formais ocupados por tipo num estado (níveis × lotação, com a regra dos donos). */
export function formalJobs(
  buildings: Partial<Record<BuildingId, BuildingState>>,
): Partial<Record<LaborTypeId, number>> {
  const out: Partial<Record<LaborTypeId, number>> = {};
  for (const id of BUILDING_IDS) {
    if (isInformal(id)) continue;
    const bs = buildings[id];
    if (!bs || bs.level <= 0) continue;
    addJobsByType(methodInfo(id, bs.methodId), bs.ownership, bs.level * bs.staffing, out);
  }
  return out;
}

/** Edifício novo (zerado) com a propriedade dada. */
export function newBuildingState(methodId: string, ownership: Record<OwnerKind, number>): BuildingState {
  return {
    level: 0,
    methodId,
    ownership: { ...ownership },
    staffing: 1,
    wageFactor: 1,
    productivity: 1,
    revenue: 0,
    inputCost: 0,
    wageBill: 0,
    profit: 0,
    avgMargin: 0,
    subsidy: 0,
    lossMonths: 0,
  };
}

/** Soma `levels` níveis de um dono, misturando a propriedade proporcionalmente. */
export function addLevels(bs: BuildingState, levels: number, owner: OwnerKind): void {
  const total = bs.level + levels;
  if (total <= 0) return;
  for (const k of Object.keys(bs.ownership) as OwnerKind[])
    bs.ownership[k] = (bs.ownership[k] * bs.level + (k === owner ? levels : 0)) / total;
  // Níveis novos chegam com a lotação diluída (contratação gradual).
  bs.staffing = clamp((bs.staffing * bs.level + levels * 0.6) / total, 0.05, 1);
  bs.level = total;
}
