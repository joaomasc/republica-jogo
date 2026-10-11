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
  /** O mesmo bloco em janelas estreitas (controles numa linha, modos de mapa num menu). */
  clusterCompact: 328,
  /** Abaixo desta largura o bloco direito usa a versão compacta. */
  compactViewport: 1400,
  /** Abaixo desta altura o bloco direito também compacta (tempo numa linha, legenda menor). */
  compactHeight: 780,
  /** Largura mínima de mapa visível antes de deixar o outliner flutuar sobre ele. */
  minMap: 460,
  /** Largura mínima absoluta de um painel. */
  panelMin: 360,
} as const;

/** Largura do bloco direito (Panorama + tempo) para a largura de janela dada. */
export function clusterWidth(viewport: number): number {
  return viewport < LAYOUT.compactViewport ? LAYOUT.clusterCompact : LAYOUT.cluster;
}

/** Bloco direito compacto: janela estreita ou baixa. */
export function isCompactHud(width: number, height: number): boolean {
  return width < LAYOUT.compactViewport || height < LAYOUT.compactHeight;
}

/** Largura do painel aberto sobre o mapa, sem invadir o bloco de tempo do canto direito. */
export function panelWidthPx(kind: PanelWidth, viewport: number): number {
  const room = viewport - LAYOUT.dock - LAYOUT.gap * 2 - clusterWidth(viewport) - LAYOUT.edge * 2;
  const wanted =
    kind === 'narrow'
      ? Math.max(360, Math.min(440, room))
      : kind === 'wide'
        ? Math.max(560, Math.min(1240, room))
        : Math.max(560, Math.min(980, viewport * 0.62, room));
  // Nunca invade o bloco de tempo, exceto em janelas tão estreitas que não sobra espaço.
  return Math.max(LAYOUT.panelMin, Math.min(wanted, room));
}

export interface DockMetrics {
  padding: number;
  item: number;
  itemGap: number;
  separator: number;
}

/** Medidas do dock vertical (px), espelhando as classes do componente. */
export const DOCK: DockMetrics = { padding: 16, item: 38, itemGap: 4, separator: 16 };
/** Dock denso (telas baixas): ícones menores e divisórias mais finas. */
export const DOCK_DENSE: DockMetrics = { padding: 12, item: 34, itemGap: 2, separator: 10 };

function groupHeight(items: number, collapsed: boolean, m: DockMetrics): number {
  const n = collapsed ? 1 : items;
  return m.separator + n * m.item + Math.max(0, n - 1) * m.itemGap;
}

/** Altura total do dock (mapa + grupos), com os grupos recolhidos indicados. */
export function dockHeight(
  groups: readonly { id: string; size: number }[],
  collapsed: ReadonlySet<string>,
  metrics: DockMetrics = DOCK,
): number {
  return (
    metrics.padding +
    metrics.item +
    groups.reduce((total, g) => total + groupHeight(g.size, collapsed.has(g.id), metrics), 0)
  );
}

/**
 * Quais grupos do dock viram um botão único (com lista) para tudo caber na altura disponível.
 * Recolhe primeiro os grupos que mais economizam espaço; o grupo principal da fase (campanha
 * ou mandato) fica aberto até ser a última opção.
 */
export function planDock(
  groups: readonly { id: string; size: number }[],
  available: number,
  keepOpen: string | null,
  metrics: DockMetrics = DOCK,
): Set<string> {
  const collapsed = new Set<string>();
  const candidates = groups
    .filter((g) => g.size > 1)
    .sort((a, b) => {
      if ((a.id === keepOpen) !== (b.id === keepOpen)) return a.id === keepOpen ? 1 : -1;
      return b.size - a.size;
    });
  for (const g of candidates) {
    if (dockHeight(groups, collapsed, metrics) <= available) break;
    collapsed.add(g.id);
  }
  return collapsed;
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

/** Altura da janela (reativa a redimensionamentos). */
export function useViewportHeight(): number {
  return useSyncExternalStore(
    subscribe,
    () => window.innerHeight,
    () => 900,
  );
}
