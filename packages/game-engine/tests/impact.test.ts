import { describe, expect, it } from 'vitest';
import { computeIntentions, dispatch } from '../src/index';
import type { GameState } from '../src/simulation/state';
import { must, newGame } from './helpers';

function playerShare(state: GameState): number {
  const snap = computeIntentions(state, state.election!, { includeSegments: false });
  return snap.total.shares[state.playerId] ?? 0;
}

describe('Medidor de impacto', () => {
  const state = newGame('governador', 'MG', 7);
  const unit = state.election!.units[0]!;

  it('registra o efeito imediato de uma ação no diário, na lista de impacto e na notificação', () => {
    const out = dispatch(state, {
      type: 'campaign/action',
      input: { actionId: 'regional_blitz', unitId: unit.id },
    });
    expect(out.result.ok).toBe(true);
    const log = out.state.campaign!.log[0]!;
    expect(log.impact).toBeDefined();
    expect(log.impact!.share).toBeGreaterThan(0);
    const entry = out.state.campaign!.impact!.find((e) => e.source === 'action');
    expect(entry?.label).toContain(unit.name);
    expect(entry?.share).toBeCloseTo(log.impact!.share, 10);
    expect(out.result.details?.some((d) => d.startsWith('Intenção de voto'))).toBe(true);
  });

  it('as fontes de um dia somam exatamente a variação real da intenção', () => {
    const before = playerShare(state);
    const next = must(state, { type: 'time/advance', step: 'day' });
    const day = next.campaign!.impact!.filter((e) => e.date === state.date);
    expect(day.length).toBeGreaterThan(0);
    const attributed = day.reduce((a, e) => a + e.share, 0);
    expect(attributed).toBeCloseTo(playerShare(next) - before, 9);
  });

  it('funciona com saves antigos sem o campo de impacto', () => {
    const old = structuredClone(state);
    delete old.campaign!.impact;
    const next = must(old, { type: 'time/advance', step: 'week' });
    expect(next.campaign!.impact!.length).toBeGreaterThan(0);
  });
});
