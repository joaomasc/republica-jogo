export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function clamp100(value: number): number {
  return clamp(value, 0, 100);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function sum(values: Iterable<number>): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

export function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length;
}

export function weightedMean(pairs: readonly (readonly [value: number, weight: number])[]): number {
  let total = 0;
  let weights = 0;
  for (const [value, weight] of pairs) {
    total += value * weight;
    weights += weight;
  }
  return weights === 0 ? 0 : total / weights;
}

export function round(value: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Normaliza um record numérico para somar 1 (valores negativos viram 0). */
export function normalizeRecord<K extends string>(record: Record<K, number>): Record<K, number> {
  const keys = Object.keys(record) as K[];
  const total = sum(keys.map((k) => Math.max(0, record[k])));
  const out = {} as Record<K, number>;
  for (const k of keys) out[k] = total > 0 ? Math.max(0, record[k]) / total : 1 / keys.length;
  return out;
}

/** Aproxima um valor em direção a um alvo com taxa `rate` (0..1). */
export function approach(current: number, target: number, rate: number): number {
  return current + (target - current) * clamp01(rate);
}

export function entries<K extends string, V>(record: Record<K, V>): [K, V][] {
  return Object.entries(record) as [K, V][];
}

export function keys<K extends string>(record: Record<K, unknown>): K[] {
  return Object.keys(record) as K[];
}

export function mapRecord<K extends string, V, R>(
  record: Record<K, V>,
  fn: (value: V, key: K) => R,
): Record<K, R> {
  const out = {} as Record<K, R>;
  for (const [k, v] of entries(record)) out[k] = fn(v, k);
  return out;
}

export function fromKeys<K extends string, V>(list: readonly K[], fn: (key: K) => V): Record<K, V> {
  const out = {} as Record<K, V>;
  for (const k of list) out[k] = fn(k);
  return out;
}

export function formatMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}R$ ${round(abs / 1e9, 2).toLocaleString('pt-BR')} bi`;
  if (abs >= 1e6) return `${sign}R$ ${round(abs / 1e6, 2).toLocaleString('pt-BR')} mi`;
  if (abs >= 1e3) return `${sign}R$ ${round(abs / 1e3, 1).toLocaleString('pt-BR')} mil`;
  return `${sign}R$ ${Math.round(abs).toLocaleString('pt-BR')}`;
}

export function formatNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${round(value / 1e6, 1).toLocaleString('pt-BR')} mi`;
  if (abs >= 1e3) return `${round(value / 1e3, 1).toLocaleString('pt-BR')} mil`;
  return Math.round(value).toLocaleString('pt-BR');
}

export function formatPct(fraction: number, digits = 1): string {
  return `${round(fraction * 100, digits).toLocaleString('pt-BR')}%`;
}
