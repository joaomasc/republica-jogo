import { describe, expect, it } from 'vitest';
import {
  CAUCUSES,
  CAUCUS_IDS,
  INTEREST_GROUP_SEEDS,
  LAW_CATEGORIES,
  PROPOSALS,
  defaultLaws,
  getLawCategory,
  getLawOption,
  type PromiseTarget,
} from '../src/index';

/** Ids fechados do catálogo (docs/DESIGN_NACAO.md, seção 4), na ordem do design. */
const EXPECTED: Record<string, { branch: string; instrument: string; options: string[] }> = {
  regime: {
    branch: 'estado',
    instrument: 'pec',
    options: ['reg_presidential', 'reg_semi_presidential', 'reg_parliamentary', 'reg_one_party'],
  },
  electoral_system: {
    branch: 'estado',
    instrument: 'pec',
    options: ['elec_open_list', 'elec_closed_list', 'elec_district'],
  },
  federalism: {
    branch: 'estado',
    instrument: 'pec',
    options: ['fed_current', 'fed_decentralized', 'fed_centralized'],
  },
  institutions: {
    branch: 'estado',
    instrument: 'pec',
    options: ['inst_current', 'inst_transparency', 'inst_strong_executive', 'inst_participatory'],
  },
  central_bank: {
    branch: 'estado',
    instrument: 'plp',
    options: ['cb_independent', 'cb_dual_mandate', 'cb_government'],
  },
  media: {
    branch: 'estado',
    instrument: 'pl',
    options: ['media_free', 'media_regulated', 'media_state'],
  },
  administration: {
    branch: 'estado',
    instrument: 'pl',
    options: ['adm_current', 'adm_lean', 'adm_digital', 'adm_expanded'],
  },
  economic_system: {
    branch: 'economia',
    instrument: 'pec',
    options: [
      'econ_laissez_faire',
      'econ_mixed',
      'econ_developmental',
      'econ_cooperative',
      'econ_planned',
    ],
  },
  taxation: {
    branch: 'economia',
    instrument: 'pl',
    options: ['tax_low', 'tax_mixed', 'tax_progressive', 'tax_wealth'],
  },
  trade: {
    branch: 'economia',
    instrument: 'pl',
    options: ['trade_open', 'trade_mixed', 'trade_protectionist', 'trade_isi', 'trade_autarky'],
  },
  industrial_policy: {
    branch: 'economia',
    instrument: 'pl',
    options: ['ind_neutral', 'ind_incentives', 'ind_bndes', 'ind_local_content', 'ind_national_plan'],
  },
  resources: {
    branch: 'economia',
    instrument: 'pl',
    options: ['res_concession', 'res_sharing', 'res_monopoly'],
  },
  banking: {
    branch: 'economia',
    instrument: 'plp',
    options: ['bank_liberal', 'bank_regulated', 'bank_public', 'bank_nationalized'],
  },
  labor: {
    branch: 'economia',
    instrument: 'pl',
    options: [
      'labor_deregulated',
      'labor_flexible',
      'labor_clt',
      'labor_protective',
      'labor_councils',
    ],
  },
  minimum_wage: {
    branch: 'economia',
    instrument: 'pl',
    options: ['mw_none', 'mw_low', 'mw_valorization', 'mw_high'],
  },
  unions: {
    branch: 'economia',
    instrument: 'pl',
    options: ['unions_banned', 'unions_restricted', 'unions_free', 'unions_corporatist'],
  },
  land: {
    branch: 'economia',
    instrument: 'pl',
    options: ['land_latifundio', 'land_current', 'land_reform', 'land_collective'],
  },
  pensions: {
    branch: 'economia',
    instrument: 'pec',
    options: ['pen_current', 'pen_reform', 'pen_capitalization', 'pen_expanded'],
  },
  environment: {
    branch: 'economia',
    instrument: 'pl',
    options: ['env_current', 'env_strict', 'env_flexible', 'env_green_economy'],
  },
  infrastructure: {
    branch: 'economia',
    instrument: 'pl',
    options: ['infra_public', 'infra_concessions', 'infra_ppp', 'infra_big_plan'],
  },
  education: {
    branch: 'sociedade',
    instrument: 'pl',
    options: ['edu_public', 'edu_fulltime', 'edu_vouchers', 'edu_tech'],
  },
  healthcare: {
    branch: 'sociedade',
    instrument: 'pl',
    options: ['health_universal', 'health_expanded', 'health_mixed', 'health_private'],
  },
  security: {
    branch: 'sociedade',
    instrument: 'pl',
    options: ['sec_balanced', 'sec_punitive', 'sec_preventive', 'sec_intelligence'],
  },
  welfare: {
    branch: 'sociedade',
    instrument: 'pl',
    options: ['wel_none', 'wel_targeted', 'wel_expanded', 'wel_universal_income'],
  },
  science: {
    branch: 'sociedade',
    instrument: 'pl',
    options: ['sci_minimal', 'sci_current', 'sci_innovation_state'],
  },
};

