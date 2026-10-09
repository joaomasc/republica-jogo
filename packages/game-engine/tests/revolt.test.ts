import { describe, expect, it } from 'vitest';
import { addMonths } from '../src/core/date';
import { streetView, type GameState, type OfficeId } from '../src/index';
import { assumeOffice } from '../src/government/government';
import { processStreetMonth, type StreetState } from '../src/nation/revolt';
import { must, newGame } from './helpers';

function inOffice(officeId: OfficeId): GameState {
  const s = structuredClone(newGame(officeId, 'BA', 61));
  const e = s.election!;
  e.results.push({
    round: 1, date: e.date, seed: 1, totalVoters: e.totalVoters, turnout: 1, turnoutRate: 0.8, blankNull: 0, validVotes: 1,
    votes: { [s.playerId]: 1 }, pct: { [s.playerId]: 0.55 }, ranking: [s.playerId], byUnit: {}, byPopType: {}, winnerId: s.playerId, runoff: null, playerElected: true,
  });
  e.outcome = { won: true, pct: 0.55, round: 1 };
  assumeOffice(s);
  s.government!.politicalCapital = 100;
  return s;
}

/** Situação ruim: aprovação baixíssima, escândalo e desemprego alto. */
function crisis(s: GameState): void {
  s.government!.approval = 8;
  s.candidates[s.playerId]!.scandal = 90;
  s.economy.unemployment = 16;
  s.regions.BA!.unemployment = 16;
}

function months(s: GameState, n: number, keepCrisis = true): number[] {
  const stages: number[] = [];
  for (let i = 0; i < n; i++) {
    if (keepCrisis) crisis(s);
    s.date = addMonths(s.date, 1);
    processStreetMonth(s);
    stages.push(streetView(s).stage);
  }
  return stages;
}

describe('Revolta popular (clima nas ruas)', () => {
  it('em crise, as ruas escalam no máximo um degrau por mês e explicam as causas', () => {
    const s = inOffice('governador');
    const stages = months(s, 10);
    for (let i = 1; i < stages.length; i++) expect(stages[i]! - stages[i - 1]!).toBeLessThanOrEqual(1);
    expect(stages[stages.length - 1]).toBeGreaterThanOrEqual(3);
    const v = streetView(s);
    expect(v.factors.some((f) => f.label.startsWith('Aprovação'))).toBe(true);
    expect(v.demands.length).toBeGreaterThan(0);
  });

  it('governo bem avaliado mantém as ruas calmas', () => {
    const s = inOffice('governador');
    s.government!.approval = 70;
    const stages = months(s, 8, false);
    expect(Math.max(...stages)).toBeLessThanOrEqual(1);
  });

  it('negociar esfria; reprimir esfria na hora mas radicaliza', () => {
    const s = inOffice('governador');
    months(s, 6);
    const heat = streetView(s).heat;
    const a = must(structuredClone(s), { type: 'street/respond', response: 'negotiate' });
    expect(streetView(a).heat).toBeLessThan(heat);
    const b = must(structuredClone(s), { type: 'street/respond', response: 'repress' });
    expect((b.nation.street as StreetState).radicalization).toBeGreaterThan(0);
  });

  it('no topo da escada: presidente enfrenta impeachment; governador, cassação', () => {
    const p = inOffice('presidente');
    months(p, 14);
    expect(p.legislature.impeachment?.targetIsPlayer).toBe(true);
    const g = inOffice('governador');
    months(g, 14);
    expect(streetView(g).removal !== null || g.government === null).toBe(true);
  });
});
