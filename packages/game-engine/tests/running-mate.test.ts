import { describe, expect, it } from 'vitest';
import { dispatch, startGame } from '../src/index';
import { needsRunningMate, runningMateOptions } from '../src/campaign/runningMate';
import { defaultConfig } from './helpers';

describe('Vice e chapa', () => {
  const s = startGame(defaultConfig(3, 'governador', 'MG'));

  it('eleição majoritária do Executivo pede vice; o próprio partido sempre é opção', () => {
    expect(needsRunningMate(s)).toBe(true);
    const opts = runningMateOptions(s);
    expect(opts[0]?.partyId).toBe(s.candidates[s.playerId]!.partyId);
    const running = new Set(s.election!.candidateIds.map((id) => s.candidates[id]!.partyId));
    for (const o of opts.slice(1)) expect(running.has(o.partyId)).toBe(false);
  });

  it('vice do próprio partido agrada a base; não dá para trocar depois', () => {
    const party = s.candidates[s.playerId]!.partyId;
    const before = s.parties[party]!.unity;
    const out = dispatch(s, { type: 'campaign/vice', partyId: party });
    expect(out.result.ok).toBe(true);
    expect(out.state.campaign?.runningMate?.partyId).toBe(party);
    expect(out.state.parties[party]!.unity).toBeGreaterThanOrEqual(before);
    expect(dispatch(out.state, { type: 'campaign/vice', partyId: party }).result.ok).toBe(false);
  });

  it('vice aliado traz eleitores do partido dele (apoio na chapa)', () => {
    const ally = runningMateOptions(s)[1];
    if (!ally) return;
    const out = dispatch(s, { type: 'campaign/vice', partyId: ally.partyId });
    expect(out.result.ok).toBe(true);
    const list = out.state.election!.endorsements?.[s.playerId] ?? [];
    expect(list.some((e) => e.partyId === ally.partyId)).toBe(true);
  });

  it('legislativo não tem vice', () => {
    expect(needsRunningMate(startGame(defaultConfig(3, 'deputado_federal', 'MG')))).toBe(false);
  });
});
