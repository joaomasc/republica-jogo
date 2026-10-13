/**
 * Escalas de cor do Atlas: do valor de cada região (0..1, vindo do motor) à cor no mapa.
 *
 * - **Esticada ao domínio real:** quando todos os estados ficam entre 0,45 e 0,60, a rampa vai do
 *   menor ao maior valor observado — senão o mapa sai de uma cor só. A legenda mostra sempre os
 *   extremos reais (`domain`), para a leitura continuar honesta.
 * - **Interpolação em OKLab:** degradês com brilho uniforme (sem "lama" no meio do caminho).
 * - **Sem dados** é explícito (hachurado), nunca uma cor da escala.
 */

export type ScaleKind = 'sequential' | 'diverging' | 'categorical';

export interface ScaleCell {
  value: number;
  color?: string;
  strength?: number;
}

export interface RegionPaint {
  fill: string;
  /** 0..1 */
  opacity: number;
  /** Sem dado: o Atlas desenha hachurado por cima. */
  noData?: boolean;
}

export interface ScaleDomain {
  min: number;
  max: number;
  minId: string;
  maxId: string;
  /** A escala foi esticada (valores próximos entre si). */
  stretched: boolean;
}

export interface ScaleResult {
  paint: Record<string, RegionPaint>;
  /** Posição de cada região na rampa (0..1), depois do esticamento — usada na faixa da legenda. */
  position: Record<string, number>;
  domain: ScaleDomain | null;
  /** Gradiente CSS da rampa usada (para a legenda). */
  gradient: string;
}

/** Rampa sequencial: azul-ardósia → petróleo → sálvia → ocre → ouro-pálido (brilho crescente). */
export const RAMP_SEQUENTIAL = ['#27445a', '#2f6b6a', '#6f9a62', '#c9b65e', '#f3dc93'] as const;
/** Divergente "bom → ruim": verde → areia → vermelho-tijolo. */
export const RAMP_GOOD_BAD = ['#2f8a63', '#8fb77c', '#e6dcae', '#de9a5c', '#bf4436'] as const;
/** Divergente neutro (eixos ideológicos): terracota ↔ areia ↔ anil, sem juízo de valor. */
export const RAMP_AXIS = ['#b4553f', '#d9a27a', '#e6dcae', '#8eaacb', '#3f6aa0'] as const;
export const NO_DATA_FILL = '#2a3a40';

// --- OKLab ------------------------------------------------------------------------------------

type Rgb = [number, number, number];
type Lab = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: Rgb): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function rgbToOklab([r8, g8, b8]: Rgb): Lab {
  const r = toLinear(r8);
  const g = toLinear(g8);
  const b = toLinear(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb([L, A, B]: Lab): Rgb {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** Mistura perceptual (OKLab) de duas cores hex. */
export function mixOklab(a: string, b: string, t: number): string {
  const la = rgbToOklab(hexToRgb(a));
  const lb = rgbToOklab(hexToRgb(b));
  return rgbToHex(oklabToRgb([la[0] + (lb[0] - la[0]) * t, la[1] + (lb[1] - la[1]) * t, la[2] + (lb[2] - la[2]) * t]));
}

/** Luminosidade perceptual (OKLab L, 0..1) — usada nos testes e para escolher a cor do rótulo. */
export function lightness(hex: string): number {
  return rgbToOklab(hexToRgb(hex))[0];
}

/** Cor numa rampa de N paradas (t em 0..1). */
export function rampColor(ramp: readonly string[], t: number): string {
  const v = Math.max(0, Math.min(1, t));
  const seg = Math.min(ramp.length - 2, Math.floor(v * (ramp.length - 1)));
  const local = v * (ramp.length - 1) - seg;
  return mixOklab(ramp[seg]!, ramp[seg + 1]!, local);
}

export function rampGradient(ramp: readonly string[]): string {
  return `linear-gradient(to right, ${ramp.join(', ')})`;
}

// --- Escala de uma camada -----------------------------------------------------------------------

export interface ScaleOptions {
  /** Rampa divergente a usar (padrão: bom → ruim). */
  diverging?: readonly string[];
  /** Divergente com centro fixo em 0,5 (ex.: eixo ideológico: 50 = centro). Estica simétrico. */
  centered?: boolean;
  /** Abaixo desta amplitude não estica (diferenças irrelevantes não viram contraste falso). */
  minSpan?: number;
}

/** Converte as células de uma camada em tinta por região, com o domínio real para a legenda. */
export function scaleLayer(
  kind: ScaleKind,
  cells: Record<string, ScaleCell>,
  options: ScaleOptions = {},
): ScaleResult {
  const paint: Record<string, RegionPaint> = {};
  const position: Record<string, number> = {};
  const ramp = kind === 'diverging' ? (options.diverging ?? RAMP_GOOD_BAD) : RAMP_SEQUENTIAL;
  const minSpan = options.minSpan ?? 0.04;

  let min = Infinity;
  let max = -Infinity;
  let minId = '';
  let maxId = '';
  for (const [id, cell] of Object.entries(cells)) {
    if (!Number.isFinite(cell.value)) continue;
    if (cell.value < min) {
      min = cell.value;
      minId = id;
    }
    if (cell.value > max) {
      max = cell.value;
      maxId = id;
    }
  }
  const hasData = minId !== '';
  const span = max - min;

  let toT: (v: number) => number = (v) => v;
  let stretched = false;
  if (hasData && kind !== 'categorical' && span >= minSpan) {
    if (kind === 'diverging' && options.centered) {
      const dev = Math.max(Math.abs(max - 0.5), Math.abs(min - 0.5));
      if (dev > 0 && dev < 0.5) {
        toT = (v) => 0.5 + (v - 0.5) / (2 * dev);
        stretched = true;
      }
    } else if (span < 0.999) {
      toT = (v) => (v - min) / span;
      stretched = true;
    }
  }

  for (const [id, cell] of Object.entries(cells)) {
    if (!Number.isFinite(cell.value)) {
      paint[id] = { fill: NO_DATA_FILL, opacity: 1, noData: true };
      continue;
    }
    const v = Math.max(0, Math.min(1, cell.value));
    if (kind === 'categorical') {
      if (!cell.color) {
        paint[id] = { fill: NO_DATA_FILL, opacity: 1, noData: true };
        continue;
      }
      const strength = Math.max(0, Math.min(1, cell.strength ?? v));
      paint[id] = { fill: cell.color, opacity: 0.45 + 0.55 * Math.max(0, Math.min(1, (strength - 0.2) / 0.45)) };
      position[id] = strength;
      continue;
    }
    const t = Math.max(0, Math.min(1, toT(v)));
    position[id] = t;
    paint[id] = { fill: rampColor(ramp, t), opacity: 1 };
  }

  return {
    paint,
    position,
    domain: hasData ? { min, max, minId, maxId, stretched } : null,
    gradient: rampGradient(ramp),
  };
}
