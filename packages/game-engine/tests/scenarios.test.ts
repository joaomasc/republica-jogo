import { describe, expect, it, vi } from 'vitest';
import {
  addMonths,
  dispatch,
  federalLaws,
  getLawOption,
  getPlayer,
  getScenario,
  objectivesView,
  OFFICES,
  SCENARIOS,
  startGame,
  validateNewGame,
  LAW_CATEGORIES,
  type GameState,
  type NewGameConfig,
} from '../src/index';
import type { onLawEnacted as OnLawEnacted } from '../src/nation/nation';
import { validateLawPreset } from '../src/scenarios/startInOffice';
import { LAW_PRESETS } from '../src/scenarios/presets';
import { initParties } from '../src/parties/parties';
import { BACKGROUNDS } from '../src/candidate/backgrounds';
import { governanceConfig, resolveBlockers, simulateGovernance } from '../scripts/governance-sim';
import { defaultConfig } from './helpers';

// Espiona `onLawEnacted` preservando o comportamento real (e o estado das leis no momento da chamada).
const lawCalls = vi.hoisted(() => ({
  calls: [] as { categoryId: string; optionId: string; enacted: Record<string, string> }[],
}));
vi.mock('../src/nation/nation', async (importOriginal) => {
  const real = await importOriginal<{ onLawEnacted: typeof OnLawEnacted }>();
  const { federalLaws: fed } = await import('../src/laws/federal');
  return {
    ...real,
    onLawEnacted: (state: GameState, categoryId: string, optionId: string) => {
      lawCalls.calls.push({ categoryId, optionId, enacted: { ...fed(state).enacted } });
      return real.onLawEnacted(state, categoryId, optionId);
    },
  };
});

function inOffice(
  officeId: Parameters<typeof defaultConfig>[1],
  stateId: Parameters<typeof defaultConfig>[2] = 'SP',
  extra: Partial<NewGameConfig> = {},
  seed = 11,
): GameState {
  return startGame({ ...defaultConfig(seed, officeId, stateId), startInOffice: true, ...extra });
}

function scenarioConfig(id: string, seed = 5): NewGameConfig {
  const sc = getScenario(id)!;
  return {
    ...defaultConfig(seed, sc.officeId, sc.stateId, sc.partyId ?? 'udc'),
    difficulty: sc.difficulty,
    mode: 'scenario',
    scenarioId: sc.id,
    year: sc.year,
    economy: sc.economy,
  };
}

