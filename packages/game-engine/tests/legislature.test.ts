import { describe, expect, it } from 'vitest';
import {
  availableInstruments,
  billDetail,
  billsOverview,
  caucusesView,
  chamberView,
  dispatch,
  impeachmentView,
  lawProposalPreview,
  legislatureBlockingReason,
  pendingDecisions,
  type GameState,
  type OfficeId,
} from '../src/index';
import { assumeOffice } from '../src/government/government';
import { openImpeachment } from '../src/legislature/impeachment';
import { must, newGame } from './helpers';

/** Estado já no mandato (pula a campanha). */
function inOffice(officeId: OfficeId = 'presidente', seed = 77): GameState {
  const s = structuredClone(newGame(officeId, 'SP', seed));
  const election = s.election!;
  election.results.push({
    round: 1,
    date: election.date,
    seed: 1,
    totalVoters: election.totalVoters,
    turnout: 1,
    turnoutRate: 0.8,
    blankNull: 0,
    validVotes: 1,
    votes: { [s.playerId]: 1 },
    pct: { [s.playerId]: 0.55 },
    ranking: [s.playerId],
    byUnit: {},
    byPopType: {},
    winnerId: s.playerId,
    runoff: null,
    playerElected: true,
  });
  election.outcome = { won: true, pct: 0.55, round: 1 };
  assumeOffice(s);
  if (s.government) s.government.politicalCapital = 100;
  return s;
}

/** Resolve tudo que bloqueia o tempo: eventos, votos do jogador (sim), sanções. */
function resolveBlockers(state: GameState, vote: 'yes' | 'no' = 'yes'): GameState {
  let s = state;
  for (const ev of s.events.pending)
    s = must(s, { type: 'event/resolve', instanceId: ev.instanceId, optionId: ev.options.find((o) => o.available)?.id ?? '' });
  for (const d of pendingDecisions(s)) {
    if (!d.blocking) continue;
    if (d.kind === 'impeachment_vote') s = must(s, { type: 'leg/impeachment', op: 'vote', vote });
    else if (d.billId) s = must(s, { type: 'leg/vote', billId: d.billId, vote });
  }
  return s;
}

function advanceDays(state: GameState, days: number, until?: (s: GameState) => boolean): GameState {
  let s = state;
  for (let i = 0; i < days && s.government; i++) {
    s = resolveBlockers(s);
    const out = dispatch(s, { type: 'time/advance', step: 'day' });
    s = out.state;
    if (until?.(s)) break;
  }
  return s;
}

const bill = (s: GameState, id: string) => s.laws.bills.find((b) => b.id === id)!;

