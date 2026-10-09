import { describe, expect, it } from 'vitest';
import {
  countryIdentity,
  federalLaws,
  getPlayer,
  interestGroupsOverview,
  LAW_CATEGORIES,
  nationOverview,
  startGame,
  strikeLossForSector,
  type GameState,
} from '../src/index';
import { Rng } from '../src/core/rng';
import { computeClout } from '../src/nation/clout';
import { NationConstants as NC } from '../src/nation/constants';
import { handleTermEnd, onLawEnacted, processNationMonth } from '../src/nation/nation';
import { governmentBase } from '../src/nation/regime';
import { defaultConfig } from './helpers';

function president(seed = 11): GameState {
  return startGame({ ...defaultConfig(seed, 'presidente', 'SP'), startInOffice: true });
}

function months(s: GameState, n: number, seed = 1): void {
  const rng = new Rng(seed);
  for (let i = 0; i < n; i++) processNationMonth(s, rng);
}

const sumOf = (values: number[]) => values.reduce((a, b) => a + b, 0);

/** Opções autoritárias de todas as categorias (para testar o desgaste institucional). */
function authoritarianOptions(): [string, string][] {
  const out: [string, string][] = [];
  for (const cat of LAW_CATEGORIES) {
    const opt = cat.options.find((o) => o.tags?.includes('authoritarian'));
    if (opt) out.push([cat.id, opt.id]);
  }
  return out;
}

describe('Nação: peso dos grupos (clout)', () => {
  it('o clout é normalizado e a influência fica entre 0 e 100', () => {
    const s = president();
    months(s, 12);
    const clouts = Object.values(s.interestGroups).map((g) => g.clout!);
    expect(sumOf(clouts)).toBeCloseTo(1, 6);
    for (const g of Object.values(s.interestGroups)) {
      expect(g.influence).toBeGreaterThanOrEqual(0);
      expect(g.influence).toBeLessThanOrEqual(100);
    }
  });

  it('reage à economia: o agro maior pesa mais, a indústria menor pesa menos', () => {
    const s = president();
    const base = computeClout(s).clout;
    const va = s.industry.stats.valueAddedBySector;
    // Economia de referência, depois um boom agrícola com desindustrialização.
    for (const [sector, share] of Object.entries(NC.referenceSectorShares)) va[sector as keyof typeof va] = share * 1000;
    const reference = computeClout(s).clout;
    va.agro *= 3;
    va.manufacturing *= 0.4;
    va.heavy_industry *= 0.4;
    const boom = computeClout(s).clout;
    expect(boom.agribusiness).toBeGreaterThan(reference.agribusiness);
    expect(boom.industry).toBeLessThan(reference.industry);
    expect(sumOf(Object.values(boom))).toBeCloseTo(1, 6);
    expect(sumOf(Object.values(base))).toBeCloseTo(1, 6);
  });

  it('sindicatos proibidos perdem peso; a influência acompanha devagar', () => {
    const s = president();
    const free = computeClout(s).clout.unions;
    federalLaws(s).enacted.unions = 'unions_banned';
    expect(computeClout(s).clout.unions).toBeLessThan(free);
    const before = s.interestGroups.unions.influence;
    months(s, 24);
    expect(s.interestGroups.unions.influence).toBeLessThan(before);
  });

  it('a população mais industrial fortalece operários e sindicatos', () => {
    const s = president();
    const before = computeClout(s).clout;
    for (const pop of Object.values(s.population.pops))
      if (pop.typeId === 'industrial_workers') pop.size *= 2;
    const after = computeClout(s).clout;
    expect(after.workers + after.unions).toBeGreaterThan(before.workers + before.unions);
  });
});

