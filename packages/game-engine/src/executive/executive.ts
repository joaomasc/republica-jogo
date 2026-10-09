import { addMonths, diffMonths } from '../core/date';
import { clamp, clamp100, round } from '../core/math';
import type { Rng } from '../core/rng';
import type { ActionResult } from '../core/types';
import { BUILDINGS } from '../economy/industry/buildings.data';
import { GOODS } from '../economy/industry/goods.data';
import {
  GOOD_CATEGORIES,
  GOOD_IDS,
  SECTOR_IDS,
  type GoodCategory,
  type GoodId,
  type SectorId,
} from '../economy/industry/types';
import { addHistory } from '../history/history';
import { federalOption } from '../laws/federal';
import { aggregateEconomyModifiers } from '../laws/modifiers';
import { pushAlert } from '../media/alerts';
import { publishNews } from '../media/news';
import { shiftGroups, shiftRadicalisms } from '../nation/groups';
import type { InterestGroupId } from '../politics/types';
import { nextId } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { annualRevenue, buildingName, existingBuilding, parseBuildingTarget } from './assets';
import { ExecutiveConstants as C } from './constants';
import { DECREES } from './decrees.data';
import { CATEGORY_GROUPS, GOOD_CATEGORY_LABELS, SECTOR_GROUPS, SECTOR_LABELS, stateLabel } from './labels';
import type { ActiveDecree, DecreeDefinition, DecreeKind, ExecutiveState } from './types';

const fail = (message: string): ActionResult => ({ ok: false, message });

export function createExecutiveState(): ExecutiveState {
  return { decrees: [], selicTarget: null, plan: null, log: [] };
}

// ---------------------------------------------------------------------------
// Papéis e regras gerais
// ---------------------------------------------------------------------------

/** O jogador comanda o Executivo federal (único papel que edita decretos econômicos). */
export function isFederalExecutive(state: GameState): boolean {
  const gov = state.government;
  return !!gov && gov.branch === 'executive' && gov.jurisdiction.level === 'federal';
}

function logAct(state: GameState, text: string): void {
  state.executive.log.unshift({ date: state.date, text });
  if (state.executive.log.length > C.logLimit) state.executive.log.length = C.logLimit;
}

/** Calamidade ou controle de preços em vigor: dá amparo legal a congelamentos e vetos de exportação. */
export function hasLegalCover(state: GameState): boolean {
  const mods = aggregateEconomyModifiers(state);
  return !!(mods.emergency || mods.priceControls);
}

/** Margem de tarifa (fração) que o decreto pode usar na política comercial vigente. */
export function tariffMargin(state: GameState): number {
  const option = federalOption(state, 'trade');
  return (option ? C.tariffMargin[option] : undefined) ?? C.tariffMarginDefault;
}

/** Multiplicador do risco jurídico de um ato (1 = risco padrão da definição). */
function legalMultiplier(
  state: GameState,
  kind: DecreeKind,
  value: number | null,
  covered: boolean,
): number {
  switch (kind) {
    case 'price_freeze':
      return covered ? C.coveredRiskMult : C.freezeUncoveredRiskMult;
    case 'export_ban':
      return covered ? C.coveredRiskMult : 1;
    case 'tariff':
      return (value ?? 0) > tariffMargin(state) ? C.tariffOverMarginRiskMult : 1;
    default:
      return 1;
  }
}

/** Chance mensal de o STF suspender um decreto (0..1). */
export function decreeLegalRisk(
  state: GameState,
  decree: Pick<ActiveDecree, 'kind' | 'value' | 'suspended'>,
): number {
  if (decree.suspended) return 0;
  const def = DECREES[decree.kind];
  const mult = legalMultiplier(state, decree.kind, decree.value, hasLegalCover(state));
  return Math.min(C.maxMonthlyRisk, def.legalRisk * mult);
}

/** Motivo pelo qual o tipo de ato não pode ser usado agora (independe do alvo), ou `null`. */
export function decreeBlockReason(state: GameState, def: DecreeDefinition): string | null {
  const gov = state.government;
  if (!gov || gov.branch !== 'executive') return 'Só o chefe do Executivo edita decretos.';
  if (gov.jurisdiction.level !== 'federal')
    return 'Estes atos pertencem ao Executivo federal.';
  if (def.kind === 'selic' && aggregateEconomyModifiers(state).centralBank !== 'government')
    return 'O Banco Central não é subordinado ao governo: só uma lei do Banco Central permite fixar a Selic.';
  if (
    def.kind === 'emergency' &&
    state.executive.decrees.some((d) => d.kind === 'emergency' && !d.suspended)
  )
    return 'O estado de calamidade já está em vigor.';
  return null;
}

