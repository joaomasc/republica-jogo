import { describe, expect, it } from 'vitest';
import { PARODY_PARTY_SKINS, PARODY_POLITICIANS, startGame } from '../src/index';
import { defaultConfig } from '../scripts/bot';
import type { GameState } from '../src/simulation/state';
import { must } from './helpers';

function parodyGame(seed: number, office: 'presidente' | 'governador' = 'presidente', uf = 'SP') {
  return startGame({ ...defaultConfig(seed, office, uf as never), world: 'parody' });
}

function runCampaign(state: GameState): GameState {
  let s = state;
  for (let guard = 0; guard < 200 && s.phase === 'campaign'; guard++) {
    const ev = s.events.pending[0];
    if (ev) {
      s = must(s, {
        type: 'event/resolve',
        instanceId: ev.instanceId,
        optionId: ev.options.find((o) => o.available)!.id,
      });
      continue;
    }
    const interview = s.interactions.interview;
    if (interview) {
      const q = interview.questions[interview.index];
      s = must(
        s,
        interview.finished || !q
          ? { type: 'interview/close' }
          : { type: 'interview/answer', answerId: q.answers[0]!.id },
      );
      continue;
    }
    const d = s.election!.debates.find((x) => x.status === 'scheduled' && x.date === s.date);
    if (d) {
      s = must(s, { type: 'debate/decline', debateId: d.id });
      continue;
    }
    s = must(s, { type: 'time/advance', step: 'week' });
  }
  return s;
}

describe('Mundo paródia', () => {
  it('troca nomes e siglas dos partidos, mantendo a mecânica', () => {
    const fictional = startGame(defaultConfig(3, 'presidente', 'SP'));
    const parody = parodyGame(3);
    expect(parody.settings.world).toBe('parody');
    expect(fictional.settings.world).toBe('fictional');
    for (const [id, skin] of Object.entries(PARODY_PARTY_SKINS)) {
      expect(parody.parties[id]?.acronym).toBe(skin.acronym);
      expect(parody.parties[id]?.ideology).toEqual(fictional.parties[id]?.ideology);
    }
  });

  it('adversários viram personagens de paródia, sem repetir e sem escândalos de origem', () => {
    const s = parodyGame(5);
    const opponents = s
      .election!.candidateIds.filter((id) => id !== s.playerId)
      .map((id) => s.candidates[id]!);
    const personas = opponents.filter((c) => c.parodyKey);
    expect(personas.length).toBeGreaterThan(0);
    expect(new Set(personas.map((c) => c.parodyKey)).size).toBe(personas.length);
    for (const c of personas) {
      const p = PARODY_POLITICIANS.find((x) => x.key === c.parodyKey)!;
      expect(c.ballotName).toBe(p.ballotName);
      expect(c.partyId).toBe(p.partyId);
      expect(c.scandal).toBe(0);
    }
  });

  it('o elenco cobre esquerda, centro e direita', () => {
    const left = PARODY_POLITICIANS.filter((p) => ['ftu', 'nes', 'ren'].includes(p.partyId));
    const right = PARODY_POLITICIANS.filter((p) =>
      ['pop', 'alb', 'psa', 'renova'].includes(p.partyId),
    );
    const center = PARODY_POLITICIANS.filter((p) => ['udc', 'pfr'].includes(p.partyId));
    expect(left.length).toBeGreaterThanOrEqual(5);
    expect(right.length).toBeGreaterThanOrEqual(5);
    expect(center.length).toBeGreaterThanOrEqual(5);
  });

  it('eventos de acusação nunca escolhem um personagem de paródia', () => {
    const names = new Set(PARODY_POLITICIANS.map((p) => p.ballotName));
    for (const seed of [1, 2, 3, 4]) {
      const s = runCampaign(parodyGame(seed, 'governador', 'SP'));
      for (const e of s.events.log) {
        if (e.eventId !== 'opponent_scandal') continue;
        for (const n of names) expect(e.title).not.toContain(n);
      }
    }
  }, 30_000);
});
