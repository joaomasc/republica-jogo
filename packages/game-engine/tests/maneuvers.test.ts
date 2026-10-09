import { describe, expect, it } from 'vitest';
import { maneuverOptions, type GameState, type OfficeId } from '../src/index';
import { assumeOffice } from '../src/government/government';
import { fileBill } from '../src/legislature/process';
import { npcManeuvers } from '../src/legislature/maneuvers';
import { must, newGame } from './helpers';

function inOffice(officeId: OfficeId, seed = 77): GameState {
  const s = structuredClone(newGame(officeId, 'SP', seed));
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

/** Projeto de um partido NPC na casa do jogador, já no plenário e com votação marcada hoje. */
function npcBillOnFloor(s: GameState, categoryId = 'economic_system', optionId = 'econ_planned') {
  const party = Object.keys(s.parties).find((p) => p !== s.candidates[s.playerId]!.partyId)!;
  const bill = fileBill(s, { categoryId, optionId, instrument: 'pec', authorId: 'npc', authorLabel: 'Dep. Fulano', authorPartyId: party, authorRole: 'legislator' });
  bill.status = 'floor';
  bill.scheduled = true;
  bill.shelved = false;
  bill.nextDate = s.date;
  bill.voteDate = s.date;
  return bill;
}

describe('Manobras regimentais', () => {
  it('deputado vê as manobras do plenário e não pode manobrar contra o próprio projeto', () => {
    const s = inOffice('deputado_federal');
    const bill = npcBillOnFloor(s);
    const opts = maneuverOptions(s, bill.id);
    expect(opts.find((m) => m.id === 'obstruct')!.available).toBe(true);
    expect(opts.find((m) => m.id === 'review')!.available).toBe(false);
    const mine = must(s, { type: 'leg/propose', categoryId: 'education', optionId: 'edu_tech', instrument: 'pl' }).laws.bills[0]!;
    const s2 = structuredClone(s);
    s2.laws.bills.unshift(mine);
    expect(maneuverOptions(s2, mine.id).every((m) => !m.available)).toBe(true);
  });

  it('obstrução bem-sucedida adia a votação e libera o tempo; falha só custa capital', () => {
    const s = inOffice('deputado_federal');
    const bill = npcBillOnFloor(s);
    const capital = s.government!.politicalCapital;
    const out = must(s, { type: 'leg/maneuver', billId: bill.id, maneuver: 'obstruct' });
    const b = out.laws.bills.find((x) => x.id === bill.id)!;
    expect(out.government!.politicalCapital).toBeLessThan(capital);
    expect(b.maneuvers?.length).toBe(1);
    if (b.maneuvers![0]!.success) expect(b.nextDate > s.date).toBe(true);
    else expect(b.nextDate).toBe(s.date);
  });

  it('emenda substitutiva troca o texto por uma versão mais branda quando aprovada', () => {
    const s = inOffice('deputado_federal');
    const bill = npcBillOnFloor(s);
    const opt = maneuverOptions(s, bill.id).find((m) => m.id === 'amend')!;
    expect(opt.available).toBe(true);
    // Força o sorteio favorável repetindo em sementes diferentes até achar um sucesso.
    let found = false;
    for (let seed = 1; seed < 40 && !found; seed++) {
      const t = structuredClone(s);
      t.meta.seed = seed;
      const out = must(t, { type: 'leg/maneuver', billId: bill.id, maneuver: 'amend' });
      const b = out.laws.bills.find((x) => x.id === bill.id)!;
      if (b.maneuvers![0]!.success) {
        expect(b.optionId).not.toBe('econ_planned');
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it('articular votos contra reduz o apoio do partido escolhido', () => {
    const s = inOffice('deputado_federal');
    const bill = npcBillOnFloor(s);
    const party = Object.keys(s.congress.chambers[0]!.seats)[0]!;
    const out = must(s, { type: 'leg/maneuver', billId: bill.id, maneuver: 'lobby_against', partyId: party });
    expect(out.laws.bills.find((x) => x.id === bill.id)!.partyBonus[party]).toBeLessThan(0);
  });

  it('a oposição obstrui os projetos do jogador quando o bloco contrário é grande', () => {
    const s = inOffice('presidente');
    const out = s;
    const b = fileBill(out, { categoryId: 'economic_system', optionId: 'econ_planned', instrument: 'pec', authorId: 'government', authorLabel: 'Governo', authorPartyId: out.candidates[out.playerId]!.partyId, authorRole: 'executive' });
    b.status = 'floor';
    b.scheduled = true;
    b.nextDate = out.date;
    let hits = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const t = structuredClone(out);
      t.meta.seed = seed;
      npcManeuvers(t);
      if (t.laws.bills[0]!.maneuvers?.some((m) => m.by === 'npc')) hits++;
    }
    expect(hits).toBeGreaterThan(0);
  });
});
