/**
 * Gera os paths SVG das UFs a partir da malha local do IBGE (data/geo/br-uf-ibge.geojson).
 *
 * Fonte: IBGE — API de Malhas Territoriais v3 (dado público), baixada uma vez e versionada no repositório.
 * O jogo NÃO acessa a internet para desenhar o mapa.
 *
 * Uso: npm run generate:map
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const geo = JSON.parse(readFileSync(resolve(root, 'data/geo/br-uf-ibge.geojson'), 'utf8'));

const IBGE_TO_UF = {
  11: 'RO',
  12: 'AC',
  13: 'AM',
  14: 'RR',
  15: 'PA',
  16: 'AP',
  17: 'TO',
  21: 'MA',
  22: 'PI',
  23: 'CE',
  24: 'RN',
  25: 'PB',
  26: 'PE',
  27: 'AL',
  28: 'SE',
  29: 'BA',
  31: 'MG',
  32: 'ES',
  33: 'RJ',
  35: 'SP',
  41: 'PR',
  42: 'SC',
  43: 'RS',
  50: 'MS',
  51: 'MT',
  52: 'GO',
  53: 'DF',
};

const WIDTH = 1000;
const PAD = 12;
const LAT0 = (-15 * Math.PI) / 180;
const KX = Math.cos(LAT0);

// Limites
let minLon = Infinity,
  maxLon = -Infinity,
  minLat = Infinity,
  maxLat = -Infinity;
const polygonsOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
for (const f of geo.features) {
  for (const poly of polygonsOf(f.geometry))
    for (const ring of poly)
      for (const [lon, lat] of ring) {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
}
const scale = (WIDTH - PAD * 2) / ((maxLon - minLon) * KX);
const HEIGHT = Math.ceil((maxLat - minLat) * scale + PAD * 2);
const project = (lon, lat) => [PAD + (lon - minLon) * KX * scale, PAD + (maxLat - lat) * scale];

// Douglas-Peucker
function simplify(points, tol) {
  if (points.length < 4) return points;
  const sqTol = tol * tol;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxD = 0,
      idx = -1;
    const [ax, ay] = points[a],
      [bx, by] = points[b];
    const dx = bx - ax,
      dy = by - ay,
      len = dx * dx + dy * dy || 1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      let t = ((px - ax) * dx + (py - ay) * dy) / len;
      t = Math.max(0, Math.min(1, t));
      const ex = ax + t * dx - px,
        ey = ay + t * dy - py;
      const d = ex * ex + ey * ey;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > sqTol && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function ringArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
    a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return a / 2;
}

function centroid(pts) {
  let x = 0,
    y = 0,
    a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    x += (pts[j][0] + pts[i][0]) * f;
    y += (pts[j][1] + pts[i][1]) * f;
    a += f;
  }
  a *= 3;
  return a === 0 ? pts[0] : [x / a, y / a];
}

const r1 = (n) => Math.round(n * 10) / 10;
const out = {};
let total = 0;
for (const f of geo.features) {
  const uf = IBGE_TO_UF[f.properties.codarea];
  if (!uf) throw new Error(`Código IBGE desconhecido: ${f.properties.codarea}`);
  let d = '';
  let bestArea = 0,
    bestCentroid = [0, 0];
  let bx0 = Infinity,
    by0 = Infinity,
    bx1 = -Infinity,
    by1 = -Infinity;
  for (const poly of polygonsOf(f.geometry)) {
    for (const [ri, ring] of poly.entries()) {
      const projected = ring.map(([lon, lat]) => project(lon, lat));
      const simple = simplify(projected, 0.6);
      if (simple.length < 3) continue;
      const area = Math.abs(ringArea(simple));
      if (area < 2 && ri > 0) continue;
      total += simple.length;
      d += `M${simple.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}Z`;
      for (const [x, y] of simple) {
        bx0 = Math.min(bx0, x);
        by0 = Math.min(by0, y);
        bx1 = Math.max(bx1, x);
        by1 = Math.max(by1, y);
      }
      if (ri === 0 && area > bestArea) {
        bestArea = area;
        bestCentroid = centroid(simple);
      }
    }
  }
  out[uf] = {
    d,
    centroid: [r1(bestCentroid[0]), r1(bestCentroid[1])],
    bbox: [r1(bx0), r1(by0), r1(bx1), r1(by1)],
  };
}

const header = `/* eslint-disable */
// ARQUIVO GERADO por scripts/generate-map.mjs — não edite à mão.
// Fonte: IBGE, API de Malhas Territoriais v3 (qualidade mínima), simplificado (Douglas-Peucker).
`;
const body = `${header}
export const BRAZIL_VIEWBOX = { width: ${WIDTH}, height: ${HEIGHT} } as const;

/** Projeção equiretangular usada no mapa (para posicionar capitais e marcadores). */
export const MAP_PROJECTION = { minLon: ${minLon}, maxLat: ${maxLat}, kx: ${KX}, scale: ${scale}, pad: ${PAD} } as const;

export function projectLonLat(lon: number, lat: number): [number, number] {
  const p = MAP_PROJECTION;
  return [p.pad + (lon - p.minLon) * p.kx * p.scale, p.pad + (p.maxLat - lat) * p.scale];
}

export interface StateGeometry {
  d: string;
  centroid: [number, number];
  bbox: [number, number, number, number];
}

export const STATE_GEOMETRY: Record<string, StateGeometry> = ${JSON.stringify(out, null, 0).replace(/},"/g, '},\n  "')};
`;
const target = resolve(root, 'packages/ui/src/map/brazilGeometry.generated.ts');
writeFileSync(target, body);
console.log(
  `Mapa gerado: ${Object.keys(out).length} UFs, ${total} pontos, ${WIDTH}x${HEIGHT} → ${target}`,
);