describe('Modo Nação: começar no poder', () => {
  it('presidente: empossado em 2027, governando, Congresso montado e sem campanha', () => {
    const s = inOffice('presidente', 'SP', { lawPreset: LAW_PRESETS.liberal });
    expect(s.phase).toBe('governing');
    expect(s.election).toBeNull();
    expect(s.campaign).toBeNull();
    expect(s.date).toBe('2027-01-01');
    const gov = s.government!;
    expect(gov.officeId).toBe('presidente');
    expect(gov.branch).toBe('executive');
    expect(gov.jurisdiction.level).toBe('federal');
    expect(gov.startDate).toBe('2027-01-01');
    expect(gov.endDate > gov.startDate).toBe(true);
    expect(gov.approval).toBeGreaterThan(40);
    expect(gov.budget).not.toBeNull();
    expect(gov.termNumber).toBe(1);
    expect(getPlayer(s).currentOffice).toBe('presidente');
    expect(s.career.offices).toHaveLength(1);
    expect(s.career.elections).toHaveLength(1);
    expect(s.career.elections[0]!.won).toBe(true);
    expect(s.congress.chambers.length).toBeGreaterThanOrEqual(2);
    expect(s.laws.jurisdictionKey).toBe('federal');
    expect(s.landscape.presidentPartyId).toBe(getPlayer(s).partyId);
  });

  it('registra a vitória no histórico e nas notícias (majoritária entre 52% e 58%)', () => {
    const s = inOffice('presidente');
    const pct = s.career.elections[0]!.pct;
    expect(pct).toBeGreaterThanOrEqual(0.52);
    expect(pct).toBeLessThanOrEqual(0.58);
    const win = s.history.find((h) => h.kind === 'victory');
    expect(win?.title).toMatch(/^Eleito\(a\) para Presidente/);
    expect(win?.title).toMatch(/\d+[,.]\d%/);
    expect(s.history.some((h) => h.kind === 'office' && /toma posse/i.test(h.title))).toBe(true);
    expect(s.media.news.some((n) => /eleito/i.test(n.headline))).toBe(true);
    expect(s.media.news.some((n) => /toma posse/i.test(n.headline))).toBe(true);
    // Sem o fluxo de campanha: nada de "Lança candidatura".
    expect(s.history.some((h) => /Lança candidatura/.test(h.title))).toBe(false);
  });

  it('pacote de leis entra em vigor com força 1, sem projetos nem implementação', () => {
    const preset = LAW_PRESETS.desenvolvimentista;
    const s = inOffice('presidente', 'SP', { lawPreset: preset });
    const laws = federalLaws(s);
    for (const [cat, opt] of Object.entries(preset)) {
      expect(laws.enacted[cat]).toBe(opt);
      expect(laws.strength[cat]).toBe(1);
    }
    expect(laws.bills).toHaveLength(0);
    expect(laws.implementing).toHaveLength(0);
    // Categorias fora do pacote mantêm o padrão.
    const untouched = LAW_CATEGORIES.find((c) => !(c.id in preset))!;
    expect(laws.enacted[untouched.id]).toBe(untouched.defaultOptionId);
  });

  it('deputado federal: legislando, Congresso Nacional e pacote nas leis federais', () => {
    const s = inOffice('deputado_federal', 'GO', { lawPreset: LAW_PRESETS.liberal });
    expect(s.phase).toBe('legislating');
    expect(s.government!.branch).toBe('legislative');
    // A circunscrição é o estado de origem; o Legislativo e as leis são os federais.
    expect(s.government!.jurisdiction.stateId).toBe('GO');
    expect(s.government!.startDate).toBe('2027-02-01');
    expect(s.government!.budget).toBeNull();
    expect(s.congress.chambers.length).toBeGreaterThanOrEqual(2);
    expect(s.laws.jurisdictionKey).toBe('federal');
    expect(s.laws.enacted.economic_system).toBe('econ_laissez_faire');
    expect(federalLaws(s)).toBe(s.laws);
    // Eleição proporcional: histórico fala em votos, não em percentual da eleição majoritária.
    expect(s.history.find((h) => h.kind === 'victory')?.title).toMatch(/votos/);
  });

  it('governador: governando o estado; o pacote vai para as leis FEDERAIS (estado fica no padrão)', () => {
    const s = inOffice('governador', 'RJ', { lawPreset: LAW_PRESETS.social_democrata });
    expect(s.phase).toBe('governing');
    expect(s.government!.officeId).toBe('governador');
    expect(s.government!.jurisdiction.level).toBe('estadual');
    expect(s.laws.jurisdictionKey).not.toBe('federal');
    expect(s.nation.federalLaws).not.toBeNull();
    expect(federalLaws(s)).toBe(s.nation.federalLaws);
    expect(federalLaws(s).enacted.minimum_wage).toBe('mw_high');
    expect(federalLaws(s).enacted.welfare).toBe('wel_expanded');
    expect(s.laws.enacted.minimum_wage).not.toBe('mw_high');
    expect(s.landscape.governors.RJ).toBe(getPlayer(s).partyId);
  });

  it('prefeito, senador e vereador também começam empossados', () => {
    for (const [office, state, phase] of [
      ['prefeito', 'PE', 'governing'],
      ['senador', 'BA', 'legislating'],
      ['vereador', 'MG', 'legislating'],
      ['deputado_estadual', 'SP', 'legislating'],
    ] as const) {
      const s = inOffice(office, state);
      expect(s.phase, office).toBe(phase);
      expect(s.government!.officeId, office).toBe(office);
      expect(s.election, office).toBeNull();
      expect(getPlayer(s).currentOffice, office).toBe(office);
      expect(OFFICES[office].branch === 'executive').toBe(s.government!.branch === 'executive');
    }
  });

  it('objetivos são registrados como ativos com progresso 0', () => {
    const s = inOffice('presidente', 'SP', {
      objectives: [
        {
          id: 'o1',
          title: 'Lei',
          description: 'd',
          metric: 'law_enacted',
          target: 'tax_low',
          deadline: null,
        },
        {
          id: 'o2',
          title: 'Aprovação',
          description: 'd',
          metric: 'approval_min',
          target: 50,
          deadline: null,
        },
      ],
    });
    expect(s.nation.objectives).toHaveLength(2);
    for (const o of s.nation.objectives) {
      expect(o.status).toBe('active');
      expect(o.progress).toBe(0);
    }
    const view = objectivesView(s);
    expect(view.map((v) => v.id)).toEqual(['o1', 'o2']);
    expect(view[1]!.current).toBeCloseTo(s.government!.approval, 1);
    expect(view[0]!.monthsLeft).toBeGreaterThan(40);
  });

  it('objetivo relativo (+3 p.p. de indústria) vira alvo absoluto sobre o valor inicial', () => {
    const s = startGame(scenarioConfig('sonho_industrial'));
    const obj = s.nation.objectives.find((o) => o.metric === 'manufacturing_share')!;
    expect(obj.status).toBe('active');
    expect(obj.target).toBeCloseTo(s.industry.stats.manufacturingShare + 0.03, 6);
  });

  it('é determinístico pela seed e varia entre seeds', () => {
    const cfg = {
      ...defaultConfig(99, 'presidente', 'SP'),
      startInOffice: true,
      lawPreset: LAW_PRESETS.liberal,
    };
    const a = startGame(cfg);
    const b = startGame(cfg);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = startGame({ ...cfg, seed: 100 });
    expect(c.career.elections[0]!.pct).not.toBe(a.career.elections[0]!.pct);
  });

  it('o fluxo normal (sem startInOffice) continua começando na campanha', () => {
    const s = startGame(defaultConfig(3, 'presidente', 'SP'));
    expect(s.phase).toBe('campaign');
    expect(s.election).not.toBeNull();
    expect(s.government).toBeNull();
    expect(s.nation.objectives).toHaveLength(0);
  });

  it('validateNewGame rejeita pacote de leis inválido', () => {
    const base = defaultConfig(1, 'presidente', 'SP');
    expect(validateNewGame({ ...base, lawPreset: { nao_existe: 'x' } })).toMatch(/categoria/);
    expect(validateNewGame({ ...base, lawPreset: { taxation: 'nao_existe' } })).toMatch(/opção/);
    // labor_councils exige socialismo de mercado ou planificação.
    expect(validateNewGame({ ...base, lawPreset: { labor: 'labor_councils' } })).toMatch(/exige/);
    expect(validateNewGame({ ...base, lawPreset: { taxation: 'tax_low' } })).toBeNull();
  });

  it('todos os pacotes de leis predefinidos são válidos', () => {
    for (const [id, preset] of Object.entries(LAW_PRESETS)) {
      expect(validateLawPreset({ ...preset }), id).toBeNull();
      for (const [cat, opt] of Object.entries(preset))
        expect(getLawOption(cat, opt), `${id}/${cat}`).toBeDefined();
    }
  });
});

