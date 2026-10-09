import { describe, expect, it } from 'vitest';
import { addMonths } from '../src/core/date';
import { Rng } from '../src/core/rng';
import { updateEconomy } from '../src/economy/economy';
import { canOrderConstruction, worksOverview, workOptions, type GameState, type OfficeId } from '../src/index';
import { assumeOffice } from '../src/government/government';
import { must, newGame } from './helpers';

function inOffice(officeId: OfficeId, stateId: 'SP' | 'BA' = 'BA'): GameState {
  const s = structuredClone(newGame(officeId, stateId, 51));
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

function months(s: GameState, n: number): GameState {
  const rng = new Rng(3);
  for (let i = 0; i < n; i++) {
    s.date = addMonths(s.date, 1);
    updateEconomy(s, rng);
  }
  return s;
}

describe('Obras públicas por esfera', () => {
  it('cada cargo vê só o catálogo da sua esfera', () => {
    const pref = inOffice('prefeito');
    const gov = inOffice('governador');
    const pres = inOffice('presidente');
    expect(workOptions(pref).map((o) => o.typeId)).toContain('ubs');
    expect(workOptions(pref).map((o) => o.typeId)).not.toContain('ferrovia');
    expect(workOptions(gov).map((o) => o.typeId)).toContain('hospital_regional');
    expect(workOptions(pres).map((o) => o.typeId)).toContain('ferrovia');
    expect(canOrderConstruction(pref, 'BA', 'steel_mill')).toMatch(/Prefeituras não abrem fábricas/);
  });

  it('obras do jogador aparecem separadas das obras de outros governos', () => {
    let s = inOffice('governador');
    s = must(s, { type: 'works/start', typeId: 'hospital_regional', size: 'medium' });
    s = months(s, 2);
    const o = worksOverview(s);
    expect(o.mine.length).toBe(1);
    expect(o.mine[0]!.stateId).toBe('BA');
    expect(o.mine.every((w) => w.player)).toBe(true);
    expect(o.local.every((w) => w.stateId === 'BA' && !w.player)).toBe(true);
    expect(o.scopeLabel).toBe('Bahia');
  });

  it('um programa de obras reduz o desemprego do estado de forma visível', () => {
    const base = months(inOffice('governador'), 1);
    let s = structuredClone(base);
    for (const t of ['polo_industrial', 'hospital_regional', 'rodovia_estadual', 'habitacao_est'])
      s = must(s, { type: 'works/start', typeId: t, size: 'large' });
    const a = months(structuredClone(base), 12);
    const b = months(s, 12);
    const drop = a.regions.BA!.unemployment - b.regions.BA!.unemployment;
    expect(drop).toBeGreaterThan(0.3);
  });

  it('obra inaugurada melhora o serviço e conta como conquista', () => {
    let s = inOffice('prefeito');
    s = must(s, { type: 'works/start', typeId: 'pavimentacao', size: 'small' });
    s = months(s, 8);
    const o = worksOverview(s);
    expect(o.done.some((w) => w.player)).toBe(true);
    expect(s.industry.worksService?.['municipal:BA']?.infrastructure ?? 0).toBeGreaterThan(0);
  });
});
