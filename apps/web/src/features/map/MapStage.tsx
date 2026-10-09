import {
  mapLayer,
  mapUnits,
  STATES,
  type MapLayer,
  type MapMode,
} from '@republica/game-engine';
import { BrazilMap, cn, Icon, ZoneMap, type ZoneSpec } from '@republica/ui';
import { useMemo, type CSSProperties } from 'react';
import { useMatch, useNavigate } from 'react-router';
import { useGameState } from '../../store/gameStore';
import { useUi } from '../../store/uiStore';
import { effectiveMode, modeLabel, modeMeta } from './mapModes';
import { STAGE_DIVERGING, STAGE_SEQUENTIAL, stageFills } from './mapPalette';

/** Rosa dos ventos decorativa. */
function CompassRose() {
  const points = [0, 90, 180, 270];
  return (
    <svg viewBox="-50 -50 100 100" width={78} height={78} aria-hidden className="opacity-60">
      <circle r="44" fill="none" stroke="#c7a047" strokeOpacity="0.45" strokeWidth="1" />
      <circle r="38" fill="none" stroke="#c7a047" strokeOpacity="0.25" strokeWidth="0.8" />
      {Array.from({ length: 32 }, (_, i) => {
        const a = (i / 32) * Math.PI * 2;
        const r0 = i % 4 === 0 ? 34 : 39;
        return (
          <line
            key={i}
            x1={Math.cos(a) * r0}
            y1={Math.sin(a) * r0}
            x2={Math.cos(a) * 44}
            y2={Math.sin(a) * 44}
            stroke="#c7a047"
            strokeOpacity="0.4"
            strokeWidth="0.8"
          />
        );
      })}
      {points.map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path d="M0 -40 L6 -6 L0 0 Z" fill="#e3c372" />
          <path d="M0 -40 L-6 -6 L0 0 Z" fill="#8f6f2b" />
        </g>
      ))}
      {[45, 135, 225, 315].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path d="M0 -24 L4 -4 L0 0 Z" fill="#c9d8d4" fillOpacity="0.7" />
          <path d="M0 -24 L-4 -4 L0 0 Z" fill="#5b7c80" fillOpacity="0.7" />
        </g>
      ))}
      <circle r="3" fill="#0b1a22" stroke="#e3c372" strokeWidth="1" />
      <text
        y="-46"
        textAnchor="middle"
        fontSize="9"
        fill="#e3c372"
        fontWeight="700"
        className="font-display"
      >
        N
      </text>
    </svg>
  );
}

/** Cartela de legenda do modo de mapa (canto inferior esquerdo do mapa). */
function MapLegend({ layer, mode }: { layer: MapLayer; mode: MapMode }) {
  const game = useGameState();
  const mapPartyId = useUi((s) => s.mapPartyId);
  const setMapPartyId = useUi((s) => s.setMapPartyId);
  const meta = modeMeta(mode);
  const partyId =
    mapPartyId && game.parties[mapPartyId]
      ? mapPartyId
      : (game.candidates[game.playerId]?.partyId ?? '');
  return (
    <div className="cartouche pointer-events-auto absolute bottom-3 left-3 w-72 max-w-[calc(100%-24px)] rounded-[5px] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Icon name={meta.icon} size={15} className="shrink-0 text-gold-400" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[13px] font-semibold tracking-[0.04em] text-paper">
            {modeLabel(mode)}
          </div>
          <div className="truncate text-[11px] text-muted">{layer.title}</div>
        </div>
        {mode === 'party' && (
          <select
            className="game-select shrink-0 px-1.5 py-0.5 text-xs"
            value={partyId}
            onChange={(e) => setMapPartyId(e.target.value)}
            aria-label="Partido exibido no mapa"
          >
            {Object.values(game.parties).map((p) => (
              <option key={p.id} value={p.id}>
                {p.acronym}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="mt-2 text-[11px] text-muted">
        {layer.scale === 'categorical' ? (
          <span>
            {layer.legend.low} · {layer.legend.high}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="shrink-0">{layer.legend.low}</span>
            <span
              className="h-2 flex-1 rounded-[2px] ring-1 ring-black/50"
              style={{
                background: layer.scale === 'diverging' ? STAGE_DIVERGING : STAGE_SEQUENTIAL,
              }}
            />
            <span className="shrink-0">{layer.legend.high}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Mapa sempre ao fundo da tela de jogo (estilo Victoria 3): modo de mapa, dica ao passar o
 * mouse, legenda e clique numa região → painel da região (`/jogo/regiao/:unitId`).
 */
export function MapStage({ style, className }: { style?: CSSProperties; className?: string }) {
  const game = useGameState();
  const navigate = useNavigate();
  const match = useMatch('/jogo/regiao/:unitId');
  const storedMode = useUi((s) => s.mapMode);
  const mapPartyId = useUi((s) => s.mapPartyId);
  const selectUnit = useUi((s) => s.selectUnit);
  const mode = effectiveMode(storedMode, game);
  const partyId =
    mapPartyId && game.parties[mapPartyId]
      ? mapPartyId
      : (game.candidates[game.playerId]?.partyId ?? '');
  const layer = useMemo(() => mapLayer(game, mode, partyId), [game, mode, partyId]);
  const fills = useMemo(() => stageFills(layer), [layer]);
  const units = useMemo(() => mapUnits(game), [game]);
  const selected = match?.params.unitId ?? null;
  const isZones = units[0]?.kind === 'zone';
  const isCity = units.some((u) => u.zone?.type === 'center');
  const stateId = units[0]?.stateId ?? 'SP';

  const open = (id: string) => {
    selectUnit(id);
    navigate(`/jogo/regiao/${id}`);
  };
  const tooltip = (id: string) => {
    const unit = units.find((u) => u.id === id);
    const cell = layer.cells[id];
    return (
      <div className="space-y-0.5">
        <div className="font-display text-[13px] font-semibold tracking-[0.04em] text-gold-300">
          {unit?.name ?? id}
        </div>
        <div className="text-paper/90">{cell?.label}</div>
        <div className="pt-0.5 text-[10.5px] text-muted">Clique para abrir o painel da região</div>
      </div>
    );
  };
  const zones: ZoneSpec[] = units.map((u) => ({
    id: u.id,
    name: u.name,
    type: u.zone?.type ?? 'sector',
    ...(u.zone?.direction ? { direction: u.zone.direction } : {}),
  }));

  return (
    <div
      className={cn('map-ocean absolute overflow-hidden', className)}
      style={style}
      data-testid="map"
    >
      <div className="map-vignette pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4">
        <CompassRose />
      </div>
      <div className="absolute inset-0">
        {isZones ? (
          <ZoneMap
            kind={isCity ? 'city' : 'state'}
            stateId={stateId}
            capitalCoords={STATES[stateId].capitalCoords}
            zones={zones}
            fills={fills}
            selected={selected}
            onSelect={open}
            renderTooltip={tooltip}
          />
        ) : (
          <BrazilMap
            fills={fills}
            selected={selected}
            onSelect={open}
            renderTooltip={tooltip}
            focus={
              game.government && game.government.jurisdiction.level !== 'federal' && game.government.jurisdiction.stateId
                ? [game.government.jurisdiction.stateId]
                : null
            }
          />
        )}
      </div>
      <MapLegend layer={layer} mode={mode} />
    </div>
  );
}
