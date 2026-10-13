import type { CSSProperties } from 'react';

/** Cor de uma região no mapa de zonas. */
export interface MapFill {
  fill: string;
  /** Opacidade/intensidade (0..1). */
  opacity?: number;
}

export interface MousePos {
  x: number;
  y: number;
  /** Tamanho do contêiner (para o balão não sair pela borda). */
  w: number;
  h: number;
}

/** Posição do balão que segue o mouse, invertendo perto das bordas. */
export function floatingTooltipStyle(m: MousePos): CSSProperties {
  const flipX = m.x > m.w - 300;
  const flipY = m.y > m.h - 160;
  return {
    left: flipX ? m.x - 16 : m.x + 16,
    top: flipY ? m.y - 16 : m.y + 16,
    transform: `translate(${flipX ? '-100%' : '0'}, ${flipY ? '-100%' : '0'})`,
  };
}

/** Cores do traçado do mapa (tema ardósia + latão). */
export const MAP_INK = {
  land: '#23414d',
  border: '#06121a',
  hover: '#f3ead2',
  selected: '#f0d68a',
  label: '#f6efdc',
  labelStroke: '#06121a',
} as const;