describe('Governança automática', () => {
  it('12 meses como presidente sem erro, resolvendo bloqueios', () => {
    const report = simulateGovernance(governanceConfig(21, 'padrao'), 12);
    expect(report.stoppedReason).toBeNull();
    expect(report.completed).toBe(true);
    expect(report.months).toBe(12);
    expect(report.state.phase).toBe('governing');
    expect(report.state.date).toBe('2028-01-01');
    expect(report.state.events.pending).toHaveLength(0);
    expect(Number.isFinite(report.growthAvg)).toBe(true);
    expect(report.unemploymentFinal).toBeGreaterThan(0);
    expect(report.approvalFinal).toBeGreaterThan(0);
    expect(Object.keys(report.pops)).toHaveLength(4);
  });

  it('12 meses como deputado federal sem erro', () => {
    const cfg = { ...defaultConfig(22, 'deputado_federal', 'GO'), startInOffice: true };
    const report = simulateGovernance(cfg, 12);
    expect(report.stoppedReason).toBeNull();
    expect(report.state.phase).toBe('legislating');
    expect(report.completed).toBe(true);
  });

  it('é determinístico', () => {
    const a = simulateGovernance(governanceConfig(31, 'liberal'), 6);
    const b = simulateGovernance(governanceConfig(31, 'liberal'), 6);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });

  it('resolveBlockers é idempotente quando não há bloqueio', () => {
    const s = startGame(governanceConfig(32));
    const out = resolveBlockers(s);
    expect(out.resolved).toBe(true);
  });
});

