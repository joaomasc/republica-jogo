import { describe, expect, it } from 'vitest';
import { promiseOverview, type GameState, type OfficeId, type PlayerPromise, type PromiseTarget } from '../src/index';
import { assumeOffice } from '../src/government/government';
import { enactBill, fileBill } from '../src/legislature/process';
import { onLawEnacted } from '../src/nation/nation';
import { must, newGame } from './helpers';

function inOffice(officeId: OfficeId, stateId: 'SP' | 'BA' = 'SP'): GameState {
  const s = structuredClone(newGame(officeId, stateId, 31));
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

function promise(s: GameState, target: PromiseTarget): PlayerPromise {
  const p: PlayerPromise = { id: `p${s.promises.length}`, proposalId: 'x', issue: 'education', title: 'Promessa de teste', madeOn: s.date, target, status: 'pending', baseline: null, evaluatedOn: null };
  s.promises.push(p);
  return p;
}

describe('Promessas cumpridas na hora', () => {
  it('lei prometida aprovada por outro autor cumpre a promessa no mesmo instante', () => {
    const s = inOffice('presidente');
    const p = promise(s, { kind: 'law', categoryId: 'education', optionIds: ['edu_tech'] });
    const cred = s.candidates[s.playerId]!.attributes.credibility;
    const other = Object.keys(s.parties).find((x) => x !== s.candidates[s.playerId]!.partyId)!;
    const bill = fileBill(s, { categoryId: 'education', optionId: 'edu_tech', instrument: 'pl', authorId: 'npc', authorLabel: 'Dep. Fulano', authorPartyId: other, authorRole: 'legislator' });
    enactBill(s, bill);
    expect(p.status).toBe('fulfilled');
    expect(p.note).toMatch(/Lei aprovada/);
    expect(s.candidates[s.playerId]!.attributes.credibility).toBeGreaterThan(cred);
  });

  it('projeto do Executivo (autoria "governo") conta para "apresentar projeto"', () => {
    const s = inOffice('governador');
    const p = promise(s, { kind: 'billProposed', categoryId: 'education' });
    const out = must(s, { type: 'leg/propose', categoryId: 'education', optionId: 'edu_tech', instrument: 'pl' });
    const pp = out.promises.find((x) => x.id === p.id)!;
    expect(pp.billNumber).toBeDefined();
    expect(promiseOverview(out).find((x) => x.id === p.id)!.projected).toBe('partial');
    const bill = out.laws.bills[0]!;
    enactBill(out, bill);
    expect(pp.status).toBe('fulfilled');
  });

  it('prefeito: promessa de lei federal conta quando a lei federal muda (outra esfera)', () => {
    const s = inOffice('prefeito', 'BA');
    const p = promise(s, { kind: 'law', categoryId: 'labor', optionIds: ['labor_protective'] });
    expect(promiseOverview(s).find((x) => x.id === p.id)!.otherSphere).toBe(true);
    if (s.nation.federalLaws) s.nation.federalLaws.enacted.labor = 'labor_protective';
    onLawEnacted(s, 'labor', 'labor_protective');
    expect(p.status).toBe('fulfilled');
    expect(p.note).toMatch(/outra esfera/);
  });

  it('lei cumprida e depois revogada vira recuo e custa credibilidade', () => {
    const s = inOffice('presidente');
    const p = promise(s, { kind: 'law', categoryId: 'education', optionIds: ['edu_tech'] });
    s.laws.enacted.education = 'edu_tech';
    onLawEnacted(s, 'education', 'edu_tech');
    expect(p.status).toBe('fulfilled');
    const cred = s.candidates[s.playerId]!.attributes.credibility;
    s.laws.enacted.education = 'edu_public';
    onLawEnacted(s, 'education', 'edu_public');
    expect(p.status).toBe('fulfilled');
    expect(p.reverted).toBe(true);
    expect(s.candidates[s.playerId]!.attributes.credibility).toBeLessThan(cred);
  });
});
