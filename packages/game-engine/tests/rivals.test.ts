import { describe, expect, it } from 'vitest';
import { dispatch, startGame, type GameState } from '../src/index';
import { eligibleEventIds } from '../src/events/events';
import { nemesisInRace, nemesisOf, rivalryScore } from '../src/world/rivals';
import { defaultConfig, playCampaign } from './helpers';

function firstElection(seed = 5): GameState {
  let s = startGame(defaultConfig(seed, 'prefeito', 'RS'));
  s = playCampaign(s, 'active');
  s = dispatch(s, { type: 'election/hold' }).state;
  // 2º turno com o jogador: joga e encerra.
  if (s.election?.status === 'campaign' && s.election.results[0]?.runoff?.includes(s.playerId)) {
    s = dispatch(s, { type: 'election/continue' }).state;
    s = playCampaign(s, 'active');
    s = dispatch(s, { type: 'election/hold' }).state;
  }
  return s;
}

describe('Rivais recorrentes', () => {
  const after = firstElection();

  it('a eleição concluída guarda os adversários relevantes com memória', () => {
    const rivals = Object.values(after.rivals ?? {});
    expect(rivals.length).toBeGreaterThan(0);
    for (const r of rivals) {
      expect(r.memory.confrontations).toBe(1);
      expect(r.memory.beatPlayer + r.memory.lostToPlayer).toBe(1);
      expect(r.career.at(-1)?.officeId).toBe('prefeito');
      expect(r.candidate.isPlayer).toBe(false);
    }
  });

  it('na eleição seguinte, o nêmesis volta à disputa e destrava eventos próprios', () => {
    let s = structuredClone(after);
    const rival = Object.values(s.rivals!)[0]!;
    // Histórico pesado: vira nêmesis.
    rival.memory = { confrontations: 3, beatPlayer: 2, lostToPlayer: 1, attacks: 4, allied: 0 };
    expect(nemesisOf(s)?.id).toBe(rival.id);
    expect(rivalryScore(rival)).toBeGreaterThan(6);
    s = dispatch(s, { type: 'election/continue' }).state;
    if (s.phase === 'governing') return; // venceu e governa: o nêmesis aparece no mandato
    const run = dispatch(s, {
      type: 'career/run',
      officeId: 'prefeito',
      stateId: 'RS',
    });
    s = run.state;
    if (!run.result.ok || !s.election) return;
    const back = nemesisInRace(s);
    // 90% de chance de voltar: com a semente fixa, volta.
    expect(back).not.toBeNull();
    expect(s.candidates[back!]?.ballotName).toBe(rival.candidate.ballotName);
    expect(eligibleEventIds(s)).toContain('arc_nemesis_volta');
  });

  it('sem nêmesis, os eventos dele não saem', () => {
    const s = startGame(defaultConfig(5, 'prefeito', 'RS'));
    expect(eligibleEventIds(s)).not.toContain('arc_nemesis_volta');
  });
});
