import type { MapLayer } from '@republica/game-engine';
import { mix, type MapFill } from '@republica/ui';

/** Paleta do mapa no tema ardósia + latão (sequencial em 3 tons; divergente verde → ocre → vermelho). */
const SEQ = ['#1a3540', '#3e7570', '#e0bf66'] as const;
const DIV = ['#4fae7c', '#d8c27c', '#c9573f'] as const;
const NO_DATA = '#22404c';

function ramp(stops: readonly [string, string, string], v: number): string {
  return v < 0.5 ? mix(stops[0], stops[1], v * 2) : mix(stops[1], stops[2], (v - 0.5) * 2);
}

/** Converte uma camada do motor em cores de mapa. */
export function stageFills(layer: MapLayer): Record<string, MapFill> {
  const out: Record<string, MapFill> = {};
  for (const [id, cell] of Object.entries(layer.cells)) {
    // Valor ausente ou inválido (NaN/Infinity) aparece como "sem dados" em vez de cor quebrada.
    if (!Number.isFinite(cell.value)) {
      out[id] = { fill: NO_DATA, opacity: 0.65 };
      continue;
    }
    const v = Math.max(0, Math.min(1, cell.value));
    if (layer.scale === 'categorical') {
      if (!cell.color) {
        out[id] = { fill: NO_DATA, opacity: 0.65 };
        continue;
      }
      const strength = cell.strength ?? v;
      out[id] = {
        fill: cell.color,
        opacity: 0.4 + 0.6 * Math.max(0, Math.min(1, (strength - 0.2) / 0.45)),
      };
    } else if (layer.scale === 'diverging') {
      out[id] = { fill: ramp(DIV, v) };
    } else {
      out[id] = { fill: ramp(SEQ, v) };
    }
  }
  return out;
}

export const STAGE_SEQUENTIAL = `linear-gradient(to right, ${SEQ.join(', ')})`;
export const STAGE_DIVERGING = `linear-gradient(to right, ${DIV.join(', ')})`;
