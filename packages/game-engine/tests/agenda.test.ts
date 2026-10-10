import { describe, expect, it } from 'vitest';
import { AGENDA_PRESETS, dispatch, type AgendaConfig, type AgendaItem } from '../src/index';
import type { GameState } from '../src/simulation/state';
import { must, newGame } from './helpers';

function withAgenda(state: GameState, items: AgendaItem[], extra: Partial<AgendaConfig> = {}) {
  return must(state, {
    type: 'agenda/update',
    agenda: { enabled: true, items, minMoney: 0, autoRest: true, ...extra },
  });
}

function item(partial: Partial<AgendaItem> & Pick<AgendaItem, 'kind'>): AgendaItem {
  return {
    id: Math.random().toString(36).slice(2),
    every: 1,
    unit: 'auto',
    popTypeId: 'auto',
    enabled: true,
    ...partial,
  };
}

/** Avança dia a dia resolvendo eventos (que pausam o tempo). */
function advance(state: GameState, days: number): { state: GameState; details: string[] } {
  let s = state;
  const details: string[] = [];
  const target = new Date(Date.parse(s.date) + days * 864e5).toISOString().slice(0, 10);
  for (let guard = 0; guard < 40 && s.date < target && s.phase === 'campaign'; guard++) {
    const ev = s.events.pending[0];
    if (ev) {
      const opt = ev.options.find((o) => o.available);
      s = must(s, { type: 'event/resolve', instanceId: ev.instanceId, optionId: opt!.id });
      continue;
    }
    const debate = s.election?.debates.find((d) => d.status === 'scheduled' && d.date === s.date);
    if (debate) {
      s = must(s, { type: 'debate/decline', debateId: debate.id });
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
    const out = dispatch(s, { type: 'time/advance', step: 'day' });
    expect(out.result.ok).toBe(true);
    details.push(...(out.result.details ?? []));
    s = out.state;
  }
  return { state: s, details };
}

describe('Agenda automática', () => {
  const base = newGame('governador', 'MG', 11);

  it('rejeita ações que não podem ser automatizadas', () => {
    const out = dispatch(base, {
      type: 'agenda/update',
      agenda: {
        enabled: true,
        items: [item({ kind: 'action', actionId: 'proposal' })],
        minMoney: 0,
        autoRest: true,
      },
    });
    expect(out.result.ok).toBe(false);
  });

  it('executa a rotina a cada dia avançado, marca o diário e mede o impacto', () => {
    const s0 = withAgenda(base, AGENDA_PRESETS.find((p) => p.id === 'balanced')!.items);
    const { state, details } = advance(s0, 7);
    const auto = state.campaign!.log.filter((l) => l.auto);
    expect(auto.some((l) => l.actionId === 'social_media')).toBe(true);
    expect(auto.some((l) => l.actionId === 'rally' || l.actionId === 'tv_program')).toBe(true);
    expect(state.campaign!.totalSpent).toBeGreaterThan(base.campaign!.totalSpent);
    expect(details.some((d) => d.startsWith('Agenda:'))).toBe(true);
    expect(state.campaign!.impact!.some((e) => e.source === 'action')).toBe(true);
  });

  it('no máximo uma atividade do dia; ações de vários dias ocupam os dias seguintes', () => {
    const s0 = withAgenda(base, [item({ kind: 'action', actionId: 'regional_blitz' })]);
    const { state } = advance(s0, 7);
    const blitz = state.campaign!.log.filter((l) => l.auto && l.actionId === 'regional_blitz');
    expect(blitz.length).toBeGreaterThan(0);
    expect(blitz.length).toBeLessThanOrEqual(3);
    const days = new Set(state.campaign!.log.filter((l) => l.auto).map((l) => l.date));
    expect(days.size).toBe(
      state.campaign!.log.filter((l) => l.auto && l.actionId !== 'social_media').length,
    );
  });

  it('respeita o caixa mínimo', () => {
    const s0 = withAgenda(base, [item({ kind: 'action', actionId: 'rally' })], {
      minMoney: base.campaign!.money * 10,
    });
    const { state, details } = advance(s0, 3);
    expect(state.campaign!.log.some((l) => l.auto && l.actionId === 'rally')).toBe(false);
    expect(details.some((d) => d.includes('caixa'))).toBe(true);
  });

  it('faz entrevistas sozinho, sem deixar a janela aberta', () => {
    const s0 = withAgenda(base, [item({ kind: 'interview', interviewType: 'tv' })], {
      autoRest: false,
    });
    const { state } = advance(s0, 2);
    expect(state.interactions.interview).toBeNull();
    expect(state.campaign!.impact!.some((e) => e.label.startsWith('Entrevista automática'))).toBe(
      true,
    );
    expect(state.media.news.some((n) => n.category === 'interview')).toBe(true);
  });

  it('pausada, não faz nada', () => {
    const s0 = withAgenda(base, [item({ kind: 'action', actionId: 'social_media' })], {
      enabled: false,
    });
    const { state } = advance(s0, 3);
    expect(state.campaign!.log.some((l) => l.auto)).toBe(false);
  });
});
