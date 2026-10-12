import { describe, expect, it } from 'vitest';
import { careerOptions, dispatch, startGame } from '../src/index';
import { applyEffects } from '../src/events/effects';
import { caixa2, cassar, inelegivel } from '../src/events/dsl';
import { defaultConfig } from './helpers';

describe('Justiça Eleitoral e Ficha Limpa', () => {
  it('caixa 2 entra no caixa e fica registrado como não declarado', () => {
    const s = startGame(defaultConfig(2, 'prefeito', 'SP'));
    const before = s.campaign!.money;
    applyEffects(s, [caixa2(100_000)], {});
    expect(s.campaign!.money).toBeGreaterThan(before);
    expect(s.campaign!.undeclared).toBeGreaterThan(0);
  });

  it('com muito caixa 2, a prestação de contas entra na fila de auditoria depois da eleição', () => {
    let scheduled = 0;
    for (let seed = 1; seed <= 8; seed++) {
      let s = startGame(defaultConfig(seed, 'prefeito', 'SP'));
      applyEffects(s, [caixa2(5_000_000)], {});
      // Vai direto ao dia da eleição (a campanha não importa aqui).
      s.date = s.election!.date;
      s.phase = 'election_day';
      s.election!.status = 'election_day';
      s = dispatch(s, { type: 'election/hold' }).state;
      if (s.events.scheduled.some((x) => x.eventId === 'jus_contas')) scheduled++;
    }
    // Chance de 85% por eleição concluída com caixa 2 alto.
    expect(scheduled).toBeGreaterThanOrEqual(4);
  });

  it('inelegível não pode se candidatar até o fim da pena', () => {
    const s = startGame(defaultConfig(2, 'prefeito', 'SP'));
    applyEffects(s, [inelegivel(8)], {});
    const year = Number(s.date.slice(0, 4));
    expect(s.career.ineligibleUntil).toBe(year + 8);
    const opts = careerOptions(s).filter((o) => o.year <= year + 8);
    expect(opts.length).toBeGreaterThan(0);
    for (const o of opts) {
      expect(o.eligible).toBe(false);
      expect(o.reason).toMatch(/Ficha Limpa/);
    }
    applyEffects(s, [{ type: 'ineligible', years: -100 }], {});
    expect(s.career.ineligibleUntil).toBe(0);
  });

  it('cassação encerra o mandato no dia seguinte', () => {
    let s = startGame({ ...defaultConfig(2, 'prefeito', 'SP'), startInOffice: true });
    expect(s.phase).toBe('governing');
    applyEffects(s, [cassar('Mandato cassado (teste)')], {});
    s = dispatch(s, { type: 'time/advance', step: 'day' }).state;
    expect(s.government).toBeNull();
    expect(s.history.some((h) => h.title.includes('cassado'))).toBe(true);
  });
});