describe('Nação: radicalismo e greves', () => {
  it('aprovação baixa radicaliza; alta modera', () => {
    const s = president();
    s.interestGroups.workers.approval = 5;
    s.interestGroups.business.approval = 95;
    s.interestGroups.business.radicalism = 50;
    const workers0 = s.interestGroups.workers.radicalism ?? 0;
    // Congela a aprovação para isolar o efeito.
    for (let i = 0; i < 4; i++) {
      s.interestGroups.workers.approval = 5;
      s.interestGroups.business.approval = 95;
      months(s, 1, i + 1);
    }
    expect(s.interestGroups.workers.radicalism!).toBeGreaterThan(workers0);
    expect(s.interestGroups.business.radicalism!).toBeLessThan(50);
  });

  it('sindicatos radicalizados fazem greve, com notícia, alerta e perda de produção', () => {
    const s = president();
    const rng = new Rng(7);
    for (let i = 0; i < 24 && s.nation.strikes.length === 0; i++) {
      s.interestGroups.unions.radicalism = 100;
      s.interestGroups.unions.approval = 5;
      processNationMonth(s, rng);
    }
    const strike = s.nation.strikes.find((x) => x.groupId === 'unions');
    expect(strike).toBeDefined();
    expect(strike!.monthsLeft).toBeGreaterThan(0);
    expect(strike!.intensity).toBeGreaterThan(0);
    expect(s.alerts.some((a) => a.kind === 'strike')).toBe(true);
    expect(s.media.news.some((n) => n.headline.toLowerCase().includes('greve') || n.headline.toLowerCase().includes('sindicato'))).toBe(true);
    const sector = strike!.sector ?? 'services';
    expect(strikeLossForSector(s, sector)).toBeGreaterThan(0);
    expect(nationOverview(s).strikes.length).toBeGreaterThan(0);
  });

  it('a greve termina, alivia o radicalismo e não se repete enquanto dura', () => {
    const s = president();
    s.nation.strikes.push({
      id: 'x',
      groupId: 'civil_servants',
      sector: 'public',
      intensity: 0.3,
      monthsLeft: 1,
      label: 'Greve do funcionalismo',
    });
    s.interestGroups.civil_servants.radicalism = 90;
    const rng = new Rng(2);
    s.interestGroups.civil_servants.approval = 50;
    processNationMonth(s, rng);
    expect(s.nation.strikes.some((x) => x.id === 'x')).toBe(false);
    expect(s.interestGroups.civil_servants.radicalism!).toBeLessThan(90);
  });

  it('empresários radicalizados provocam fuga de capitais', () => {
    const s = president();
    s.industry.investmentPool = 100;
    s.industry.foreignPool = 100;
    const exchange = s.market.exchangeRate;
    const rng = new Rng(4);
    for (let i = 0; i < 40 && s.industry.investmentPool >= 100; i++) {
      s.interestGroups.business.radicalism = 100;
      s.interestGroups.business.approval = 5;
      processNationMonth(s, rng);
    }
    expect(s.industry.investmentPool).toBeLessThan(100);
    expect(s.industry.foreignPool).toBeLessThan(100);
    expect(s.market.exchangeRate).toBeGreaterThan(exchange);
    expect(s.alerts.some((a) => a.kind === 'capital_flight')).toBe(true);
  });
});

describe('Nação: legitimidade e inquietação', () => {
  it('leis autoritárias derrubam a legitimidade', () => {
    const democratic = president();
    const authoritarian = president();
    for (const [cat, opt] of authoritarianOptions()) federalLaws(authoritarian).enacted[cat] = opt;
    months(democratic, 36);
    months(authoritarian, 36);
    expect(authoritarian.nation.legitimacy).toBeLessThan(democratic.nation.legitimacy - 5);
    const overview = nationOverview(authoritarian);
    expect(overview.legitimacyFactors.some((f) => f.id === 'authoritarian' && f.value < 0)).toBe(true);
  });

  it('aprovação, inflação e desemprego altos elevam a inquietação', () => {
    const calm = president();
    const hot = president();
    hot.economy.inflation = 18;
    hot.economy.unemployment = 16;
    hot.government!.approval = 20;
    months(calm, 18);
    months(hot, 18);
    expect(hot.nation.unrest).toBeGreaterThan(calm.nation.unrest + 10);
    expect(hot.nation.legitimacy).toBeLessThan(calm.nation.legitimacy);
  });

  it('o estado de calamidade e o STF pesam na legitimidade', () => {
    const s = president();
    s.government!.politicalCapital = 100;
    const base = nationOverview(s).legitimacyTarget;
    s.executive.decrees.push({
      id: 'd1',
      kind: 'emergency',
      label: 'Estado de calamidade',
      target: null,
      value: null,
      issuedOn: s.date,
      expiresOn: null,
      suspended: false,
    });
    expect(nationOverview(s).legitimacyTarget).toBeLessThan(base);
  });
});

