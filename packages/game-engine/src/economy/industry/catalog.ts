import type { StateId } from '../../core/types';
import { STATES } from '../../map/states';
import { BUILDINGS } from './buildings.data';
import { GOODS } from './goods.data';
import {
  BUILDING_IDS,
  GOOD_IDS,
  LABOR_TYPE_IDS,
  type BuildingId,
  type GoodId,
  type LaborTypeId,
  type OwnerKind,
  type ProductionMethod,
  type SectorId,
} from './types';

/**
 * Dados estáticos pré-calculados do catálogo (bens, edifícios e métodos). Só leitura: os caches
 * guardam derivações dos arquivos `*.data.ts`, nunca estado da partida.
 */

export interface MethodInfo {
  buildingId: BuildingId;
  method: ProductionMethod;
  inputs: [GoodId, number][];
  outputs: [GoodId, number][];
  /** Empregos por nível, exceto `business` (donos/diretores). */
  jobs: [LaborTypeId, number][];
  business: number;
  totalJobs: number;
  /** Tipo de trabalhador principal (vira dono na fatia cooperativa). */
  mainType: LaborTypeId;
  /** Valor dos insumos e da produção por nível a preços-base. */
  baseInputValue: number;
  baseOutputValue: number;
  /** Participação de cada insumo no valor dos insumos (efeito da escassez). */
  inputShares: [GoodId, number][];
  points: number;
  minTech: number;
  pollution: number;
}

const cache = new Map<string, MethodInfo>();

function build(buildingId: BuildingId, method: ProductionMethod): MethodInfo {
  const inputs = Object.entries(method.inputs).filter(([, q]) => (q ?? 0) > 0) as [GoodId, number][];
  const outputs = Object.entries(method.outputs).filter(([, q]) => (q ?? 0) > 0) as [
    GoodId,
    number,
  ][];
  const jobs: [LaborTypeId, number][] = [];
  let business = 0;
  let total = 0;
  for (const t of LABOR_TYPE_IDS) {
    const n = method.jobs[t] ?? 0;
    if (n <= 0) continue;
    total += n;
    if (t === 'business') business = n;
    else jobs.push([t, n]);
  }
  let mainType: LaborTypeId = 'workers';
  let best = -1;
  for (const [t, n] of jobs) {
    if (t === 'middle_class') continue;
    if (n > best) {
      best = n;
      mainType = t;
    }
  }
  const baseInputValue = inputs.reduce((a, [, q]) => a + q, 0);
  const baseOutputValue = outputs.reduce((a, [, q]) => a + q, 0);
  return {
    buildingId,
    method,
    inputs,
    outputs,
    jobs,
    business,
    totalJobs: total,
    mainType,
    baseInputValue,
    baseOutputValue,
    inputShares:
      baseInputValue > 0 ? inputs.map(([g, q]) => [g, q / baseInputValue] as [GoodId, number]) : [],
    points: method.constructionPoints ?? 0,
    minTech: method.minTech ?? 0,
    pollution: method.pollution ?? 0,
  };
}