// ---------------------------------------------------------------------------
// Alvos e valores
// ---------------------------------------------------------------------------

type Checked = { error: string } | { target: ActiveDecree['target']; value: number | null };

function validTarget(def: DecreeDefinition, target: string | null): Checked {
  switch (def.target) {
    case 'none':
      return { target: null, value: null };
    case 'good': {
      if (!target || !(GOOD_IDS as readonly string[]).includes(target))
        return { error: 'Escolha um bem válido.' };
      const good = GOODS[target as GoodId];
      if (def.kind === 'export_ban' && !good.tradeable)
        return { error: `${good.name} não é um bem exportável.` };
      return { target: target as GoodId, value: null };
    }
    case 'category': {
      const t = def.kind === 'tariff' && (target === null || target === 'all') ? 'all' : target;
      if (t === 'all') return { target: 'all', value: null };
      if (!t || !(GOOD_CATEGORIES as readonly string[]).includes(t))
        return { error: 'Escolha uma categoria de bens válida.' };
      return { target: t as GoodCategory, value: null };
    }
    case 'sector': {
      if (!target || !(SECTOR_IDS as readonly string[]).includes(target))
        return { error: 'Escolha um setor válido.' };
      if (target === 'public' || target === 'informal')
        return { error: 'Este setor não recebe incentivos por decreto.' };
      return { target: target as SectorId, value: null };
    }
    case 'building_state': {
      const parsed = parseBuildingTarget(target);
      if (!parsed) return { error: 'Escolha um edifício e um estado válidos.' };
      return { target: `${parsed.stateId}:${parsed.buildingId}`, value: null };
    }
  }
}

function validValue(
  state: GameState,
  def: DecreeDefinition,
  value: number | null,
): number | null | { error: string } {
  if (!def.value) return null;
  const { min, max, step, default: initial, unit } = def.value;
  // Sem valor informado, a Selic parte da taxa vigente (e não de um padrão fixo).
  const fallback = def.kind === 'selic' ? state.economy.interestRate : initial;
  const v = value ?? fallback;
  if (!Number.isFinite(v)) return { error: 'Valor inválido.' };
  if (v < min - 1e-9 || v > max + 1e-9)
    return {
      error: `Valor fora da faixa permitida (${fmtRange(min, unit)} a ${fmtRange(max, unit)} ${unit}).`,
    };
  // `+ 0` evita o zero negativo ("-0") nos rótulos.
  const snapped = clamp(round(Math.round(v / step) * step, 4), min, max) + 0;
  if (unit === 'p.p.' && snapped === 0)
    return { error: 'Uma alíquota sem variação não produz efeito: informe um valor diferente de zero.' };
  return snapped;
}

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

/** Limite da faixa na mesma escala do rótulo (alíquotas guardadas em fração aparecem em p.p.). */
function fmtRange(n: number, unit: string): string {
  return fmt(unit === 'p.p.' ? round(n * 100, 1) : n);
}

function formatBi(n: number): string {
  return `R$ ${fmt(round(n, 1))} bi`;
}

/** Rótulo legível do alvo de um decreto. */
export function decreeTargetLabel(kind: DecreeKind, target: ActiveDecree['target']): string {
  if (target === null) return '';
  if (target === 'all') return 'Todas as categorias';
  if (kind === 'expropriation' || kind === 'privatization') {
    const parsed = parseBuildingTarget(target);
    return parsed ? `${buildingName(parsed.buildingId)} em ${stateLabel(parsed.stateId)}` : target;
  }
  if ((GOOD_IDS as readonly string[]).includes(target)) return GOODS[target as GoodId].name;
  if ((GOOD_CATEGORIES as readonly string[]).includes(target))
    return GOOD_CATEGORY_LABELS[target as GoodCategory];
  if ((SECTOR_IDS as readonly string[]).includes(target)) return SECTOR_LABELS[target as SectorId];
  return target;
}

