/**
 * Geometria plana para o mapa 3D: converte os paths SVG gerados (só M, L e Z, coordenadas
 * absolutas) em anéis e agrupa cada contorno externo com seus buracos (ex.: Goiás tem um buraco
 * onde fica o DF). Puro e testável, sem three.js.
 */

export type Ring = [number, number][];

export interface Polygon {
  outer: Ring;
  holes: Ring[];
}

/** Anéis de um path "M x y L x y ... Z M ..." (Z opcional: linhas abertas também saem como anel). */
export function parseRings(d: string): Ring[] {
  const rings: Ring[] = [];
  let current: Ring | null = null;
  const re = /([MLZ])([^MLZ]*)/gi;
  for (const m of d.matchAll(re)) {
    const cmd = m[1]!.toUpperCase();
    if (cmd === 'Z') {
      if (current && current.length >= 2) rings.push(current);
      current = null;
      continue;
    }
    const nums = (m[2] ?? '')
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (cmd === 'M') {
      if (current && current.length >= 2) rings.push(current);
      current = [];
    }
    for (let i = 0; i + 1 < nums.length; i += 2) current?.push([nums[i]!, nums[i + 1]!]);
  }
  if (current && current.length >= 2) rings.push(current);
  return rings;
}

/** Área com sinal (positiva = anti-horário no plano x→direita, y→cima). */
export function signedArea(r: Ring): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++)
    a += (r[j]![0] + r[i]![0]) * (r[j]![1] - r[i]![1]);
  return -a / 2;
}

export function pointInRing([x, y]: [number, number], r: Ring): boolean {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i]!;
    const [xj, yj] = r[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Agrupa anéis em polígonos: um anel contido em outro anel MAIOR vira buraco dele (a malha do
 * IBGE não garante o sentido dos anéis, então decide pela contenção, não pela orientação).
 * Ilhas dentro de buracos voltam a ser contornos externos.
 */
export function groupPolygons(rings: Ring[]): Polygon[] {
  const sorted = rings
    .filter((r) => r.length >= 3)
    .map((r) => ({ r, area: Math.abs(signedArea(r)) }))
    .filter((x) => x.area > 0)
    .sort((a, b) => b.area - a.area);
  const polys: (Polygon & { depth: number })[] = [];
  for (const { r } of sorted) {
    // Contêiner mais interno (o último encontrado, já que vieram do maior para o menor).
    let container: { poly: Polygon & { depth: number }; ring: Ring; isHole: boolean } | null = null;
    for (const p of polys) {
      if (pointInRing(r[0]!, p.outer)) {
        const hole = p.holes.find((h) => pointInRing(r[0]!, h));
        container = hole
          ? { poly: p, ring: hole, isHole: true }
          : { poly: p, ring: p.outer, isHole: false };
      }
    }
    if (container && !container.isHole) {
      container.poly.holes.push(r);
    } else {
      polys.push({ outer: r, holes: [], depth: container ? container.poly.depth + 1 : 0 });
    }
  }
  return polys.map(({ outer, holes }) => ({ outer, holes }));
}
