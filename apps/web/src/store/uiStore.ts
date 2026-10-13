import type { BuildingId, GoodId, IdeologyAxis, MapMode } from '@republica/game-engine';

/** Recorte pedido ao mapa por um painel aberto (o mapa resolve no motor a cada estado novo). */
export type MapFocus = { kind: 'good'; id: GoodId } | { kind: 'building'; id: BuildingId };

/**
 * Painel que usa o mapa como seletor: clicar num estado chama `pick` (ex.: onde construir, onde
 * anunciar) em vez de abrir o painel da região; as escolhas (`selected`) ficam marcadas no mapa.
 */
export interface MapPick {
  hint: string;
  selected: readonly string[];
  pick: (unitId: string) => void;
}
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
  /** Eixo do modo "Ideologia do eleitorado". */
  mapAxis: IdeologyAxis;
  /** Recorte pedido pelo painel aberto (produção de um bem, níveis de um edifício). */
  mapFocus: MapFocus | null;
  /** Painel aberto usando o mapa como seletor. */
  mapPick: MapPick | null;
  /** O modo do mapa acompanha o painel aberto (Economia → desemprego, Pesquisas → intenção...). */
  mapAuto: boolean;
  /** Escreve o valor do modo sobre cada estado. */
  mapNumbers: boolean;
  /** Mostra marcadores de dados (obras, canteiros industriais). */
  mapMarkers: boolean;
  /** Ranking das regiões aberto na legenda. */
  mapRanking: boolean;
  /** Detalhes da legenda do mapa expandidos. */
  mapLegendOpen: boolean;
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
  setMapAxis: (axis: IdeologyAxis) => void;
  setMapFocus: (focus: MapFocus | null) => void;
  setMapPick: (pick: MapPick | null) => void;
  toggleMapOption: (key: 'mapAuto' | 'mapNumbers' | 'mapMarkers' | 'mapRanking' | 'mapLegendOpen') => void;
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
      mapAxis: 'economy',
      mapFocus: null,
      mapPick: null,
      mapAuto: true,
      mapNumbers: false,
      mapMarkers: true,
      mapRanking: false,
      mapLegendOpen: true,
      selectedUnitId: null,
      playing: false,
      outlinerOpen: true,
      collapsed: {},
      panelWide: false,
      setMapMode: (mapMode) => set({ mapMode }),
      setMapPartyId: (mapPartyId) => set({ mapPartyId }),
      setMapAxis: (mapAxis) => set({ mapAxis }),
      setMapFocus: (mapFocus) => set({ mapFocus }),
      setMapPick: (mapPick) => set({ mapPick }),
      toggleMapOption: (key) => set((s) => ({ [key]: !s[key] })),
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
        mapAuto: s.mapAuto,
        mapNumbers: s.mapNumbers,
        mapMarkers: s.mapMarkers,
        mapRanking: s.mapRanking,
        mapLegendOpen: s.mapLegendOpen,
      }),
    },
  ),
);
