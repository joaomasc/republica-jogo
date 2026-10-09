import { entries } from '../core/math';
import { isStateId, type StateId } from '../core/types';
import { BUILDINGS, getMethod } from '../economy/industry/buildings.data';
import {
  BUILDING_IDS,
  type BuildingId,
  type BuildingState,
  type OwnerKind,
} from '../economy/industry/types';
import type { GameState } from '../simulation/state';
import { ExecutiveConstants as C } from './constants';

/** Alvo de atos sobre edifícios: `${UF}:${edifício}`. */
export function parseBuildingTarget(
  target: string | null,
): { stateId: StateId; buildingId: BuildingId } | null {
  if (!target) return null;
  const [uf, building, ...rest] = target.split(':');
  if (rest.length > 0 || !uf || !building) return null;
  if (!isStateId(uf)) return null;
  if (!(BUILDING_IDS as readonly string[]).includes(building)) return null;
  return { stateId: uf, buildingId: building as BuildingId };
}

/** Edifício existente (nível > 0) do estado, ou `undefined`. */
export function existingBuilding(
  state: GameState,
  stateId: StateId,
  buildingId: BuildingId,
): BuildingState | undefined {
  const bs = state.industry.buildings[stateId]?.[buildingId];
  return bs && bs.level > 0 ? bs : undefined;
}

/**
 * Receita anual do edifício (R$ bi/ano). Quando o motor ainda não registrou receita
 * (início da partida), estima pela produção do método ativo aos preços de mercado.
 */
export function annualRevenue(
  state: GameState,
  buildingId: BuildingId,
  bs: Pick<BuildingState, 'level' | 'methodId' | 'revenue'>,
): number {
  if (bs.revenue > 0) return bs.revenue;
  const method = getMethod(buildingId, bs.methodId);
  let revenue = 0;
  for (const [good, quantity] of entries(method.outputs as Record<string, number>))
    revenue += quantity * (state.market.goods[good as keyof typeof state.market.goods]?.price ?? 1);
  revenue *= bs.level;
  return revenue > 0 ? revenue : bs.level * C.fallbackRevenuePerLevel;
}

/** Valor (R$ bi) da fatia de um tipo de dono num edifício; 0 se não houver. */
export function sliceValue(
  state: GameState,
  stateId: StateId,
  buildingId: BuildingId,
  owner: OwnerKind,
): number {
  const bs = existingBuilding(state, stateId, buildingId);
  if (!bs) return 0;
  return annualRevenue(state, buildingId, bs) * bs.ownership[owner] * C.assetValueToRevenue;
}

export function buildingName(buildingId: BuildingId): string {
  return BUILDINGS[buildingId].name;
}
