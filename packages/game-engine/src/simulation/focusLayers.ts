import { clamp, formatPct, round } from '../core/math';
import type { UnitId } from '../core/types';
import { BUILDINGS } from '../economy/industry/buildings.data';
import { GOODS } from '../economy/industry/goods.data';
import { buildingByState, goodOutputByState } from '../economy/industry/selectors';
import type { BuildingId, GoodId } from '../economy/industry/types';
import type { MapCell, MapLayer } from './selectors';
import { mapUnits } from './selectors';
import type { GameState } from './state';

/**
 * Camadas "de foco": um painel pede ao mapa um recorte específico (onde se produz aço, onde há
 * siderúrgicas). Mesmo formato das camadas fixas (`mapLayer`), para o mapa tratar tudo igual.
 */

function billions(v: number): string {
  if (v >= 1) return `R$ ${round(v, 1).toLocaleString('pt-BR')} bi`;
  return `R$ ${Math.round(v * 1000).toLocaleString('pt-BR')} mi`;
}

/** Produção de um bem por UF; intensidade proporcional à maior produtora. */
export function goodLayer(state: GameState, goodId: GoodId): MapLayer {
  const units = mapUnits(state);
  const byState = goodOutputByState(state, goodId);
  const total = Object.values(byState).reduce((a, b) => a + b, 0);
  const max = Math.max(1e-9, ...Object.values(byState));
  const cells: Record<UnitId, MapCell> = {};
  for (const u of units) {
    const out = byState[u.stateId] ?? 0;
    cells[u.id] =
      out > 0
        ? {
            value: clamp(out / max, 0, 1),
            label: `Produz ${billions(out)}/ano · ${formatPct(total > 0 ? out / total : 0)} do país`,
            short: formatPct(total > 0 ? out / total : 0, 0),
          }
        : { value: 0, label: 'Não produz' };
  }
  const name = GOODS[goodId].name;
  return {
    mode: 'good',
    title: `Produção: ${name}`,
    scale: 'sequential',
    cells,
    legend: { low: 'Não produz', high: 'Maior produtor' },
  };
}

/** Níveis de um edifício por UF (com obras na fila). */
export function buildingLayer(state: GameState, buildingId: BuildingId): MapLayer {
  const units = mapUnits(state);
  const byState = buildingByState(state, buildingId);
  const max = Math.max(1, ...Object.values(byState).map((b) => b.levels));
  const cells: Record<UnitId, MapCell> = {};
  for (const u of units) {
    const b = byState[u.stateId];
    if (!b || (b.levels <= 0 && b.queued === 0)) {
      cells[u.id] = { value: 0, label: 'Nenhum nível' };
      continue;
    }
    const parts = [`${round(b.levels, 1).toLocaleString('pt-BR')} nível(is)`];
    if (b.levels > 0) parts.push(`ocupação ${formatPct(b.staffing, 0)}`);
    if (b.queued > 0) parts.push(`${b.queued} em construção`);
    cells[u.id] = {
      value: clamp(b.levels / max, 0, 1),
      label: parts.join(' · '),
      short: `${round(b.levels, 0)}${b.queued > 0 ? '+' : ''}`,
    };
  }
  return {
    mode: 'building',
    title: `Indústria: ${BUILDINGS[buildingId].name}`,
    scale: 'sequential',
    cells,
    legend: { low: 'Nenhum', high: 'Mais níveis' },
  };
}
