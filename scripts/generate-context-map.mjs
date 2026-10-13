/**
 * Gera a geometria de CONTEXTO do mapa (países vizinhos, rios, lagos e represas) na mesma projeção
 * das UFs (scripts/generate-map.mjs), para o Atlas desenhar o Brasil dentro da América do Sul.
 *
 * Fonte: Natural Earth 1:50m (domínio público) — https://www.naturalearthdata.com
 * O recorte sul-americano fica versionado em data/geo/natural-earth-sa.json; o jogo NÃO acessa a
 * internet para desenhar o mapa.
 *
 * Uso:
 *   npm run generate:context-map            (lê o recorte versionado)
 *   npm run generate:context-map -- --fetch (baixa o Natural Earth de novo e refaz o recorte)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SUBSET = resolve(root, 'data/geo/natural-earth-sa.json');
const TARGET = resolve(root, 'packages/ui/src/atlas/contextGeometry.generated.ts');
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';

/** Caixa (lon/lat) do que interessa ao mapa: Brasil com folga para os vizinhos. */
const BOX = { minLon: -86, maxLon: -26, minLat: -42, maxLat: 14 };

/** Países desenhados (ADM0_A3). França entra só pela Guiana Francesa (filtrada pela caixa). */
const COUNTRIES = [
  'ARG',
  'BOL',
  'CHL',
  'COL',
  'ECU',
  'GUY',
  'PRY',
  'PER',
  'SUR',
  'URY',
  'VEN',
  'FRA',
  'PAN',
  'BRA',
];

/** Onde escrever o nome de cada país (lon, lat): o centróide cai fora da vista em vários deles. */
const LABEL_AT = {
  ARG: [-62.5, -31.5],
  BOL: [-64.6, -17.2],
  CHL: [-71.2, -31],
  COL: [-73.2, 3.6],
  ECU: [-78.3, -1.4],
  GUY: [-58.9, 5.2],
  PRY: [-58.4, -23.3],
  PER: [-75.4, -9.6],
  SUR: [-55.9, 4.1],
  URY: [-56, -32.7],
  VEN: [-66, 7.3],
  GUF: [-53.2, 3.9],
};

const NAMES = {
  ARG: 'Argentina',
  BOL: 'Bolívia',
  CHL: 'Chile',
  COL: 'Colômbia',
  ECU: 'Equador',
  GUY: 'Guiana',
  PRY: 'Paraguai',
  PER: 'Peru',
  SUR: 'Suriname',
  URY: 'Uruguai',
  VEN: 'Venezuela',
  GUF: 'Guiana Francesa',
  PAN: 'Panamá',
};

/** Nomes dos rios como aparecem no mapa (o Natural Earth usa grafias em espanhol/sem acento em alguns). */
const RIVER_NAMES = {
  'São  Francisco': 'São Francisco',
  Purús: 'Purus',
  Uruguay: 'Uruguai',
  Paraiba: 'Paraíba do Sul',
  Caquetá: 'Japurá',
};

// --- Projeção: a mesma de scripts/generate-map.mjs (lida do arquivo gerado das UFs) -----------
const brazilGenerated = readFileSync(
  resolve(root, 'packages/ui/src/map/brazilGeometry.generated.ts'),
  'utf8',
);
const projLine = brazilGenerated.match(/MAP_PROJECTION = (\{[^}]+\})/);
if (!projLine) throw new Error('MAP_PROJECTION não encontrado em brazilGeometry.generated.ts');
const P = Function(`return ${projLine[1]}`)();
const project = (lon, lat) => [
  P.pad + (lon - P.minLon) * P.kx * P.scale,
  P.pad + (P.maxLat - lat) * P.scale,
];

// --- Entrada ------------------------------------------------------------------------------------
function* points(c) {
  if (typeof c[0] === 'number') yield c;
  else for (const x of c) yield* points(x);
}
const inBox = ([lon, lat]) =>
  lon >= BOX.minLon && lon <= BOX.maxLon && lat >= BOX.minLat && lat <= BOX.maxLat;
const touchesBox = (coords) => {
  for (const p of points(coords)) if (inBox(p)) return true;
  return false;
};
const polygonsOf = (g) =>
  g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
const linesOf = (g) =>
  g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];

