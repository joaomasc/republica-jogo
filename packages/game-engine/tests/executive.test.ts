import { describe, expect, it } from 'vitest';
import {
  activeDecreesView,
  aggregateEconomyModifiers,
  decreeLegalRisk,
  decreeOptions,
  dispatch,
  federalLaws,
  planView,
  startGame,
  type GameState,
} from '../src/index';
import { Rng } from '../src/core/rng';
import { BUILDINGS } from '../src/economy/industry/buildings.data';
import type { BuildingId } from '../src/economy/industry/types';
import { issueDecree, processExecutiveMonth, revokeDecree } from '../src/executive/executive';
import { defaultConfig } from './helpers';

function president(seed = 11): GameState {
  return startGame({ ...defaultConfig(seed, 'presidente', 'SP'), startInOffice: true });
}

/** Planta um edifício no estado (a economia industrial pode começar vazia nos testes). */
function plant(
  s: GameState,
  uf: 'SP' | 'MG',
  id: BuildingId,
  level: number,
  ownership: { private: number; state: number },
): void {
  s.industry.buildings[uf][id] = {
    level,
    methodId: BUILDINGS[id].methods[0]!.id,
    ownership: { private: ownership.private, state: ownership.state, cooperative: 0, foreign: 0 },
    staffing: 1,
    wageFactor: 1,
    productivity: 1,
    revenue: 0,
    inputCost: 0,
    wageBill: 0,
    profit: 0,
    avgMargin: 0,
    subsidy: 0,
    lossMonths: 0,
  };
}

function advanceMonths(s: GameState, months: number, rng = new Rng(5)): void {
  for (let i = 0; i < months; i++) {
    const [y, m, d] = s.date.split('-').map(Number);
    const next = new Date(Date.UTC(y!, m!, d!));
    s.date = next.toISOString().slice(0, 10);
    processExecutiveMonth(s, rng);
  }
}

describe('Executivo: validações', () => {
  it('só o Executivo federal edita decretos', () => {
    const gov = startGame({ ...defaultConfig(11, 'governador', 'SP'), startInOffice: true });
    expect(issueDecree(gov, 'ipi', 'consumer', -0.05).ok).toBe(false);
    const dep = startGame({ ...defaultConfig(11, 'deputado_federal', 'SP'), startInOffice: true });
    expect(issueDecree(dep, 'ipi', 'consumer', -0.05).ok).toBe(false);
  });

  it('exige capital político suficiente', () => {
    const s = president();
    s.government!.politicalCapital = 1;
    const out = issueDecree(s, 'price_freeze', 'fuel', null);
    expect(out.ok).toBe(false);
    expect(s.executive.decrees).toHaveLength(0);
    expect(s.government!.politicalCapital).toBe(1);
  });

  it('valida alvo e faixa de valor', () => {
    const s = president();
    expect(issueDecree(s, 'ipi', 'banana', -0.05).ok).toBe(false);
    expect(issueDecree(s, 'ipi', 'consumer', -0.9).ok).toBe(false);
    expect(issueDecree(s, 'subsidy', 'public', 20).ok).toBe(false);
    expect(issueDecree(s, 'export_ban', 'services', null).ok).toBe(false);
    expect(issueDecree(s, 'expropriation', 'XX:mine', null).ok).toBe(false);
    expect(s.executive.decrees).toHaveLength(0);
  });

  it('respeita o limite de decretos ativos', () => {
    const s = president();
    s.government!.politicalCapital = 100;
    const goods = ['grain', 'soy', 'meat', 'wood', 'iron_ore', 'oil', 'fuel', 'steel', 'chemicals', 'textiles', 'electronics', 'machinery', 'vehicles'] as const;
    let accepted = 0;
    for (const g of goods) {
      s.government!.politicalCapital = 100;
      if (issueDecree(s, 'export_ban', g, null).ok) accepted += 1;
    }
    expect(accepted).toBe(12);
    expect(s.executive.decrees).toHaveLength(12);
  });
});

