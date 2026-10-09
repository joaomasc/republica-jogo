import type { MapLayer } from '@republica/game-engine';
import { Bar, Delta, Slider } from '@republica/ui';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { stageFills } from '../map/mapPalette';
import { alertRoute, NAV_GROUPS, routeMeta } from './navigation';

function layer(scale: MapLayer['scale'], value: number): MapLayer {
  return {
    title: 't',
    scale,
    legend: { low: 'a', high: 'b' },
    cells: { SP: { value, label: 'x' } },
  } as unknown as MapLayer;
}

describe('robustez numérica da interface', () => {
  it('mapa: valor inválido vira "sem dados", nunca cor quebrada', () => {
    for (const scale of ['sequential', 'diverging', 'categorical'] as const) {
      for (const v of [Number.NaN, Infinity, -Infinity]) {
        const fill = stageFills(layer(scale, v)).SP;
        expect(fill?.fill).toMatch(/^#[0-9a-f]{6}$/i);
        expect(fill?.fill).not.toContain('NaN');
      }
    }
  });

  it('mapa: valores fora de 0–1 são limitados', () => {
    const lo = stageFills(layer('sequential', -3)).SP?.fill;
    const hi = stageFills(layer('sequential', 9)).SP?.fill;
    expect(lo).toBe(stageFills(layer('sequential', 0)).SP?.fill);
    expect(hi).toBe(stageFills(layer('sequential', 1)).SP?.fill);
  });

  it('Bar e Slider não geram largura NaN', () => {
    expect(renderToStaticMarkup(createElement(Bar, { value: Number.NaN }))).not.toContain('NaN');
    expect(renderToStaticMarkup(createElement(Bar, { value: 5 }))).toContain('width:100%');
    const slider = renderToStaticMarkup(
      createElement(Slider, { value: Number.NaN, onChange: () => {} }),
    );
    expect(slider).toContain('--range-pct:0%');
  });

  it('Delta nunca mostra "-0.0"', () => {
    const html = (value: number) => renderToStaticMarkup(createElement(Delta, { value }));
    expect(html(-0.04)).toContain('>0.0<');
    expect(html(-0.04)).not.toContain('>-');
    expect(html(0.04)).not.toContain('>+');
    expect(html(1.26)).toContain('+1.3');
    expect(html(-1.26)).toContain('-1.3');
  });
});

describe('rotas do contrato', () => {
  it('todo destino de alerta existe como painel do dock', () => {
    const paths = new Set(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.path)));
    for (const link of [
      'polls', 'finance', 'party', 'events', 'debate', 'government', 'budget', 'laws',
      'congress', 'economy', 'market', 'industry', 'trade', 'decrees', 'nation',
    ]) {
      const route = alertRoute(link);
      expect(route, link).not.toBeNull();
      expect(paths.has(route!.replace('/jogo/', '')), link).toBe(true);
    }
  });

  it('rotas novas do contrato têm painel largo ou normal e rótulo', () => {
    for (const p of ['mercado', 'industria', 'comercio', 'decretos', 'nacao']) {
      expect(routeMeta(p).label, p).not.toBe('');
    }
  });
});

describe('ícones', () => {
  it('todo ícone do dock, dos modos de mapa e dos dados do motor existe no registro', async () => {
    const { ICONS } = await import('@republica/ui');
    const { BUILDINGS, DECREES } = await import('@republica/game-engine');
    const { MAP_MODES } = await import('@republica/game-engine');
    const { modeMeta } = await import('../map/mapModes');
    const missing: string[] = [];
    const check = (where: string, icon: string | undefined) => {
      if (icon && !ICONS[icon]) missing.push(`${where}:${icon}`);
    };
    for (const g of NAV_GROUPS) for (const i of g.items) check(`nav/${i.path}`, i.icon);
    for (const m of MAP_MODES) check(`mapa/${m}`, modeMeta(m).icon);
    for (const [id, b] of Object.entries(BUILDINGS)) check(`edificio/${id}`, b.icon);
    for (const [id, d] of Object.entries(DECREES)) check(`decreto/${id}`, d.icon);
    expect(missing).toEqual([]);
  });
});
