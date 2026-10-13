import {
  buildingLayer,
  goodLayer,
  mapLayer,
  type GameState,
  type IdeologyAxis,
  type MapLayer,
  type MapMode,
} from '@republica/game-engine';
import { RAMP_AXIS, scaleLayer, type ScaleResult } from '@republica/ui';
import { useMemo } from 'react';
import { useGameState } from '../../store/gameStore';
import { useUi, type MapFocus } from '../../store/uiStore';
import { effectiveMode, modeLabel, modeMeta } from './mapModes';

export interface ActiveLayer {
  layer: MapLayer;
  scale: ScaleResult;
  /** Modo fixo em uso (mesmo quando um foco de painel está por cima). */
  mode: MapMode;
  focus: MapFocus | null;
  /** Nome da camada para a legenda ("Desemprego", "Produção: Aço"...). */
  label: string;
  icon: string;
  polarity: 1 | -1 | 0;
  partyId: string;
  axis: IdeologyAxis;
  /** Chave estável da camada (para comparar meses da MESMA camada). */
  key: string;
}

function playerPartyId(game: GameState): string {
  return game.candidates[game.playerId]?.partyId ?? '';
}

/** Camada do mapa conforme o modo, o foco pedido pelo painel e as escolhas da legenda. */
export function resolveLayer(
  game: GameState,
  stored: MapMode | null,
  focus: MapFocus | null,
  storedParty: string | null,
  axis: IdeologyAxis,
): ActiveLayer {
  const mode = effectiveMode(stored, game);
  const partyId = storedParty && game.parties[storedParty] ? storedParty : playerPartyId(game);
  if (focus) {
    const layer = focus.kind === 'good' ? goodLayer(game, focus.id) : buildingLayer(game, focus.id);
    return {
      layer,
      scale: scaleLayer(layer.scale, layer.cells),
      mode,
      focus,
      label: layer.title,
      icon: focus.kind === 'good' ? 'package' : 'factory',
      polarity: 1,
      partyId,
      axis,
      key: `${focus.kind}:${focus.id}`,
    };
  }
  const layer = mapLayer(game, mode, partyId, axis);
  const meta = modeMeta(mode);
  return {
    layer,
    scale: scaleLayer(
      layer.scale,
      layer.cells,
      mode === 'ideology' ? { diverging: RAMP_AXIS, centered: true } : {},
    ),
    mode,
    focus: null,
    label: modeLabel(mode),
    icon: meta.icon,
    polarity: meta.polarity,
    partyId,
    axis,
    key: `${mode}:${mode === 'party' ? partyId : mode === 'ideology' ? axis : ''}`,
  };
}

/** Camada ativa do mapa (memoizada pelo estado do jogo e pelas escolhas de interface). */
export function useActiveLayer(): ActiveLayer {
  const game = useGameState();
  const stored = useUi((s) => s.mapMode);
  const focus = useUi((s) => s.mapFocus);
  const party = useUi((s) => s.mapPartyId);
  const axis = useUi((s) => s.mapAxis);
  return useMemo(
    () => resolveLayer(game, stored, focus, party, axis),
    [game, stored, focus, party, axis],
  );
}

/** Posição de uma região na leitura ativa ("3º de 27"), para dicas e painéis. */
export function rankOf(
  cells: Record<string, { value: number; strength?: number }>,
  id: string,
  categorical: boolean,
): { rank: number; total: number } | null {
  const sortValue = (c: { value: number; strength?: number }) =>
    categorical ? (c.strength ?? c.value) : c.value;
  const list = Object.values(cells).filter((c) => Number.isFinite(c.value));
  const mine = cells[id];
  if (!mine || !Number.isFinite(mine.value)) return null;
  const v = sortValue(mine);
  return { rank: 1 + list.filter((c) => sortValue(c) > v).length, total: list.length };
}
