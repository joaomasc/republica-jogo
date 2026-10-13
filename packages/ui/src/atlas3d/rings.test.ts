import { describe, expect, it } from 'vitest';
import { STATE_GEOMETRY } from '../map/brazilGeometry.generated';
import { groupPolygons, parseRings, pointInRing, signedArea } from './rings';

describe('anéis do mapa 3D', () => {
  it('lê M/L/Z com vários subpaths e linhas abertas', () => {
    const rings = parseRings('M0 0L10 0L10 10Z M20 20L30 20L30 30Z M5 5L6 6');
    expect(rings).toHaveLength(3);
    expect(rings[0]).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    expect(rings[2]).toEqual([
      [5, 5],
      [6, 6],
    ]);
  });

  it('anel dentro de outro maior vira buraco; ilha dentro do buraco volta a ser contorno', () => {
    const outer = 'M0 0L100 0L100 100L0 100Z';
    const hole = 'M20 20L80 20L80 80L20 80Z';
    const island = 'M40 40L60 40L60 60L40 60Z';
    const polys = groupPolygons(parseRings(outer + hole + island));
    expect(polys).toHaveLength(2);
    expect(polys[0]!.holes).toHaveLength(1);
    expect(polys[1]!.holes).toHaveLength(0);
    expect(Math.abs(signedArea(polys[1]!.outer))).toBe(400);
  });

  it('as 27 UFs viram polígonos válidos e o DF não fica dentro da área de Goiás', () => {
    for (const [uf, g] of Object.entries(STATE_GEOMETRY)) {
      const polys = groupPolygons(parseRings(g.d));
      expect(polys.length, uf).toBeGreaterThan(0);
    }
    const df = STATE_GEOMETRY.DF!.centroid;
    const filled = groupPolygons(parseRings(STATE_GEOMETRY.GO!.d)).some(
      (p) =>
        pointInRing([df[0], df[1]], p.outer) &&
        !p.holes.some((h) => pointInRing([df[0], df[1]], h)),
    );
    expect(filled).toBe(false);
  });
});
