import { describe, expect, it } from 'vitest';
import {
  computeIntentions,
  dhondt,
  dispatch,
  OTHERS_KEY,
  simulateElection,
  sum,
} from '../src/index';
import { clearBlockers, must, newGame, playCampaign } from './helpers';

describe('Modelo de intenção de voto', () => {
  const state = newGame('presidente', 'SP', 11);

  it('frações de cada recorte somam 1 (candidatos + indecisos + brancos)', () => {
    const snap = computeIntentions(state, state.election!);
    const total =
      sum(Object.values(snap.total.shares)) + snap.total.undecided + snap.total.blankNull;
    expect(total).toBeCloseTo(1, 5);
    for (const agg of Object.values(snap.byUnit))
      expect(sum(Object.values(agg.shares)) + agg.undecided + agg.blankNull).toBeCloseTo(1, 5);
  });

  it('candidato desconhecido começa atrás dos favoritos', () => {
    const snap = computeIntentions(state, state.election!);
    const ranked = Object.entries(snap.valid).sort((a, b) => b[1] - a[1]);
    expect(ranked[0]?.[0]).not.toBe(state.playerId);
    expect(snap.valid[state.playerId]).toBeLessThan(0.2);
  });

  it('mais conhecimento aumenta a intenção de voto', () => {
    const boosted = structuredClone(state);
    const status = boosted.election!.participants[boosted.playerId]!;
    for (const id of Object.keys(status.knowledge)) status.knowledge[id] = 90;
    const a = computeIntentions(state, state.election!).valid[state.playerId]!;
    const b = computeIntentions(boosted, boosted.election!).valid[boosted.playerId]!;
    expect(b).toBeGreaterThan(a);
  });
});

describe('simulateElection', () => {
  const state = newGame('governador', 'RJ', 21);

  it('é reprodutível pela seed e não altera o estado', () => {
    const before = JSON.stringify(state);
    const a = simulateElection(state, { seed: 99 });
    const b = simulateElection(state, { seed: 99 });
    expect(a).toEqual(b);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('seeds diferentes produzem resultados diferentes (aleatoriedade controlada)', () => {
    const a = simulateElection(state, { seed: 1 });
    const b = simulateElection(state, { seed: 2 });
    expect(a.votes).not.toEqual(b.votes);
  });

  it('produz votos, percentuais, comparecimento e distribuição regional', () => {
    const r = simulateElection(state, { seed: 5 });
    expect(sum(Object.values(r.pct))).toBeCloseTo(1, 3);
    expect(r.turnoutRate).toBeGreaterThan(0.5);
    expect(r.turnoutRate).toBeLessThan(0.95);
    expect(Object.keys(r.byUnit)).toHaveLength(state.election!.units.length);
    expect(r.validVotes + r.blankNull).toBeLessThanOrEqual(r.turnout + 2);
    expect(r.winnerId !== null || r.runoff !== null).toBe(true);
  });

  it('sem maioria absoluta há 2º turno entre os dois primeiros', () => {
    for (let seed = 1; seed < 20; seed++) {
      const r = simulateElection(state, { seed });
      const top = r.ranking[0]!;
      if ((r.pct[top] ?? 0) <= 0.5) {
        expect(r.runoff).toEqual([r.ranking[0], r.ranking[1]]);
        return;
      }
      expect(r.winnerId).toBe(top);
    }
  });
});

describe('Eleição proporcional', () => {
  it("D'Hondt distribui todas as cadeiras e favorece maiores médias", () => {
    const seats = dhondt({ a: 100_000, b: 80_000, c: 30_000 }, 8);
    expect(sum(Object.values(seats))).toBe(8);
    expect(seats.a).toBeGreaterThan(seats.c!);
    expect(seats).toEqual({ a: 4, b: 3, c: 1 });
  });

  it('calcula cadeiras do partido, linha de corte e se o jogador foi eleito', () => {
    const state = newGame('deputado_federal', 'SP', 3);
    const r = simulateElection(state, { seed: 3 });
    const p = r.proportional!;
    expect(p).toBeDefined();
    expect(sum(Object.values(p.partySeats))).toBe(70);
    expect(p.cutLine).toBeGreaterThan(0);
    expect(p.playerElected).toBe(
      p.playerRankInParty > 0 && p.playerRankInParty <= p.playerPartySeats,
    );
    expect(computeIntentions(state, state.election!).total.shares[OTHERS_KEY]).toBeGreaterThan(0.5);
  });
});

describe('Fluxo da eleição', () => {
  it('realiza a eleição, mostra resultado e segue para governo, 2º turno ou carreira', () => {
    let s = playCampaign(newGame('prefeito', 'PE', 8), 'active');
    s = clearBlockers(s);
    expect(s.phase).toBe('election_day');
    s = must(s, { type: 'election/hold' });
    expect(s.phase).toBe('results');
    expect(s.election!.results.length).toBeGreaterThan(0);
    s = must(s, { type: 'election/continue' });
    expect(['campaign', 'governing', 'career']).toContain(s.phase);
  });

  it('não permite realizar a eleição antes do dia', () => {
    const s = newGame('prefeito', 'PE', 8);
    expect(dispatch(s, { type: 'election/hold' }).result.ok).toBe(false);
  });
});
