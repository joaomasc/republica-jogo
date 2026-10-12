import { describe, expect, it } from 'vitest';
import { computeIntentions } from '../src/election/voterModel';
import { dispatch, startGame, type GameState } from '../src/index';
import { defaultConfig, playCampaign } from './helpers';

/** Primeira semente em que o jogador vai ao 2º turno para prefeito de SP. */
function runoffGame(): GameState {
  for (let seed = 1; seed <= 40; seed++) {
    let s = startGame(defaultConfig(seed, 'prefeito', 'SP'));
    s = playCampaign(s, 'active');
    s = dispatch(s, { type: 'election/hold' }).state;
    const first = s.election?.results[0];
    if (first?.runoff?.includes(s.playerId)) {
      s = dispatch(s, { type: 'election/continue' }).state;
      if (s.election?.round === 2 && (s.election.runoffDeals?.length ?? 0) > 0) return s;
    }
  }
  throw new Error('nenhuma semente levou ao 2º turno');
}

describe('2º turno: negociação com os derrotados', () => {
  const base = runoffGame();

  it('abre negociações com os eliminados relevantes, com afinidade e preço', () => {
    const deals = base.election!.runoffDeals!;
    for (const d of deals) {
      expect(base.election!.candidateIds).not.toContain(d.candidateId);
      expect(d.share).toBeGreaterThanOrEqual(0.02);
      expect(['cargo', 'pauta']).toContain(d.asks);
      expect(d.affinityPlayer).toBeGreaterThanOrEqual(0);
      expect(d.affinityPlayer).toBeLessThanOrEqual(1);
    }
  });

  it('uma tentativa por candidato; o apoio fechado aumenta a intenção de voto', () => {
    const deal = base.election!.runoffDeals!.find((d) => d.status === 'open');
    if (!deal) return;
    const before = computeIntentions(base, base.election!, { includeSegments: false }).total.shares[
      base.playerId
    ]!;
    // Força o sucesso para medir o efeito do apoio no modelo.
    let s = structuredClone(base);
    s.election!.runoffDeals!.find((d) => d.candidateId === deal.candidateId)!.affinityPlayer = 1;
    s.election!.runoffDeals!.find((d) => d.candidateId === deal.candidateId)!.affinityRival = 0;
    const out = dispatch(s, {
      type: 'election/deal',
      candidateId: deal.candidateId,
      offer: 'cargo',
    });
    expect(out.result.ok).toBe(true);
    s = out.state;
    const after = s.election!.runoffDeals!.find((d) => d.candidateId === deal.candidateId)!;
    expect(['player', 'neutral']).toContain(after.status);
    const again = dispatch(s, {
      type: 'election/deal',
      candidateId: deal.candidateId,
      offer: 'pauta',
    });
    expect(again.result.ok).toBe(false);
    if (after.status === 'player') {
      const now = computeIntentions(s, s.election!, { includeSegments: false }).total.shares[
        s.playerId
      ]!;
      expect(now).toBeGreaterThan(before);
    }
  });

  it('é determinístico', () => {
    const run = () => {
      const s = structuredClone(base);
      const d = s.election!.runoffDeals!.find((x) => x.status === 'open');
      if (!d) return 'sem negociação';
      return JSON.stringify(
        dispatch(s, { type: 'election/deal', candidateId: d.candidateId, offer: d.asks }).state
          .election!.runoffDeals,
      );
    };
    expect(run()).toBe(run());
  });
});