describe('Executivo: efeitos dos decretos', () => {
  it('o decreto custa capital, vira modificador e entra no registro', () => {
    const s = president();
    const before = s.government!.politicalCapital;
    const out = issueDecree(s, 'tariff', 'consumer', 0.1);
    expect(out.ok).toBe(true);
    expect(s.government!.politicalCapital).toBeLessThan(before);
    expect(aggregateEconomyModifiers(s).tariffByCategory?.consumer).toBeCloseTo(0.1);
    expect(s.executive.log[0]?.text).toContain('Alíquota de importação');
    expect(activeDecreesView(s)).toHaveLength(1);
  });

  it('funciona também pela ação exec/decree e exec/revoke do dispatch', () => {
    const s = president();
    const out = dispatch(s, { type: 'exec/decree', kind: 'ipi', target: 'consumer', value: -0.05 });
    expect(out.result.ok).toBe(true);
    const id = out.state.executive.decrees[0]!.id;
    const revoked = dispatch(out.state, { type: 'exec/revoke', decreeId: id });
    expect(revoked.result.ok).toBe(true);
    expect(revoked.state.executive.decrees).toHaveLength(0);
  });

  it('subsídio e crédito apenas registram o decreto (o motor econômico paga)', () => {
    const s = president();
    const balance = s.government!.budget!.balance;
    expect(issueDecree(s, 'subsidy', 'manufacturing', 30).ok).toBe(true);
    expect(issueDecree(s, 'credit_line', 'high_tech', 2).ok).toBe(true);
    expect(s.government!.budget!.balance).toBe(balance);
    const mods = aggregateEconomyModifiers(s);
    expect(mods.subsidies?.manufacturing).toBe(30);
    expect(mods.creditSubsidy?.high_tech).toBe(2);
  });

  it('o decreto expira na data prevista', () => {
    const s = president();
    expect(issueDecree(s, 'ipi', 'consumer', -0.05).ok).toBe(true);
    const expires = s.executive.decrees[0]!.expiresOn!;
    // Sem risco de STF para o teste: IPI tem risco baixo, então usa um RNG que nunca sorteia.
    const never = { chance: () => false } as unknown as Rng;
    s.date = expires;
    processExecutiveMonth(s, never);
    expect(s.executive.decrees).toHaveLength(0);
    expect(aggregateEconomyModifiers(s).consumptionTaxByCategory?.consumer).toBeUndefined();
  });

  it('revogar remove o decreto', () => {
    const s = president();
    issueDecree(s, 'ipi', 'consumer', -0.05);
    const id = s.executive.decrees[0]!.id;
    expect(revokeDecree(s, id).ok).toBe(true);
    expect(revokeDecree(s, id).ok).toBe(false);
    expect(s.executive.decrees).toHaveLength(0);
  });

  it('calamidade: legitimidade cai, só uma por vez e dá amparo legal ao congelamento', () => {
    const s = president();
    const before = s.nation.legitimacy;
    const free = issueDecree(s, 'price_freeze', 'fuel', null);
    expect(free.ok).toBe(true);
    const uncovered = decreeLegalRisk(s, s.executive.decrees[0]!);
    expect(issueDecree(s, 'emergency', null, null).ok).toBe(true);
    expect(s.nation.legitimacy).toBeLessThan(before);
    expect(issueDecree(s, 'emergency', null, null).ok).toBe(false);
    expect(decreeLegalRisk(s, s.executive.decrees[0]!)).toBeLessThan(uncovered);
  });
});

describe('Executivo: Selic', () => {
  it('só com o Banco Central subordinado ao governo', () => {
    const s = president();
    const blocked = issueDecree(s, 'selic', null, 8);
    expect(blocked.ok).toBe(false);
    expect(s.executive.selicTarget).toBeNull();

    federalLaws(s).enacted.central_bank = 'cb_government';
    expect(aggregateEconomyModifiers(s).centralBank).toBe('government');
    const ok = issueDecree(s, 'selic', null, 8);
    expect(ok.ok).toBe(true);
    expect(s.executive.selicTarget).toBe(8);

    // Novo decreto de Selic substitui o anterior.
    s.government!.politicalCapital = 100;
    expect(issueDecree(s, 'selic', null, 6.5).ok).toBe(true);
    expect(s.executive.decrees.filter((d) => d.kind === 'selic')).toHaveLength(1);
    expect(s.executive.selicTarget).toBe(6.5);
  });

  it('a Selic é abandonada se o Banco Central volta a ser independente', () => {
    const s = president();
    federalLaws(s).enacted.central_bank = 'cb_government';
    issueDecree(s, 'selic', null, 8);
    federalLaws(s).enacted.central_bank = 'cb_independent';
    processExecutiveMonth(s, new Rng(1));
    expect(s.executive.selicTarget).toBeNull();
    expect(s.executive.decrees.some((d) => d.kind === 'selic')).toBe(false);
  });
});

