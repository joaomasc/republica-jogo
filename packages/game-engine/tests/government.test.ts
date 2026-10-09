import { describe, expect, it } from 'vitest';
import {
  dispatch,
  getLawOption,
  LAW_CATEGORIES,
  passLaw,
  projectBill,
  updateEconomy,
  updatePopularity,
  updatePopulation,
  type GameState,
} from '../src/index';
import { assumeOffice } from '../src/government/government';
import { must, newGame } from './helpers';

/** Cria um estado já governando (pulando a campanha) para testar o modo governo. */
function governing(
  officeId: 'presidente' | 'governador' | 'prefeito' = 'presidente',
  stateId: 'SP' | 'BA' = 'SP',
): GameState {
  const s = structuredClone(newGame(officeId, stateId, 77));
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
  return s;
}

describe('Leis', () => {
  it('cada categoria tem opção padrão válida e todas as opções têm custo e prazo', () => {
    expect(LAW_CATEGORIES.length).toBeGreaterThanOrEqual(13);
    for (const cat of LAW_CATEGORIES) {
      expect(cat.options.some((o) => o.id === cat.defaultOptionId)).toBe(true);
      for (const o of cat.options) {
        expect(o.politicalCost).toBeGreaterThan(0);
        expect(o.implementationMonths).toBeGreaterThan(0);
      }
    }
  });

  it('não é possível propor leis sem mandato', () => {
    const s = newGame();
    expect(
      dispatch(s, { type: 'gov/propose', categoryId: 'taxation', optionId: 'tax_low' }).result.ok,
    ).toBe(false);
  });

  it('projeto não é aprovado na hora: tramita, é votado e depois implementado', () => {
    let s = governing();
    s = must(s, { type: 'gov/propose', categoryId: 'education', optionId: 'edu_tech' });
    const bill = s.laws.bills[0]!;
    expect(bill.status).toBe('committee');
    expect(s.laws.enacted.education).toBe('edu_public');
    const projection = projectBill(s, bill);
    expect(projection.chambers.length).toBe(2);
    s = must(s, { type: 'gov/rush', billId: bill.id });
    const voted = s.laws.bills.find((b) => b.id === bill.id)!;
    expect(['passed', 'rejected']).toContain(voted.status);
    expect(voted.votes.length).toBeGreaterThan(0);
    if (voted.status === 'passed') {
      expect(s.laws.implementing.some((i) => i.categoryId === 'education')).toBe(true);
      const months = getLawOption('education', 'edu_tech')!.implementationMonths;
      for (let i = 0; i <= months; i++)
        s = dispatch(s, { type: 'time/advance', step: 'month' }).state;
      for (const ev of s.events.pending)
        s = dispatch(s, {
          type: 'event/resolve',
          instanceId: ev.instanceId,
          optionId: ev.options[0]!.id,
        }).state;
    }
  });

  it('negociação (ministério) traz partido para a base e aumenta apoio', () => {
    let s = governing();
    s = must(s, { type: 'gov/propose', categoryId: 'labor', optionId: 'labor_flexible' });
    const bill = s.laws.bills[0]!;
    const target = Object.keys(s.parties).find(
      (p) => p !== s.candidates[s.playerId]!.partyId && !s.congress.coalition.includes(p),
    )!;
    const before = projectBill(s, bill).chambers[0]!.byParty[target]!;
    s = must(s, { type: 'gov/portfolio', partyId: target, portfolio: 'Trabalho' });
    expect(s.congress.coalition).toContain(target);
    const after = projectBill(s, s.laws.bills[0]!).chambers[0]!.byParty[target]!;
    expect(after).toBeGreaterThan(before);
  });

  it('passLaw (ferramenta) promulga direto para testes de balanceamento', () => {
    const s = passLaw(governing(), 'taxation', 'tax_low').state;
    expect(s.laws.enacted.taxation).toBe('tax_low');
  });
});

describe('Economia e população', () => {
  it('updateEconomy é determinístico e mantém indicadores em faixas plausíveis', () => {
    const s = governing();
    const a = updateEconomy(s);
    const b = updateEconomy(s);
    expect(a.economy).toEqual(b.economy);
    let x = s;
    for (let i = 0; i < 48; i++) x = updateEconomy(x);
    expect(x.economy.unemployment).toBeGreaterThan(2);
    expect(x.economy.unemployment).toBeLessThan(26);
    expect(x.economy.inflation).toBeGreaterThan(-2);
    expect(x.economy.inflation).toBeLessThan(31);
  });

  it('leis alteram a economia pelo modelo (ex.: flexibilização trabalhista eleva crescimento esperado)', () => {
    const base = governing();
    let flexible = passLaw(base, 'labor', 'labor_flexible').state;
    let current = base;
    for (let i = 0; i < 24; i++) {
      flexible = updateEconomy(flexible);
      current = updateEconomy(current);
    }
    expect(flexible.economy.confidence).toBeGreaterThan(current.economy.confidence);
  });

  it('orçamento maior para saúde melhora a satisfação de quem prioriza saúde', () => {
    const s = governing();
    const more = must(s, {
      type: 'gov/budget',
      category: 'health',
      amount: s.government!.budget!.baseline.health * 1.5,
    });
    const a = updatePopulation(s);
    const b = updatePopulation(more);
    const pop = Object.values(a.population.pops).find((p) => p.typeId === 'retirees')!;
    expect(b.population.pops[pop.id]!.satisfaction).toBeGreaterThan(pop.satisfaction);
  });

  it('updatePopularity aproxima a popularidade da intenção de voto', () => {
    const s = newGame();
    const player = s.candidates[s.playerId]!;
    const next = updatePopularity(s);
    expect(next.candidates[s.playerId]!.attributes.popularity).not.toBe(
      player.attributes.popularity,
    );
  });
});

describe('Mandato', () => {
  it('governar mês a mês até o fim do mandato leva à avaliação e às opções de carreira', () => {
    let s = governing('prefeito', 'BA');
    s.promises.push({
      id: 'p1',
      proposalId: 'health_more',
      issue: 'healthcare',
      title: 'Mais saúde',
      madeOn: s.date,
      target: { kind: 'budget', category: 'health', minRatio: 1.12 },
      status: 'pending',
      baseline: null,
      evaluatedOn: null,
    });
    s = must(s, {
      type: 'gov/budget',
      category: 'health',
      amount: s.government!.budget!.baseline.health * 1.3,
    });
    let guard = 0;
    while (s.phase === 'governing' && guard++ < 80) {
      for (const ev of s.events.pending)
        s = must(s, {
          type: 'event/resolve',
          instanceId: ev.instanceId,
          optionId: ev.options.find((o) => o.available)!.id,
        });
      s = dispatch(s, { type: 'time/advance', step: 'month' }).state;
    }
    expect(s.phase).toBe('career');
    expect(s.career.lastEvaluation).not.toBeNull();
    expect(s.promises.find((p) => p.id === 'p1')?.status).toBe('fulfilled');
    const run = must(s, { type: 'career/run', officeId: 'prefeito', stateId: 'BA' });
    expect(run.phase).toBe('campaign');
    expect(run.election!.participants[run.playerId]!.isIncumbent).toBe(true);
  });
});
