import { capitalOf, mapUnits, STATES } from '@republica/game-engine';
import {
  Atlas,
  BRAZIL_VIEWBOX,
  cn,
  NO_INSETS,
  ZoneMap,
  type AtlasPin,
  type Insets,
  type MapFill,
  type ZoneSpec,
} from '@republica/ui';
import { useMemo, type CSSProperties } from 'react';
import { useMatch, useNavigate } from 'react-router';
import { useGameState } from '../../store/gameStore';
import { useUi } from '../../store/uiStore';
import { ATLAS_REGIONS, CAPITAL_PINS } from './atlasRegions';
import { mapMarkers } from './mapMarkers';
import { rankOf, useActiveLayer } from './useActiveLayer';
import { useChangePulse } from './useChangePulse';

const WORLD = [0, 0, BRAZIL_VIEWBOX.width, BRAZIL_VIEWBOX.height] as const;

/**
 * Mapa sempre ao fundo da tela de jogo (estilo Victoria 3), desenhado pelo Atlas.
 *
 * Lê o estado do jogo e as escolhas de interface, resolve a camada no motor (`useActiveLayer`),
 * converte em cores e entrega ao Atlas com a área livre (`insets`) — o mapa desliza para fora do
 * painel aberto. Clique numa região → painel da região (`/jogo/regiao/:unitId`).
 */
export function MapStage({
  style,
  className,
  insets = NO_INSETS,
}: {
  style?: CSSProperties;
  className?: string;
  /** Pixels do mapa cobertos pela interface (painel aberto, outliner). */
  insets?: Insets;
}) {
  const game = useGameState();
  const navigate = useNavigate();
  const match = useMatch('/jogo/regiao/:unitId');
  const selectUnit = useUi((s) => s.selectUnit);
  const numbers = useUi((s) => s.mapNumbers);
  const showMarkers = useUi((s) => s.mapMarkers);
  const active = useActiveLayer();
  const pulses = useChangePulse(active, game.date);
  const units = useMemo(() => mapUnits(game), [game]);
  const names = useMemo(() => Object.fromEntries(units.map((u) => [u.id, u.name])), [units]);
  const markers = useMemo(() => (showMarkers ? mapMarkers(game) : []), [game, showMarkers]);
  const selected = match?.params.unitId ?? null;
  const { layer, scale } = active;
  const isZones = units[0]?.kind === 'zone';
  const isCity = units.some((u) => u.zone?.type === 'center');
  const stateId = units[0]?.stateId ?? 'SP';
  // Saves antigos e o DF (zonas de cidade sem cidade definida) usam a capital.
  const cityId = isCity
    ? (game.election?.jurisdiction.cityId ?? game.government?.jurisdiction.cityId ?? capitalOf(stateId).id)
    : undefined;
  const jurisdiction = game.government?.jurisdiction;
  const focus = useMemo(
    () => (jurisdiction && jurisdiction.level !== 'federal' && jurisdiction.stateId ? [jurisdiction.stateId] : null),
    [jurisdiction],
  );

  const values = useMemo(() => {
    if (!numbers) return null;
    const out: Record<string, string> = {};
    for (const [id, cell] of Object.entries(layer.cells)) if (cell.short) out[id] = cell.short;
    return out;
  }, [numbers, layer]);
  const pins = useMemo<AtlasPin[]>(() => [...CAPITAL_PINS, ...markers], [markers]);

  const open = (id: string) => {
    selectUnit(id);
    navigate(`/jogo/regiao/${id}`);
  };

  const tooltip = (id: string) => {
    const cell = layer.cells[id];
    const rank = rankOf(layer.cells, id, layer.scale === 'categorical');
    return (
      <div className="space-y-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-[13px] font-semibold tracking-[0.04em] text-gold-300">
            {names[id] ?? id}
          </span>
          {cell?.short && <span className="text-[13px] font-semibold tabular-nums text-paper">{cell.short}</span>}
        </div>
        <div className="text-paper/90">{cell?.label}</div>
        {rank && layer.scale !== 'categorical' && (
          <div className="text-[10.5px] text-muted">
            {rank.rank}º de {rank.total} · {active.focus ? layer.title : active.label}
          </div>
        )}
        <div className="pt-0.5 text-[10.5px] text-muted">Clique para abrir o painel da região</div>
      </div>
    );
  };

  const zoneFills = useMemo(() => {
    const out: Record<string, MapFill> = {};
    for (const [id, p] of Object.entries(scale.paint)) out[id] = { fill: p.fill, opacity: p.noData ? 0.65 : p.opacity };
    return out;
  }, [scale]);
  const zones: ZoneSpec[] = units.map((u) => ({
    id: u.id,
    name: u.name,
    type: u.zone?.type ?? 'sector',
    ...(u.zone?.direction ? { direction: u.zone.direction } : {}),
  }));

  return (
    <div className={cn('map-ocean absolute overflow-hidden', className)} style={style} data-testid="map">
      <div className="map-vignette pointer-events-none absolute inset-0" />
      {isZones ? (
        <div className="absolute inset-y-0 right-0" style={{ left: insets.left }}>
          <ZoneMap
            kind={isCity ? 'city' : 'state'}
            stateId={stateId}
            {...(cityId ? { cityId } : {})}
            capitalCoords={STATES[stateId].capitalCoords}
            zones={zones}
            fills={zoneFills}
            selected={selected}
            onSelect={open}
            renderTooltip={tooltip}
          />
        </div>
      ) : (
        <Atlas
          regions={ATLAS_REGIONS}
          world={WORLD}
          paint={scale.paint}
          values={values}
          pins={pins}
          pulses={pulses}
          selected={selected}
          focus={focus}
          flyTo={selected}
          insets={insets}
          onSelect={open}
          renderTooltip={tooltip}
          ariaLabel="Mapa do Brasil"
        />
      )}
    </div>
  );
}
