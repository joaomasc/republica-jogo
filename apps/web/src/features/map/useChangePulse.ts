import type { AtlasPulse } from '@republica/ui';
import { useState } from 'react';
import type { ActiveLayer } from './useActiveLayer';

/** Variação mínima (na escala 0..1 do motor) para uma região pulsar. */
const THRESHOLD = 0.02;
/** No máximo tantas regiões pulsam de uma vez (as que mais mudaram). */
const MAX_PULSES = 6;
/** Modos que mudam todo dia na campanha: compara por semana, não por dia. */
const WEEKLY = new Set(['intention', 'campaign', 'popularity']);

function period(date: string, key: string): string {
  if (WEEKLY.has(key.split(':')[0] ?? '')) {
    const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
    return `w${Math.floor(day / 7)}`;
  }
  return date.slice(0, 7);
}

function snapshot(active: ActiveLayer): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, cell] of Object.entries(active.layer.cells))
    if (Number.isFinite(cell.value)) out[id] = cell.value;
  return out;
}

/**
 * Regiões cuja leitura do modo ativo mudou de verdade desde o período anterior (mês, ou semana na
 * campanha): pulsam em verde ou vermelho conforme o sentido "bom" do indicador.
 * Trocar de modo zera a comparação (mudar de camada não é "mudança" no país).
 */
export function useChangePulse(active: ActiveLayer, date: string): AtlasPulse[] {
  const p = period(date, active.key);
  const [prev, setPrev] = useState(() => ({
    key: active.key,
    period: p,
    values: snapshot(active),
  }));
  const [pulses, setPulses] = useState<AtlasPulse[]>([]);
  if (prev.key !== active.key || prev.period !== p) {
    const values = snapshot(active);
    if (prev.key === active.key && active.polarity !== 0) {
      const changed = Object.entries(values)
        .map(([id, v]) => ({ id, delta: v - (prev.values[id] ?? v) }))
        .filter((c) => Math.abs(c.delta) >= THRESHOLD)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, MAX_PULSES);
      setPulses(
        changed.map((c) => ({
          id: c.id,
          tone: c.delta * active.polarity > 0 ? 'good' : 'bad',
          key: `${p}-${c.id}`,
        })),
      );
    } else setPulses([]);
    setPrev({ key: active.key, period: p, values });
  }
  return pulses;
}