describe('Executivo: risco jurídico e STF', () => {
  it('congelamento sem calamidade nem controle de preços tem risco alto', () => {
    const s = president();
    const out = issueDecree(s, 'price_freeze', 'fuel', null);
    expect(out.ok).toBe(true);
    expect(decreeLegalRisk(s, s.executive.decrees[0]!)).toBeGreaterThanOrEqual(0.1);
    expect(out.details?.join(' ')).toContain('Risco jurídico alto');
  });

  it('o STF suspende decretos arriscados, com notícia, alerta e desgaste', () => {
    const s = president();
    issueDecree(s, 'price_freeze', 'fuel', null);
    const legitimacy = s.nation.legitimacy;
    const rng = new Rng(3);
    for (let i = 0; i < 40 && !s.executive.decrees[0]?.suspended; i++) processExecutiveMonth(s, rng);
    const decree = s.executive.decrees[0]!;
    expect(decree.suspended).toBe(true);
    expect(s.nation.legitimacy).toBeLessThan(legitimacy);
    expect(s.media.news.some((n) => n.headline.includes('STF suspende'))).toBe(true);
    expect(s.alerts.some((a) => a.kind === 'decree_suspended')).toBe(true);
    // Suspenso, o decreto não vira modificador nem pode ser suspenso de novo.
    expect(aggregateEconomyModifiers(s).frozenGoods ?? []).not.toContain('fuel');
    expect(decreeLegalRisk(s, decree)).toBe(0);
  });
});

describe('Executivo: desapropriação e privatização', () => {
  it('desapropriar estatiza a fatia privada, indeniza e abala investidores', () => {
    const s = president();
    plant(s, 'SP', 'steel_mill', 4, { private: 1, state: 0 });
    s.industry.investmentPool = 100;
    s.industry.foreignPool = 50;
    const gov = s.government!;
    gov.politicalCapital = 100;
    const balance = gov.budget!.balance;
    const confidence = s.economy.confidence;
    const business = s.interestGroups.business.approval;

    const out = issueDecree(s, 'expropriation', 'SP:steel_mill', null);
    expect(out.ok).toBe(true);
    const bs = s.industry.buildings.SP.steel_mill!;
    expect(bs.ownership.private).toBe(0);
    expect(bs.ownership.state).toBeCloseTo(1);
    expect(gov.budget!.balance).toBeLessThan(balance);
    expect(s.economy.confidence).toBeLessThan(confidence);
    expect(s.industry.investmentPool).toBeLessThan(100);
    expect(s.industry.foreignPool).toBeLessThan(50);
    expect(s.interestGroups.business.approval).toBeLessThan(business);
    expect(s.executive.decrees).toHaveLength(0);
    expect(s.media.news.some((n) => n.headline.includes('desapropria'))).toBe(true);
  });

  it('desapropriar exige fatia privada e edifício existente', () => {
    const s = president();
    s.government!.politicalCapital = 100;
    delete s.industry.buildings.SP.steel_mill;
    expect(issueDecree(s, 'expropriation', 'SP:steel_mill', null).ok).toBe(false);
    plant(s, 'SP', 'steel_mill', 2, { private: 0, state: 1 });
    expect(issueDecree(s, 'expropriation', 'SP:steel_mill', null).ok).toBe(false);
  });

  it('privatizar vende a fatia estatal, gera receita única e irrita sindicatos', () => {
    const s = president();
    plant(s, 'MG', 'steel_mill', 4, { private: 0.2, state: 0.8 });
    const gov = s.government!;
    gov.politicalCapital = 100;
    const balance = gov.budget!.balance;
    const unions = s.interestGroups.unions.approval;

    const out = issueDecree(s, 'privatization', 'MG:steel_mill', null);
    expect(out.ok).toBe(true);
    const bs = s.industry.buildings.MG.steel_mill!;
    expect(bs.ownership.state).toBeLessThan(0.05);
    expect(bs.ownership.private).toBeGreaterThan(0.95);
    expect(gov.budget!.balance).toBeGreaterThan(balance);
    expect(s.interestGroups.unions.approval).toBeLessThan(unions);
  });

  it('serviços públicos não são privatizáveis nem desapropriáveis', () => {
    const s = president();
    s.government!.politicalCapital = 100;
    plant(s, 'SP', 'hospital', 3, { private: 0, state: 1 });
    expect(issueDecree(s, 'privatization', 'SP:hospital', null).ok).toBe(false);
  });
});

