import { describe, expect, it } from 'vitest';
import { actionCost, dispatch, estimateAdCost, getCampaignAction, latestPoll } from '../src/index';
import { must, newGame } from './helpers';

describe('Ações de campanha', () => {
  const state = newGame('governador', 'MG', 5);
  const unit = state.election!.units[0]!;

  it('comício gasta dinheiro e energia, avança o tempo e aumenta presença/conhecimento na região', () => {
    const def = getCampaignAction('rally')!;
    const cost = actionCost(state, def);
    const before = state.election!.participants[state.playerId]!;
    const next = must(state, {
      type: 'campaign/action',
      input: { actionId: 'rally', unitId: unit.id },
    });
    const after = next.election!.participants[next.playerId]!;
    expect(next.date > state.date).toBe(true);
    expect(next.campaign!.log[0]?.actionId).toBe('rally');
    expect(next.campaign!.totalSpent).toBeGreaterThanOrEqual(cost);
    expect(after.presence[unit.id]!).toBeGreaterThan((before.presence[unit.id] ?? 0) * 0.9);
    expect(after.knowledge[unit.id]!).toBeGreaterThan(before.knowledge[unit.id]! * 0.98);
  });

  it('recusa ação sem dinheiro sem alterar o estado', () => {
    const broke = structuredClone(state);
    broke.campaign!.money = 0;
    const out = dispatch(broke, {
      type: 'campaign/action',
      input: { actionId: 'rally', unitId: unit.id },
    });
    expect(out.result.ok).toBe(false);
    expect(out.state).toBe(broke);
  });

  it('recusa ação sem energia', () => {
    const tired = structuredClone(state);
    tired.campaign!.energy = 0;
    expect(
      dispatch(tired, { type: 'campaign/action', input: { actionId: 'rally', unitId: unit.id } })
        .result.ok,
    ).toBe(false);
  });

  it('proposta registra promessa e muda a ênfase temática (agrada uns, desagrada outros)', () => {
    const next = must(state, {
      type: 'campaign/action',
      input: { actionId: 'proposal', proposalId: 'tax_cut' },
    });
    expect(next.promises.some((p) => p.proposalId === 'tax_cut')).toBe(true);
    const status = next.election!.participants[next.playerId]!;
    const before = state.election!.participants[state.playerId]!;
    expect(status.issueFocus.taxes ?? 0).toBeGreaterThan(before.issueFocus.taxes ?? 0);
    expect(status.perceivedIdeology.fiscal).toBeGreaterThan(before.perceivedIdeology.fiscal);
  });

  it('pesquisa interna custa dinheiro e traz recortes detalhados', () => {
    const next = must(state, { type: 'campaign/poll' });
    const poll = latestPoll(next, 'internal')!;
    expect(poll).not.toBeNull();
    expect(poll.playerSegments).toBeDefined();
    expect(Object.keys(poll.byPopType ?? {}).length).toBe(12);
    expect(next.campaign!.money).toBeLessThan(state.campaign!.money);
  });
});

describe('Propaganda e dinheiro', () => {
  const state = newGame('presidente', 'SP', 6);

  it('custo de TV nacional é maior que regional e escala com os dias', () => {
    const national = estimateAdCost(state, {
      channel: 'tv',
      unitIds: [],
      targetPopTypes: [],
      tone: 'positive',
      days: 7,
      intensity: 1,
    });
    const regional = estimateAdCost(state, {
      channel: 'tv',
      unitIds: ['AC'],
      targetPopTypes: [],
      tone: 'positive',
      days: 7,
      intensity: 1,
    });
    expect(national.total).toBeGreaterThan(regional.total * 5);
    const twoWeeks = estimateAdCost(state, {
      channel: 'tv',
      unitIds: [],
      targetPopTypes: [],
      tone: 'positive',
      days: 14,
      intensity: 1,
    });
    expect(twoWeeks.total).toBeCloseTo(national.total * 2, -2);
  });

  it('propaganda é paga na hora e não permite dinheiro infinito', () => {
    const next = must(state, {
      type: 'campaign/ad',
      input: {
        channel: 'social',
        unitIds: [],
        targetPopTypes: ['students'],
        tone: 'positive',
        days: 5,
        intensity: 1,
      },
    });
    expect(next.campaign!.money).toBeLessThan(state.campaign!.money);
    expect(next.campaign!.ads[0]?.active).toBe(true);
    const broke = structuredClone(state);
    broke.campaign!.money = 1000;
    expect(
      dispatch(broke, {
        type: 'campaign/ad',
        input: {
          channel: 'tv',
          unitIds: [],
          targetPopTypes: [],
          tone: 'positive',
          days: 7,
          intensity: 1,
        },
      }).result.ok,
    ).toBe(false);
  });

  it('propaganda no ar aumenta conhecimento dia a dia', () => {
    let s = must(state, {
      type: 'campaign/ad',
      input: {
        channel: 'tv',
        unitIds: [],
        targetPopTypes: [],
        tone: 'positive',
        days: 5,
        intensity: 1,
      },
    });
    const before = s.election!.participants[s.playerId]!.knowledge.SP!;
    s = must(s, { type: 'campaign/action', input: { actionId: 'rest' } });
    expect(s.election!.participants[s.playerId]!.knowledge.SP!).toBeGreaterThan(before);
  });

  it('a folha de pagamento da equipe consome caixa diariamente', () => {
    let s = must(state, { type: 'campaign/hire', roleId: 'marketer', level: 3 });
    const afterHire = s.campaign!.money;
    s = must(s, { type: 'campaign/action', input: { actionId: 'rest' } });
    expect(s.campaign!.ledger.some((l) => l.category === 'staff' && l.amount < 0)).toBe(true);
    expect(s.campaign!.totalRaised).toBeGreaterThan(state.campaign!.totalRaised);
    expect(afterHire).toBeLessThan(state.campaign!.money);
  });
});
