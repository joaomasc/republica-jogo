import { mapUnits } from '@republica/game-engine';
import { Atlas, cn, NO_INSETS, type AtlasPin, type Insets } from '@republica/ui';
import { useMemo, type CSSProperties } from 'react';
import { useMatch, useNavigate } from 'react-router';
import { useGameState } from '../../store/gameStore';
import { useUi } from '../../store/uiStore';
import { CAPITAL_PINS } from './atlasRegions';
import { useMapGeometry } from './mapGeometry';
import { mapMarkers } from './mapMarkers';
import { rankOf, useActiveLayer } from './useActiveLayer';
import { useChangePulse } from './useChangePulse';

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
  const mapPick = useUi((s) => s.mapPick);
  const active = useActiveLayer();
  const pulses = useChangePulse(active, game.date);
  const units = useMemo(() => mapUnits(game), [game]);
  const names = useMemo(() => Object.fromEntries(units.map((u) => [u.id, u.name])), [units]);
  const markers = useMemo(() => (showMarkers ? mapMarkers(game) : []), [game, showMarkers]);
  const routeSelected = match?.params.unitId ?? null;
  // Com um painel usando o mapa como seletor, o realce são as escolhas dele (e a câmera não voa).
  const selected = mapPick ? null : routeSelected;
  const { layer, scale } = active;
  const geometry = useMapGeometry(game, units);
  const jurisdiction = game.government?.jurisdiction;
  const focus = useMemo(
    () =>
      jurisdiction && jurisdiction.level !== 'federal' && jurisdiction.stateId
        ? [jurisdiction.stateId]
        : null,
    [jurisdiction],
  );

  const values = useMemo(() => {
    if (!numbers) return null;
    const out: Record<string, string> = {};
    for (const [id, cell] of Object.entries(layer.cells)) if (cell.short) out[id] = cell.short;
    return out;
  }, [numbers, layer]);
  // Capitais e marcadores são por UF: no mapa de zonas, nenhum.
  const pins = useMemo<AtlasPin[]>(
    () => (geometry.zones ? [] : [...CAPITAL_PINS, ...markers]),
    [geometry.zones, markers],
  );

  const open = (id: string) => {
    if (mapPick) {
      mapPick.pick(id);
      return;
    }
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
          {cell?.short && (
            <span className="text-[13px] font-semibold tabular-nums text-paper">{cell.short}</span>
          )}
        </div>
        <div className="text-paper/90">{cell?.label}</div>
        {rank && layer.scale !== 'categorical' && (
          <div className="text-[10.5px] text-muted">
            {rank.rank}º de {rank.total} · {active.focus ? layer.title : active.label}
          </div>
        )}
        <div className={cn('pt-0.5 text-[10.5px]', mapPick ? 'text-gold-300' : 'text-muted')}>
          {mapPick ? mapPick.hint : 'Clique para abrir o painel da região'}
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn('map-ocean absolute overflow-hidden', className)}
      style={style}
      data-testid="map"
    >
      <div className="map-vignette pointer-events-none absolute inset-0" />
      <Atlas
        regions={geometry.regions}
        world={geometry.world}
        outline={geometry.outline ?? null}
        backdrop={geometry.backdrop ?? []}
        context={geometry.context ?? true}
        {...(geometry.kmPerUnit !== undefined ? { kmPerUnit: geometry.kmPerUnit } : {})}
        paint={scale.paint}
        values={values}
        pins={pins}
        pulses={pulses}
        selected={selected}
        marked={mapPick?.selected ?? null}
        focus={geometry.zones ? null : focus}
        flyTo={routeSelected}
        insets={insets}
        onSelect={open}
        renderTooltip={tooltip}
        ariaLabel={geometry.zones ? 'Mapa das zonas eleitorais' : 'Mapa do Brasil'}
      />
    </div>
  );
}
