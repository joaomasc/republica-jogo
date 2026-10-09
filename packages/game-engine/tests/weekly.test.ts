import { describe, expect, it } from 'vitest';
import { computeIntentions, dispatch, startGame } from '../src/index';
import { defaultConfig } from '../scripts/bot';
import type { GameState } from '../src/simulation/state';
import { must } from './helpers';

const dynamic = (seed = 21) =>
  startGame({ ...defaultConfig(seed, 'governador', 'MG'), weekly: true });

function share(s: GameState): number {
  return computeIntentions(s, s.election!).total.shares[s.playerId] ?? 0;
}

/** Avança até a próxima reunião semanal, resolvendo eventos/entrevistas/debates no caminho. */
function untilNextWeek(state: GameState): GameState {
  let s = state;
  const start = s.campaign!.week!.startDate;
  for (let guard = 0; guard < 40; guard++) {
    if (s.campaign?.week?.pending && s.campaign.week.startDate !== start) return s;
    const ev = s.events.pending[0];
    if (ev) {
      s = must(s, {
        type: 'event/resolve',
        instanceId: ev.instanceId,
        optionId: ev.options.find((o) => o.available)!.id,
      });
      continue;
    }
    const it = s.interactions.interview;
    if (it) {
      const q = it.questions[it.index];
      s = must(
        s,
        it.finished || !q
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
    s = must(s, { type: 'time/advance', step: 'day' });
  }
  throw new Error('nenhuma semana nova');
}

describe('Campanha dinâmica (turno semanal)', () => {
  it('desligada por padrão: nada muda para saves e simulações existentes', () => {
    const s = startGame(defaultConfig(21, 'governador', 'MG'));
    expect(s.campaign!.week).toBeUndefined();
    expect(s.election!.trend ?? null).toBeNull();
  });

  it('a campanha começa com a reunião: pauta, 3 cartas e o tempo parado', () => {
    const s = dynamic();
    const week = s.campaign!.week!;
    expect(week.pending).toBe(true);
    expect(week.cards).toHaveLength(3);
    expect(s.election!.trend).toBe(week.trend);
    expect(dispatch(s, { type: 'time/advance', step: 'day' }).result.ok).toBe(false);
  });

  it('escolher uma carta aplica o efeito e libera o tempo', () => {
    const s = dynamic();
    const card = s.campaign!.week!.cards[0]!;
    const out = dispatch(s, { type: 'week/choose', cardId: card.id });
    expect(out.result.ok).toBe(true);
    expect(out.state.campaign!.week!.pending).toBe(false);
    expect(out.state.campaign!.week!.outcome?.cardId).toBe(card.id);
    expect(dispatch(out.state, { type: 'time/advance', step: 'day' }).result.ok).toBe(true);
  });

  it('toda semana: nova pauta, rivais com estilo e tática, e o balanço da semana anterior', () => {
    let s = must(dynamic(), { type: 'week/choose', cardId: null });
    const firstTrend = s.campaign!.week!.trend;
    s = untilNextWeek(s);
    const week = s.campaign!.week!;
    expect(week.index).toBe(2);
    expect(week.trend).not.toBe(firstTrend);
    expect(week.lastWeekDelta).not.toBeNull();
    expect(week.rivalMoves.length).toBeGreaterThan(0);
    for (const id of s.election!.candidateIds.filter((x) => x !== s.playerId)) {
      expect(s.election!.participants[id]!.style).toBeDefined();
      expect(s.election!.participants[id]!.tactic).toBeDefined();
    }
  });

  it('a pauta da semana favorece quem dá ênfase ao tema', () => {
    const s = dynamic();
    const trend = s.election!.trend!;
    const before = share(s);
    const boosted = structuredClone(s);
    boosted.election!.participants[s.playerId]!.issueFocus[trend] = 100;
    expect(share(boosted)).toBeGreaterThan(before);
  });
});