describe('Processo legislativo', () => {
  it('instrumentos respeitam a hierarquia: tema constitucional só por PEC, MP só para o Presidente', () => {
    const pres = inOffice('presidente');
    const econ = availableInstruments(pres, 'economic_system', 'econ_mixed');
    expect(econ.find((i) => i.instrument === 'pec')!.allowed).toBe(true);
    expect(econ.find((i) => i.instrument === 'pl')!.allowed).toBe(false);
    expect(availableInstruments(pres, 'trade', 'trade_open').find((i) => i.instrument === 'mp')!.allowed).toBe(true);
    expect(availableInstruments(pres, 'labor', 'labor_flexible').find((i) => i.instrument === 'mp')!.allowed).toBe(false);
    const dep = inOffice('deputado_federal');
    expect(availableInstruments(dep, 'trade', 'trade_open').find((i) => i.instrument === 'mp')!.allowed).toBe(false);
  });

  it('PL do Executivo tramita por comissão e plenário nas duas casas até um desfecho', () => {
    let s = inOffice('presidente');
    s = must(s, { type: 'leg/propose', categoryId: 'education', optionId: 'edu_tech', instrument: 'pl' });
    const id = s.laws.bills[0]!.id;
    expect(bill(s, id).status).toBe('committee');
    expect(bill(s, id).path.map((p) => p.rounds)).toEqual([1, 1]);
    s = must(s, { type: 'leg/urgency', billId: id });
    s = advanceDays(s, 400, (x) => {
      const b = bill(x, id);
      if (b.status === 'sanction') return true;
      return !['committee', 'floor'].includes(b.status);
    });
    const b = bill(s, id);
    expect(['sanction', 'passed', 'rejected', 'veto', 'plebiscite']).toContain(b.status);
    expect(b.timeline.length).toBeGreaterThan(2);
    if (b.status === 'sanction') {
      expect(pendingDecisions(s).some((d) => d.kind === 'sanction' && d.billId === id)).toBe(true);
      s = must(s, { type: 'leg/sanction', billId: id, decision: 'sanction' });
      expect(['passed', 'plebiscite']).toContain(bill(s, id).status);
    }
    const detail = billDetail(s, id)!;
    expect(detail.path.length).toBe(2);
    expect(detail.summary.number).toMatch(/^PL /);
  });

  it('PEC exige dois turnos em cada casa e quórum de 3/5', () => {
    let s = inOffice('presidente');
    s = must(s, { type: 'leg/propose', categoryId: 'institutions', optionId: 'inst_transparency', instrument: 'pec' });
    const b = s.laws.bills[0]!;
    expect(b.instrument).toBe('pec');
    expect(b.path.every((p) => p.rounds === 2)).toBe(true);
    const proj = billDetail(s, b.id)!.projection;
    const camara = proj.chambers[0]!;
    expect(camara.required).toBe(Math.ceil(camara.total * 0.6));
    s = must(s, { type: 'gov/rush', billId: b.id });
    const floorVotes = bill(s, b.id).votes.filter((v) => v.kind !== 'veto');
    // Aprovada: 4 votações (2 turnos × 2 casas); rejeitada: para na primeira derrota.
    if (bill(s, b.id).status !== 'rejected') expect(floorVotes.length).toBe(4);
    for (const v of floorVotes) {
      const total = s.congress.chambers.find((c) => c.id === v.chamberId)!.totalSeats;
      expect(v.required).toBe(Math.ceil(total * 0.6));
      if (v.passed) expect(v.yes).toBeGreaterThanOrEqual(v.required);
    }
  });

  it('MP entra em vigor na hora e é revertida se caducar', () => {
    let s = inOffice('presidente');
    const before = s.laws.enacted.trade;
    expect(before).not.toBe('trade_open');
    s = must(s, { type: 'leg/propose', categoryId: 'trade', optionId: 'trade_open', instrument: 'mp' });
    const b = s.laws.bills[0]!;
    expect(s.laws.enacted.trade).toBe('trade_open');
    expect(b.mpExpires).toBeDefined();
    // Força o prazo: o Congresso não votou a tempo.
    const draft = structuredClone(s);
    const mp = bill(draft, b.id);
    mp.mpExpires = draft.date;
    mp.status = 'committee';
    mp.nextDate = '2999-01-01';
    s = advanceDays(draft, 1);
    expect(bill(s, b.id).status).toBe('expired');
    expect(s.laws.enacted.trade).toBe(before);
    // Não pode ser reeditada no mesmo ano.
    expect(availableInstruments(s, 'trade', 'trade_open').find((i) => i.instrument === 'mp')!.allowed).toBe(false);
  });

  it('veto do Presidente vai à sessão do Congresso, que mantém ou derruba', () => {
    let s = inOffice('presidente');
    s = must(s, { type: 'leg/propose', categoryId: 'labor', optionId: 'labor_flexible', instrument: 'pl' });
    const draft = structuredClone(s);
    const b = bill(draft, draft.laws.bills[0]!.id);
    b.status = 'sanction';
    b.stepIndex = b.path.length;
    b.nextDate = draft.date;
    s = draft;
    expect(pendingDecisions(s).some((d) => d.kind === 'sanction')).toBe(true);
    s = must(s, { type: 'leg/sanction', billId: b.id, decision: 'veto' });
    expect(bill(s, b.id).status).toBe('veto');
    s = advanceDays(s, 60, (x) => bill(x, b.id).status !== 'veto');
    expect(['rejected', 'passed', 'plebiscite']).toContain(bill(s, b.id).status);
    expect(bill(s, b.id).votes.some((v) => v.kind === 'veto')).toBe(true);
  });

  it('deputado: votação na sua casa bloqueia o tempo até registrar o voto', () => {
    let s = inOffice('deputado_federal');
    expect(s.government?.branch).toBe('legislative');
    s = must(s, { type: 'leg/propose', categoryId: 'education', optionId: 'edu_tech', instrument: 'pl' });
    const id = s.laws.bills[0]!.id;
    const draft = structuredClone(s);
    const b = bill(draft, id);
    b.status = 'floor';
    b.scheduled = true;
    b.shelved = false;
    b.nextDate = draft.date;
    b.voteDate = draft.date;
    s = draft;
    expect(legislatureBlockingReason(s)).not.toBeNull();
    expect(dispatch(s, { type: 'time/advance', step: 'day' }).result.ok).toBe(false);
    s = must(s, { type: 'leg/vote', billId: id, vote: 'yes' });
    expect(legislatureBlockingReason(s)).toBeNull();
    expect(bill(s, id).votes.length).toBeGreaterThan(0);
  });

  it('impeachment do Presidente: abre, vota e termina com desfecho', () => {
    let s = structuredClone(inOffice('presidente'));
    openImpeachment(s, true, 'Crime de responsabilidade fiscal');
    expect(impeachmentView(s)?.active).toBe(true);
    expect(pendingDecisions(s).some((d) => d.kind === 'impeachment_defense')).toBe(true);
    s = must(s, { type: 'leg/impeachment', op: 'defend' });
    s = advanceDays(s, 365, (x) => !x.government || x.legislature.impeachment?.stage === 'concluded');
    const outcome = s.legislature.impeachment?.outcome;
    expect(['removed', 'acquitted', 'archived']).toContain(outcome);
    if (outcome === 'removed') expect(s.government).toBeNull();
  });

  it('seletores do Congresso: casas, bancadas, prévia e visão geral', () => {
    let s = inOffice('presidente');
    const camara = chamberView(s, s.congress.chambers[0]!.id)!;
    expect(camara.rows.reduce((a, r) => a + r.seats, 0)).toBe(camara.total);
    expect(camara.speaker).not.toBeNull();
    const caucuses = caucusesView(s);
    expect(caucuses.length).toBeGreaterThan(3);
    expect(caucuses.every((c) => c.members >= 0)).toBe(true);
    const prev = lawProposalPreview(s, 'trade', 'trade_isi')!;
    expect(prev.projection.chambers.length).toBe(2);
    expect(prev.instruments.some((i) => i.allowed)).toBe(true);
    s = must(s, { type: 'leg/propose', categoryId: 'trade', optionId: 'trade_isi', instrument: prev.defaultInstrument });
    const ov = billsOverview(s);
    expect(ov.active.length).toBeGreaterThan(0);
    expect(ov.active[0]!.stage.length).toBeGreaterThan(0);
  });

  it('um ano de Congresso NPC é estável (sem travar o tempo nem quebrar o estado)', () => {
    let s = inOffice('presidente', 11);
    for (let m = 0; m < 12 && s.government; m++) {
      s = resolveBlockers(s);
      for (const d of pendingDecisions(s))
        if (d.kind === 'sanction' && d.billId) s = must(s, { type: 'leg/sanction', billId: d.billId, decision: 'sanction' });
      s = dispatch(s, { type: 'time/advance', step: 'month' }).state;
    }
    expect(s.laws.bills.length).toBeGreaterThan(0);
    expect(Number.isFinite(s.government?.politicalCapital ?? 0)).toBe(true);
  });
});
