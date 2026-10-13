import { useEffect, useMemo, useState } from 'react';
import type { AtlasRegion } from '../atlas/Atlas';
import type { Bounds } from '../atlas/camera';
import { projectLonLat, STATE_GEOMETRY } from './brazilGeometry.generated';
import type { CityGeometry } from './cityGeometry.generated';

/**
 * Zonas eleitorais desenhadas pelo Atlas: setores do estado (cunhas a partir do centro, recortadas
 * no contorno real da UF, mais região metropolitana e capital) ou bairros da cidade (cunhas e
 * centro, recortados no contorno real do município).
 */

export interface ZoneSpec {
  id: string;
  name: string;
  type: 'capital' | 'metro' | 'sector' | 'center';
  direction?: 'n' | 's' | 'l' | 'o';
}

export interface ZoneAtlas {
  /** Na ordem de desenho: setores, depois região metropolitana, depois capital/centro. */
  regions: AtlasRegion[];
  /** Contorno que recorta as zonas (UF ou município). */
  outline: string;
  world: Bounds;
  /** km por unidade do desenho: undefined = projeção nacional (padrão do Atlas), null = sem escala. */
  kmPerUnit: number | null | undefined;
  /** Mapa de estado: os outros estados em volta, como terra de fundo. */
  backdrop: string[];
  /** Mapa de estado usa a projeção nacional (vizinhos, rios); cidade tem escala própria. */
  context: boolean;
}

/** Contorno genérico (cidade sem malha carregada ainda). */
const CITY_BLOB =
  'M200 20 C282 18 352 62 370 132 C388 204 360 282 290 314 C228 340 150 338 94 302 C38 264 20 190 38 126 C56 62 120 22 200 20 Z';
const ANGLES: Record<'n' | 's' | 'l' | 'o', [number, number]> = {
  n: [-135, -45],
  l: [-45, 45],
  s: [45, 135],
  o: [135, 225],
};