const DEFAULTS: Record<string, string> = {
  regime: 'reg_presidential',
  electoral_system: 'elec_open_list',
  federalism: 'fed_current',
  institutions: 'inst_current',
  central_bank: 'cb_independent',
  media: 'media_free',
  administration: 'adm_current',
  economic_system: 'econ_mixed',
  taxation: 'tax_mixed',
  trade: 'trade_mixed',
  industrial_policy: 'ind_incentives',
  resources: 'res_sharing',
  banking: 'bank_regulated',
  labor: 'labor_clt',
  minimum_wage: 'mw_valorization',
  unions: 'unions_free',
  land: 'land_current',
  pensions: 'pen_current',
  environment: 'env_current',
  infrastructure: 'infra_public',
  education: 'edu_public',
  healthcare: 'health_universal',
  security: 'sec_balanced',
  welfare: 'wel_targeted',
  science: 'sci_current',
};

const BRANCH_ORDER = ['estado', 'economia', 'sociedade'];

/** Categorias que continuam abertas a estados/municípios (seção 4 do design). */
const SUBNATIONAL = [
  'taxation',
  'education',
  'healthcare',
  'security',
  'administration',
  'infrastructure',
  'environment',
];

function optionExists(categoryId: string, optionId: string): boolean {
  return getLawOption(categoryId, optionId) !== undefined;
}

function promiseRefs(p: PromiseTarget): { categoryId: string; optionIds: string[] } | null {
  if (p.kind === 'law') return { categoryId: p.categoryId, optionIds: p.optionIds };
  if (p.kind === 'noLaw') return { categoryId: p.categoryId, optionIds: p.forbiddenOptionIds };
  if (p.kind === 'billProposed') return { categoryId: p.categoryId, optionIds: [] };
  return null;
}

function mods(id: string) {
  for (const c of LAW_CATEGORIES) {
    const o = c.options.find((x) => x.id === id);
    if (o) return o.modifiers ?? {};
  }
  throw new Error(`opção inexistente: ${id}`);
}

