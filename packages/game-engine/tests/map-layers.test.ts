import { describe, expect, it } from 'vitest';
import {
  buildingLayer,
  goodLayer,
  goodOutputByState,
  MAP_MODES,
  mapLayer,
  mapUnits,
  type GameState,
} from '../src/index';
import { newGame } from './helpers';

/** Presidente: mapa com as 27 UFs. */
function national(): GameState {
  return newGame('presidente', 'SP', 7);
}

describe('camadas do mapa', () => {
  it('todo modo devolve uma célula por unidade, com valor finito ou "sem dados" explícito', () => {
    const s = national();
    const units = mapUnits(s);
    for (const mode of MAP_MODES) {
      const layer = mapLayer(s, mode);
      expect(Object.keys(layer.cells).sort(), mode).toEqual(units.map((u) => u.id).sort());
      for (const cell of Object.values(layer.cells)) {
        expect(typeof cell.label, mode).toBe('string');
        if (Number.isFinite(cell.value)) {
          expect(cell.value, mode).toBeGreaterThanOrEqual(0);
          expect(cell.value, mode).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('valores compactos (para escrever no mapa) usam vírgula decimal e são curtos', () => {
    const s = national();
    for (const mode of ['unemployment', 'income', 'informality', 'population', 'ideology'] as const) {
      const cells = Object.values(mapLayer(s, mode).cells);
      expect(cells.every((c) => c.short !== undefined), mode).toBe(true);
      for (const c of cells) {
        expect(c.short!.length, `${mode}: ${c.short}`).toBeLessThanOrEqual(12);
        expect(c.short, mode).not.toMatch(/\d\.\d/);
      }
    }
  });

  it('governos estaduais: cor e sigla do partido que governa cada UF', () => {
    const s = national();
    const layer = mapLayer(s, 'governors');
    expect(layer.scale).toBe('categorical');
    for (const u of mapUnits(s)) {
      const pid = s.landscape.governors[u.stateId];
      const cell = layer.cells[u.id]!;
      expect(cell.color).toBe(s.parties[pid]!.color);
      expect(cell.short).toBe(s.parties[pid]!.acronym);
    }
  });

  it('governos estaduais seguem o resultado das eleições (landscape), não o sorteio inicial', () => {
    const s = structuredClone(national());
    const other = Object.keys(s.parties).find((p) => p !== s.landscape.governors.BA)!;
    s.landscape.governors.BA = other;
    expect(mapLayer(s, 'governors').cells.BA!.color).toBe(s.parties[other]!.color);
  });

  it('ideologia: eixo escolhido, divergente, valor = média do eleitorado da UF', () => {
    const s = national();
    const layer = mapLayer(s, 'ideology', undefined, 'social');
    expect(layer.scale).toBe('diverging');
    expect(layer.title).toContain('Costumes');
    expect(layer.cells.SP!.value).toBeCloseTo(s.regions.SP!.ideology.social / 100, 5);
  });

  it('produção de um bem: soma por UF bate com o total e a maior produtora tem valor 1', () => {
    const s = national();
    const byState = goodOutputByState(s, 'steel');
    const layer = goodLayer(s, 'steel');
    const values = Object.values(layer.cells).map((c) => c.value);
    expect(Math.max(...values)).toBeCloseTo(1, 5);
    const producers = Object.entries(byState).filter(([, v]) => v > 0);
    expect(producers.length).toBeGreaterThan(0);
    for (const [uf] of producers) expect(layer.cells[uf]!.label).toMatch(/^Produz/);
    expect(layer.mode).toBe('good');
  });

  it('níveis de um edifício por UF, com obras na fila marcadas', () => {
    const s = structuredClone(national());
    const layer = buildingLayer(s, 'steel_mill');
    expect(layer.mode).toBe('building');
    const levels = Object.entries(s.industry.buildings).filter(([, b]) => (b.steel_mill?.level ?? 0) > 0);
    for (const [uf] of levels) expect(layer.cells[uf]!.value).toBeGreaterThan(0);
  });
});