describe('Executivo: seletores', () => {
  it('decreeOptions informa disponibilidade, motivos, alvos e faixas', () => {
    const s = president();
    const options = decreeOptions(s);
    expect(options.map((o) => o.kind)).toContain('selic');
    const selic = options.find((o) => o.kind === 'selic')!;
    expect(selic.available).toBe(false);
    expect(selic.reason).toBeTruthy();
    const ipi = options.find((o) => o.kind === 'ipi')!;
    expect(ipi.available).toBe(true);
    expect(ipi.targets.length).toBeGreaterThan(0);
    expect(ipi.targets[0]!.label).toBeTruthy();
    expect(ipi.value?.min).toBeLessThan(0);
    expect(ipi.cost).toBeGreaterThan(0);
  });

  it('decreeOptions indica quando o jogador não é o Executivo federal', () => {
    const gov = startGame({ ...defaultConfig(11, 'governador', 'SP'), startInOffice: true });
    expect(decreeOptions(gov).every((o) => !o.available)).toBe(true);
  });

  it('activeDecreesView e planView refletem o estado', () => {
    const s = president();
    expect(activeDecreesView(s)).toHaveLength(0);
    issueDecree(s, 'export_ban', 'soy', null);
    const view = activeDecreesView(s);
    expect(view).toHaveLength(1);
    expect(view[0]!.name).toBeTruthy();
    const plan = planView(s);
    expect(plan).toBeDefined();
  });
});

describe('Executivo: determinismo', () => {
  it('mesma semente, mesmo resultado', () => {
    const run = () => {
      const s = president(21);
      issueDecree(s, 'price_freeze', 'fuel', null);
      issueDecree(s, 'tariff', 'consumer', 0.3);
      advanceMonths(s, 18, new Rng(9));
      return JSON.stringify(s.executive);
    };
    expect(run()).toBe(run());
  });
});