describe('Catálogo de leis (Nação)', () => {
  it('tem exatamente as 25 categorias e as opções do design', () => {
    expect(LAW_CATEGORIES).toHaveLength(25);
    expect(LAW_CATEGORIES.map((c) => c.id)).toEqual(Object.keys(EXPECTED));
    for (const cat of LAW_CATEGORIES) {
      const exp = EXPECTED[cat.id]!;
      expect(cat.options.map((o) => o.id), cat.id).toEqual(exp.options);
      expect(cat.branch, cat.id).toBe(exp.branch);
      expect(cat.instrument, cat.id).toBe(exp.instrument);
    }
  });

  it('segue a ordem dos ramos (estado, economia, sociedade) e tem os três', () => {
    const idx = LAW_CATEGORIES.map((c) => BRANCH_ORDER.indexOf(c.branch));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    expect(new Set(LAW_CATEGORIES.map((c) => c.branch))).toEqual(new Set(BRANCH_ORDER));
  });

  it('padrões são os do design e existem; defaultLaws cobre todas as categorias', () => {
    expect(defaultLaws()).toEqual(DEFAULTS);
    for (const cat of LAW_CATEGORIES) {
      expect(
        cat.options.some((o) => o.id === cat.defaultOptionId),
        cat.id,
      ).toBe(true);
      expect(getLawCategory(cat.id)).toBe(cat);
    }
  });

  it('ids de opção são únicos no catálogo inteiro', () => {
    const ids = LAW_CATEGORIES.flatMap((c) => c.options.map((o) => o.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('constitutional === (instrument === "pec"); MP só em lei ordinária', () => {
    for (const cat of LAW_CATEGORIES) {
      expect(cat.constitutional, cat.id).toBe(cat.instrument === 'pec');
      if (cat.allowsMP) expect(cat.instrument, cat.id).toBe('pl');
    }
    const mp = LAW_CATEGORIES.filter((c) => c.allowsMP).map((c) => c.id);
    expect(mp.sort()).toEqual(['industrial_policy', 'minimum_wage', 'trade', 'welfare']);
  });

  it('toda categoria inclui a esfera federal; categorias novas são só federais', () => {
    for (const cat of LAW_CATEGORIES) expect(cat.levels, cat.id).toContain('federal');
    for (const id of SUBNATIONAL) {
      expect(getLawCategory(id)!.levels.length, id).toBeGreaterThan(1);
    }
    for (const id of [
      'regime',
      'electoral_system',
      'central_bank',
      'media',
      'economic_system',
      'trade',
      'industrial_policy',
      'resources',
      'banking',
      'minimum_wage',
      'unions',
      'land',
      'welfare',
      'science',
    ]) {
      expect(getLawCategory(id)!.levels, id).toEqual(['federal']);
    }
  });

  it('toda categoria tem >= 3 opções e metadados completos', () => {
    for (const cat of LAW_CATEGORIES) {
      expect(cat.options.length, cat.id).toBeGreaterThanOrEqual(3);
      expect(cat.name.length, cat.id).toBeGreaterThan(0);
      expect(cat.description.length, cat.id).toBeGreaterThan(0);
      expect(cat.icon, cat.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      for (const o of cat.options) {
        expect(o.name.length, o.id).toBeGreaterThan(0);
        expect(o.description.length, o.id).toBeGreaterThan(0);
        expect(Object.keys(o.ideology).length, o.id).toBeGreaterThan(0);
      }
    }
  });

  it('custo político em 10–100 e implementação em 3–24 meses', () => {
    for (const cat of LAW_CATEGORIES) {
      for (const o of cat.options) {
        expect(o.politicalCost, o.id).toBeGreaterThanOrEqual(10);
        expect(o.politicalCost, o.id).toBeLessThanOrEqual(100);
        expect(o.implementationMonths, o.id).toBeGreaterThanOrEqual(3);
        expect(o.implementationMonths, o.id).toBeLessThanOrEqual(24);
      }
    }
  });

  it('pops em −15..+15, grupos em −40..+20 e bancadas em −10..+10 com chaves válidas', () => {
    for (const cat of LAW_CATEGORIES) {
      for (const o of cat.options) {
        for (const v of Object.values(o.pops)) {
          expect(v, o.id).toBeGreaterThanOrEqual(-15);
          expect(v, o.id).toBeLessThanOrEqual(15);
        }
        for (const v of Object.values(o.groups)) {
          expect(v, o.id).toBeGreaterThanOrEqual(-40);
          expect(v, o.id).toBeLessThanOrEqual(20);
        }
        for (const [k, v] of Object.entries(o.caucuses ?? {})) {
          expect((CAUCUS_IDS as readonly string[]).includes(k), `${o.id}:${k}`).toBe(true);
          expect(v, o.id).toBeGreaterThanOrEqual(-10);
          expect(v, o.id).toBeLessThanOrEqual(10);
        }
      }
    }
  });

  it('requires apontam para opções existentes e os requisitos do design valem', () => {
    const all = new Set(LAW_CATEGORIES.flatMap((c) => c.options.map((o) => o.id)));
    for (const cat of LAW_CATEGORIES) {
      for (const o of cat.options) {
        for (const r of o.requires ?? []) expect(all.has(r), `${o.id} requer ${r}`).toBe(true);
        if (o.id === cat.defaultOptionId) expect(o.requires ?? [], o.id).toEqual([]);
      }
    }
    const req = (cat: string, id: string) => [...(getLawOption(cat, id)!.requires ?? [])].sort();
    expect(req('labor', 'labor_councils')).toEqual(['econ_cooperative', 'econ_planned']);
    expect(req('land', 'land_collective')).toEqual(['econ_cooperative', 'econ_planned']);
    expect(req('industrial_policy', 'ind_national_plan')).toEqual([
      'econ_developmental',
      'econ_planned',
    ]);
    expect(req('regime', 'reg_one_party')).toEqual([]);
  });

  it('opções não padrão têm ganhadores e perdedores (pops ou grupos)', () => {
    for (const cat of LAW_CATEGORIES) {
      for (const o of cat.options) {
        if (o.id === cat.defaultOptionId) continue;
        const vals = [...Object.values(o.pops), ...Object.values(o.groups)];
        expect(
          vals.some((v) => v > 0),
          `${o.id} sem ganhadores`,
        ).toBe(true);
        expect(
          vals.some((v) => v < 0),
          `${o.id} sem perdedores`,
        ).toBe(true);
      }
    }
  });

  it('regimes: plebiscito, special e choque de legitimidade do partido único', () => {
    const cat = getLawCategory('regime')!;
    const specials: Record<string, string> = {
      reg_presidential: 'presidential',
      reg_semi_presidential: 'semi_presidential',
      reg_parliamentary: 'parliamentary',
      reg_one_party: 'one_party',
    };
    for (const o of cat.options) {
      expect(o.special, o.id).toBe(specials[o.id]);
      if (o.id !== cat.defaultOptionId) expect(o.plebiscite, o.id).toBe(true);
    }
    const one = getLawOption('regime', 'reg_one_party')!;
    expect(one.tags).toContain('authoritarian');
    expect(one.legitimacyShock ?? 0).toBeLessThanOrEqual(-20);
    expect(one.politicalCost).toBeGreaterThanOrEqual(90);
  });

  it('banco central define o modo e o controle do governo reduz a confiança', () => {
    expect(mods('cb_independent').centralBank).toBe('independent');
    expect(mods('cb_dual_mandate').centralBank).toBe('dual');
    expect(mods('cb_government').centralBank).toBe('government');
    expect(getLawOption('central_bank', 'cb_government')!.economy.confidence ?? 0).toBeLessThan(0);
  });

  it('modificadores de referência da tabela 4.1 mantêm a direção', () => {
    expect(mods('econ_laissez_faire').banStateIndustry).toBe(true);
    expect(mods('econ_planned').banPrivateInvestment).toBe(true);
    expect(mods('econ_planned').priceControls).toBe(true);
    expect(mods('econ_cooperative').newPrivateAsCooperative).toBe(true);
    expect(mods('trade_open').tradeOpenness ?? 1).toBeGreaterThan(1);
    expect(mods('trade_autarky').tradeOpenness ?? 1).toBeLessThan(0.2);
    expect(mods('mw_none').minimumWage).toBe(0);
    expect(mods('mw_high').minimumWage ?? 0).toBeGreaterThan(mods('mw_valorization').minimumWage ?? 0);
    expect(mods('mw_valorization').minimumWage ?? 0).toBeGreaterThan(mods('mw_low').minimumWage ?? 1);
    expect(mods('labor_deregulated').laborFlexibility ?? 1).toBeGreaterThan(
      mods('labor_flexible').laborFlexibility ?? 1,
    );
    expect(mods('land_reform').landReform ?? 0).toBeGreaterThan(0);
    expect(mods('land_collective').landReform ?? 0).toBeGreaterThan(mods('land_reform').landReform ?? 0);
    expect(mods('res_monopoly').resourceStateShare).toBe(1);
    expect(mods('sci_innovation_state').techRate ?? 1).toBeGreaterThan(1);
    expect(mods('sci_minimal').techRate ?? 1).toBeLessThan(1);
  });

  it('opções com modifiers não duplicam efeitos macro (só confiança e inflação)', () => {
    for (const cat of LAW_CATEGORIES) {
      for (const o of cat.options) {
        if (!o.modifiers || Object.keys(o.modifiers).length === 0) continue;
        expect(o.economy.growth ?? 0, o.id).toBe(0);
        expect(o.economy.unemployment ?? 0, o.id).toBe(0);
        expect(o.economy.investment ?? 0, o.id).toBe(0);
        expect(o.economy.revenue ?? 0, o.id).toBe(0);
      }
    }
  });

  it('as opções de uma categoria usam os mesmos eixos ideológicos', () => {
    for (const cat of LAW_CATEGORIES) {
      const sets = cat.options.map((o) => Object.keys(o.ideology).sort().join(','));
      expect(new Set(sets).size, cat.id).toBe(1);
    }
  });
});

describe('Referências ao catálogo', () => {
  it('preferredLaws dos grupos de interesse apontam para opções existentes', () => {
    for (const g of INTEREST_GROUP_SEEDS) {
      for (const [cat, opt] of Object.entries(g.preferredLaws ?? {})) {
        expect(optionExists(cat, opt), `${g.id}: ${cat}/${opt}`).toBe(true);
      }
    }
  });

  it('grupos cobrem as preferências esperadas pelo design', () => {
    const want: Record<string, Record<string, string>> = {
      business: {
        taxation: 'tax_low',
        labor: 'labor_flexible',
        banking: 'bank_liberal',
        central_bank: 'cb_independent',
        economic_system: 'econ_laissez_faire',
      },
      unions: { labor: 'labor_protective', minimum_wage: 'mw_high', unions: 'unions_free' },
      agribusiness: { land: 'land_latifundio', environment: 'env_flexible', trade: 'trade_open' },
      industry: {
        trade: 'trade_protectionist',
        industrial_policy: 'ind_bndes',
        economic_system: 'econ_developmental',
      },
      social_movements: { land: 'land_reform', welfare: 'wel_expanded', environment: 'env_strict' },
      tech: { science: 'sci_innovation_state', education: 'edu_tech' },
      civil_servants: { administration: 'adm_expanded', pensions: 'pen_current' },
      retirees: { pensions: 'pen_expanded' },
      youth: { education: 'edu_fulltime', welfare: 'wel_expanded' },
      workers: { minimum_wage: 'mw_high', labor: 'labor_protective' },
      commerce: { taxation: 'tax_low', trade: 'trade_open' },
    };
    for (const [gid, laws] of Object.entries(want)) {
      const g = INTEREST_GROUP_SEEDS.find((x) => x.id === gid)!;
      for (const [cat, opt] of Object.entries(laws)) {
        expect(g.preferredLaws?.[cat], `${gid}:${cat}`).toBe(opt);
      }
    }
  });

  it('preferredLaws/opposedLaws das bancadas apontam para opções existentes', () => {
    for (const c of Object.values(CAUCUSES)) {
      for (const [cat, opt] of Object.entries(c.preferredLaws)) {
        expect(optionExists(cat, opt), `${c.id}: ${cat}/${opt}`).toBe(true);
      }
      for (const [cat, opts] of Object.entries(c.opposedLaws)) {
        for (const opt of opts) expect(optionExists(cat, opt), `${c.id}: ${cat}/${opt}`).toBe(true);
      }
    }
  });

  it('propostas com promessa de lei apontam para categorias e opções existentes', () => {
    const ids = PROPOSALS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PROPOSALS) {
      for (const target of [p.promise, p.legislativePromise]) {
        if (!target) continue;
        const ref = promiseRefs(target);
        if (!ref) continue;
        expect(getLawCategory(ref.categoryId), `${p.id}: ${ref.categoryId}`).toBeDefined();
        for (const opt of ref.optionIds) {
          expect(optionExists(ref.categoryId, opt), `${p.id}: ${ref.categoryId}/${opt}`).toBe(true);
        }
      }
    }
  });

  it('há propostas federais ligadas às leis da expansão, com pares opostos', () => {
    const promised = new Set<string>();
    for (const p of PROPOSALS) {
      if (!p.levels.includes('federal')) continue;
      if (p.promise.kind === 'law') p.promise.optionIds.forEach((o) => promised.add(o));
    }
    const wanted = [
      'land_reform',
      'res_monopoly',
      'trade_open',
      'ind_bndes',
      'wel_universal_income',
      'mw_high',
      'econ_laissez_faire',
      'econ_cooperative',
      'reg_parliamentary',
      // pares em direção oposta
      'land_latifundio',
      'res_concession',
      'cb_government',
      'mw_low',
      'econ_planned',
    ];
    for (const id of wanted) expect(promised.has(id), id).toBe(true);
    // Banco Central independente é o padrão: a promessa é não mudar para o controle do governo.
    const cb = PROPOSALS.find((p) => p.id === 'independent_central_bank')!;
    expect(cb.promise.kind).toBe('noLaw');
    expect(cb.levels).toEqual(['federal']);
  });
});

describe('Catálogo de leis: revisão adversarial', () => {
  const allOptions = LAW_CATEGORIES.flatMap((c) =>
    c.options.map((o) => ({ cat: c, o, isDefault: o.id === c.defaultOptionId })),
  );

  function numbersIn(v: unknown, path: string, out: { path: string; n: number }[]) {
    if (typeof v === 'number') out.push({ path, n: v });
    else if (Array.isArray(v)) v.forEach((x, i) => numbersIn(x, `${path}[${i}]`, out));
    else if (v && typeof v === 'object')
      for (const [k, x] of Object.entries(v)) numbersIn(x, `${path}.${k}`, out);
  }

  it('todos os números do catálogo são finitos e a ideologia fica em 0..100', () => {
    for (const { o } of allOptions) {
      const nums: { path: string; n: number }[] = [];
      numbersIn(o, o.id, nums);
      for (const { path, n } of nums) expect(Number.isFinite(n), path).toBe(true);
      for (const [axis, v] of Object.entries(o.ideology)) {
        expect(v, `${o.id}.${axis}`).toBeGreaterThanOrEqual(0);
        expect(v, `${o.id}.${axis}`).toBeLessThanOrEqual(100);
      }
      for (const v of Object.values(o.budget)) {
        expect(v, o.id).toBeGreaterThanOrEqual(-1);
        expect(v, o.id).toBeLessThanOrEqual(3);
      }
    }
  });

  it('opção padrão é a linha de base: sem efeitos em Pops, grupos, bancadas nem legitimidade', () => {
    for (const { o, isDefault } of allOptions) {
      if (!isDefault) continue;
      expect(Object.keys(o.pops), o.id).toEqual([]);
      expect(Object.keys(o.groups), o.id).toEqual([]);
      expect(Object.keys(o.caucuses ?? {}), o.id).toEqual([]);
      expect(Object.keys(o.budget), o.id).toEqual([]);
      expect(o.plebiscite ?? false, o.id).toBe(false);
      expect(o.legitimacyShock ?? 0, o.id).toBe(0);
    }
  });

  it('nenhuma opção não padrão é um "almoço grátis": as perdas somam pelo menos 6 pontos', () => {
    for (const { o, isDefault } of allOptions) {
      if (isDefault) continue;
      const losses = [...Object.values(o.pops), ...Object.values(o.groups)]
        .filter((v) => v < 0)
        .reduce((a, v) => a - v, 0);
      expect(losses, o.id).toBeGreaterThanOrEqual(6);
    }
  });

  it('só opções de regime têm plebiscito e só elas têm special', () => {
    for (const { cat, o } of allOptions) {
      if (cat.id !== 'regime') {
        expect(o.plebiscite ?? false, o.id).toBe(false);
        expect(o.special, o.id).toBeUndefined();
      }
    }
  });

  it('bancadas: opção preferida (não padrão) soma apoio e as opostas perdem apoio', () => {
    for (const c of Object.values(CAUCUSES)) {
      for (const [cat, opt] of Object.entries(c.preferredLaws)) {
        if (getLawCategory(cat)!.defaultOptionId === opt) continue;
        const v = getLawOption(cat, opt)!.caucuses?.[c.id] ?? 0;
        expect(v, `${c.id} prefere ${opt}`).toBeGreaterThan(0);
      }
      for (const [cat, opts] of Object.entries(c.opposedLaws)) {
        for (const opt of opts) {
          const v = getLawOption(cat, opt)!.caucuses?.[c.id] ?? 0;
          expect(v, `${c.id} rejeita ${opt}`).toBeLessThan(0);
        }
      }
    }
  });

  it('grupos: a opção preferida (não padrão) aumenta a aprovação do próprio grupo', () => {
    for (const g of INTEREST_GROUP_SEEDS) {
      for (const [cat, opt] of Object.entries(g.preferredLaws ?? {})) {
        if (getLawCategory(cat)!.defaultOptionId === opt) continue;
        const v = (getLawOption(cat, opt)!.groups as Record<string, number | undefined>)[g.id] ?? 0;
        expect(v, `${g.id} prefere ${opt}`).toBeGreaterThan(0);
      }
    }
  });

  it('promessas das propostas só citam categorias em que a esfera da proposta legisla', () => {
    for (const p of PROPOSALS) {
      for (const target of [p.promise, p.legislativePromise]) {
        if (!target) continue;
        const ref = promiseRefs(target);
        if (!ref) continue;
        const cat = getLawCategory(ref.categoryId)!;
        for (const level of p.levels) {
          expect(cat.levels, `${p.id} (${level}) → ${ref.categoryId}`).toContain(level);
        }
        // Promessa de lei com opção já vigente por padrão seria cumprida de graça.
        if (target.kind === 'law') {
          expect(target.optionIds, p.id).not.toContain(cat.defaultOptionId);
        }
      }
    }
  });

  it('deslocamento ideológico das propostas de instituições segue o eixo (baixo = centralização)', () => {
    const shift = (id: string) => PROPOSALS.find((p) => p.id === id)!.ideologyShift.institutions ?? 0;
    // Executivo forte tem institutions baixo (10); parlamentarismo distribui o poder (72).
    expect(shift('strong_presidency')).toBeLessThan(0);
    expect(shift('parliamentarism')).toBeGreaterThan(0);
    expect(shift('government_central_bank')).toBeLessThan(0);
    expect(shift('independent_central_bank')).toBeGreaterThan(0);
  });
});
