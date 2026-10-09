import { describe, expect, it } from 'vitest';
import { describeModifiers, getLawOption, previewLawImpact, startGame } from '../src/index';
import { defaultConfig } from './helpers';

describe('Prévia de impacto (o que muda)', () => {
  const state = startGame({ ...defaultConfig(5, 'presidente', 'SP', 'udc'), scenarioId: 'presidencia_2027' });

  it('compara o futuro com e sem a lei sem alterar o estado atual', () => {
    const before = JSON.stringify(state);
    const r = previewLawImpact(state, 'trade', 'trade_isi', 12)!;
    expect(JSON.stringify(state)).toBe(before);
    expect(r.months).toBe(12);
    const manuf = r.economy.find((x) => x.id === 'manufacturing')!;
    const imports = r.economy.find((x) => x.id === 'imports')!;
    expect(imports.delta).toBeLessThan(0);
    expect(Number.isFinite(manuf.delta)).toBe(true);
    expect(r.headlines.length).toBeGreaterThan(0);
  });

  it('é determinística', () => {
    const a = previewLawImpact(state, 'labor', 'labor_flexible', 6)!;
    const b = previewLawImpact(state, 'labor', 'labor_flexible', 6)!;
    expect(a).toEqual(b);
  });

  it('cada efeito econômico de lei tem explicação de causa e efeito', () => {
    for (const [c, o] of [['trade', 'trade_isi'], ['economic_system', 'econ_planned'], ['labor', 'labor_flexible']] as const) {
      const lines = describeModifiers(getLawOption(c, o)!.modifiers);
      expect(lines.length).toBeGreaterThan(0);
      for (const l of lines) expect(l.why.length).toBeGreaterThan(10);
    }
  });
});
