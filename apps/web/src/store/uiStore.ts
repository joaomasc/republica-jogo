import type { MapMode } from '@republica/game-engine';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Estado da interface da tela de jogo (não faz parte do save): modo de mapa, região
 * selecionada, avanço automático, outliner e largura do painel.
 */
interface UiStore {
  /** Modo do mapa; `null` = automático conforme a fase (intenção na campanha, resultado...). */
  mapMode: MapMode | null;
  /** Partido exibido no modo "Influência partidária" (`null` = o do jogador). */
  mapPartyId: string | null;
  selectedUnitId: string | null;
  /** Avanço automático do tempo ligado. */
  playing: boolean;
  outlinerOpen: boolean;
  /** Seções do outliner recolhidas (id → true). */
  collapsed: Record<string, boolean>;
  /** Painel aberto em largura expandida. */
  panelWide: boolean;
  setMapMode: (mode: MapMode | null) => void;
  setMapPartyId: (partyId: string | null) => void;
  selectUnit: (unitId: string | null) => void;
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  setOutlinerOpen: (open: boolean) => void;
  toggleSection: (id: string) => void;
  togglePanelWide: () => void;
}

export const useUi = create<UiStore>()(
  persist(
    (set) => ({
      mapMode: null,
      mapPartyId: null,
      selectedUnitId: null,
      playing: false,
      outlinerOpen: true,
      collapsed: {},
      panelWide: false,
      setMapMode: (mapMode) => set({ mapMode }),
      setMapPartyId: (mapPartyId) => set({ mapPartyId }),
      selectUnit: (selectedUnitId) => set({ selectedUnitId }),
      setPlaying: (playing) => set({ playing }),
      togglePlaying: () => set((s) => ({ playing: !s.playing })),
      setOutlinerOpen: (outlinerOpen) => set({ outlinerOpen }),
      toggleSection: (id) => set((s) => ({ collapsed: { ...s.collapsed, [id]: !s.collapsed[id] } })),
      togglePanelWide: () => set((s) => ({ panelWide: !s.panelWide })),
    }),
    {
      name: 'republica:ui',
      // Só preferências de layout persistem; o resto vale para a sessão.
      partialize: (s) => ({
        outlinerOpen: s.outlinerOpen,
        collapsed: s.collapsed,
        panelWide: s.panelWide,
      }),
    },
  ),
);