/** Informações do método (cai no método padrão se o id não existir). */
export function methodInfo(buildingId: BuildingId, methodId: string): MethodInfo {
  const key = `${buildingId}:${methodId}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const def = BUILDINGS[buildingId];
  const method = def.methods.find((m) => m.id === methodId) ?? (def.methods[0] as ProductionMethod);
  const info = build(buildingId, method);
  cache.set(key, info);
  return info;
}

export function defaultMethodId(buildingId: BuildingId): string {
  return BUILDINGS[buildingId].methods[0]?.id ?? '';
}

export function sectorOf(buildingId: BuildingId): SectorId {
  return BUILDINGS[buildingId].sector;
}

export function isPublic(buildingId: BuildingId): boolean {
  return BUILDINGS[buildingId].sector === 'public';
}

export function isInformal(buildingId: BuildingId): boolean {
  return buildingId === 'informal';
}

export function isConstruction(buildingId: BuildingId): boolean {
  return buildingId === 'construction_sector';
}

/** Edifício de mercado (vende o que produz e tem lucro). */
export function isMarketBuilding(buildingId: BuildingId): boolean {
  return !isPublic(buildingId) && !isInformal(buildingId) && !isConstruction(buildingId);
}

export const INDUSTRIAL_SECTORS: readonly SectorId[] = ['heavy_industry', 'manufacturing', 'high_tech'];

export const TRADEABLE_GOODS: readonly GoodId[] = GOOD_IDS.filter((g) => GOODS[g].tradeable);
export const NON_TRADEABLE_GOODS: readonly GoodId[] = GOOD_IDS.filter((g) => !GOODS[g].tradeable);

/** Edifícios que produzem cada bem (método padrão). */
export const PRODUCERS: Record<GoodId, BuildingId[]> = (() => {
  const out = Object.fromEntries(GOOD_IDS.map((g) => [g, [] as BuildingId[]])) as Record<
    GoodId,
    BuildingId[]
  >;
  for (const b of BUILDING_IDS)
    for (const m of BUILDINGS[b].methods)
      for (const g of Object.keys(m.outputs) as GoodId[])
        if (!out[g].includes(b) && b !== 'informal') out[g].push(b);
  return out;
})();

/** Bem principal produzido por um edifício (maior quantidade no método padrão). */
export function mainOutput(buildingId: BuildingId): GoodId | null {
  const info = methodInfo(buildingId, defaultMethodId(buildingId));
  let best: GoodId | null = null;
  let q = 0;
  for (const [g, v] of info.outputs)
    if (v > q) {
      q = v;
      best = g;
    }
  return best;
}

/**
 * Empregos por tipo de Pop para `levels` níveis com a regra dos donos: os postos `business`
 * são empresários na fatia privada/estrangeira, gestores (`middle_class`) na estatal e o tipo
 * principal de trabalhador na cooperativa.
 */
export function addJobsByType(
  info: MethodInfo,
  ownership: Record<OwnerKind, number>,
  levels: number,
  out: Partial<Record<LaborTypeId, number>>,
): void {
  if (levels <= 0) return;
  for (const [t, n] of info.jobs) out[t] = (out[t] ?? 0) + n * levels;
  if (info.business > 0) {
    const b = info.business * levels;
    const owners = ownership.private + ownership.foreign;
    if (owners > 0) out.business = (out.business ?? 0) + b * owners;
    if (ownership.state > 0) out.middle_class = (out.middle_class ?? 0) + b * ownership.state;
    if (ownership.cooperative > 0)
      out[info.mainType] = (out[info.mainType] ?? 0) + b * ownership.cooperative;
  }
}

/** Fator regional de renda (mesma regra da geração dos Pops). */
export function regionalIncomeFactor(stateId: StateId): number {
  return 0.6 + 0.4 * (STATES[stateId].gdpPerCapita / 40);
}

/** Pesos de perfil de um edifício num estado (mesma escala de `stateFactors`). */
export function profileFactors(
  stateId: StateId,
): Record<'agro' | 'industry' | 'tech' | 'urbanization' | 'publicSector' | 'income', number> {
  const s = STATES[stateId];
  return {
    agro: s.profile.agro,
    industry: s.profile.industry,
    tech: s.profile.tech,
    urbanization: s.profile.urbanization,
    publicSector: s.profile.publicSector,
    income: s.gdpPerCapita / 60,
  };
}

/** Propriedade nula (para inicializar acumuladores). */
export function emptyOwnership(): Record<OwnerKind, number> {
  return { private: 0, state: 0, cooperative: 0, foreign: 0 };
}

/** Normaliza a propriedade (soma 1, sem negativos). */
export function normalizeOwnership(o: Record<OwnerKind, number>): void {
  const p = Math.max(0, o.private);
  const s = Math.max(0, o.state);
  const c = Math.max(0, o.cooperative);
  const f = Math.max(0, o.foreign);
  const total = p + s + c + f;
  if (total <= 0) {
    o.private = 1;
    o.state = 0;
    o.cooperative = 0;
    o.foreign = 0;
    return;
  }
  o.private = p / total;
  o.state = s / total;
  o.cooperative = c / total;
  o.foreign = f / total;
}