describe('Nação: regime e identidade', () => {
  it('partido único transfere ~95% das cadeiras da oposição ao partido do Executivo', () => {
    const s = president();
    const exec = getPlayer(s).partyId;
    const base = new Set(governmentBase(s));
    const totals = s.congress.chambers.map((c) => sumOf(Object.values(c.seats)));
    const before = s.congress.chambers.map((c) => ({ ...c.seats }));
    const outsiders = s.congress.chambers.map((c) =>
      sumOf(Object.entries(c.seats).filter(([p]) => !base.has(p)).map(([, v]) => v)),
    );
    expect(outsiders[0]).toBeGreaterThan(0);

    federalLaws(s).enacted.regime = 'reg_one_party';
    onLawEnacted(s, 'regime', 'reg_one_party');

    expect(s.nation.regime).toBe('one_party');
    s.congress.chambers.forEach((c, i) => {
      expect(sumOf(Object.values(c.seats))).toBe(totals[i]);
      const left = sumOf(Object.entries(c.seats).filter(([p]) => !base.has(p)).map(([, v]) => v));
      expect(left / outsiders[i]!).toBeLessThan(0.08);
      expect(c.seats[exec]!).toBeGreaterThan(before[i]![exec] ?? 0);
    });
    expect(s.nation.milestones.length).toBeGreaterThan(0);
    expect(s.media.news.some((n) => n.headline.includes('Partido único'))).toBe(true);
  });

  it('o choque de legitimidade da lei é aplicado', () => {
    const s = president();
    const before = s.nation.legitimacy;
    onLawEnacted(s, 'regime', 'reg_one_party');
    expect(s.nation.legitimacy).toBeLessThan(before - 20);
  });

  it('parlamentarismo e semipresidencialismo trocam o regime', () => {
    const s = president();
    onLawEnacted(s, 'regime', 'reg_parliamentary');
    expect(s.nation.regime).toBe('parliamentary');
    onLawEnacted(s, 'regime', 'reg_semi_presidential');
    expect(s.nation.regime).toBe('semi_presidential');
    onLawEnacted(s, 'regime', 'reg_presidential');
    expect(s.nation.regime).toBe('presidential');
  });

  it('no partido único o mandato do Executivo é prorrogado por 4 anos', () => {
    const s = president();
    expect(handleTermEnd(s)).toBe(false);
    onLawEnacted(s, 'regime', 'reg_one_party');
    const end = s.government!.endDate;
    const legitimacy = s.nation.legitimacy;
    expect(handleTermEnd(s)).toBe(true);
    const extended = s.government!.endDate;
    expect(extended > end).toBe(true);
    expect(Number(extended.slice(0, 4)) - Number(end.slice(0, 4))).toBe(4);
    expect(s.nation.legitimacy).toBeLessThan(legitimacy);
  });

  it('parlamentar de oposição é cassado quando o partido único é instituído', () => {
    const s = startGame({ ...defaultConfig(11, 'deputado_federal', 'SP'), startInOffice: true });
    const party = getPlayer(s).partyId;
    // Garante que o jogador está fora da base governista.
    s.legislature.governmentCoalition = s.legislature.governmentCoalition.filter((p) => p !== party);
    if (s.landscape.presidentPartyId === party)
      s.landscape.presidentPartyId = Object.keys(s.parties).find((p) => p !== party)!;
    onLawEnacted(s, 'regime', 'reg_one_party');
    expect(s.government!.endDate).toBe(s.date);
    expect(s.history.some((h) => h.title.includes('cassado'))).toBe(true);
    expect(handleTermEnd(s)).toBe(false);
  });

  it('a identidade do país muda com as leis', () => {
    const s = president();
    expect(countryIdentity(s).officialName).toBe('República Federativa do Brasil');

    federalLaws(s).enacted.economic_system = 'econ_laissez_faire';
    months(s, 1);
    expect(countryIdentity(s).systemLabel).toContain('Capitalismo liberal');

    federalLaws(s).enacted.economic_system = 'econ_planned';
    federalLaws(s).enacted.regime = 'reg_one_party';
    onLawEnacted(s, 'regime', 'reg_one_party');
    onLawEnacted(s, 'economic_system', 'econ_planned');
    const identity = countryIdentity(s);
    expect(identity.officialName).toBe('República Popular do Brasil');
    expect(identity.systemLabel).toBe('Socialismo de Estado');
    expect(s.nation.milestones.some((m) => m.title.includes('República Popular'))).toBe(true);
  });

  it('interestGroupsOverview traz clout, radicalismo, leis preferidas e bancadas', () => {
    const s = president();
    months(s, 3);
    const groups = interestGroupsOverview(s);
    expect(groups).toHaveLength(11);
    expect(groups[0]!.clout).toBeGreaterThanOrEqual(groups[10]!.clout);
    const agro = groups.find((g) => g.id === 'agribusiness')!;
    expect(agro.preferredLaws.length).toBeGreaterThan(0);
    expect(agro.preferredLaws.every((l) => l.categoryName && l.optionName)).toBe(true);
    expect(agro.caucuses.some((c) => c.id === 'ruralista')).toBe(true);
    expect(agro.radicalismLabel).toBeTruthy();
  });
});

