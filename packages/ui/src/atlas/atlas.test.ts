import { describe, expect, it } from 'vitest';
import {
  clampCamera,
  fitBounds,
  flightDuration,
  interpolateCamera,
  safeArea,
  screenToWorld,
  worldToScreen,
  zoomAround,
  type Bounds,
} from './camera';
import {
  lightness,
  RAMP_AXIS,
  RAMP_GOOD_BAD,
  RAMP_SEQUENTIAL,
  rampColor,
  scaleLayer,
} from './scales';

const SIZE = { width: 1600, height: 900 };
const BRAZIL: Bounds = [0, 0, 1000, 1031];
const LIMITS = { minK: 0.3, maxK: 6 };

describe('câmera do Atlas', () => {
  it('enquadra o mundo inteiro dentro da tela, centralizado', () => {
    const cam = fitBounds(BRAZIL, SIZE, undefined, 20);
    const [x0, y0] = worldToScreen(cam, 0, 0);
    const [x1, y1] = worldToScreen(cam, 1000, 1031);
    expect(y0).toBeCloseTo(20, 5);
    expect(y1).toBeCloseTo(880, 5);
    expect((x0 + x1) / 2).toBeCloseTo(800, 5);
  });

  it('com um painel à esquerda, o Brasil vai para a área visível à direita do painel', () => {
    const insets = { top: 0, right: 0, bottom: 0, left: 700 };
    const cam = fitBounds(BRAZIL, SIZE, insets, 20);
    const [x0] = worldToScreen(cam, 0, 0);
    const [x1] = worldToScreen(cam, 1000, 0);
    expect(x0).toBeGreaterThanOrEqual(700);
    expect((x0 + x1) / 2).toBeCloseTo(700 + (1600 - 700) / 2, 5);
  });

  it('área útil nunca fica degenerada mesmo com interface maior que a tela', () => {
    const area = safeArea(
      { width: 500, height: 400 },
      { top: 0, right: 300, bottom: 0, left: 300 },
    );
    expect(area.width).toBeGreaterThanOrEqual(160);
    expect(area.x).toBeGreaterThanOrEqual(0);
  });

  it('zoom mantém fixo o ponto sob o cursor e respeita os limites', () => {
    const cam = fitBounds(BRAZIL, SIZE);
    const before = screenToWorld(cam, 900, 300);
    const z = zoomAround(cam, 2, 900, 300, LIMITS);
    const after = screenToWorld(z, 900, 300);
    expect(after[0]).toBeCloseTo(before[0], 6);
    expect(after[1]).toBeCloseTo(before[1], 6);
    expect(zoomAround(cam, 1000, 0, 0, LIMITS).k).toBe(LIMITS.maxK);
  });

  it('não deixa o mapa sair da tela ao arrastar', () => {
    const cam = fitBounds(BRAZIL, SIZE);
    const far = clampCamera({ ...cam, x: 50_000, y: -50_000 }, BRAZIL, SIZE, LIMITS);
    const [x0, y0] = worldToScreen(far, 0, 0);
    const [, y1] = worldToScreen(far, 0, 1031);
    expect(x0).toBeLessThan(SIZE.width);
    expect(y1).toBeGreaterThan(0);
    expect(y0).toBeLessThan(SIZE.height);
  });

  it('voo: começa e termina nas câmeras pedidas, zoom intermediário em escala log', () => {
    const a = fitBounds(BRAZIL, SIZE);
    const b = fitBounds([600, 600, 700, 700], SIZE);
    const start = interpolateCamera(a, b, 0, SIZE);
    const end = interpolateCamera(a, b, 1, SIZE);
    expect(start.k).toBeCloseTo(a.k, 6);
    expect(end.k).toBeCloseTo(b.k, 6);
    expect(end.x).toBeCloseTo(b.x, 4);
    expect(interpolateCamera(a, b, 0.5, SIZE).k).toBeCloseTo(Math.sqrt(a.k * b.k), 6);
    expect(flightDuration(a, b, SIZE)).toBeGreaterThan(250);
    expect(flightDuration(a, b, SIZE)).toBeLessThanOrEqual(900);
  });
});

