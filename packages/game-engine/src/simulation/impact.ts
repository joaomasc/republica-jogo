import { deepClone } from '../core/clone';
import { addMonths } from '../core/date';
import { Rng } from '../core/rng';
import { STATE_IDS } from '../core/types';
import { updateEconomy } from '../economy/economy';
import { GOODS } from '../economy/industry/goods.data';
import { SECTOR_LABELS } from '../executive/labels';
import { issueDecree } from '../executive/executive';
import type { DecreeKind } from '../executive/types';
import { getLawOption } from '../laws/laws.data';
import { onLawEnacted } from '../nation/nation';
import { updateInterestGroups } from '../politics/interestGroups';
import { updatePopulationMonthly } from '../population/satisfaction';
import { POP_TYPE_IDS, POP_TYPES } from '../population/popTypes';
import { GOOD_IDS, SECTOR_IDS } from '../economy/industry/types';
import { nationalMonthlyTick } from './nationalTick';
import type { GameState } from './state';

/**
 * Projeção de impacto: roda o futuro duas vezes a partir do estado atual — sem e com a mudança —
 * com a mesma semente e sem eventos, eleições ou Congresso, e compara os resultados. Responde a
 * "o que isso vai mudar?" com números do próprio modelo. Pura: não altera o estado recebido.
 */

export interface ImpactRow {
  id: string;
  label: string;
  /** Valor ao fim da projeção sem a mudança. */
  base: number;
  /** Valor ao fim da projeção com a mudança. */
  after: number;
  delta: number;
  /** Formato do valor na interface. */
  unit: 'pct' | 'pp' | 'brl_bi' | 'brl' | 'index' | 'price' | 'points';
  /** Subir é bom para o país/grupo (para colorir a variação). */
  goodWhenUp: boolean;
}

export interface ImpactReport {
  months: number;
  /** Indicadores do país (crescimento, inflação, emprego, comércio, contas). */
  economy: ImpactRow[];
  /** Setores com maior variação de valor adicionado. */
  sectors: ImpactRow[];
  /** Bens com maior variação de preço. */
  prices: ImpactRow[];
  /** Satisfação média de cada tipo de Pop. */
  pops: ImpactRow[];
  /** Aprovação dos grupos de interesse. */
  groups: ImpactRow[];
  /** Frases com os efeitos mais fortes (para leitura rápida). */
  headlines: { text: string; good: boolean }[];
}

interface Snapshot {
  growth: number;
  inflation: number;
  unemployment: number;
  income: number;
  wage: number;
  manufacturing: number;
  exports: number;
  imports: number;
  exchange: number;
  revenue: number;
  debt: number;
  investment: number;
  legitimacy: number;
  sectors: Record<string, number>;
  prices: Record<string, number>;
  pops: Record<string, number>;
  groups: Record<string, number>;
}

function snapshot(s: GameState, acc: { growth: number; inflation: number; n: number }): Snapshot {
  const st = s.industry.stats;
  let wageNum = 0;
  let wageDen = 0;
  for (const id of STATE_IDS) {
    const l = s.industry.labor[id];
    if (!l) continue;
    wageNum += l.avgWage * l.filledJobs;
    wageDen += l.filledJobs;
  }
  const popNum: Record<string, number> = {};
  const popDen: Record<string, number> = {};
  for (const p of Object.values(s.population.pops)) {
    popNum[p.typeId] = (popNum[p.typeId] ?? 0) + p.satisfaction * p.size;
    popDen[p.typeId] = (popDen[p.typeId] ?? 0) + p.size;
  }
  return {
    growth: acc.n > 0 ? acc.growth / acc.n : s.economy.growth,
    inflation: acc.n > 0 ? acc.inflation / acc.n : s.economy.inflation,
    unemployment: s.economy.unemployment,
    income: s.economy.income,
    wage: wageDen > 0 ? wageNum / wageDen : 0,
    manufacturing: st.manufacturingShare * 100,
    exports: st.exports,
    imports: st.imports,
    exchange: s.market.exchangeRate,
    revenue: s.economy.revenue,
    debt: s.economy.debt,
    investment: st.privateInvestment + st.stateInvestment + st.foreignInvestment,
    legitimacy: s.nation.legitimacy,
    sectors: Object.fromEntries(SECTOR_IDS.map((k) => [k, st.valueAddedBySector[k] ?? 0])),
    prices: Object.fromEntries(GOOD_IDS.map((g) => [g, s.market.goods[g].price])),
    pops: Object.fromEntries(POP_TYPE_IDS.map((t) => [t, (popNum[t] ?? 0) / Math.max(1, popDen[t] ?? 0)])),
    groups: Object.fromEntries(Object.values(s.interestGroups).map((g) => [g.id, g.approval])),
  };
}