describe('Objetivos: avaliação mensal', () => {
  const objectives: NonNullable<NewGameConfig['objectives']> = [
    // Marco já cumprido pelo pacote: completa na primeira virada de mês.
    {
      id: 'lei',
      title: 'Impostos baixos',
      description: 'd',
      metric: 'law_enacted',
      target: 'tax_low',
      deadline: null,
    },
    // Alternativas com "|".
    {
      id: 'lei_alt',
      title: 'Sistema',
      description: 'd',
      metric: 'law_enacted',
      target: 'econ_planned|econ_laissez_faire',
      deadline: null,
    },
    // Marco impossível com prazo curto: falha no prazo.
    {
      id: 'projetos',
      title: 'Projetos',
      description: 'd',
      metric: 'bills_passed',
      target: 99,
      deadline: '2027-04-01',
    },
    // Manutenção trivial com prazo: só é julgada no prazo.
    {
      id: 'aprov',
      title: 'Aprovação',
      description: 'd',
      metric: 'approval_min',
      target: 1,
      deadline: '2027-06-01',
    },
    // Manutenção impossível sem prazo: falha na última virada do mandato.
    {
      id: 'legit',
      title: 'Legitimidade',
      description: 'd',
      metric: 'legitimacy_min',
      target: 1000,
      deadline: null,
    },
  ];

  it('mudam de status com notícia, alerta (link "nation") e histórico', () => {
    const report = simulateGovernance(
      governanceConfig(41, 'liberal', { objectives: objectives.map((o) => ({ ...o })) }),
      12,
    );
    const byId = Object.fromEntries(report.state.nation.objectives.map((o) => [o.id, o]));
    expect(byId.lei!.status).toBe('completed');
    expect(byId.lei!.progress).toBe(1);
    expect(byId.lei_alt!.status).toBe('completed');
    expect(byId.projetos!.status).toBe('failed');
    expect(byId.aprov!.status).toBe('completed');
    expect(byId.legit!.status).toBe('active');
    const s = report.state;
    expect(s.alerts.some((a) => a.link === 'nation' && a.kind === 'objective_completed')).toBe(
      true,
    );
    expect(s.alerts.some((a) => a.link === 'nation' && a.kind === 'objective_failed')).toBe(true);
    expect(s.media.news.some((n) => /cumpre meta/i.test(n.headline))).toBe(true);
    expect(s.media.news.some((n) => /não cumprida/i.test(n.headline))).toBe(true);
    expect(s.history.some((h) => /Objetivo cumprido/.test(h.title))).toBe(true);
    expect(s.history.some((h) => /Objetivo falhou/.test(h.title))).toBe(true);
  });

  it('metas de manutenção só são julgadas no prazo', () => {
    const report = simulateGovernance(
      governanceConfig(41, 'liberal', { objectives: objectives.map((o) => ({ ...o })) }),
      3,
    );
    const aprov = report.state.nation.objectives.find((o) => o.id === 'aprov')!;
    expect(aprov.status).toBe('active');
    expect(aprov.progress).toBe(1);
  });

  it('no fim do mandato os objetivos ativos falham', () => {
    let s = startGame(
      governanceConfig(42, 'liberal', {
        objectives: [
          {
            id: 'x',
            title: 'Impossível',
            description: 'd',
            metric: 'bills_passed',
            target: 99,
            deadline: null,
          },
          {
            id: 'y',
            title: 'Legitimidade',
            description: 'd',
            metric: 'legitimacy_min',
            target: 1000,
            deadline: null,
          },
        ],
      }),
    );
    // Encurta o mandato para a última virada de mês cair antes do fim.
    s = structuredClone(s);
    s.government!.endDate = addMonths(s.date, 2);
    // Avança mês a mês, resolvendo bloqueios, até o mandato acabar.
    let guard = 0;
    let cur = s;
    while (cur.government && guard++ < 12) {
      cur = resolveBlockers(cur).state;
      cur = dispatch(cur, { type: 'time/advance', step: 'month' }).state;
    }
    expect(cur.government).toBeNull();
    expect(cur.nation.objectives.map((o) => o.status)).toEqual(['failed', 'failed']);
  });

  it('cenários: objetivos registrados correspondem à definição', () => {
    for (const sc of SCENARIOS.filter((x) => x.objectives)) {
      const s = startGame(scenarioConfig(sc.id));
      expect(s.nation.objectives.map((o) => o.id)).toEqual(sc.objectives!.map((o) => o.id));
      expect(s.nation.objectives.every((o) => o.status === 'active' && o.progress === 0)).toBe(
        true,
      );
    }
  });
});

