import { GameConstants } from '../config/constants';
import { clamp, sigmoid } from '../core/math';
import type { Rng } from '../core/rng';
import type { ActionResult, PartyId } from '../core/types';
import { OFFICES, type Jurisdiction, type OfficeLevel } from '../election/offices';
import { cityOfJurisdiction } from '../map/cities';
import type { BudgetCategory } from '../economy/types';
import { IDEOLOGY_AXES, type IdeologyVector } from '../ideology/axes';
import { ideologyAffinity } from '../ideology/ideology';
import type { IssueId } from '../ideology/issues';
import { proposeLegislation, voteOnBill } from '../legislature/actions';
import { LegislatureConstants as LC } from '../legislature/constants';
import { defaultInstrument } from '../legislature/legislature';
import { closeBill, rushBill as processRush } from '../legislature/process';
import { billPartyLogit, chamberSegments, quorumRule, requiredFor, voteContext } from '../legislature/voting';
import { publishNews } from '../media/news';
import { onLawEnacted } from '../nation/nation';
import type { Party } from '../parties/types';
import type { InterestGroupId } from '../politics/types';
import type { PopTypeId } from '../population/popTypes';
import type { GameState } from '../simulation/state';
import { federalLaws, localLaws } from './federal';
import { defaultLaws, getLawCategory, getLawOption, LAW_CATEGORIES } from './laws.data';
import { isBillActive, type Bill, type LawEconomyEffects, type LawOptionDefinition, type LawsState } from './types';

const L = GameConstants.laws;

/**
 * Chave das leis de uma esfera. Cidades que não são capitais ganham um terceiro trecho
 * (`municipal:RS:4305108`); as capitais mantêm `municipal:RS` (compatível com saves antigos).
 */
export function jurisdictionKey(j: Pick<Jurisdiction, 'level' | 'stateId' | 'cityId'>): string {
  if (j.level === 'federal' || !j.stateId) return 'federal';
  const city = cityOfJurisdiction(j);
  return city && !city.capital ? `${j.level}:${j.stateId}:${city.id}` : `${j.level}:${j.stateId}`;
}

export function initLawsState(key = 'federal'): LawsState {
  const enacted = defaultLaws();
  return {
    jurisdictionKey: key,
    enacted,
    strength: Object.fromEntries(Object.keys(enacted).map((k) => [k, 1])),
    bills: [],
    implementing: [],
  };
}

/** Nível de legislação do jogador (esfera do mandato). */
export function legislativeLevel(state: GameState): OfficeLevel | null {
  const gov = state.government;
  if (!gov) return null;
  return OFFICES[gov.officeId].level === 'federal' ? 'federal' : gov.jurisdiction.level;
}

export function categoriesForLevel(level: OfficeLevel): typeof LAW_CATEGORIES {
  return LAW_CATEGORIES.filter((c) => c.levels.includes(level));
}

/** Vetor ideológico completo de uma opção (eixos ausentes herdam a referência — não pesam). */
export function optionIdeology(
  option: LawOptionDefinition,
  reference: IdeologyVector,
): IdeologyVector {
  const out = { ...reference };
  for (const axis of IDEOLOGY_AXES) {
    const v = option.ideology[axis];
    if (v !== undefined) out[axis] = v;
  }
  return out;
}

export function partyPreferredOption(party: Party, categoryId: string): string | null {
  const explicit = party.lawPositions[categoryId];
  if (explicit) return explicit;
  const cat = getLawCategory(categoryId);
  if (!cat) return null;
  let best: string | null = null;
  let bestAff = -1;
  for (const o of cat.options) {
    const aff = ideologyAffinity(party.ideology, optionIdeology(o, party.ideology));
    if (aff > bestAff) {
      bestAff = aff;
      best = o.id;
    }
  }
  return best;
}

export interface AggregatedLawEffects {
  economy: LawEconomyEffects;
  budget: Partial<Record<BudgetCategory, number>>;
  pops: Partial<Record<PopTypeId, number>>;
  groups: Partial<Record<InterestGroupId, number>>;
  issues: Partial<Record<IssueId, number>>;
  options: { categoryId: string; option: LawOptionDefinition; strength: number }[];
}

