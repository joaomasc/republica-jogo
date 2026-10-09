import { useSyncExternalStore } from 'react';
import type { PanelWidth } from './navigation';

/** Medidas fixas da tela de jogo (px). */
export const LAYOUT = {
  topBar: 56,
  dock: 58,
  gap: 8,
  edge: 12,
  outliner: 304,
  /** Abaixo desta largura de janela o outliner fica recolhido. */
  outlinerMinViewport: 1280,
  /** Bloco do canto inferior direito (tempo, modos de mapa, CTA). */
  cluster: 388,
  /** Largura mínima de mapa visível antes de deixar o outliner flutuar sobre ele. */
  minMap: 460,
  /** Largura mínima absoluta de um painel. */
  panelMin: 360,
} as const;

/** Largura do painel aberto sobre o mapa, sem invadir o bloco de tempo do canto direito. */
export function panelWidthPx(kind: PanelWidth, viewport: number): number {
  const room = viewport - LAYOUT.dock - LAYOUT.gap * 2 - LAYOUT.cluster - LAYOUT.edge * 2;
  const wanted =
    kind === 'narrow'
      ? Math.max(360, Math.min(440, room))
      : kind === 'wide'
        ? Math.max(560, Math.min(1240, room))
        : Math.max(560, Math.min(980, viewport * 0.62, room));
  // Nunca invade o bloco de tempo, exceto em janelas tão estreitas que não sobra espaço.
  return Math.max(LAYOUT.panelMin, Math.min(wanted, room));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

/** Largura da janela (reativa a redimensionamentos). */
export function useViewportWidth(): number {
  return useSyncExternalStore(
    subscribe,
    () => window.innerWidth,
    () => 1600,
  );
}
