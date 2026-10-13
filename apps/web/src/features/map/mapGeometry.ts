import { capitalOf, STATES, type ElectoralUnit, type GameState } from '@republica/game-engine';
import { BRAZIL_VIEWBOX, useZoneAtlas, type AtlasProps, type ZoneSpec } from '@republica/ui';
import { useMemo } from 'react';
import { ATLAS_REGIONS } from './atlasRegions';

const WORLD = [0, 0, BRAZIL_VIEWBOX.width, BRAZIL_VIEWBOX.height] as const;

export type MapGeometry = Pick<
  AtlasProps,
  'regions' | 'world' | 'outline' | 'backdrop' | 'context'
> & {
  /** km por unidade (ausente = projeção nacional; null = sem barra de escala). */
  kmPerUnit?: number | null;
  /** Mapa de zonas (eleição de prefeito/governador/vereador), não de UFs. */
  zones: boolean;
};

/**
 * Geometria do mapa para as unidades eleitorais do momento: as 27 UFs ou as zonas de um estado
 * ou de uma cidade (recortadas no contorno real, com a malha municipal carregada sob demanda).
 */
export function useMapGeometry(game: GameState, units: ElectoralUnit[]): MapGeometry {
  const isZones = units[0]?.kind === 'zone';
  const isCity = units.some((u) => u.zone?.type === 'center');
  const stateId = units[0]?.stateId ?? 'SP';
  // Saves antigos e o DF (zonas de cidade sem cidade definida) usam a capital.
  const cityId = isCity
    ? (game.election?.jurisdiction.cityId ??
      game.government?.jurisdiction.cityId ??
      capitalOf(stateId).id)
    : undefined;
  const zones = useMemo<ZoneSpec[]>(
    () =>
      isZones
        ? units.map((u) => ({
            id: u.id,
            name: u.name,
            type: u.zone?.type ?? 'sector',
            ...(u.zone?.direction ? { direction: u.zone.direction } : {}),
          }))
        : [],
    [units, isZones],
  );
  const zone = useZoneAtlas(
    isCity ? 'city' : 'state',
    stateId,
    cityId,
    STATES[stateId].capitalCoords,
    zones,
  );
  return useMemo<MapGeometry>(
    () =>
      isZones
        ? {
            regions: zone.regions,
            world: zone.world,
            outline: zone.outline,
            backdrop: zone.backdrop,
            context: zone.context,
            ...(zone.kmPerUnit !== undefined ? { kmPerUnit: zone.kmPerUnit } : {}),
            zones: true,
          }
        : {
            regions: ATLAS_REGIONS,
            world: WORLD,
            outline: null,
            backdrop: [],
            context: true,
            zones: false,
          },
    [isZones, zone],
  );
}