/** Valor formatado de um decreto (ex.: "+10 p.p.", "R$ 20 bi/ano", "10,25% a.a."). */
export function decreeValueLabel(kind: DecreeKind, value: number | null): string {
  const def = DECREES[kind];
  if (value === null || !def.value) return '';
  switch (def.value.unit) {
    case 'p.p.':
      return `${value > 0 ? '+' : ''}${fmt(round(value * 100, 1))} p.p.`;
    case 'R$ bi/ano':
      return `R$ ${fmt(value)} bi/ano`;
    case '% a.a.':
      return `${fmt(value)}% a.a.`;
    default:
      return `${fmt(value)} ${def.value.unit}`;
  }
}

function decreeLabel(kind: DecreeKind, target: ActiveDecree['target'], value: number | null): string {
  const parts = [decreeTargetLabel(kind, target), decreeValueLabel(kind, value)].filter(Boolean);
  return parts.length > 0 ? `${DECREES[kind].name}: ${parts.join(' · ')}` : DECREES[kind].name;
}

// ---------------------------------------------------------------------------
// Reações dos grupos
// ---------------------------------------------------------------------------

type Reaction = Partial<Record<InterestGroupId, number>>;

function addTo(r: Reaction, ids: readonly InterestGroupId[], delta: number): void {
  for (const id of ids) r[id] = (r[id] ?? 0) + delta;
}

function targetProducers(def: DecreeDefinition, target: ActiveDecree['target']): InterestGroupId[] {
  if (!target || target === 'all') return [];
  if (def.target === 'sector') return SECTOR_GROUPS[target as SectorId] ?? [];
  if (def.target === 'category') return CATEGORY_GROUPS[target as GoodCategory] ?? [];
  if (def.target === 'good') return CATEGORY_GROUPS[GOODS[target as GoodId].category] ?? [];
  return [];
}

