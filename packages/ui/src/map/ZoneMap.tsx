import { useId, useMemo, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react';
import { floatingTooltipStyle, MAP_INK, type MapFill, type MousePos } from './BrazilMap';
import { projectLonLat, STATE_GEOMETRY } from './brazilGeometry.generated';
import { MapControls, type MapControlsPosition } from './MapControls';
import { useZoomPan } from './useZoomPan';

export interface ZoneSpec {
  id: string;
  name: string;
  type: 'capital' | 'metro' | 'sector' | 'center';
  direction?: 'n' | 's' | 'l' | 'o';
}

export interface ZoneMapProps {
  kind: 'state' | 'city';
  stateId: string;
  capitalCoords: [number, number];
  zones: ZoneSpec[];
  fills: Record<string, MapFill>;
  selected?: string | null;
  onSelect?: (id: string) => void;
  renderTooltip?: (id: string) => ReactNode;
  /** Posição dos botões de zoom (`none` esconde). */
  controlsPosition?: MapControlsPosition;
}

const CITY_BLOB =
  'M200 20 C282 18 352 62 370 132 C388 204 360 282 290 314 C228 340 150 338 94 302 C38 264 20 190 38 126 C56 62 120 22 200 20 Z';
const ANGLES: Record<'n' | 's' | 'l' | 'o', [number, number]> = {
  n: [-135, -45],
  l: [-45, 45],
  s: [45, 135],
  o: [135, 225],
};

function wedge(cx: number, cy: number, r: number, dir: 'n' | 's' | 'l' | 'o'): string {
  const [a0, a1] = ANGLES[dir];
  const pts: string[] = [`${cx} ${cy}`];
  for (let a = a0; a <= a1; a += 15) {
    const rad = (a * Math.PI) / 180;
    pts.push(`${cx + Math.cos(rad) * r} ${cy + Math.sin(rad) * r}`);
  }
  return `M${pts.join('L')}Z`;
}

function dirVector(dir: 'n' | 's' | 'l' | 'o'): [number, number] {
  return dir === 'n' ? [0, -1] : dir === 's' ? [0, 1] : dir === 'l' ? [1, 0] : [-1, 0];
}

/** Mapa estilizado de zonas: setores do estado (recortados no contorno real) ou bairros da capital. */
export function ZoneMap({
  kind,
  stateId,
  capitalCoords,
  zones,
  fills,
  selected,
  onSelect,
  renderTooltip,
  controlsPosition = 'top-right',
}: ZoneMapProps) {
  const uid = useId().replace(/:/g, '');
  const geo = STATE_GEOMETRY[stateId];
  const layout = useMemo(() => {
    if (kind === 'city' || !geo) {
      return {
        box: { x: 0, y: 0, w: 400, h: 340 },
        outline: CITY_BLOB,
        center: [205, 172] as [number, number],
        capital: [205, 172] as [number, number],
        unit: 340,
      };
    }
    const [x0, y0, x1, y1] = geo.bbox;
    const w = x1 - x0;
    const h = y1 - y0;
    const pad = Math.max(w, h) * 0.12;
    return {
      box: { x: x0 - pad, y: y0 - pad, w: w + pad * 2, h: h + pad * 2 },
      outline: geo.d,
      center: geo.centroid,
      capital: projectLonLat(capitalCoords[0], capitalCoords[1]),
      unit: Math.min(w, h),
    };
  }, [kind, geo, capitalCoords]);

  const { svgRef, viewBoxAttr, handlers, wasDrag, zoomIn, zoomOut, reset } = useZoomPan(
    layout.box,
    1,
    4,
  );
  const [hover, setHover] = useState<string | null>(null);
  /** Foco de teclado: realça a zona sem abrir a dica (que segue o mouse). */
  const [focusId, setFocusId] = useState<string | null>(null);
  const [mouse, setMouse] = useState<MousePos | null>(null);
  const R = Math.max(layout.box.w, layout.box.h) * 1.5;
  const fontSize = layout.box.w / (kind === 'city' ? 30 : 46);
  const stroke = layout.box.w / 260;

  const shapeFor = (
    z: ZoneSpec,
  ): { el: 'path' | 'circle'; d?: string; cx?: number; cy?: number; r?: number } => {
    if (z.type === 'sector' && z.direction)
      return { el: 'path', d: wedge(layout.center[0], layout.center[1], R, z.direction) };
    if (z.type === 'metro')
      return { el: 'circle', cx: layout.capital[0], cy: layout.capital[1], r: layout.unit * 0.2 };
    if (z.type === 'capital')
      return {
        el: 'circle',
        cx: layout.capital[0],
        cy: layout.capital[1],
        r: Math.max(layout.unit * 0.09, layout.box.w * 0.025),
      };
    return { el: 'circle', cx: layout.center[0], cy: layout.center[1], r: 62 };
  };

  const labelPos = (z: ZoneSpec): [number, number] => {
    if (z.type === 'sector' && z.direction) {
      const [dx, dy] = dirVector(z.direction);
      const anchor = kind === 'city' ? layout.center : layout.center;
      const dist = kind === 'city' ? 115 : layout.unit * 0.32;
      return [anchor[0] + dx * dist, anchor[1] + dy * dist];
    }
    if (z.type === 'metro')
      return [layout.capital[0], layout.capital[1] + layout.unit * 0.2 + fontSize];
    if (z.type === 'capital')
      return [
        layout.capital[0],
        layout.capital[1] - Math.max(layout.unit * 0.09, layout.box.w * 0.025) - fontSize * 0.6,
      ];
    return [layout.center[0], layout.center[1]];
  };

  const order = (t: ZoneSpec['type']) => (t === 'sector' ? 0 : t === 'metro' ? 1 : 2);
  const sorted = [...zones].sort((a, b) => order(a.type) - order(b.type));

  return (
    <div className="relative h-full w-full select-none" onMouseLeave={() => setHover(null)}>
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
        aria-label={kind === 'city' ? 'Mapa da cidade' : 'Mapa do estado'}
      >
        <defs>
          <clipPath id={`zone-clip-${uid}`}>
            <path d={layout.outline} />
          </clipPath>
        </defs>
        <path
          d={layout.outline}
          fill="#010406"
          opacity="0.7"
          transform={`translate(0 ${layout.box.h * 0.014})`}
        />
        <g clipPath={`url(#zone-clip-${uid})`}>
          {sorted.map((z) => {
            const s = shapeFor(z);
            const f = fills[z.id];
            const isSel = selected === z.id;
            const isHover = hover === z.id || focusId === z.id;
            const common = {
              fill: f?.fill ?? MAP_INK.land,
              fillOpacity: f?.opacity ?? 1,
              stroke: isSel ? MAP_INK.selected : isHover ? MAP_INK.hover : MAP_INK.border,
              strokeWidth: (isSel ? 3.2 : isHover ? 2.6 : 1.6) * stroke,
              className: 'cursor-pointer outline-none transition-[fill,fill-opacity] duration-300',
              tabIndex: 0,
              role: 'button',
              'aria-label': z.name,
              'aria-pressed': isSel,
              onMouseEnter: () => setHover(z.id),
              onFocus: (e: FocusEvent<SVGElement>) =>
                setFocusId(e.currentTarget.matches(':focus-visible') ? z.id : null),
              onBlur: () => setFocusId(null),
              onKeyDown: (e: KeyboardEvent<SVGElement>) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                // Não deixa o Espaço chegar ao atalho global de pausa.
                e.preventDefault();
                e.stopPropagation();
                onSelect?.(z.id);
              },
              onClick: () => {
                if (!wasDrag()) onSelect?.(z.id);
              },
            };
            return s.el === 'path' ? (
              <path key={z.id} d={s.d} {...common} />
            ) : (
              <circle key={z.id} cx={s.cx} cy={s.cy} r={s.r} {...common} />
            );
          })}
        </g>
        <path
          d={layout.outline}
          fill="none"
          stroke={MAP_INK.border}
          strokeWidth={stroke * 3}
          strokeLinejoin="round"
          pointerEvents="none"
        />
        {sorted.map((z) => {
          const [x, y] = labelPos(z);
          return (
            <text
              key={`l-${z.id}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none font-display font-bold"
              style={{ fontSize, paintOrder: 'stroke', letterSpacing: '0.03em' }}
              fill={MAP_INK.label}
              stroke={MAP_INK.labelStroke}
              strokeWidth={fontSize * 0.22}
            >
              {z.name}
            </text>
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