async function fetchSubset() {
  const get = async (name) => {
    const res = await fetch(`${NE}/${name}.geojson`);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    return res.json();
  };
  const [countries, rivers, lakes] = await Promise.all([
    get('ne_50m_admin_0_countries'),
    get('ne_50m_rivers_lake_centerlines'),
    get('ne_50m_lakes'),
  ]);
  const round4 = (c) =>
    typeof c[0] === 'number'
      ? [Math.round(c[0] * 1e4) / 1e4, Math.round(c[1] * 1e4) / 1e4]
      : c.map(round4);
  const subset = {
    source: 'Natural Earth 1:50m (domínio público), recorte da América do Sul',
    countries: countries.features
      .filter((f) => COUNTRIES.includes(f.properties.ADM0_A3))
      .map((f) => ({
        id: f.properties.ADM0_A3,
        polygons: polygonsOf(f.geometry).filter(touchesBox).map(round4),
      })),
    rivers: rivers.features
      .filter((f) => linesOf(f.geometry).some(touchesBox))
      .map((f) => ({
        name: f.properties.name,
        rank: f.properties.scalerank,
        lines: linesOf(f.geometry).map(round4),
      })),
    lakes: lakes.features
      .filter((f) => polygonsOf(f.geometry).some(touchesBox))
      .map((f) => ({
        name: f.properties.name ?? '',
        polygons: polygonsOf(f.geometry).map(round4),
      })),
  };
  writeFileSync(SUBSET, JSON.stringify(subset));
  console.log(`Recorte salvo em ${SUBSET}`);
  return subset;
}

const data =
  process.argv.includes('--fetch') || !existsSync(SUBSET)
    ? await fetchSubset()
    : JSON.parse(readFileSync(SUBSET, 'utf8'));

// --- Simplificação (Douglas-Peucker, igual ao gerador das UFs) ---------------------------------
function simplify(pts, tol) {
  if (pts.length < 4) return pts;
  const sqTol = tol * tol;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxD = 0;
    let idx = -1;
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy || 1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
      const ex = ax + t * dx - px;
      const ey = ay + t * dy - py;
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
  return pts.filter((_, i) => keep[i]);
}

function ringArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
    a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return a / 2;
}

const r1 = (n) => Math.round(n * 10) / 10;
const toPath = (pts, close) =>
  `M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}${close ? 'Z' : ''}`;
let total = 0;

function polygonPath(polygons, tol, minArea) {
  let d = '';
  for (const poly of polygons)
    for (const [ri, ring] of poly.entries()) {
      const simple = simplify(
        ring.map(([lon, lat]) => project(lon, lat)),
        tol,
      );
      if (simple.length < 3) continue;
      if (Math.abs(ringArea(simple)) < (ri === 0 ? minArea : minArea * 2)) continue;
      total += simple.length;
      d += toPath(simple, true);
    }
  return d;
}

// --- Saída --------------------------------------------------------------------------------------
const land = [];
let brazilOutline = '';
for (const c of data.countries) {
  if (c.id === 'BRA') {
    brazilOutline = polygonPath(c.polygons, 0.8, 3);
    continue;
  }
  // A França entra só pela Guiana Francesa.
  const id = c.id === 'FRA' ? 'GUF' : c.id;
  const d = polygonPath(c.polygons, 1, 3);
  if (!d) continue;
  const at = LABEL_AT[id];
  land.push({ id, name: NAMES[id] ?? id, d, ...(at ? { label: project(...at).map(r1) } : {}) });
}

const rivers = [];
for (const r of data.rivers) {
  const d = r.lines
    .map((line) =>
      simplify(
        line.map(([lon, lat]) => project(lon, lat)),
        0.9,
      ),
    )
    .filter((pts) => pts.length >= 2)
    .map((pts) => {
      total += pts.length;
      return toPath(pts, false);
    })
    .join('');
  if (d) rivers.push({ name: RIVER_NAMES[r.name] ?? r.name, rank: r.rank, d });
}
rivers.sort((a, b) => b.rank - a.rank);

const lakes = data.lakes
  .map((l) => ({ name: l.name, d: polygonPath(l.polygons, 0.6, 1.5) }))
  .filter((l) => l.d);

const json = (v) => JSON.stringify(v).replace(/\},\{/g, '},\n  {');
const body = `/* eslint-disable */
// ARQUIVO GERADO por scripts/generate-context-map.mjs — não edite à mão.
// Fonte: Natural Earth 1:50m (domínio público), recortado na América do Sul e simplificado
// (Douglas-Peucker), na mesma projeção das UFs (brazilGeometry.generated.ts).

export interface ContextLand {
  id: string;
  name: string;
  d: string;
  /** Onde escrever o nome (coordenadas do mapa). */
  label?: [number, number];
}

export interface ContextLine {
  name: string;
  /** Importância no Natural Earth (1 = maior rio). */
  rank: number;
  d: string;
}

export interface ContextArea {
  name: string;
  d: string;
}

/** Contorno do Brasil no Natural Earth: base sob as UFs (evita frestas entre fontes diferentes). */
export const BRAZIL_OUTLINE = ${JSON.stringify(brazilOutline)};

export const CONTEXT_LAND: ContextLand[] = [
  ${json(land).slice(1, -1)}
];

export const RIVERS: ContextLine[] = [
  ${json(rivers).slice(1, -1)}
];

export const LAKES: ContextArea[] = [
  ${json(lakes).slice(1, -1)}
];
`;
writeFileSync(TARGET, body);
console.log(
  `Contexto gerado: ${land.length} países, ${rivers.length} rios, ${lakes.length} lagos, ${total} pontos, ${(body.length / 1024).toFixed(0)} KB → ${TARGET}`,
);
