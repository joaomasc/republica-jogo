import { clamp, round } from '../core/math';
import type { StateId, UnitId } from '../core/types';
import { BUILDINGS } from '../economy/industry/buildings.data';
import { INDUSTRIAL_SECTORS, methodInfo } from '../economy/industry/catalog';
import { STATE_RESOURCES } from '../economy/industry/resources.data';
import { BUILDING_IDS } from '../economy/industry/types';
import type { ElectoralUnit } from '../election/types';
import type { MapCell, MapLayer, MapMode } from './selectors';
import type { GameState } from './state';

type EconomyMode = Extract<
  MapMode,
  'industrialization' | 'income' | 'unemployment' | 'informality' | 'construction' | 'resources'
>;

function industrialShare(state: GameState, stateId: StateId): number {
  let ind = 0;
  let all = 0;
  for (const id of BUILDING_IDS) {
    const bs = state.industry.buildings[stateId][id];
    if (!bs || bs.level <= 0) continue;
    const info = methodInfo(id, bs.methodId);
    const v = bs.level * bs.staffing * Math.max(0, info.baseOutputValue - info.baseInputValue);
    all += v;
    if (INDUSTRIAL_SECTORS.includes(BUILDINGS[id].sector)) ind += v;
  }
  return all > 0 ? ind / all : 0;
}

/** Camadas econômicas do mapa (por estado; zonas usam o estado da zona). */
export function economyLayer(state: GameState, mode: EconomyMode, units: ElectoralUnit[]): MapLayer {
  const cells: Record<UnitId, MapCell> = {};
  const pct = (v: number) => `${round(v * 100, 1)}%`;
  const incomes = units.map((u) => state.regions[u.stateId]?.income ?? 0);
  const maxIncome = Math.max(1, ...incomes);
  for (const u of units) {
    const s = u.stateId;
    const region = state.regions[s];
    const labor = state.industry.labor[s];
    switch (mode) {
      case 'industrialization': {
        const share = industrialShare(state, s);
        cells[u.id] = { value: clamp(share / 0.4, 0, 1), label: `Indústria: ${pct(share)} do valor adicionado` };
        break;
      }
      case 'income': {
        const inc = region?.income ?? 0;
        cells[u.id] = { value: inc / maxIncome, label: `Renda média R$ ${Math.round(inc).toLocaleString('pt-BR')}` };
        break;
      }
      case 'unemployment': {
        const un = region?.unemployment ?? 0;
        cells[u.id] = { value: clamp((un - 3) / 15, 0, 1), label: `Desemprego ${round(un, 1)}%` };
        break;
      }
      case 'informality': {
        const v = labor && labor.laborForce > 0 ? labor.informal / labor.laborForce : 0;
        cells[u.id] = { value: clamp(v / 0.4, 0, 1), label: `Informalidade ${pct(v)} da força de trabalho` };
        break;
      }
      case 'construction': {
        const n = state.industry.queue.filter((q) => q.stateId === s).length;
        cells[u.id] = { value: clamp(n / 8, 0, 1), label: n ? `${n} obra(s) em andamento` : 'Nenhuma obra' };
        break;
      }
      case 'resources': {
        const res = STATE_RESOURCES[s] ?? {};
        const total = Object.values(res).reduce((a, b) => a + (b ?? 0), 0);
        cells[u.id] = { value: clamp(Math.sqrt(total / 1200), 0, 1), label: `Potencial de recursos: ${Math.round(total)} níveis` };
        break;
      }
    }
  }
  const meta: Record<EconomyMode, { title: string; scale: MapLayer['scale']; low: string; high: string }> = {
    industrialization: { title: 'Industrialização', scale: 'sequential', low: 'Pouca indústria', high: 'Muita indústria' },
    income: { title: 'Renda média', scale: 'sequential', low: 'Menor', high: 'Maior' },
    unemployment: { title: 'Desemprego', scale: 'diverging', low: 'Baixo', high: 'Alto' },
    informality: { title: 'Informalidade', scale: 'diverging', low: 'Baixa', high: 'Alta' },
    construction: { title: 'Obras em andamento', scale: 'sequential', low: 'Nenhuma', high: 'Muitas' },
    resources: { title: 'Recursos naturais', scale: 'sequential', low: 'Poucos', high: 'Muitos' },
  };
  const m = meta[mode];
  return { mode, title: m.title, scale: m.scale, cells, legend: { low: m.low, high: m.high } };
}
