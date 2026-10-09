import { clamp, clamp100 } from '../core/math';
import type { Rng } from '../core/rng';
import { IDEOLOGY_AXES, type IdeologyAxis, type IdeologyVector } from './axes';

export type AxisWeights = Partial<Record<IdeologyAxis, number>>;

/** Distância ideológica ponderada, normalizada em [0, 1]. */
export function ideologyDistance(
  a: IdeologyVector,
  b: IdeologyVector,
  weights?: AxisWeights,
): number {
  let total = 0;
  let wsum = 0;
  for (const axis of IDEOLOGY_AXES) {
    const w = weights?.[axis] ?? 1;
    total += Math.abs(a[axis] - b[axis]) * w;
    wsum += w;
  }
  return wsum === 0 ? 0 : total / wsum / 100;
}

/** Afinidade em [0, 1] (1 = idênticos). */
export function ideologyAffinity(
  a: IdeologyVector,
  b: IdeologyVector,
  weights?: AxisWeights,
): number {
  return 1 - ideologyDistance(a, b, weights);
}

export function blendIdeology(a: IdeologyVector, b: IdeologyVector, t: number): IdeologyVector {
  const out = {} as IdeologyVector;
  for (const axis of IDEOLOGY_AXES) out[axis] = clamp100(a[axis] + (b[axis] - a[axis]) * t);
  return out;
}

export function shiftIdeology(
  base: IdeologyVector,
  shift: Partial<IdeologyVector>,
  scale = 1,
): IdeologyVector {
  const out = { ...base };
  for (const axis of IDEOLOGY_AXES) {
    const delta = shift[axis];
    if (delta !== undefined) out[axis] = clamp100(out[axis] + delta * scale);
  }
  return out;
}

export function jitterIdeology(base: IdeologyVector, rng: Rng, sd: number): IdeologyVector {
  const out = { ...base };
  for (const axis of IDEOLOGY_AXES) out[axis] = clamp(out[axis] + rng.normal(0, sd), 0, 100);
  return out;
}

/** Quão distante do centro (50) está um vetor — usado como medida de radicalização. */
export function ideologyExtremity(v: IdeologyVector): number {
  let total = 0;
  for (const axis of IDEOLOGY_AXES) total += Math.abs(v[axis] - 50);
  return total / IDEOLOGY_AXES.length / 50;
}

export function averageIdeology(
  items: readonly { ideology: IdeologyVector; weight: number }[],
): IdeologyVector {
  const out = {} as IdeologyVector;
  let wsum = 0;
  for (const item of items) wsum += item.weight;
  for (const axis of IDEOLOGY_AXES) {
    let total = 0;
    for (const item of items) total += item.ideology[axis] * item.weight;
    out[axis] = wsum === 0 ? 50 : total / wsum;
  }
  return out;
}

/** Descrição curta para a interface, ex.: "Mercado, Conservador". */
export function describeIdeology(
  v: IdeologyVector,
  labels: Record<IdeologyAxis, { low: string; high: string }>,
): string {
  const strongest = [...IDEOLOGY_AXES]
    .map((axis) => ({ axis, delta: v[axis] - 50 }))
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
    .slice(0, 2)
    .filter((x) => Math.abs(x.delta) >= 8);
  if (strongest.length === 0) return 'Centro';
  return strongest.map((x) => (x.delta < 0 ? labels[x.axis].low : labels[x.axis].high)).join(', ');
}
