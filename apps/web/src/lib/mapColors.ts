import type { MapLayer } from '@republica/game-engine';
import { mix, type MapFill } from '@republica/ui';

const LOW = '#24365e';
const HIGH = '#f2b51e';
const GOOD = '#3ddc97';
const MID = '#f2b51e';
const BAD = '#ff6b6b';

/** Converte uma camada do motor em cores de mapa. */
export function layerFills(layer: MapLayer): Record<string, MapFill> {
  const out: Record<string, MapFill> = {};
  for (const [id, cell] of Object.entries(layer.cells)) {
    const v = Math.max(0, Math.min(1, cell.value));
    if (layer.scale === 'categorical') {
      if (!cell.color) {
        out[id] = { fill: '#273759', opacity: 0.6 };
        continue;
      }
      const strength = cell.strength ?? v;
      out[id] = {
        fill: cell.color,
        opacity: 0.35 + 0.65 * Math.max(0, Math.min(1, (strength - 0.2) / 0.45)),
      };
    } else if (layer.scale === 'diverging') {
      out[id] = { fill: v < 0.5 ? mix(GOOD, MID, v * 2) : mix(MID, BAD, (v - 0.5) * 2) };
    } else {
      out[id] = { fill: mix(LOW, HIGH, v) };
    }
  }
  return out;
}

export const SEQUENTIAL_GRADIENT = `linear-gradient(to right, ${LOW}, ${HIGH})`;
export const DIVERGING_GRADIENT = `linear-gradient(to right, ${GOOD}, ${MID}, ${BAD})`;
