import { describe, expect, it } from 'vitest';
import pkg from '../../../package.json';
import { APP_VERSION, CHANGELOG } from './changelog.data';

const num = (v: string) => v.split('.').map(Number);
const cmp = (a: string, b: string) => {
  const [x, y] = [num(a), num(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};

describe('Diário de desenvolvimento', () => {
  it('versão atual é a do package.json e as entradas vêm da mais nova para a mais velha', () => {
    expect(APP_VERSION).toBe(pkg.version);
    for (let i = 1; i < CHANGELOG.length; i++)
      expect(cmp(CHANGELOG[i - 1]!.version, CHANGELOG[i]!.version)).toBeGreaterThan(0);
    for (const e of CHANGELOG) expect(e.items.length).toBeGreaterThan(0);
  });
});