describe('Cenários', () => {
  it('os cenários existentes continuam presentes e sem modo nação', () => {
    for (const id of [
      'gerais_2026',
      'outsider',
      'prefeitura',
      'crise_rj',
      'primeiro_mandato',
      'senado_ba',
      'bonanca',
    ]) {
      const sc = getScenario(id);
      expect(sc, id).toBeDefined();
      expect(sc!.startInOffice).toBeUndefined();
    }
  });

  it('os sete cenários no poder existem e são coerentes', () => {
    const ids = [
      'presidencia_2027',
      'sonho_industrial',
      'choque_liberal',
      'revolucao_pelo_voto',
      'crise_da_divida',
      'baixo_clero',
      'senado_2027',
    ];
    for (const id of ids) {
      const sc = getScenario(id);
      expect(sc, id).toBeDefined();
      expect(sc!.startInOffice).toBe(true);
      expect(sc!.year).toBe(2026);
    }
    expect(getScenario('presidencia_2027')!.officeId).toBe('presidente');
    expect(getScenario('baixo_clero')!.officeId).toBe('deputado_federal');
    expect(getScenario('senado_2027')!.officeId).toBe('senador');
    expect(getScenario('crise_da_divida')!.economy).toBe('crisis');
    const choque = getScenario('choque_liberal')!;
    expect(
      choque.objectives!.filter((o) => o.metric === 'law_enacted').map((o) => o.target),
    ).toEqual(['econ_laissez_faire', 'tax_low', 'trade_open']);
    expect(choque.objectives!.some((o) => o.metric === 'gdp_growth_avg' && o.target === 3)).toBe(
      true,
    );
    expect(getScenario('baixo_clero')!.objectives![0]).toMatchObject({
      metric: 'bills_passed',
      target: 1,
    });
    expect(
      getScenario('sonho_industrial')!.objectives!.some(
        (o) => o.metric === 'unemployment_max' && o.target === 8,
      ),
    ).toBe(true);
    expect(
      getScenario('crise_da_divida')!
        .objectives!.map((o) => o.metric)
        .sort(),
    ).toEqual(['approval_min', 'inflation_max']);
  });

  it('todo cenário é válido: partido, histórico pessoal, leis e métricas existem', () => {
    const parties = initParties('fictional');
    const metrics = [
      'manufacturing_share',
      'gdp_growth_avg',
      'unemployment_max',
      'inflation_max',
      'approval_min',
      'law_enacted',
      'trade_balance_min',
      'industry_levels',
      'avg_wage_growth',
      'legitimacy_min',
      'bills_passed',
    ];
    const allOptions = new Set(LAW_CATEGORIES.flatMap((c) => c.options.map((o) => o.id)));
    const ids = new Set<string>();
    for (const sc of SCENARIOS) {
      expect(ids.has(sc.id), `id duplicado ${sc.id}`).toBe(false);
      ids.add(sc.id);
      if (sc.partyId) expect(parties[sc.partyId], sc.id).toBeDefined();
      if (sc.backgroundId)
        expect(
          BACKGROUNDS.some((b) => b.id === sc.backgroundId),
          sc.id,
        ).toBe(true);
      expect(OFFICES[sc.officeId], sc.id).toBeDefined();
      expect(sc.name.length).toBeGreaterThan(2);
      for (const o of sc.objectives ?? []) {
        expect(metrics, `${sc.id}/${o.id}`).toContain(o.metric);
        if (o.metric === 'law_enacted')
          for (const opt of String(o.target).split('|'))
            expect(allOptions.has(opt), `${sc.id}/${opt}`).toBe(true);
      }
      expect(validateNewGame(scenarioConfig(sc.id)), sc.id).toBeNull();
    }
  });

  it('iniciar qualquer cenário funciona: no poder governa, os demais fazem campanha', () => {
    for (const sc of SCENARIOS) {
      const s = startGame(scenarioConfig(sc.id));
      if (sc.startInOffice) {
        expect(['governing', 'legislating'], sc.id).toContain(s.phase);
        expect(s.government!.officeId, sc.id).toBe(sc.officeId);
        expect(s.election, sc.id).toBeNull();
      } else {
        expect(s.phase, sc.id).toBe('campaign');
        expect(s.election, sc.id).not.toBeNull();
      }
    }
  });

  it('choque_liberal: partido liberal e leis do objetivo ainda NÃO estão em vigor', () => {
    const s = startGame(scenarioConfig('choque_liberal'));
    expect(getPlayer(s).partyId).toBe('alb');
    const laws = federalLaws(s);
    expect(laws.enacted.economic_system).not.toBe('econ_laissez_faire');
    expect(laws.enacted.taxation).not.toBe('tax_low');
    expect(laws.enacted.trade).not.toBe('trade_open');
  });
});

