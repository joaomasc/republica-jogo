import { describe, expect, it } from 'vitest';
import { weeklyChallenge } from './weeklyChallenge';

describe('Desafio da semana', () => {
  it('é igual para todos na mesma semana e muda na semana seguinte', () => {
    const mon = weeklyChallenge(new Date(2026, 9, 12));
    const sun = weeklyChallenge(new Date(2026, 9, 18));
    const next = weeklyChallenge(new Date(2026, 9, 19));
    expect(sun.preset).toEqual(mon.preset);
    expect(next.preset.seed).not.toBe(mon.preset.seed);
    expect(mon.preset.difficulty).toBe('hard');
    expect(mon.preset.lockOffice).toBe(true);
  });
});
