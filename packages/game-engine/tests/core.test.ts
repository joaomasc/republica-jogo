import { describe, expect, it } from 'vitest';
import {
  addDays,
  diffDays,
  firstSundayOfOctober,
  hashSeed,
  ideologyDistance,
  lastSundayOfOctober,
  neutralIdeology,
  Rng,
} from '../src/index';

describe('Rng', () => {
  it('é determinístico para a mesma seed', () => {
    const a = new Rng(123);
    const b = new Rng(123);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('gera valores em [0, 1) e respeita int()', () => {
    const r = new Rng(9);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = r.int(3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('hashSeed muda com as partes', () => {
    expect(hashSeed('a', 1)).not.toBe(hashSeed('a', 2));
    expect(hashSeed('a', 1)).toBe(hashSeed('a', 1));
  });
});

describe('Datas', () => {
  it('calcula domingos de eleição', () => {
    expect(firstSundayOfOctober(2026)).toBe('2026-10-04');
    expect(lastSundayOfOctober(2026)).toBe('2026-10-25');
    expect(firstSundayOfOctober(2028)).toBe('2028-10-01');
  });

  it('soma e diferença de dias', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(diffDays('2026-08-01', '2026-10-04')).toBe(64);
  });
});

describe('Ideologia', () => {
  it('distância é 0 para vetores iguais e 1 para opostos', () => {
    const a = neutralIdeology();
    expect(ideologyDistance(a, a)).toBe(0);
    const zero = Object.fromEntries(Object.keys(a).map((k) => [k, 0])) as typeof a;
    const full = Object.fromEntries(Object.keys(a).map((k) => [k, 100])) as typeof a;
    expect(ideologyDistance(zero, full)).toBeCloseTo(1);
  });
});