/** Soma dos efeitos das leis vigentes. `national` só conta leis federais; `local`, leis estaduais/municipais. */
export function aggregateLawEffects(
  state: GameState,
  scope: 'national' | 'local' | 'any',
): AggregatedLawEffects {
  const out: AggregatedLawEffects = {
    economy: {},
    budget: {},
    pops: {},
    groups: {},
    issues: {},
    options: [],
  };
  const book =
    scope === 'national' ? federalLaws(state) : scope === 'local' ? localLaws(state) : state.laws;
  if (!book) return out;
  const localScale = book.jurisdictionKey === 'federal' ? 1 : 0.5;
  for (const [categoryId, optionId] of Object.entries(book.enacted)) {
    const option = getLawOption(categoryId, optionId);
    if (!option) continue;
    const strength = (book.strength[categoryId] ?? 1) * localScale;
    out.options.push({ categoryId, option, strength });
    for (const [k, v] of Object.entries(option.economy) as [keyof LawEconomyEffects, number][])
      out.economy[k] = (out.economy[k] ?? 0) + v * strength;
    for (const [k, v] of Object.entries(option.budget) as [BudgetCategory, number][])
      out.budget[k] = (out.budget[k] ?? 0) + v * strength;
    for (const [k, v] of Object.entries(option.pops) as [PopTypeId, number][])
      out.pops[k] = (out.pops[k] ?? 0) + v * strength;
    for (const [k, v] of Object.entries(option.groups) as [InterestGroupId, number][])
      out.groups[k] = (out.groups[k] ?? 0) + v * strength;
    for (const [k, v] of Object.entries(option.issues) as [IssueId, number][])
      out.issues[k] = (out.issues[k] ?? 0) + v * strength;
  }
  return out;
}

/** Logit de apoio de um partido a um projeto (modelo de voto do processo legislativo). */
export function partySupportLogit(state: GameState, bill: Bill, party: Party): number {
  return billPartyLogit(state, bill, party);
}

export interface BillProjection {
  chambers: {
    id: string;
    name: string;
    expectedYes: number;
    required: number;
    total: number;
    byParty: Record<PartyId, number>;
  }[];
  passes: boolean;
}

/** Requisito legado (maioria absoluta ou 3/5 do total). */
export function requiredVotes(total: number, constitutional: boolean): number {
  return constitutional
    ? Math.ceil(total * L.qualifiedMajority)
    : Math.floor(total * L.simpleMajority) + 1;
}

/**
 * Projeção de votos em cada casa que a proposição ainda vai enfrentar (sem ruído): segmentos
 * partido × bancada, parecer do relator e quórum do instrumento.
 */
export function projectBill(state: GameState, bill: Bill): BillProjection {
  const result: BillProjection = { chambers: [], passes: true };
  const ctx = voteContext(state, bill);
  for (const chamber of state.congress.chambers) {
    const segments = chamberSegments(state, bill, chamber.id, 'floor', ctx);
    let expected = 0;
    const byPartyNum: Record<PartyId, number> = {};
    const byPartySeats: Record<PartyId, number> = {};
    for (const s of segments) {
      const p = sigmoid(s.logit);
      expected += s.seats * p;
      byPartyNum[s.partyId] = (byPartyNum[s.partyId] ?? 0) + p * s.seats;
      byPartySeats[s.partyId] = (byPartySeats[s.partyId] ?? 0) + s.seats;
    }
    const byParty: Record<PartyId, number> = {};
    for (const [pid, n] of Object.entries(byPartyNum)) byParty[pid] = n / Math.max(1, byPartySeats[pid] ?? 1);
    const rule = quorumRule(bill.instrument, 'floor');
    const yes = Math.round(expected);
    const required = requiredFor(rule, chamber.totalSeats, yes, Math.max(0, chamber.totalSeats - yes));
    result.chambers.push({ id: chamber.id, name: chamber.name, expectedYes: yes, required, total: chamber.totalSeats, byParty });
    if (yes < required) result.passes = false;
  }
  return result;
}

