import { describe, expect, it } from 'vitest';
import { dispatch, startGame, type GameState } from '../src/index';
import { OCCUPATIONS } from '../src/career/occupations';
import { EVENT_DEFINITIONS } from '../src/events/events.data';
import { defaultConfig, playCampaign } from './helpers';

/** Perde (ou termina) uma eleição e cai na fase de carreira. */
function outOfOffice(): GameState {
  for (let seed = 1; seed <= 30; seed++) {
    let s = startGame(defaultConfig(seed, 'prefeito', 'SP'));
    s = playCampaign(s, 'passive');
    s = dispatch(s, { type: 'election/hold' }).state;
    if (s.election?.status === 'campaign') continue;
    s = dispatch(s, { type: 'election/continue' }).state;
    if (s.phase === 'career') return s;
  }
  throw new Error('nenhuma derrota encontrada');
}

describe('Entressafra jogável', () => {
  const base = outOfOffice();

  it('escolher ocupação só fora do cargo e com id válido', () => {
    const ok = dispatch(base, { type: 'career/occupation', occupationId: 'professor' });
    expect(ok.result.ok).toBe(true);
    expect(ok.state.career.occupation).toBe('professor');
    const bad = dispatch(base, { type: 'career/occupation', occupationId: 'astronauta' as never });
    expect(bad.result.ok).toBe(false);
  });

  it('avançar 6 meses aplica os efeitos da ocupação e traz um acontecimento dela', () => {
    let s = dispatch(base, { type: 'career/occupation', occupationId: 'influenciador' }).state;
    const fame = s.candidates[s.playerId]!.fame;
    const cred = s.candidates[s.playerId]!.attributes.credibility;
    let fired = 0;
    for (let i = 0; i < 4; i++) {
      for (const ev of s.events.pending)
        s = dispatch(s, {
          type: 'event/resolve',
          instanceId: ev.instanceId,
          optionId: ev.options[0]!.id,
        }).state;
      const out = dispatch(s, { type: 'career/advance' });
      expect(out.result.ok).toBe(true);
      s = out.state;
      if (s.events.pending.length > 0 || s.events.log[0]?.eventId.startsWith('car_')) fired++;
    }
    const after = s.candidates[s.playerId]!;
    expect(after.fame).toBeGreaterThan(fame - 2);
    expect(after.attributes.credibility).toBeLessThan(cred + 1);
    expect(fired).toBeGreaterThan(0);
  });

  it('toda ocupação tem eventos próprios no pacote', () => {
    for (const id of Object.keys(OCCUPATIONS)) {
      const own = EVENT_DEFINITIONS.filter((e) => {
        if (!e.phases.includes('career') || !e.condition) return false;
        try {
          return e.condition({ career: { occupation: id } } as never) === true;
        } catch {
          return false; // condição que depende de outros campos do estado
        }
      });
      expect(own.length, id).toBeGreaterThanOrEqual(2);
    }
  });
});
