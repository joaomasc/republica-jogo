import { describe, expect, it } from 'vitest';
import { buildCandidateContexts } from '../src/election/voterModel';
import { billPartyLogit } from '../src/legislature/voting';
import {
  candidatePlatform,
  ideologyFromPlatform,
  neutralIdeology,
  PLATFORM_MAX,
  platformPopAppeal,
  startGame,
  suggestPlatform,
  validatePlatform,
  type GameState,
  type NewGameConfig,
} from '../src/index';
import { assumeOffice } from '../src/government/government';
import { defaultConfig, must } from './helpers';

const PRO_WORKER = { labor: 'labor_protective', minimum_wage: 'mw_high' };

function withPlatform(platform: Record<string, string>, seed = 9): NewGameConfig {
  const cfg = defaultConfig(seed, 'presidente', 'SP', 'udc');
  return { ...cfg, candidate: { ...cfg.candidate, platform } };
}

function governing(platform: Record<string, string>): GameState {
  const s = structuredClone(startGame(withPlatform(platform)));
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

describe('Bandeiras (plataforma de leis)', () => {
  it('valida limite e opções', () => {
    expect(validatePlatform({ labor: 'labor_protective' })).toBeNull();
    expect(validatePlatform({ labor: 'nao_existe' })).not.toBeNull();
    const many = Object.fromEntries(Object.entries(suggestPlatform({ ...neutralIdeology(), economy: 5, social: 10, fiscal: 5 }, 20)).slice(0, PLATFORM_MAX + 1));
    if (Object.keys(many).length > PLATFORM_MAX) expect(validatePlatform(many)).not.toBeNull();
  });

  it('o candidato guarda as bandeiras e elas viram apelo por tipo de eleitor', () => {
    const real = Object.fromEntries(Object.entries(PRO_WORKER).filter(([c, o]) => validatePlatform({ [c]: o }) === null));
    expect(Object.keys(real).length).toBeGreaterThan(0);
    const s = startGame(withPlatform(real));
    expect(candidatePlatform(s, s.playerId)).toEqual(real);
    const appeal = platformPopAppeal(real);
    expect(Object.values(appeal).some((v) => (v ?? 0) > 0)).toBe(true);
    const ctx = buildCandidateContexts(s, s.election!, [s.playerId]);
    expect(ctx[0]!.platformAppeal).toEqual(appeal);
  });

  it('ajustar eixos às bandeiras muda a ideologia nos eixos cobertos', () => {
    const base = neutralIdeology();
    const out = ideologyFromPlatform({ economic_system: 'econ_planned' }, base);
    expect(out.economy).toBeLessThan(base.economy);
  });

  it('propor uma bandeira dá credibilidade; contrariar custa', () => {
    const s = governing({ education: 'edu_tech' });
    const cred = s.candidates[s.playerId]!.attributes.credibility;
    const a = must(s, { type: 'leg/propose', categoryId: 'education', optionId: 'edu_tech', instrument: 'pl' });
    expect(a.candidates[a.playerId]!.attributes.credibility).toBeGreaterThan(cred);
    // Contrariar a própria bandeira (defende ensino técnico, propõe vouchers).
    const out = must(governing({ education: 'edu_tech' }), { type: 'leg/propose', categoryId: 'education', optionId: 'edu_vouchers', instrument: 'pl' });
    expect(out.candidates[out.playerId]!.attributes.credibility).toBeLessThan(cred);
  });

  it('trocar bandeiras no meio da carreira custa credibilidade', () => {
    const s = startGame(withPlatform({ education: 'edu_tech' }));
    const cred = s.candidates[s.playerId]!.attributes.credibility;
    const add = must(s, { type: 'career/platform', platform: { education: 'edu_tech', labor: 'labor_flexible' } });
    expect(add.candidates[add.playerId]!.attributes.credibility).toBe(cred);
    const flip = must(add, { type: 'career/platform', platform: { labor: 'labor_flexible' } });
    expect(flip.candidates[flip.playerId]!.attributes.credibility).toBeLessThan(cred);
  });

  it('partido vota a favor da própria bandeira no Congresso', () => {
    const s = governing({});
    s.laws.bills = [];
    const r = must(s, { type: 'leg/propose', categoryId: 'labor', optionId: 'labor_flexible', instrument: 'pl' });
    const bill = r.laws.bills[0]!;
    const party = Object.values(r.parties)[0]!;
    const before = billPartyLogit(r, bill, party);
    const flagged = { ...party, lawPositions: { labor: 'labor_flexible' } };
    expect(billPartyLogit(r, bill, flagged)).toBeGreaterThan(before);
  });
});