describe('escalas de cor do Atlas', () => {
  it('rampas sequenciais e divergentes têm brilho coerente (sequencial sempre crescente)', () => {
    for (let i = 1; i < RAMP_SEQUENTIAL.length; i++)
      expect(lightness(RAMP_SEQUENTIAL[i]!)).toBeGreaterThan(lightness(RAMP_SEQUENTIAL[i - 1]!));
    for (const ramp of [RAMP_GOOD_BAD, RAMP_AXIS]) {
      const mid = lightness(ramp[2]!);
      expect(mid).toBeGreaterThan(lightness(ramp[0]!));
      expect(mid).toBeGreaterThan(lightness(ramp[4]!));
    }
    expect(rampColor(RAMP_SEQUENTIAL, 0)).toBe(RAMP_SEQUENTIAL[0]);
    expect(rampColor(RAMP_SEQUENTIAL, 1)).toBe(RAMP_SEQUENTIAL[4]);
  });

  it('valores próximos entre si são esticados à rampa inteira, com o domínio real informado', () => {
    const r = scaleLayer('sequential', {
      A: { value: 0.45 },
      B: { value: 0.5 },
      C: { value: 0.6 },
    });
    expect(r.position.A).toBeCloseTo(0, 6);
    expect(r.position.C).toBeCloseTo(1, 6);
    expect(r.domain).toMatchObject({
      min: 0.45,
      max: 0.6,
      minId: 'A',
      maxId: 'C',
      stretched: true,
    });
    expect(r.paint.A!.fill).not.toBe(r.paint.C!.fill);
  });

  it('diferenças irrelevantes não viram contraste falso', () => {
    const r = scaleLayer('sequential', { A: { value: 0.5 }, B: { value: 0.51 } });
    expect(r.domain!.stretched).toBe(false);
    expect(r.position.A).toBeCloseTo(0.5, 6);
  });

  it('divergente centrado mantém o meio no meio (ideologia: 50 = centro)', () => {
    const r = scaleLayer(
      'diverging',
      { A: { value: 0.4 }, B: { value: 0.5 }, C: { value: 0.55 } },
      { centered: true },
    );
    expect(r.position.B).toBeCloseTo(0.5, 6);
    expect(r.position.A).toBeCloseTo(0, 6);
    expect(r.position.C).toBeCloseTo(0.75, 6);
  });

  it('sem dados é marcado explicitamente, nunca vira cor da escala', () => {
    const r = scaleLayer('sequential', { A: { value: Number.NaN }, B: { value: 0.3 } });
    expect(r.paint.A!.noData).toBe(true);
    expect(r.position.A).toBeUndefined();
    const c = scaleLayer('categorical', {
      A: { value: 1 },
      B: { value: 1, color: '#ff0000', strength: 1 },
    });
    expect(c.paint.A!.noData).toBe(true);
    expect(c.paint.B).toMatchObject({ fill: '#ff0000', opacity: 1 });
  });
});

describe('enquadramento com interface', () => {
  it('painel largo: o Brasil desliza para a faixa livre sem encolher abaixo de 70%', async () => {
    const { frameBounds } = await import('./camera');
    const insets = { top: 0, right: 412, bottom: 0, left: 1000 };
    const full = fitBounds(BRAZIL, SIZE, undefined, 28);
    const cam = frameBounds(BRAZIL, SIZE, insets);
    expect(cam.k).toBeGreaterThanOrEqual(full.k * 0.7 - 1e-9);
    // Faixa livre estreita: o outliner passa a flutuar e o centro vai para o meio de [1000, 1600].
    const [cx] = worldToScreen(cam, 500, 0);
    expect(cx).toBeCloseTo(1300, 0);
  });

  it('painel estreito: centro na área entre painel e outliner, zoom igual ao da tela inteira', async () => {
    const { frameBounds } = await import('./camera');
    const insets = { top: 0, right: 300, bottom: 0, left: 450 };
    const full = fitBounds(BRAZIL, SIZE, undefined, 28);
    const cam = frameBounds(BRAZIL, SIZE, insets);
    expect(cam.k).toBeLessThanOrEqual(full.k + 1e-9);
    const [cx] = worldToScreen(cam, 500, 0);
    expect(cx).toBeCloseTo(450 + (1600 - 450 - 300) / 2, 0);
  });
});

describe('zonas no Atlas', () => {
  it('estado: cunhas antes dos círculos, rótulos dentro do contorno, vizinhos de fundo', async () => {
    const { zoneAtlas } = await import('../map/zoneGeometry');
    const z = zoneAtlas(
      'state',
      'MG',
      [-43.94, -19.92],
      [
        { id: 'cap', name: 'Belo Horizonte', type: 'capital' },
        { id: 'n', name: 'Interior Norte', type: 'sector', direction: 'n' },
        { id: 'met', name: 'Região Metropolitana', type: 'metro' },
        { id: 's', name: 'Interior Sul', type: 'sector', direction: 's' },
      ],
      null,
    );
    expect(z.regions.map((r) => r.id)).toEqual(['n', 's', 'met', 'cap']);
    for (const r of z.regions) {
      expect(r.centroid[0]).toBeGreaterThanOrEqual(z.world[0]);
      expect(r.centroid[0]).toBeLessThanOrEqual(z.world[2]);
      expect(r.bbox[2]).toBeGreaterThan(r.bbox[0]);
    }
    expect(z.backdrop).toHaveLength(26);
    expect(z.context).toBe(true);
    expect(z.kmPerUnit).toBeUndefined();
  });

  it('cidade: escala própria (km por unidade) e sem contexto nacional', async () => {
    const { zoneAtlas } = await import('../map/zoneGeometry');
    const { CITY_GEOMETRY } = await import('../map/cityGeometry.generated');
    const [, recife] = Object.entries(CITY_GEOMETRY)[0]!;
    const z = zoneAtlas(
      'city',
      'PE',
      [-34.9, -8.05],
      [{ id: 'c', name: 'Centro', type: 'center' }],
      recife,
    );
    expect(z.context).toBe(false);
    expect(z.kmPerUnit).toBeGreaterThan(0);
    expect(z.outline).toBe(recife.d);
    // Sem malha carregada: contorno genérico e sem barra de escala.
    expect(zoneAtlas('city', 'PE', [-34.9, -8.05], [], null).kmPerUnit).toBeNull();
  });
});
