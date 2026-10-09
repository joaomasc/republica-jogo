import { useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { BRAZIL_VIEWBOX, projectLonLat, STATE_GEOMETRY } from './brazilGeometry.generated';
import { MapControls, type MapControlsPosition } from './MapControls';
import { useZoomPan } from './useZoomPan';

export interface MapFill {
  fill: string;
  /** Opacidade/intensidade (0..1). */
  opacity?: number;
}

export interface MapMarker {
  id: string;
  lon: number;
  lat: number;
  color: string;
  label?: string;
}

export interface BrazilMapProps {
  fills: Record<string, MapFill>;
  selected?: string | null;
  onSelect?: (id: string) => void;
  renderTooltip?: (id: string) => ReactNode;
  showLabels?: boolean;
  /** Estados em destaque (os demais ficam esmaecidos). */
  focus?: string[] | null;
  markers?: MapMarker[];
  className?: string;
  /** Posição dos botões de zoom (`none` esconde). */
  controlsPosition?: MapControlsPosition;
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

const LABEL_NUDGE: Record<string, [number, number]> = {
  DF: [6, -4],
  GO: [-10, 14],
  SE: [10, 4],
  AL: [14, 2],
  PE: [24, 0],
  PB: [26, -2],
  RN: [14, -6],
  ES: [14, 4],
  RJ: [12, 10],
  SC: [6, 0],
  MT: [0, 10],
  PA: [0, 10],
  AP: [0, 6],
  RO: [0, 4],
  TO: [0, 6],
  PI: [-2, 10],
  MG: [8, 6],
};

/** Mapa do Brasil por UF: hover, clique, zoom e arrasto. Geometria 100% local (IBGE). */
export function BrazilMap({
  fills,
  selected,
  onSelect,
  renderTooltip,
  showLabels = true,
  focus,
  markers = [],
  className,
  controlsPosition = 'top-right',
}: BrazilMapProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const base = useMemo(
    () => ({ x: 0, y: 0, w: BRAZIL_VIEWBOX.width, h: BRAZIL_VIEWBOX.height }),
    [],
  );
  const { svgRef, viewBoxAttr, handlers, wasDrag, zoomIn, zoomOut, reset, view } = useZoomPan(base);
  const [hover, setHover] = useState<string | null>(null);
  /** Foco de teclado: realça a região sem abrir a dica (que segue o mouse). */
  const [focusId, setFocusId] = useState<string | null>(null);
  const [mouse, setMouse] = useState<MousePos | null>(null);
  const labelScale = Math.max(0.45, view.w / base.w);

  // Ordem fixa: reordenar os caminhos no hover moveria o nó do DOM entre o mousedown e o mouseup
  // (toque/clique rápido perderia o clique). Realce de hover/seleção vai numa camada à parte.
  const ordered = Object.entries(STATE_GEOMETRY);

  return (
    <div
      className={`relative h-full w-full select-none ${className ?? ''}`}
      onMouseLeave={() => setHover(null)}
    >
      <MapControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={reset} position={controlsPosition} />
      <svg
        ref={svgRef}
        viewBox={viewBoxAttr}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        {...handlers}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height });
        }}
        role="group"
        aria-label="Mapa do Brasil"
      >
        <defs>
          <filter id={`${uid}-shadow`} x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#010406" floodOpacity="0.75" />
          </filter>
          <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <g filter={`url(#${uid}-shadow)`}>
          {ordered.map(([id, geo]) => {
            const f = fills[id];
            const dim = focus && !focus.includes(id);
            const isSel = selected === id;
            return (
              <path
                key={id}
                d={geo.d}
                data-uf={id}
                fill={f?.fill ?? MAP_INK.land}
                fillOpacity={dim ? 0.25 : (f?.opacity ?? 1)}
                stroke={MAP_INK.border}
                strokeWidth={1.3}
                strokeLinejoin="round"
                className="cursor-pointer outline-none transition-[fill,fill-opacity] duration-300"
                tabIndex={0}
                role="button"
                aria-label={id}
                aria-pressed={isSel}
                onMouseEnter={() => setHover(id)}
                onFocus={(e) => setFocusId(e.currentTarget.matches(':focus-visible') ? id : null)}
                onBlur={() => setFocusId(null)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  // Não deixa o Espaço chegar ao atalho global de pausa.
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect?.(id);
                }}
                onClick={() => {
                  if (!wasDrag()) onSelect?.(id);
                }}
              />
            );
          })}
        </g>
        {/* Realce de hover e seleção por cima de todos os estados, sem capturar o mouse. */}
        <g pointerEvents="none" fill="none" strokeLinejoin="round">
          {[hover, focusId].map(
            (id, i) =>
              id &&
              id !== selected &&
              STATE_GEOMETRY[id] && (
                <path key={i} d={STATE_GEOMETRY[id].d} stroke={MAP_INK.hover} strokeWidth={2.6} />
              ),
          )}
          {selected && STATE_GEOMETRY[selected] && (
            <path
              d={STATE_GEOMETRY[selected].d}
              stroke={MAP_INK.selected}
              strokeWidth={3.6}
              filter={`url(#${uid}-glow)`}
            />
          )}
        </g>
        {/* Leve relevo: brilho no alto e sombra embaixo, sem capturar o mouse. */}
        <g pointerEvents="none">
          {Object.entries(STATE_GEOMETRY).map(([id, geo]) => (
            <path key={`s-${id}`} d={geo.d} fill={`url(#${uid}-sheen)`} />
          ))}
        </g>
        {showLabels &&
          Object.entries(STATE_GEOMETRY).map(([id, geo]) => {
            const [nx, ny] = LABEL_NUDGE[id] ?? [0, 0];
            const x = geo.centroid[0] + nx;
            const y = geo.centroid[1] + ny;
            return (
              <text
                key={`l-${id}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none font-display font-bold"
                style={{ fontSize: 14.5 * labelScale, paintOrder: 'stroke', letterSpacing: '0.04em' }}
                fill={MAP_INK.label}
                stroke={MAP_INK.labelStroke}
                strokeWidth={3.4 * labelScale}
                strokeLinejoin="round"
                opacity={focus && !focus.includes(id) ? 0.35 : 0.95}
              >
                {id}
              </text>
            );
          })}
        {markers.map((m) => {
          const [x, y] = projectLonLat(m.lon, m.lat);
          return (
            <g key={m.id} transform={`translate(${x} ${y})`} className="pointer-events-none">
              <circle
                r={7 * labelScale}
                fill={m.color}
                stroke={MAP_INK.border}
                strokeWidth={2.5 * labelScale}
              />
              {m.label && (
                <text
                  y={-12 * labelScale}
                  textAnchor="middle"
                  style={{ fontSize: 12 * labelScale, paintOrder: 'stroke' }}
                  fill={MAP_INK.label}
                  stroke={MAP_INK.labelStroke}
                  strokeWidth={3 * labelScale}
                  className="font-display font-bold"
                >
                  {m.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover && renderTooltip && mouse && (
        <div
          className="tooltip-bubble pointer-events-none absolute z-20 w-max max-w-72 px-3 py-2 text-xs text-paper"
          style={floatingTooltipStyle(mouse)}
        >
          {renderTooltip(hover)}
        </div>
      )}
    </div>
  );
}