describe('Nação: determinismo', () => {
  it('mesma semente, mesmo resultado', () => {
    const run = () => {
      const s = president(33);
      s.interestGroups.unions.radicalism = 90;
      s.interestGroups.unions.approval = 10;
      months(s, 24, 5);
      return JSON.stringify([s.nation, s.interestGroups]);
    };
    expect(run()).toBe(run());
  });
});

describe('Nação: revisão adversarial', () => {
  it('legitimidade e inquietação ficam em 0..100 mesmo nas piores condições', () => {
    const s = president();
    s.economy.inflation = 300;
    s.economy.unemployment = 80;
    s.government!.approval = 0;
    s.candidates[s.playerId]!.scandal = 100;
    for (const g of Object.values(s.interestGroups)) {
      g.approval = 0;
      g.radicalism = 100;
    }
    for (const [cat, opt] of authoritarianOptions()) federalLaws(s).enacted[cat] = opt;
    s.nation.regime = 'one_party';
    months(s, 60, 3);
    expect(s.nation.legitimacy).toBeGreaterThanOrEqual(0);
    expect(s.nation.legitimacy).toBeLessThanOrEqual(100);
    expect(s.nation.unrest).toBeGreaterThanOrEqual(0);
    expect(s.nation.unrest).toBeLessThanOrEqual(100);
    for (const g of Object.values(s.interestGroups)) {
      expect(g.radicalism!).toBeLessThanOrEqual(100);
      expect(Number.isFinite(g.clout!)).toBe(true);
    }
    const loss = strikeLossForSector(s, 'services');
    expect(loss).toBeGreaterThanOrEqual(0);
    expect(loss).toBeLessThan(1);
  });

  it('toda greve termina: sem radicalismo novo, o país volta à normalidade', () => {
    const s = president();
    const rng = new Rng(11);
    for (let i = 0; i < 36; i++) {
      for (const g of Object.values(s.interestGroups)) {
        g.radicalism = 100;
        g.approval = 5;
      }
      processNationMonth(s, rng);
      for (const st of s.nation.strikes) {
        expect(st.monthsLeft).toBeGreaterThan(0);
        expect(st.monthsLeft).toBeLessThanOrEqual(NC.strikeMonths[1]);
      }
      // Um grupo nunca tem duas greves ao mesmo tempo.
      const ids = s.nation.strikes.map((x) => x.groupId);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(s.nation.strikes.length).toBeGreaterThan(0);
    for (let i = 0; i < NC.strikeMonths[1] + 1; i++) {
      for (const g of Object.values(s.interestGroups)) {
        g.radicalism = 0;
        g.approval = 95;
      }
      processNationMonth(s, rng);
    }
    expect(s.nation.strikes).toHaveLength(0);
  });

  it('a crise de legitimidade provocada por um choque fora do tick também gera alerta e marco', () => {
    const s = president();
    s.nation.legitimacy = 10;
    months(s, 1);
    expect(s.alerts.some((a) => a.kind === 'legitimacy_low')).toBe(true);
    expect(s.nation.milestones.some((m) => m.title === 'Crise de legitimidade')).toBe(true);
  });

  it('os alertas de legitimidade e inquietação não se repetem todo mês', () => {
    const s = president();
    s.nation.legitimacy = 10;
    s.nation.unrest = 95;
    const rng = new Rng(2);
    for (let i = 0; i < 4; i++) {
      s.date = `2027-0${i + 2}-01`;
      s.nation.legitimacy = 10;
      s.nation.unrest = 95;
      processNationMonth(s, rng);
    }
    expect(s.alerts.filter((a) => a.kind === 'legitimacy_low')).toHaveLength(1);
    expect(s.alerts.filter((a) => a.kind === 'unrest_high')).toHaveLength(1);
  });

  it('deputado estadual não é cassado pelo partido único federal', () => {
    const s = startGame({ ...defaultConfig(11, 'deputado_estadual', 'SP'), startInOffice: true });
    const party = getPlayer(s).partyId;
    s.legislature.governmentCoalition = s.legislature.governmentCoalition.filter((p) => p !== party);
    if (s.landscape.presidentPartyId === party)
      s.landscape.presidentPartyId = Object.keys(s.parties).find((p) => p !== party)!;
    const end = s.government!.endDate;
    onLawEnacted(s, 'regime', 'reg_one_party');
    expect(s.government!.endDate).toBe(end);
    expect(s.history.some((h) => h.title.includes('cassado'))).toBe(false);
  });

  it('mudar para o mesmo regime não repete a transferência de cadeiras', () => {
    const s = president();
    onLawEnacted(s, 'regime', 'reg_one_party');
    const seats = JSON.stringify(s.congress.chambers);
    onLawEnacted(s, 'regime', 'reg_one_party');
    expect(JSON.stringify(s.congress.chambers)).toBe(seats);
  });

  it('opção de lei desconhecida é ignorada sem alterar o estado', () => {
    const s = president();
    const before = JSON.stringify(s.nation);
    onLawEnacted(s, 'regime', 'nao_existe');
    onLawEnacted(s, 'nao_existe', 'reg_one_party');
    expect(JSON.stringify(s.nation)).toBe(before);
  });

  it('o partido único não prorroga o mandato de quem governa um estado', () => {
    const s = startGame({ ...defaultConfig(11, 'governador', 'SP'), startInOffice: true });
    s.nation.regime = 'one_party';
    expect(handleTermEnd(s)).toBe(false);
  });

  it('o clout continua normalizado sem Pops ou com grupos faltando', () => {
    const s = president();
    delete (s.interestGroups as Record<string, unknown>).tech;
    let result = computeClout(s);
    expect(sumOf(Object.values(result.clout))).toBeCloseTo(1, 6);
    for (const pop of Object.values(s.population.pops)) pop.size = 0;
    result = computeClout(s);
    expect(sumOf(Object.values(result.clout))).toBeCloseTo(1, 6);
    expect(Object.values(result.clout).every((v) => Number.isFinite(v))).toBe(true);
    expect(Object.values(result.influenceTarget).every((v) => v >= 0 && v <= 100)).toBe(true);
  });

  it('a transferência de cadeiras dá a maioria ao partido do Executivo e não deixa casa negativa', () => {
    const s = president();
    const exec = getPlayer(s).partyId;
    onLawEnacted(s, 'regime', 'reg_one_party');
    for (const c of s.congress.chambers) {
      for (const n of Object.values(c.seats)) expect(n).toBeGreaterThanOrEqual(0);
      expect(c.seats[exec]!).toBeGreaterThan(c.totalSeats / 2 - 1);
    }
  });
});
