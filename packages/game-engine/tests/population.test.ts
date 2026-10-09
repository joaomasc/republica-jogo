import { describe, expect, it } from 'vitest';
import {
  GameConstants,
  POP_TYPE_IDS,
  popShares,
  STATE_IDS,
  STATE_LIST,
  STATES,
  sum,
} from '../src/index';
import { newGame } from './helpers';

describe('População (Pops)', () => {
  const state = newGame('presidente', 'SP', 7);

  it('cria um Pop por tipo e por estado', () => {
    expect(Object.keys(state.population.pops)).toHaveLength(STATE_IDS.length * POP_TYPE_IDS.length);
  });

  it('o eleitorado total é coerente com a população × razão de eleitores', () => {
    const population = sum(STATE_LIST.map((s) => s.population * 1000));
    const expected = population * GameConstants.population.voterRatio;
    expect(state.population.totalVoters / expected).toBeGreaterThan(0.99);
    expect(state.population.totalVoters / expected).toBeLessThan(1.01);
  });

  it('a composição demográfica de cada estado soma 1 e reage aos fatores regionais', () => {
    const avg = {
      urbanization: 0.85,
      agro: 0.35,
      industry: 0.55,
      publicSector: 0.4,
      tech: 0.5,
      income: 0.8,
      unemployment: 0.75,
    };
    const mt = popShares(STATES.MT, avg);
    const df = popShares(STATES.DF, avg);
    expect(sum(Object.values(mt))).toBeCloseTo(1);
    expect(mt.farmers).toBeGreaterThan(df.farmers);
    expect(df.civil_servants).toBeGreaterThan(mt.civil_servants);
  });

  it('identificação partidária é limitada (há independentes)', () => {
    for (const pop of Object.values(state.population.pops).slice(0, 50)) {
      const total = sum(Object.values(pop.partyAffinity));
      expect(total).toBeGreaterThan(0.1);
      expect(total).toBeLessThan(0.8);
    }
  });

  it('é reprodutível com a mesma seed', () => {
    const again = newGame('presidente', 'SP', 7);
    expect(again.population).toEqual(state.population);
  });
});
