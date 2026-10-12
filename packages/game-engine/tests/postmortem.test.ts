import { describe, expect, it } from 'vitest';
import { dispatch, electionPostMortem, startGame } from '../src/index';
import { defaultConfig, playCampaign } from './helpers';

describe('Por que perdi? (relatório pós-eleição)', () => {
  it('lista o que mais ajudou/atrapalhou e compara com o vencedor', () => {
    let s = startGame(defaultConfig(4, 'prefeito', 'SP'));
    s = playCampaign(s, 'active');
    s = dispatch(s, { type: 'election/hold' }).state;
    const pm = electionPostMortem(s);
    expect(pm).not.toBeNull();
    expect(pm!.bySource.length).toBeGreaterThan(0);
    expect(pm!.best.length + pm!.worst.length).toBeGreaterThan(0);
    expect(pm!.versusName).toBeTruthy();
    for (const f of pm!.best) expect(f.delta).toBeGreaterThan(0);
    for (const f of pm!.worst) expect(f.delta).toBeLessThan(0);
  });
});