export function canProposeBill(state: GameState, categoryId: string, optionId: string): string | null {
  const gov = state.government;
  if (!gov || (state.phase !== 'governing' && state.phase !== 'legislating'))
    return 'É preciso ter um mandato para propor leis.';
  const level = legislativeLevel(state);
  const cat = getLawCategory(categoryId);
  const option = getLawOption(categoryId, optionId);
  if (!cat || !option || !level) return 'Lei inválida.';
  if (!cat.levels.includes(level)) return 'Sua esfera de governo não legisla sobre este tema.';
  if (state.laws.enacted[categoryId] === optionId) return 'Essa opção já está em vigor.';
  if (state.laws.bills.some((b) => b.categoryId === categoryId && isBillActive(b)))
    return 'Já existe um projeto sobre este tema tramitando.';
  if (state.laws.implementing.some((i) => i.categoryId === categoryId))
    return 'Uma mudança neste tema ainda está sendo implementada.';
  if (option.requires && !option.requires.some((r) => Object.values(state.laws.enacted).includes(r)))
    return 'Requisitos da lei não atendidos.';
  if (gov.politicalCapital < option.politicalCost)
    return `Capital político insuficiente (precisa de ${option.politicalCost}).`;
  return null;
}

/** Apresenta um projeto de lei com o instrumento padrão da categoria (compatibilidade). */
export function proposeBill(state: GameState, categoryId: string, optionId: string): ActionResult {
  return proposeLegislation(state, categoryId, optionId, defaultInstrument(categoryId));
}

export function withdrawBill(state: GameState, billId: string): ActionResult {
  const bill = state.laws.bills.find((b) => b.id === billId && isBillActive(b));
  if (!bill) return { ok: false, message: 'Projeto não encontrado.' };
  if (bill.authorId !== 'government' && bill.authorId !== state.playerId)
    return { ok: false, message: 'Só o autor pode retirar o projeto.' };
  closeBill(state, bill, 'withdrawn');
  return { ok: true, message: 'Projeto retirado de pauta.' };
}

/** Urgência urgentíssima: todas as votações restantes no mesmo dia. */
export function rushBill(state: GameState, billId: string): ActionResult {
  const bill = state.laws.bills.find((b) => b.id === billId && (b.status === 'committee' || b.status === 'floor'));
  if (!bill) return { ok: false, message: 'Projeto não encontrado.' };
  const gov = state.government;
  if (gov) gov.politicalCapital = clamp(gov.politicalCapital - LC.rushCapital, 0, 100);
  const lead = state.legislature.leadership[bill.path[bill.stepIndex]?.chamberId ?? ''];
  if (lead && !lead.isPlayer) lead.relation = clamp(lead.relation + LC.rushSpeakerRelation, -100, 100);
  const vote = processRush(state, bill);
  const score = vote ? `${vote.yes} a ${vote.no}` : '';
  // Uma derrota em plenário é um resultado válido (a ação aconteceu), por isso ok: true.
  return {
    ok: true,
    message:
      bill.status === 'rejected'
        ? `Rejeitado (${score}).`
        : bill.status === 'passed'
          ? `Aprovado por ${score}!`
          : `Aprovado no Congresso (${score}); segue para ${bill.status === 'veto' ? 'a sessão do veto' : bill.status === 'plebiscite' ? 'o plebiscito' : 'sanção'}.`,
  };
}

/** Voto do jogador parlamentar (compatibilidade com 'gov/vote'). */
export function castPlayerVote(state: GameState, billId: string, vote: 'yes' | 'no' | 'abstain'): ActionResult {
  return voteOnBill(state, billId, vote);
}

/** Tick mensal das leis: implementação gradual (votações e projetos NPC ficam no Legislativo). */
export function processLawsMonthly(state: GameState, _rng: Rng): void {
  const remaining = [];
  for (const impl of state.laws.implementing) {
    impl.monthsLeft -= 1;
    if (impl.monthsLeft <= 0) {
      state.laws.enacted[impl.categoryId] = impl.optionId;
      state.laws.strength[impl.categoryId] = impl.strength;
      const option = getLawOption(impl.categoryId, impl.optionId);
      publishNews(state, { headline: `Entra em vigor: ${option?.name ?? impl.optionId}`, category: 'government' });
      onLawEnacted(state, impl.categoryId, impl.optionId);
    } else remaining.push(impl);
  }
  state.laws.implementing = remaining;
}