describe('Revisão: consistência do começo no poder', () => {
  it('todos os cargos: fase, governo, Congresso e esferas de leis coerentes', () => {
    for (const officeId of Object.keys(OFFICES) as (keyof typeof OFFICES)[]) {
      const office = OFFICES[officeId];
      const s = inOffice(officeId, 'MG', { lawPreset: { ...LAW_PRESETS.liberal } });
      const tag = String(officeId);
      const gov = s.government!;
      expect(s.phase, tag).toBe(office.branch === 'executive' ? 'governing' : 'legislating');
      expect(gov.officeId, tag).toBe(officeId);
      expect(gov.branch, tag).toBe(office.branch);
      expect(gov.budget === null, tag).toBe(office.branch !== 'executive');
      expect(s.election, tag).toBeNull();
      expect(s.campaign, tag).toBeNull();
      expect(s.interactions, tag).toEqual({ debate: null, interview: null });
      expect(s.congress.chambers.length, tag).toBeGreaterThan(0);
      expect(s.date, tag).toBe(gov.startDate);
      expect(gov.endDate > gov.startDate, tag).toBe(true);
      expect(Number.isFinite(gov.approval) && gov.approval >= 0 && gov.approval <= 100, tag).toBe(
        true,
      );
      // Leis do jogador na esfera do cargo; federais sempre acessíveis e com o pacote.
      const federalOffice = office.level === 'federal';
      expect(s.laws.jurisdictionKey === 'federal', tag).toBe(federalOffice);
      const fed = federalLaws(s);
      expect(fed.jurisdictionKey, tag).toBe('federal');
      expect(fed.enacted.economic_system, tag).toBe('econ_laissez_faire');
      expect(fed.strength.economic_system, tag).toBe(1);
      if (!federalOffice) {
        expect(s.nation.federalLaws, tag).toBe(fed);
        expect(s.laws.enacted.economic_system, tag).not.toBe('econ_laissez_faire');
      } else expect(s.nation.federalLaws, tag).toBeNull();
      // Estado só com JSON e sem valores não finitos.
      expect(JSON.parse(JSON.stringify(s)), tag).toEqual(s);
      expect(JSON.stringify(s), tag).not.toMatch(/NaN|Infinity/);
    }
  });

  it('lawPreset chama onLawEnacted uma vez por mudança, já com o pacote completo gravado', () => {
    lawCalls.calls.length = 0;
    const preset = { ...LAW_PRESETS.planificado };
    const s = inOffice('presidente', 'SP', { lawPreset: preset });
    const called = lawCalls.calls.filter(
      (c) => preset[c.categoryId as keyof typeof preset] === c.optionId,
    );
    expect(called.map((c) => c.categoryId).sort()).toEqual(Object.keys(preset).sort());
    // Em cada chamada todas as leis do pacote já estão em vigor (sem estado intermediário).
    for (const c of called)
      for (const [cat, opt] of Object.entries(preset)) expect(c.enacted[cat]).toBe(opt);
    expect(federalLaws(s).enacted.economic_system).toBe('econ_planned');
  });

  it('pacote vazio ou igual ao padrão não chama onLawEnacted', () => {
    lawCalls.calls.length = 0;
    inOffice('presidente', 'SP', { lawPreset: {} });
    const defaults = Object.fromEntries(LAW_CATEGORIES.map((c) => [c.id, c.defaultOptionId]));
    inOffice('presidente', 'SP', { lawPreset: defaults });
    expect(lawCalls.calls).toHaveLength(0);
  });

  it('só herda objetivos e leis do cenário se o cargo for o do cenário', () => {
    const cfg = scenarioConfig('baixo_clero');
    const other = startGame({ ...cfg, office: { officeId: 'presidente', stateId: 'SP' } });
    expect(other.phase).toBe('campaign');
    expect(other.nation.objectives).toHaveLength(0);
  });

  it('pacote com opção ou categoria inexistente é recusado', () => {
    expect(validateLawPreset({ economic_system: 'nao_existe' })).toMatch(/não existe/);
    expect(validateLawPreset({ nao_existe: 'x' })).toMatch(/desconhecida/);
  });
});