/** Reação pontual (pontos de aprovação) dos grupos a um decreto. Todo ato tem ganhadores e perdedores. */
function reactionTo(
  state: GameState,
  def: DecreeDefinition,
  target: ActiveDecree['target'],
  value: number | null,
): Reaction {
  const out: Reaction = {};
  const producers = targetProducers(def, target);
  switch (def.kind) {
    case 'tariff': {
      const sign = (value ?? 0) >= 0 ? 1 : -1;
      const r = C.tariffGroupReaction * Math.min(1, Math.abs(value ?? 0) / 0.2);
      addTo(out, producers.length > 0 ? producers : ['industry', 'unions'], sign * r);
      addTo(out, ['workers', 'commerce'], -sign * r * 0.6);
      break;
    }
    case 'ipi': {
      const cut = (value ?? 0) <= 0 ? 1 : -1;
      const r = C.ipiGroupReaction * Math.min(1, Math.abs(value ?? 0) / 0.1);
      addTo(out, producers, cut * r * 0.7);
      addTo(out, ['commerce'], cut * r);
      addTo(out, ['workers'], cut * r * 0.5);
      break;
    }
    case 'export_ban': {
      const r = C.exportBanGroupReaction;
      addTo(out, producers, -r);
      addTo(out, ['business'], -r * 0.5);
      addTo(out, ['workers'], r * 0.5);
      addTo(out, ['retirees'], r * 0.4);
      addTo(out, ['social_movements'], r * 0.3);
      break;
    }
    case 'price_freeze': {
      const r = C.freezeGroupReaction;
      addTo(out, producers, -r * 0.6);
      addTo(out, ['commerce'], -r);
      addTo(out, ['business'], -r * 0.6);
      addTo(out, ['workers'], r);
      addTo(out, ['retirees'], r * 0.6);
      addTo(out, ['social_movements'], r * 0.3);
      break;
    }
    case 'subsidy':
      addTo(out, producers, C.subsidyGroupReaction * Math.min(1, (value ?? 0) / 40 + 0.4));
      break;
    case 'credit_line':
      addTo(out, producers, C.creditGroupReaction);
      break;
    case 'selic': {
      const cut = (value ?? 0) < state.economy.interestRate ? 1 : -1;
      const r = C.selicGroupReaction;
      addTo(out, ['industry', 'commerce'], cut * r);
      addTo(out, ['workers'], cut * r * 0.5);
      addTo(out, ['retirees'], -cut * r * 0.5);
      addTo(out, ['business'], -cut * r * 0.3);
      break;
    }
    default:
      break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Emissão
// ---------------------------------------------------------------------------

function riskText(risk: number): string {
  const level = risk >= 0.1 ? 'alto' : risk >= 0.03 ? 'médio' : 'baixo';
  return `Risco jurídico ${level} (${round(risk * 100, 1).toLocaleString('pt-BR')}% ao mês de suspensão pelo STF).`;
}

/** Edita um decreto (ou ato instantâneo) do Executivo federal. */
export function issueDecree(
  state: GameState,
  kind: DecreeKind,
  target: string | null,
  value: number | null,
): ActionResult {
  const def = DECREES[kind] as DecreeDefinition | undefined;
  if (!def) return fail('Ato desconhecido.');
  const blocked = decreeBlockReason(state, def);
  if (blocked) return fail(blocked);
  const gov = state.government;
  if (!gov) return fail('Só o chefe do Executivo edita decretos.');

  const t = validTarget(def, target);
  if ('error' in t) return fail(t.error);
  const v = validValue(state, def, value);
  if (v !== null && typeof v === 'object') return fail(v.error);

  if (def.instant) {
    const instant = def.kind === 'expropriation' ? expropriate : privatize;
    return instant(state, t.target, def);
  }

  const existing = state.executive.decrees.find(
    (d) => d.kind === kind && d.target === t.target,
  );
  const sameKind = kind === 'selic' ? state.executive.decrees.find((d) => d.kind === 'selic') : existing;
  if (state.executive.decrees.length - (sameKind ? 1 : 0) >= C.maxActiveDecrees)
    return fail(`Limite de ${C.maxActiveDecrees} decretos ativos. Revogue algum antes de editar outro.`);
  if (gov.politicalCapital < def.politicalCost)
    return fail(
      `Capital político insuficiente: o ato custa ${def.politicalCost} e você tem ${Math.floor(gov.politicalCapital)}.`,
    );

  gov.politicalCapital -= def.politicalCost;
  if (sameKind) state.executive.decrees = state.executive.decrees.filter((d) => d !== sameKind);

  const decree: ActiveDecree = {
    id: nextId(state, 'dec'),
    kind,
    label: decreeLabel(kind, t.target, v),
    target: t.target,
    value: v,
    issuedOn: state.date,
    expiresOn: def.durationMonths ? addMonths(state.date, def.durationMonths) : null,
    suspended: false,
  };
  state.executive.decrees.push(decree);

  const details: string[] = [];
  if (kind === 'selic' && v !== null) state.executive.selicTarget = v;
  if (kind === 'emergency') {
    state.nation.legitimacy = clamp100(state.nation.legitimacy - C.emergencyLegitimacyHit);
    details.push('Estado de calamidade: fica mais fácil congelar preços, mas a legitimidade se desgasta.');
  }
  shiftGroups(state, reactionTo(state, def, t.target, v));

  const risk = decreeLegalRisk(state, decree);
  if (risk >= 0.03) details.push(riskText(risk));
  logAct(state, `Decreto editado: ${decree.label}.`);
  announce(state, decree);
  return { ok: true, message: `${def.name} em vigor.`, details };
}

/** Notícia e memória política dos atos marcantes. */
function announce(state: GameState, decree: ActiveDecree): void {
  const target = decreeTargetLabel(decree.kind, decree.target).toLowerCase();
  let headline: string | null = null;
  switch (decree.kind) {
    case 'emergency':
      headline = 'Governo decreta estado de calamidade';
      break;
    case 'export_ban':
      headline = `Governo proíbe a exportação de ${target}`;
      break;
    case 'price_freeze':
      headline = `Governo congela o preço de ${target}`;
      break;
    case 'selic':
      headline = `Governo fixa a Selic em ${decreeValueLabel('selic', decree.value)}`;
      break;
    default:
      break;
  }
  if (!headline) return;
  publishNews(state, { headline, category: 'government', importance: 2 });
  addHistory(state, { kind: 'reform', title: headline, importance: 2 });
}

function expropriate(
  state: GameState,
  target: ActiveDecree['target'],
  def: DecreeDefinition,
): ActionResult {
  const gov = state.government;
  const parsed = parseBuildingTarget(target);
  if (!gov || !gov.budget || !parsed) return fail('Não há orçamento federal para indenizar.');
  const { stateId, buildingId } = parsed;
  const building = BUILDINGS[buildingId];
  if (building.sector === 'public' || building.sector === 'informal')
    return fail('Este setor não tem fatia privada a desapropriar.');
  const bs = existingBuilding(state, stateId, buildingId);
  if (!bs) return fail(`Não há ${building.name.toLowerCase()} em ${stateLabel(stateId)}.`);
  const slice = bs.ownership.private;
  if (slice < C.minSlice) return fail('Não há fatia privada relevante neste edifício.');
  if (gov.politicalCapital < def.politicalCost)
    return fail(
      `Capital político insuficiente: o ato custa ${def.politicalCost} e você tem ${Math.floor(gov.politicalCapital)}.`,
    );

  const compensation =
    annualRevenue(state, buildingId, bs) * slice * C.assetValueToRevenue * C.expropriationCompensation;
  gov.politicalCapital -= def.politicalCost;
  bs.ownership.state += slice;
  bs.ownership.private = 0;
  gov.budget.balance -= compensation;

  const e = state.economy;
  e.confidence = clamp100(e.confidence - C.expropriationConfidenceHit);
  e.shocks.push({
    id: nextId(state, 'shock'),
    label: 'Desapropriação',
    monthsLeft: C.expropriationShockMonths,
    growth: 0,
    inflation: 0,
    unemployment: 0,
    confidence: C.expropriationShockConfidence,
  });
  state.industry.investmentPool *= 1 - C.expropriationPrivatePoolLoss;
  state.industry.foreignPool *= 1 - C.expropriationForeignPoolLoss;
  state.nation.legitimacy = clamp100(state.nation.legitimacy - C.expropriationLegitimacyHit);
  shiftGroups(state, C.expropriationGroups);
  shiftRadicalisms(state, C.expropriationRadicalism);

  const label = `${building.name} em ${stateLabel(stateId)}`;
  const headline = `Governo desapropria ${label.toLowerCase()} e indeniza ${formatBi(compensation)}`;
  logAct(state, `Desapropriação: ${label} (${Math.round(slice * 100)}% do capital), indenização de ${formatBi(compensation)}.`);
  publishNews(state, { headline, category: 'economy', importance: 3 });
  addHistory(state, { kind: 'reform', title: headline, importance: 2 });
  return {
    ok: true,
    message: `${label}: fatia privada estatizada.`,
    details: [
      `Indenização de ${formatBi(compensation)} paga pelo Tesouro.`,
      'Investidores reagem: a confiança e os fundos de investimento caem.',
    ],
  };
}

function privatize(
  state: GameState,
  target: ActiveDecree['target'],
  def: DecreeDefinition,
): ActionResult {
  const gov = state.government;
  const parsed = parseBuildingTarget(target);
  if (!gov || !gov.budget || !parsed) return fail('Não há orçamento federal para receber a venda.');
  const { stateId, buildingId } = parsed;
  const building = BUILDINGS[buildingId];
  if (building.sector === 'public' || building.sector === 'informal')
    return fail('Serviços públicos essenciais não são privatizáveis por decreto.');
  const bs = existingBuilding(state, stateId, buildingId);
  if (!bs) return fail(`Não há ${building.name.toLowerCase()} em ${stateLabel(stateId)}.`);

  const mods = aggregateEconomyModifiers(state);
  const floor = Math.max(
    mods.stateShareFloor?.[buildingId] ?? 0,
    building.sector === 'extraction' ? (mods.resourceStateShare ?? 0) : 0,
  );
  const sell = bs.ownership.state - floor;
  if (bs.ownership.state < C.minSlice) return fail('Não há fatia estatal neste edifício.');
  if (sell < C.minSlice)
    return fail(
      `A lei vigente exige participação estatal mínima de ${Math.round(floor * 100)}% neste setor.`,
    );
  if (gov.politicalCapital < def.politicalCost)
    return fail(
      `Capital político insuficiente: o ato custa ${def.politicalCost} e você tem ${Math.floor(gov.politicalCapital)}.`,
    );

  const revenue =
    annualRevenue(state, buildingId, bs) * sell * C.assetValueToRevenue * C.privatizationPrice;
  gov.politicalCapital -= def.politicalCost;
  bs.ownership.state -= sell;
  bs.ownership.private += sell;
  gov.budget.balance += revenue;

  const e = state.economy;
  e.confidence = clamp100(e.confidence + C.privatizationConfidenceGain);
  shiftGroups(state, C.privatizationGroups);
  shiftRadicalisms(state, C.privatizationRadicalism);

  const label = `${building.name} em ${stateLabel(stateId)}`;
  const headline = `Governo privatiza ${label.toLowerCase()} e arrecada ${formatBi(revenue)}`;
  logAct(state, `Privatização: ${label} (${Math.round(sell * 100)}% do capital), receita única de ${formatBi(revenue)}.`);
  publishNews(state, { headline, category: 'economy', importance: 3 });
  addHistory(state, { kind: 'reform', title: headline, importance: 2 });
  return {
    ok: true,
    message: `${label}: fatia estatal vendida.`,
    details: [`Receita única de ${formatBi(revenue)} no caixa.`, 'Sindicatos e servidores reagem.'],
  };
}

/** Revoga um decreto ativo (ou suspenso). */
export function revokeDecree(state: GameState, decreeId: string): ActionResult {
  if (!isFederalExecutive(state)) return fail('Só o Executivo federal revoga decretos.');
  const decree = state.executive.decrees.find((d) => d.id === decreeId);
  if (!decree) return fail('Decreto não encontrado.');
  state.executive.decrees = state.executive.decrees.filter((d) => d.id !== decreeId);
  if (decree.kind === 'selic') state.executive.selicTarget = null;
  logAct(state, `Decreto revogado: ${decree.label}.`);
  return { ok: true, message: `${DECREES[decree.kind].name} revogado.` };
}

// ---------------------------------------------------------------------------
// Tick mensal
// ---------------------------------------------------------------------------

/** Remove todos os decretos (fim de mandato ou perda do Executivo federal). */
export function clearDecrees(state: GameState, reason: string): void {
  const ex = state.executive;
  if (ex.decrees.length === 0 && ex.selicTarget === null) return;
  logAct(state, `${ex.decrees.length} decreto(s) encerrado(s): ${reason}.`);
  ex.decrees = [];
  ex.selicTarget = null;
}

/** Tick mensal: expiração de decretos e risco de suspensão pelo STF. */
export function processExecutiveMonth(state: GameState, rng: Rng): void {
  const ex = state.executive;
  if (!isFederalExecutive(state)) {
    clearDecrees(state, 'o governo federal não é mais conduzido pelo jogador');
    return;
  }

  // Selic só vale com o Banco Central subordinado ao governo.
  if (
    (ex.selicTarget !== null || ex.decrees.some((d) => d.kind === 'selic')) &&
    aggregateEconomyModifiers(state).centralBank !== 'government'
  ) {
    ex.selicTarget = null;
    ex.decrees = ex.decrees.filter((d) => d.kind !== 'selic');
    logAct(state, 'A Selic deixa de ser definida pelo governo: o Banco Central voltou a ser autônomo.');
  }

  // Expiração e arquivamento dos suspensos.
  const kept: ActiveDecree[] = [];
  for (const d of ex.decrees) {
    if (d.expiresOn !== null && state.date >= d.expiresOn) {
      logAct(state, `Decreto expirou: ${d.label}.`);
      continue;
    }
    if (d.suspended && d.suspendedOn && diffMonths(d.suspendedOn, state.date) >= C.suspendedKeepMonths) {
      logAct(state, `Decreto suspenso arquivado: ${d.label}.`);
      continue;
    }
    kept.push(d);
  }
  ex.decrees = kept;

  // Risco mensal de suspensão pelo STF.
  for (const d of ex.decrees) {
    const risk = decreeLegalRisk(state, d);
    if (risk <= 0 || !rng.chance(risk)) continue;
    d.suspended = true;
    d.suspendedOn = state.date;
    const gov = state.government;
    if (gov) gov.approval = clamp100(gov.approval - C.stfApprovalHit);
    state.nation.legitimacy = clamp100(state.nation.legitimacy - C.stfLegitimacyHit);
    logAct(state, `STF suspende o decreto: ${d.label}.`);
    publishNews(state, {
      headline: `STF suspende decreto do governo: ${DECREES[d.kind].name.toLowerCase()}`,
      body: d.label,
      category: 'government',
      sentiment: -1,
      importance: 2,
    });
    pushAlert(state, {
      kind: 'decree_suspended',
      severity: 'warning',
      title: 'STF suspendeu um decreto',
      message: `${d.label} perdeu a eficácia por extrapolar a lei vigente.`,
      link: 'decrees',
    });
  }
}

/** Decretos ativos (não suspensos) de um tipo. */
export function activeDecreesOfKind(state: GameState, kind: DecreeKind): ActiveDecree[] {
  return state.executive.decrees.filter((d) => d.kind === kind && !d.suspended);
}