/** Avança `months` meses só com economia, população, grupos e Nação (sem eventos nem Congresso). */
function project(state: GameState, months: number): Snapshot {
  const s = state;
  const rng = new Rng(s.meta.seed ^ 0x5eed);
  const acc = { growth: 0, inflation: 0, n: 0 };
  // A segunda metade da projeção dá a média de crescimento/inflação (a primeira é transição).
  const from = Math.floor(months / 2);
  for (let i = 0; i < months; i++) {
    s.date = addMonths(s.date, 1);
    updateEconomy(s, rng);
    updatePopulationMonthly(s);
    updateInterestGroups(s, rng);
    nationalMonthlyTick(s, rng);
    if (i >= from) {
      acc.growth += s.economy.growth;
      acc.inflation += s.economy.inflation;
      acc.n += 1;
    }
  }
  return snapshot(s, acc);
}

function prepare(state: GameState): GameState {
  const s = deepClone(state);
  // Isola a projeção: sem eventos, sem projetos tramitando, sem implementações pendentes alheias.
  s.events.pending = [];
  s.laws.bills = [];
  return s;
}

function row(id: string, label: string, base: number, after: number, unit: ImpactRow['unit'], goodWhenUp: boolean): ImpactRow {
  return { id, label, base, after, delta: after - base, unit, goodWhenUp };
}

function compare(base: Snapshot, after: Snapshot, months: number): ImpactReport {
  const economy: ImpactRow[] = [
    row('growth', 'Crescimento do PIB (% a.a.)', base.growth, after.growth, 'pp', true),
    row('inflation', 'Inflação (% a.a.)', base.inflation, after.inflation, 'pp', false),
    row('unemployment', 'Desemprego (%)', base.unemployment, after.unemployment, 'pp', false),
    row('income', 'Renda média (R$/mês)', base.income, after.income, 'brl', true),
    row('wage', 'Salário formal médio (R$/mês)', base.wage, after.wage, 'brl', true),
    row('manufacturing', 'Indústria (% do valor adicionado)', base.manufacturing, after.manufacturing, 'pp', true),
    row('investment', 'Investimento (R$ bi/ano, preços-base)', base.investment, after.investment, 'brl_bi', true),
    row('exports', 'Exportações (R$ bi/ano, preços-base)', base.exports, after.exports, 'brl_bi', true),
    row('imports', 'Importações (R$ bi/ano, preços-base)', base.imports, after.imports, 'brl_bi', false),
    row('exchange', 'Câmbio (R$ por US$)', base.exchange, after.exchange, 'price', false),
    row('revenue', 'Arrecadação (R$ bi/ano)', base.revenue, after.revenue, 'brl_bi', true),
    row('debt', 'Dívida pública (% do PIB)', base.debt, after.debt, 'pp', false),
    row('legitimacy', 'Legitimidade', base.legitimacy, after.legitimacy, 'points', true),
  ];
  const sectors = SECTOR_IDS.map((k) => {
    const b = base.sectors[k] ?? 0;
    const a = after.sectors[k] ?? 0;
    return row(k, SECTOR_LABELS[k], b, a, 'pct', true);
  })
    .map((r) => ({ ...r, delta: r.base > 1e-6 ? r.after / r.base - 1 : 0 }))
    .filter((r) => Math.abs(r.delta) >= 0.005)
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
    .slice(0, 8);
  const prices = GOOD_IDS.map((g) => {
    const r = row(g, GOODS[g].name, base.prices[g] ?? 1, after.prices[g] ?? 1, 'price', false);
    return { ...r, delta: r.base > 0 ? r.after / r.base - 1 : 0 };
  })
    .filter((r) => Math.abs(r.delta) >= 0.01)
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
    .slice(0, 8);
  const pops = POP_TYPE_IDS.map((t) => row(t, POP_TYPES[t].plural, base.pops[t] ?? 0, after.pops[t] ?? 0, 'points', true))
    .filter((r) => Math.abs(r.delta) >= 0.5)
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  const groups = Object.keys(after.groups)
    .map((id) => row(id, id, base.groups[id] ?? 0, after.groups[id] ?? 0, 'points', true))
    .filter((r) => Math.abs(r.delta) >= 0.5)
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  return { months, economy, sectors, prices, pops, groups, headlines: headlines(economy, sectors, prices, pops) };
}

const fmt = (v: number, d = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d });