describe('Executivo: revisão adversarial', () => {
  it('alíquota sem variação (ou que arredonda para zero) é recusada e não gasta capital', () => {
    const s = president();
    const capital = s.government!.politicalCapital;
    expect(issueDecree(s, 'tariff', 'consumer', 0).ok).toBe(false);
    expect(issueDecree(s, 'ipi', 'consumer', -0.001).ok).toBe(false);
    expect(s.government!.politicalCapital).toBe(capital);
    expect(s.executive.decrees).toHaveLength(0);
  });

  it('valores não finitos são recusados e o rótulo nunca mostra zero negativo', () => {
    const s = president();
    expect(issueDecree(s, 'subsidy', 'agro', Number.NaN).ok).toBe(false);
    expect(issueDecree(s, 'subsidy', 'agro', Number.POSITIVE_INFINITY).ok).toBe(false);
    expect(issueDecree(s, 'tariff', 'consumer', -0.05).ok).toBe(true);
    expect(s.executive.decrees[0]!.label).not.toContain('-0 p.p.');
    expect(Object.is(s.executive.decrees[0]!.value, -0)).toBe(false);
  });

  it('o valor é ajustado ao passo permitido', () => {
    const s = president();
    expect(issueDecree(s, 'subsidy', 'agro', 22).ok).toBe(true);
    expect(s.executive.decrees[0]!.value).toBe(20);
  });

  it('calamidade suspensa pelo STF não impede um novo decreto de calamidade', () => {
    const s = president();
    s.government!.politicalCapital = 100;
    expect(issueDecree(s, 'emergency', null, null).ok).toBe(true);
    s.executive.decrees[0]!.suspended = true;
    s.executive.decrees[0]!.suspendedOn = s.date;
    expect(aggregateEconomyModifiers(s).emergency).toBeFalsy();
    expect(issueDecree(s, 'emergency', null, null).ok).toBe(true);
    expect(s.executive.decrees.filter((d) => d.kind === 'emergency')).toHaveLength(1);
    expect(s.executive.decrees[0]!.suspended).toBe(false);
  });

  it('Selic sem valor informado parte da taxa vigente, não de um padrão fixo', () => {
    const s = president();
    federalLaws(s).enacted.central_bank = 'cb_government';
    s.economy.interestRate = 14.1;
    expect(issueDecree(s, 'selic', null, null).ok).toBe(true);
    expect(s.executive.selicTarget).toBe(14);
  });

  it('decreto suspenso é arquivado depois de alguns meses e libera o limite', () => {
    const s = president();
    issueDecree(s, 'price_freeze', 'fuel', null);
    const d = s.executive.decrees[0]!;
    d.suspended = true;
    d.suspendedOn = s.date;
    const never = { chance: () => false } as unknown as Rng;
    advanceMonths(s, 1, never);
    expect(s.executive.decrees).toHaveLength(1);
    advanceMonths(s, 4, never);
    expect(s.executive.decrees).toHaveLength(0);
  });

  it('desapropriação preserva as outras fatias e a soma da propriedade fecha em 1', () => {
    const s = president();
    plant(s, 'SP', 'steel_mill', 3, { private: 0.5, state: 0.1 });
    const bs = s.industry.buildings.SP.steel_mill!;
    bs.ownership.cooperative = 0.1;
    bs.ownership.foreign = 0.3;
    s.government!.politicalCapital = 100;
    expect(issueDecree(s, 'expropriation', 'SP:steel_mill', null).ok).toBe(true);
    const o = bs.ownership;
    expect(o.private).toBe(0);
    expect(o.state).toBeCloseTo(0.6, 9);
    expect(o.cooperative).toBeCloseTo(0.1, 9);
    expect(o.foreign).toBeCloseTo(0.3, 9);
    expect(o.private + o.state + o.cooperative + o.foreign).toBeCloseTo(1, 9);
  });

  it('o valor da indenização acompanha a receita registrada e a fatia expropriada', () => {
    const a = president();
    const b = president();
    plant(a, 'SP', 'steel_mill', 4, { private: 1, state: 0 });
    plant(b, 'SP', 'steel_mill', 4, { private: 0.5, state: 0.5 });
    a.industry.buildings.SP.steel_mill!.revenue = 20;
    b.industry.buildings.SP.steel_mill!.revenue = 20;
    for (const s of [a, b]) s.government!.politicalCapital = 100;
    const balanceA = a.government!.budget!.balance;
    const balanceB = b.government!.budget!.balance;
    issueDecree(a, 'expropriation', 'SP:steel_mill', null);
    issueDecree(b, 'expropriation', 'SP:steel_mill', null);
    const paidA = balanceA - a.government!.budget!.balance;
    const paidB = balanceB - b.government!.budget!.balance;
    expect(paidA).toBeGreaterThan(0);
    expect(paidA / paidB).toBeCloseTo(2, 6);
  });

  it('atos instantâneos recusados não mexem em capital, caixa nem propriedade', () => {
    const s = president();
    plant(s, 'SP', 'steel_mill', 4, { private: 0.01, state: 0.99 });
    const gov = s.government!;
    const capital = gov.politicalCapital;
    const balance = gov.budget!.balance;
    expect(issueDecree(s, 'expropriation', 'SP:steel_mill', null).ok).toBe(false);
    gov.politicalCapital = 1;
    expect(issueDecree(s, 'privatization', 'SP:steel_mill', null).ok).toBe(false);
    expect(gov.budget!.balance).toBe(balance);
    expect(gov.politicalCapital).toBe(1);
    expect(s.industry.buildings.SP.steel_mill!.ownership.state).toBeCloseTo(0.99, 9);
    expect(capital).toBeGreaterThan(1);
  });

  it('a privatização respeita a participação estatal mínima exigida pela lei', () => {
    const s = president();
    federalLaws(s).enacted.economic_system = 'econ_developmental';
    plant(s, 'SP', 'oil_field', 4, { private: 0.1, state: 0.9 });
    s.government!.politicalCapital = 100;
    expect(issueDecree(s, 'privatization', 'SP:oil_field', null).ok).toBe(true);
    const o = s.industry.buildings.SP.oil_field!.ownership;
    expect(o.state).toBeCloseTo(0.5, 9);
    expect(o.private + o.state + o.cooperative + o.foreign).toBeCloseTo(1, 9);
    // Já no piso: nada mais a vender.
    expect(issueDecree(s, 'privatization', 'SP:oil_field', null).ok).toBe(false);
  });

  it('decretos de quem não governa mais o país são encerrados no tick mensal', () => {
    const s = president();
    issueDecree(s, 'tariff', 'consumer', 0.1);
    expect(s.executive.decrees).toHaveLength(1);
    s.government!.branch = 'legislative';
    processExecutiveMonth(s, new Rng(1));
    expect(s.executive.decrees).toHaveLength(0);
    expect(s.executive.selicTarget).toBeNull();
  });

  it('o risco mensal de suspensão nunca passa do teto', () => {
    const s = president();
    s.government!.politicalCapital = 100;
    issueDecree(s, 'price_freeze', 'fuel', null);
    const risk = decreeLegalRisk(s, s.executive.decrees[0]!);
    expect(risk).toBeLessThanOrEqual(0.6);
    expect(risk).toBeGreaterThan(0);
  });

  it('a mensagem de faixa mostra alíquotas na mesma escala do rótulo (p.p.)', () => {
    const s = president();
    const out = issueDecree(s, 'tariff', 'consumer', 0.9);
    expect(out.ok).toBe(false);
    expect(out.message).toContain('35 p.p.');
    expect(out.message).not.toContain('0,35');
  });
});