function wedge(cx: number, cy: number, r: number, dir: 'n' | 's' | 'l' | 'o'): [number, number][] {
  const [a0, a1] = ANGLES[dir];
  const pts: [number, number][] = [[cx, cy]];
  for (let a = a0; a <= a1; a += 15) {
    const rad = (a * Math.PI) / 180;
    pts.push([cx + Math.cos(rad) * r, cy + Math.sin(rad) * r]);
  }
  return pts;
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

function intersect(a: Bounds, b: Bounds): Bounds {
  const x0 = Math.max(a[0], b[0]);
  const y0 = Math.max(a[1], b[1]);
  const x1 = Math.min(a[2], b[2]);
  const y1 = Math.min(a[3], b[3]);
  return x1 > x0 && y1 > y0 ? [x0, y0, x1, y1] : b;
}

const DIR: Record<'n' | 's' | 'l' | 'o', [number, number]> = {
  n: [0, -1],
  s: [0, 1],
  l: [1, 0],
  o: [-1, 0],
};
const ORDER: Record<ZoneSpec['type'], number> = { sector: 0, metro: 1, capital: 2, center: 2 };

/** Geometria das zonas para o Atlas (função pura; a malha da cidade vem de fora). */
export function zoneAtlas(
  kind: 'state' | 'city',
  stateId: string,
  capitalCoords: [number, number],
  zones: ZoneSpec[],
  cityShape: CityGeometry | null,
): ZoneAtlas {
  const stateGeo = STATE_GEOMETRY[stateId];
  let outline: string;
  let box: Bounds;
  let center: [number, number];
  let capital: [number, number];
  let kmPerUnit: number | null | undefined;
  if (kind === 'city' && cityShape) {
    outline = cityShape.d;
    box = cityShape.bbox;
    center = cityShape.centroid;
    capital = cityShape.centroid;
    kmPerUnit = cityShape.kmPerUnit;
  } else if (kind === 'city' || !stateGeo) {
    outline = CITY_BLOB;
    box = [20, 18, 386, 340];
    center = [205, 172];
    capital = [205, 172];
    kmPerUnit = null;
  } else {
    outline = stateGeo.d;
    box = stateGeo.bbox;
    center = stateGeo.centroid;
    capital = projectLonLat(capitalCoords[0], capitalCoords[1]);
    kmPerUnit = undefined;
  }
  const w = box[2] - box[0];
  const h = box[3] - box[1];
  const unit = Math.min(w, h);
  const R = Math.max(w, h) * 1.6;

  const metroR = zones.some((z) => z.type === 'metro') ? unit * 0.2 : 0;
  /** Rótulo da cunha: no eixo da direção, empurrado para fora do anel metropolitano se cair nele. */
  const sectorLabel = (dir: 'n' | 's' | 'l' | 'o'): [number, number] => {
    const [dx, dy] = DIR[dir];
    const extent = dx !== 0 ? w : h;
    let dist = extent * 0.3;
    const at = (d: number): [number, number] => [center[0] + dx * d, center[1] + dy * d];
    while (metroR > 0 && dist < extent * 0.48) {
      const [x, y] = at(dist);
      if (Math.hypot(x - capital[0], y - capital[1]) > metroR * 1.25) break;
      dist += extent * 0.03;
    }
    return at(dist);
  };

  const regions: AtlasRegion[] = [...zones]
    .sort((a, b) => ORDER[a.type] - ORDER[b.type])
    .map((z) => {
      if (z.type === 'sector' && z.direction) {
        const pts = wedge(center[0], center[1], R, z.direction);
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        return {
          id: z.id,
          name: z.name,
          short: z.name,
          d: `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`,
          centroid: sectorLabel(z.direction),
          bbox: intersect(
            [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
            box,
          ),
        };
      }
      const [cx, cy] = z.type === 'center' ? center : capital;
      const r =
        z.type === 'metro'
          ? unit * 0.2
          : z.type === 'capital'
            ? Math.max(unit * 0.09, w * 0.025)
            : Math.max(w, h) * 0.09;
      return {
        id: z.id,
        name: z.name,
        short: z.name,
        d: circlePath(cx, cy, r),
        // Região metropolitana: nome no anel, abaixo da capital.
        centroid: (z.type === 'metro' ? [cx, cy + r * 0.72] : [cx, cy]) as readonly [
          number,
          number,
        ],
        bbox: [cx - r, cy - r, cx + r, cy + r] as Bounds,
      };
    });

  return {
    regions,
    outline,
    world: box,
    kmPerUnit,
    backdrop:
      kind === 'state' && stateGeo
        ? Object.entries(STATE_GEOMETRY)
            .filter(([id]) => id !== stateId)
            .map(([, g]) => g.d)
        : [],
    context: kind === 'state' && !!stateGeo,
  };
}

/** Malhas municipais: módulo grande, carregado só quando um mapa de cidade aparece. */
function useCityGeometry(cityId: string | undefined): CityGeometry | null {
  const [loaded, setLoaded] = useState<{ id: string; geo: CityGeometry | null } | null>(null);
  useEffect(() => {
    if (!cityId) return;
    let alive = true;
    void import('./cityGeometry.generated').then((m) => {
      if (alive) setLoaded({ id: cityId, geo: m.CITY_GEOMETRY[cityId] ?? null });
    });
    return () => {
      alive = false;
    };
  }, [cityId]);
  return loaded && loaded.id === cityId ? loaded.geo : null;
}

/** Zonas prontas para o Atlas, com a malha da cidade carregada sob demanda. */
export function useZoneAtlas(
  kind: 'state' | 'city',
  stateId: string,
  cityId: string | undefined,
  capitalCoords: [number, number],
  zones: ZoneSpec[],
): ZoneAtlas {
  const cityShape = useCityGeometry(kind === 'city' ? cityId : undefined);
  const key = zones.map((z) => `${z.id}:${z.type}:${z.direction ?? ''}`).join('|');
  return useMemo(
    () => zoneAtlas(kind, stateId, capitalCoords, zones, cityShape),
    // `zones` chega como array novo a cada renderização; a chave estável basta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, stateId, capitalCoords[0], capitalCoords[1], key, cityShape],
  );
}