function headlines(economy: ImpactRow[], sectors: ImpactRow[], prices: ImpactRow[], pops: ImpactRow[]): ImpactReport['headlines'] {
  const out: { text: string; good: boolean; weight: number }[] = [];
  const by = Object.fromEntries(economy.map((r) => [r.id, r]));
  const add = (r: ImpactRow | undefined, min: number, text: (r: ImpactRow) => string, scale = 1) => {
    if (!r || Math.abs(r.delta) < min) return;
    out.push({ text: text(r), good: r.delta > 0 === r.goodWhenUp, weight: (Math.abs(r.delta) / min) * scale });
  };
  add(by.growth, 0.1, (r) => `Crescimento ${r.delta > 0 ? 'maior' : 'menor'}: ${fmt(r.after)}% a.a. (${r.delta > 0 ? '+' : ''}${fmt(r.delta)} p.p.)`, 1.5);
  add(by.inflation, 0.2, (r) => `Inflação ${r.delta > 0 ? 'mais alta' : 'mais baixa'}: ${fmt(r.after)}% (${r.delta > 0 ? '+' : ''}${fmt(r.delta)} p.p.)`, 1.3);
  add(by.unemployment, 0.15, (r) => `Desemprego ${r.delta > 0 ? 'sobe' : 'cai'} para ${fmt(r.after)}%`, 1.3);
  add(by.manufacturing, 0.2, (r) => `A indústria ${r.delta > 0 ? 'ganha' : 'perde'} ${fmt(Math.abs(r.delta))} p.p. de participação na economia`);
  add(by.wage, by.wage ? Math.max(10, by.wage.base * 0.01) : 10, (r) => `Salário médio ${r.delta > 0 ? 'sobe' : 'cai'} ${fmt(Math.abs((r.delta / Math.max(1, r.base)) * 100))}%`);
  add(by.revenue, by.revenue ? Math.max(1, by.revenue.base * 0.01) : 1, (r) => `Arrecadação ${r.delta > 0 ? 'cresce' : 'cai'} R$ ${fmt(Math.abs(r.delta), 0)} bi por ano`);
  add(by.imports, by.imports ? Math.max(1, by.imports.base * 0.03) : 1, (r) => `Importações ${r.delta > 0 ? 'aumentam' : 'diminuem'} ${fmt(Math.abs((r.delta / Math.max(1, r.base)) * 100), 0)}%`, 0.8);
  add(by.exports, by.exports ? Math.max(1, by.exports.base * 0.03) : 1, (r) => `Exportações ${r.delta > 0 ? 'aumentam' : 'diminuem'} ${fmt(Math.abs((r.delta / Math.max(1, r.base)) * 100), 0)}%`, 0.8);
  add(by.legitimacy, 1, (r) => `Legitimidade ${r.delta > 0 ? '+' : ''}${fmt(r.delta, 0)}`);
  const s0 = sectors[0];
  if (s0 && Math.abs(s0.delta) >= 0.02)
    out.push({ text: `${s0.label}: ${s0.delta > 0 ? '+' : ''}${fmt(s0.delta * 100, 0)}% de produção`, good: s0.delta > 0, weight: Math.abs(s0.delta) * 30 });
  const p0 = prices[0];
  if (p0 && Math.abs(p0.delta) >= 0.03)
    out.push({ text: `${p0.label} fica ${fmt(Math.abs(p0.delta) * 100, 0)}% mais ${p0.delta > 0 ? 'caro' : 'barato'}`, good: p0.delta < 0, weight: Math.abs(p0.delta) * 20 });
  const winner = pops.find((p) => p.delta > 0);
  const loser = pops.find((p) => p.delta < 0);
  if (winner && winner.delta >= 2) out.push({ text: `${winner.label} mais satisfeitos (+${fmt(winner.delta, 0)})`, good: true, weight: winner.delta / 2 });
  if (loser && loser.delta <= -2) out.push({ text: `${loser.label} menos satisfeitos (${fmt(loser.delta, 0)})`, good: false, weight: -loser.delta / 2 });
  return out
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6)
    .map(({ text, good }) => ({ text, good }));
}

/** Roda as duas projeções (sem e com `apply`). */
export function simulateImpact(state: GameState, apply: (s: GameState) => void, months = 24): ImpactReport {
  const base = project(prepare(state), months);
  const changed = prepare(state);
  apply(changed);
  const after = project(changed, months);
  const report = compare(base, after, months);
  for (const g of report.groups) g.label = state.interestGroups[g.id as keyof typeof state.interestGroups]?.name ?? g.id;
  return report;
}

/** Impacto de pôr uma opção de lei em vigor já (força total), comparado a não mudar nada. */
export function previewLawImpact(state: GameState, categoryId: string, optionId: string, months = 24): ImpactReport | null {
  if (!getLawOption(categoryId, optionId)) return null;
  return simulateImpact(
    state,
    (s) => {
      s.laws.implementing = s.laws.implementing.filter((i) => i.categoryId !== categoryId);
      s.laws.enacted[categoryId] = optionId;
      s.laws.strength[categoryId] = 1;
      onLawEnacted(s, categoryId, optionId);
    },
    months,
  );
}

/** Impacto de editar um decreto agora (ignora o custo em capital político). */
export function previewDecreeImpact(
  state: GameState,
  kind: DecreeKind,
  target: string | null,
  value: number | null,
  months = 18,
): ImpactReport | null {
  if (!state.government) return null;
  let ok = true;
  const report = simulateImpact(
    state,
    (s) => {
      if (s.government) s.government.politicalCapital = 1000;
      ok = issueDecree(s, kind, target, value).ok;
    },
    months,
  );
  return ok ? report : null;
}
