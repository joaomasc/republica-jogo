import type { GameState } from '@republica/game-engine';
import { describe, expect, it } from 'vitest';
import {
  GAME_SPEEDS,
  MIN_TICK_MS,
  SPEED_FACTORS,
  speedIntervalMs,
  type GameSpeed,
} from '../../store/settingsStore';
import { availableModes, effectiveMode } from '../map/mapModes';
import { LAYOUT, panelWidthPx } from './layout';
import {
  alertRoute,
  isNavItemVisible,
  NAV_GROUPS,
  panelSegment,
  routeMeta,
} from './navigation';

function fakeGame(phase: GameState['phase'], branch?: 'executive' | 'legislative'): GameState {
  return {
    phase,
    election: null,
    government: branch ? { branch } : null,
  } as unknown as GameState;
}

describe('navegação do shell', () => {
  it('mapeia Alert.link do contrato para rotas em /jogo', () => {
    expect(alertRoute('congress')).toBe('/jogo/congresso');
    expect(alertRoute('industry')).toBe('/jogo/industria');
    expect(alertRoute('market')).toBe('/jogo/mercado');
    expect(alertRoute('trade')).toBe('/jogo/comercio');
    expect(alertRoute('decrees')).toBe('/jogo/decretos');
    expect(alertRoute('nation')).toBe('/jogo/nacao');
    expect(alertRoute('map')).toBe('/jogo');
    expect(alertRoute('inexistente')).toBeNull();
    expect(alertRoute(undefined)).toBeNull();
  });

  it('extrai o segmento do painel a partir da URL', () => {
    expect(panelSegment('/jogo')).toBeNull();
    expect(panelSegment('/jogo/')).toBeNull();
    expect(panelSegment('/jogo/leis')).toBe('leis');
    expect(panelSegment('/jogo/regiao/SP')).toBe('regiao');
  });

  it('toda rota do dock tem metadados e ids únicos', () => {
    const paths = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.path));
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) expect(routeMeta(p).label).not.toBe('');
    expect(routeMeta('regiao').width).toBe('narrow');
    expect(routeMeta('desconhecida').label).toBe('');
  });

  it('esconde itens conforme fase e ramo do mandato', () => {
    const decretos = routeMeta('decretos');
    expect(isNavItemVisible(decretos, fakeGame('governing', 'executive'))).toBe(true);
    expect(isNavItemVisible(decretos, fakeGame('governing', 'legislative'))).toBe(false);
    expect(isNavItemVisible(decretos, fakeGame('campaign'))).toBe(false);
    const campanha = routeMeta('campanha');
    expect(isNavItemVisible(campanha, fakeGame('campaign'))).toBe(true);
    expect(isNavItemVisible(campanha, fakeGame('governing', 'executive'))).toBe(false);
  });
});

describe('largura dos painéis', () => {
  it('nunca invade o bloco de tempo quando há espaço', () => {
    for (const viewport of [1024, 1100, 1280, 1600, 1920, 2560]) {
      const room =
        viewport - LAYOUT.dock - LAYOUT.gap * 2 - LAYOUT.cluster - LAYOUT.edge * 2;
      for (const kind of ['narrow', 'normal', 'wide'] as const) {
        const w = panelWidthPx(kind, viewport);
        expect(w).toBeGreaterThanOrEqual(LAYOUT.panelMin);
        if (room >= LAYOUT.panelMin) expect(w).toBeLessThanOrEqual(room);
        expect(Number.isFinite(w)).toBe(true);
      }
    }
  });

  it('painel largo é maior que o normal em telas grandes', () => {
    expect(panelWidthPx('wide', 2560)).toBeGreaterThan(panelWidthPx('normal', 2560));
    expect(panelWidthPx('narrow', 2560)).toBeLessThan(panelWidthPx('normal', 2560));
  });
});

describe('velocidade do avanço automático', () => {
  it('é monotônica e respeita o intervalo mínimo', () => {
    let prev = Infinity;
    for (const s of GAME_SPEEDS) {
      const ms = speedIntervalMs(1000, s);
      expect(ms).toBeLessThanOrEqual(prev);
      expect(ms).toBeGreaterThanOrEqual(MIN_TICK_MS);
      prev = ms;
    }
    expect(speedIntervalMs(300, 5)).toBe(MIN_TICK_MS);
  });

  it('não gera NaN com configuração inválida', () => {
    expect(speedIntervalMs(Number.NaN, 3)).toBe(Math.round(1000 * SPEED_FACTORS[3]));
    expect(speedIntervalMs(-5, 1)).toBe(1000);
    expect(Number.isFinite(speedIntervalMs(1000, 9 as GameSpeed))).toBe(true);
  });
});

describe('modos de mapa', () => {
  it('sem eleição não oferece intenção, campanha nem resultados', () => {
    const modes = availableModes(fakeGame('governing', 'executive'));
    expect(modes).not.toContain('intention');
    expect(modes).not.toContain('campaign');
    expect(modes).not.toContain('results');
    expect(modes).toContain('popularity');
  });

  it('o modo guardado indisponível cai no padrão da fase', () => {
    const gov = fakeGame('governing', 'executive');
    expect(effectiveMode('intention', gov)).toBe('popularity');
    expect(effectiveMode('economy', gov)).toBe('economy');
    expect(effectiveMode(null, gov)).toBe('popularity');
  });
});