describe('Revisão: objetivos de ponta a ponta', () => {
  it('lei em vigor depois do início completa o objetivo uma única vez', () => {
    let s = startGame(
      governanceConfig(51, 'padrao', {
        objectives: [
          {
            id: 'l',
            title: 'Impostos baixos',
            description: 'd',
            metric: 'law_enacted',
            target: 'tax_low',
            deadline: null,
          },
        ],
      }),
    );
    expect(s.nation.objectives[0]!.status).toBe('active');
    s = structuredClone(s);
    federalLaws(s).enacted.taxation = 'tax_low';
    s = resolveBlockers(s).state;
    s = dispatch(s, { type: 'time/advance', step: 'month' }).state;
    expect(s.nation.objectives[0]!.status).toBe('completed');
    s = resolveBlockers(s).state;
    s = dispatch(s, { type: 'time/advance', step: 'month' }).state;
    expect(s.media.news.filter((n) => /cumpre meta/i.test(n.headline))).toHaveLength(1);
  });

  it('metas de manutenção cumpridas no prazo completam; descumpridas falham', () => {
    const report = simulateGovernance(
      governanceConfig(52, 'padrao', {
        objectives: [
          {
            id: 'ok',
            title: 'Desemprego baixo',
            description: 'd',
            metric: 'unemployment_max',
            target: 99,
            deadline: '2027-03-01',
          },
          {
            id: 'ruim',
            title: 'Inflação negativa',
            description: 'd',
            metric: 'inflation_max',
            target: -50,
            deadline: '2027-03-01',
          },
        ],
      }),
      4,
    );
    const byId = Object.fromEntries(report.state.nation.objectives.map((o) => [o.id, o]));
    expect(byId.ok!.status).toBe('completed');
    expect(byId.ruim!.status).toBe('failed');
    expect(Number.isFinite(byId.ruim!.progress)).toBe(true);
  });

  it('progresso e visão sempre finitos em 0..1, mesmo com alvos degenerados', () => {
    const metrics = [
      'manufacturing_share',
      'gdp_growth_avg',
      'unemployment_max',
      'inflation_max',
      'approval_min',
      'trade_balance_min',
      'industry_levels',
      'avg_wage_growth',
      'legitimacy_min',
      'bills_passed',
    ] as const;
    const objectives = metrics.flatMap((metric) =>
      [0, -5, 1e9].map((target, i) => ({
        id: `${metric}_${i}`,
        title: metric,
        description: 'd',
        metric,
        target,
        deadline: null,
      })),
    );
    const report = simulateGovernance(governanceConfig(53, 'padrao', { objectives }), 3);
    for (const v of objectivesView(report.state)) {
      expect(Number.isFinite(v.progress), v.id).toBe(true);
      expect(v.progress, v.id).toBeGreaterThanOrEqual(0);
      expect(v.progress, v.id).toBeLessThanOrEqual(1);
      expect(v.current === null || Number.isFinite(v.current), v.id).toBe(true);
    }
  });

  it('governa como senador, vereador e governador por 6 meses sem travar', () => {
    for (const [office, st] of [
      ['senador', 'PR'],
      ['vereador', 'MG'],
      ['governador', 'GO'],
    ] as const) {
      const report = simulateGovernance(
        { ...defaultConfig(61, office, st), startInOffice: true },
        6,
      );
      expect(report.stoppedReason, office).toBeNull();
      expect(report.completed, office).toBe(true);
    }
  });
});
