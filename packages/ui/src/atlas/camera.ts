/**
 * Câmera do Atlas: matemática pura (sem DOM), testável.
 *
 * Convenção: um ponto do mundo (coordenadas do mapa gerado, ~0..1000) aparece na tela em
 * `screen = world * k + (x, y)`, em pixels do contêiner.
 */

export interface Camera {
  x: number;
  y: number;
  k: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Retângulo no mundo: [x0, y0, x1, y1]. */
export type Bounds = readonly [number, number, number, number];

/** Pixels da tela ocupados por interface (painel, outliner...) — a câmera enquadra o resto. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export interface ZoomLimits {
  minK: number;
  maxK: number;
}

/** Área útil da tela depois de descontar a interface (nunca menor que um mínimo razoável). */
export function safeArea(
  size: Size,
  insets: Insets,
): { x: number; y: number; width: number; height: number } {
  const width = Math.max(160, size.width - insets.left - insets.right);
  const height = Math.max(160, size.height - insets.top - insets.bottom);
  // Se a interface ocupa quase tudo, centraliza na tela inteira em vez de espremer o mapa.
  const x = size.width - insets.left - insets.right >= 160 ? insets.left : (size.width - width) / 2;
  const y =
    size.height - insets.top - insets.bottom >= 160 ? insets.top : (size.height - height) / 2;
  return { x, y, width, height };
}

/** Câmera que enquadra `bounds` dentro da área útil, com margem em pixels. */
export function fitBounds(
  bounds: Bounds,
  size: Size,
  insets: Insets = NO_INSETS,
  padding = 24,
  maxK = Infinity,
): Camera {
  const area = safeArea(size, insets);
  const bw = Math.max(1e-6, bounds[2] - bounds[0]);
  const bh = Math.max(1e-6, bounds[3] - bounds[1]);
  const k = Math.min(
    maxK,
    Math.max(1e-6, (area.width - padding * 2) / bw),
    Math.max(1e-6, (area.height - padding * 2) / bh),
  );
  const cx = (bounds[0] + bounds[2]) / 2;
  const cy = (bounds[1] + bounds[3]) / 2;
  return { k, x: area.x + area.width / 2 - cx * k, y: area.y + area.height / 2 - cy * k };
}

/** Converte um ponto da tela em coordenadas do mundo. */
export function screenToWorld(cam: Camera, sx: number, sy: number): [number, number] {
  return [(sx - cam.x) / cam.k, (sy - cam.y) / cam.k];
}

export function worldToScreen(cam: Camera, wx: number, wy: number): [number, number] {
  return [wx * cam.k + cam.x, wy * cam.k + cam.y];
}

/** Zoom por um fator mantendo fixo o ponto da tela (sx, sy) — o ponto sob o cursor não "foge". */
export function zoomAround(
  cam: Camera,
  factor: number,
  sx: number,
  sy: number,
  limits: ZoomLimits,
): Camera {
  const k = Math.min(limits.maxK, Math.max(limits.minK, cam.k * factor));
  const [wx, wy] = screenToWorld(cam, sx, sy);
  return { k, x: sx - wx * k, y: sy - wy * k };
}

/**
 * Mantém parte do mundo sempre visível: o jogador não "perde" o mapa arrastando para fora.
 * Pelo menos `keep` (fração da área útil) do retângulo do mundo continua na tela em cada eixo.
 */
export function clampCamera(
  cam: Camera,
  world: Bounds,
  size: Size,
  limits: ZoomLimits,
  keep = 0.35,
): Camera {
  const k = Math.min(limits.maxK, Math.max(limits.minK, cam.k));
  const clampAxis = (offset: number, w0: number, w1: number, screen: number) => {
    const span = (w1 - w0) * k;
    const margin = Math.min(span, screen) * keep;
    // Borda direita do mundo não pode passar da margem esquerda; borda esquerda não passa da direita.
    const min = margin - w1 * k;
    const max = screen - margin - w0 * k;
    return Math.min(max, Math.max(min, offset));
  };
  return {
    k,
    x: clampAxis(cam.x, world[0], world[2], size.width),
    y: clampAxis(cam.y, world[1], world[3], size.height),
  };
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Interpola duas câmeras como um voo: o zoom anda em escala logarítmica e o centro do mundo visto
 * se move em linha reta (assim o movimento parece constante, sem "mergulho" no meio).
 */
export function interpolateCamera(a: Camera, b: Camera, t: number, size: Size): Camera {
  const k = Math.exp(Math.log(a.k) + (Math.log(b.k) - Math.log(a.k)) * t);
  const [ax, ay] = screenToWorld(a, size.width / 2, size.height / 2);
  const [bx, by] = screenToWorld(b, size.width / 2, size.height / 2);
  const cx = ax + (bx - ax) * t;
  const cy = ay + (by - ay) * t;
  return { k, x: size.width / 2 - cx * k, y: size.height / 2 - cy * k };
}

/** Câmeras praticamente iguais (evita animações de 0 px). */
export function sameCamera(a: Camera, b: Camera): boolean {
  return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.k / b.k - 1) < 0.002;
}

/** Duração do voo conforme a distância e a mudança de zoom (curto para ajustes, mais longo para viagens). */
export function flightDuration(a: Camera, b: Camera, size: Size): number {
  const [ax, ay] = screenToWorld(a, size.width / 2, size.height / 2);
  const [bx, by] = screenToWorld(b, size.width / 2, size.height / 2);
  const dist = Math.hypot(bx - ax, by - ay) * Math.min(a.k, b.k);
  const zoom = Math.abs(Math.log(b.k / a.k));
  return Math.round(Math.min(900, 260 + dist * 0.35 + zoom * 260));
}

export interface FrameOptions {
  padding?: number;
  /** Abaixo desta largura livre, a interface da direita (outliner) passa a flutuar sobre o mapa. */
  minFreeWidth?: number;
  /** Zoom mínimo (padrão: 70% do enquadramento de `bounds` na tela inteira). */
  minK?: number;
  /** Zoom máximo (padrão: o enquadramento de `bounds` na tela inteira). */
  maxK?: number;
}

/**
 * Enquadra `bounds` na área livre sem deixar o mapa virar um selo: o zoom fica entre `minK` e
 * `maxK` e o centro vai para o meio da área livre. Painel largo → o Brasil desliza para a faixa
 * visível (parte dele pode ficar sob o painel, como um atlas aberto sobre a mesa), em vez de
 * encolher até sumir.
 */
export function frameBounds(
  bounds: Bounds,
  size: Size,
  insets: Insets,
  options: FrameOptions = {},
): Camera {
  const { padding = 28, minFreeWidth = 420 } = options;
  const full = fitBounds(bounds, size, NO_INSETS, padding);
  const minK = options.minK ?? full.k * 0.7;
  const maxK = options.maxK ?? full.k;
  const ins =
    size.width - insets.left - insets.right < minFreeWidth ? { ...insets, right: 0 } : insets;
  const fit = fitBounds(bounds, size, ins, padding);
  const k = Math.max(minK, Math.min(maxK, fit.k));
  const area = safeArea(size, ins);
  const cx = (bounds[0] + bounds[2]) / 2;
  const cy = (bounds[1] + bounds[3]) / 2;
  return { k, x: area.x + area.width / 2 - cx * k, y: area.y + area.height / 2 - cy * k };
}
