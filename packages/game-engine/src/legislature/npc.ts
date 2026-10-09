import { yearOf } from '../core/date';
import { clamp, sigmoid } from '../core/math';
import type { Rng } from '../core/rng';
import type { PartyId } from '../core/types';
import { federalLaws } from '../laws/federal';
import { getLawOption, LAW_CATEGORIES } from '../laws/laws.data';
import { isBillActive, type BillInstrument, type LawCategoryDefinition } from '../laws/types';
import { ideologyAffinity } from '../ideology/ideology';
import { endTerm } from '../government/government';
import { addHistory } from '../history/history';
import { onLawEnacted } from '../nation/nation';
import { getPlayer } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { CAUCUSES } from './caucuses.data';
import { LegislatureConstants as LC } from './constants';
import {
  chamberById,
  executiveInfo,
  isFederalSphere,
  legLog,
  legNews,
  memberPrefix,
  sphereLevel,
} from './context';
import { fileBill } from './process';
import { ideologicalGain } from './voting';
import { CAUCUS_IDS, type CaucusId } from './types';

/** Categorias que a esfera atual pode legislar. */
function sphereCategories(state: GameState): LawCategoryDefinition[] {
  const level = sphereLevel(state);
  return LAW_CATEGORIES.filter((c) => c.levels.includes(level));
}

function hasActiveBill(state: GameState, categoryId: string): boolean {
  return state.laws.bills.some((b) => b.categoryId === categoryId && isBillActive(b));
}

/** Melhor mudança para um partido (maior ganho ideológico) dentre as categorias livres. */
function bestChange(
  state: GameState,
  partyId: PartyId,
  rng: Rng,
  filter: (cat: LawCategoryDefinition) => boolean = () => true,
): { categoryId: string; optionId: string; instrument: BillInstrument } | null {
  const party = state.parties[partyId];
  if (!party) return null;
  const options: { categoryId: string; optionId: string; gain: number; instrument: BillInstrument }[] = [];
  for (const cat of sphereCategories(state)) {
    if (!filter(cat) || hasActiveBill(state, cat.id)) continue;
    if (state.laws.implementing.some((i) => i.categoryId === cat.id)) continue;
    const current = getLawOption(cat.id, state.laws.enacted[cat.id] ?? cat.defaultOptionId);
    for (const o of cat.options) {
      if (o.id === current?.id || o.politicalCost > LC.npcMaxCost || o.special) continue;
      if (o.requires && !o.requires.some((r) => Object.values(state.laws.enacted).includes(r))) continue;
      const gain = ideologicalGain(party.ideology, o, current);
      if (gain > LC.npcMinGain) options.push({ categoryId: cat.id, optionId: o.id, gain, instrument: cat.instrument });
    }
  }
  if (!options.length) return null;
  const pick = rng.weightedPick(options, (o) => o.gain);
  return pick ? { categoryId: pick.categoryId, optionId: pick.optionId, instrument: pick.instrument } : null;
}

/** Base do governo NPC: partidos ideologicamente próximos ao do chefe do Executivo. */
export function computeGovernmentCoalition(state: GameState): PartyId[] {
  const exec = executiveInfo(state);
  const execParty = state.parties[exec.partyId];
  const chamber = state.congress.chambers[0];
  if (!execParty || !chamber) return [exec.partyId];
  const ranked = Object.entries(chamber.seats)
    .filter(([pid, s]) => s > 0 && state.parties[pid])
    .map(([pid, s]) => ({ pid, s, aff: ideologyAffinity(execParty.ideology, state.parties[pid]!.ideology) }))
    .sort((a, b) => b.aff - a.aff);
  const out: PartyId[] = [exec.partyId];
  let seats = chamber.seats[exec.partyId] ?? 0;
  for (const r of ranked) {
    if (r.pid === exec.partyId) continue;
    const enough = seats >= chamber.totalSeats * LC.govCoalitionTargetShare;
    if (r.aff >= LC.govCoalitionMinAffinity || (!enough && r.aff >= LC.govCoalitionFloorAffinity)) {
      out.push(r.pid);
      seats += r.s;
    }
  }
  return out;
}

/** Projetos do Executivo NPC e pautas de parlamentares/bancadas (tick mensal). */
export function npcBills(state: GameState, rng: Rng): void {
  const exec = executiveInfo(state);
  if (!exec.isPlayer && rng.chance(LC.npcExecBillChance)) {
    const change = bestChange(state, exec.partyId, rng);
    if (change) {
      const cat = LAW_CATEGORIES.find((c) => c.id === change.categoryId);
      const useMp = isFederalSphere(state) && cat?.allowsMP && rng.chance(LC.npcMpShare) && !state.legislature.mpBlocked?.[`${change.categoryId}:${change.optionId}`];
      const bill = fileBill(state, {
        ...change,
        instrument: useMp ? 'mp' : change.instrument,
        authorId: 'npc',
        authorLabel: exec.label,
        authorPartyId: exec.partyId,
        authorRole: 'executive',
        urgency: rng.chance(LC.npcUrgencyChance),
      });
      legNews(state, { headline: `${exec.office} envia ao Legislativo: ${getLawOption(bill.categoryId, bill.optionId)?.name ?? ''}`, category: 'congress' }, bill.id);
    }
  }
  if (!rng.chance(LC.npcLegislatorBillChance)) return;
  const chamber = state.congress.chambers[rng.int(0, Math.max(0, state.congress.chambers.length - 1))];
  if (!chamber) return;
  if (rng.chance(LC.npcCaucusBillShare)) {
    const caucusId = rng.pick(CAUCUS_IDS) as CaucusId;
    const def = CAUCUSES[caucusId];
    const prefs = Object.entries(def.preferredLaws).filter(
      ([cat, opt]) => sphereCategories(state).some((c) => c.id === cat) && state.laws.enacted[cat] !== opt && !hasActiveBill(state, cat),
    );
    if (!prefs.length) return;
    const [categoryId, optionId] = rng.pick(prefs);
    const cat = LAW_CATEGORIES.find((c) => c.id === categoryId);
    fileBill(state, {
      categoryId,
      optionId,
      instrument: cat?.instrument ?? 'pl',
      authorId: 'npc',
      authorLabel: `${def.shortName} (${def.leaderName})`,
      authorPartyId: null,
      authorRole: 'caucus',
      caucusId,
      originChamberId: chamber.id,
    });
    return;
  }
  const entries = Object.entries(chamber.seats).filter(([pid, s]) => s > 0 && pid !== getPlayer(state).partyId);
  const party = rng.weightedPick(entries, ([, s]) => s)?.[0];
  if (!party) return;
  const change = bestChange(state, party, rng, (c) => c.instrument !== 'pec');
  if (!change) return;
  fileBill(state, {
    ...change,
    authorId: 'npc',
    authorLabel: `${memberPrefix(chamber.id)} ${state.parties[party]?.acronym ?? ''}`,
    authorPartyId: party,
    authorRole: 'legislator',
    originChamberId: chamber.id,
  });
}

/** Governo federal NPC muda leis federais de vez em quando (jogador fora da esfera federal). */
export function npcFederalDrift(state: GameState, rng: Rng): void {
  if (isFederalSphere(state) || !rng.chance(LC.npcFederalChangeChance)) return;
  const laws = federalLaws(state);
  const party = state.parties[state.landscape.presidentPartyId];
  if (!party) return;
  const options: { cat: string; opt: string; gain: number }[] = [];
  for (const cat of LAW_CATEGORIES) {
    if (!cat.levels.includes('federal')) continue;
    const current = getLawOption(cat.id, laws.enacted[cat.id] ?? cat.defaultOptionId);
    for (const o of cat.options) {
      if (o.id === current?.id || o.politicalCost > LC.npcMaxCost || o.special) continue;
      const gain = ideologicalGain(party.ideology, o, current);
      if (gain > LC.npcMinGain * 3) options.push({ cat: cat.id, opt: o.id, gain });
    }
  }
  const pick = rng.weightedPick(options, (o) => o.gain);
  if (!pick) return;
  laws.enacted[pick.cat] = pick.opt;
  laws.strength[pick.cat] = 1;
  onLawEnacted(state, pick.cat, pick.opt);
  legNews(state, { headline: `Governo federal aprova: ${getLawOption(pick.cat, pick.opt)?.name ?? ''}`, category: 'government', importance: 2 }, `federal:${pick.cat}`);
}

/** Emendas parlamentares do jogador legislador: liberadas conforme a fidelidade ao governo. */
export function processAmendments(state: GameState): void {
  const gov = state.government;
  if (!gov || gov.branch !== 'legislative') return;
  const leg = state.legislature;
  const year = yearOf(state.date);
  const quota = (LC.amendmentQuota as Record<string, number>)[gov.officeId] ?? 0;
  if (leg.amendments.year !== year) leg.amendments = { year, budget: quota, executed: 0, blocked: 0 };
  if (quota <= 0) return;
  const exec = executiveInfo(state);
  const loyalty = (leg.governmentLoyalty ?? LC.loyaltyStart) / 100;
  const release = exec.isPlayer ? 1 : clamp(LC.amendmentBaseRelease + LC.amendmentLoyaltyRelease * (loyalty - 0.5), 0, 1);
  const monthly = quota / 12;
  leg.amendments.executed += monthly * release;
  leg.amendments.blocked += monthly * (1 - release);
  const share = release / 12;
  const home = gov.jurisdiction.stateId ?? getPlayer(state).homeStateId;
  for (const pop of Object.values(state.population.pops))
    if (pop.stateId === home) pop.satisfaction = clamp(pop.satisfaction + LC.amendmentSatisfactionPerYear * share * 0.2, 0, 100);
  const player = getPlayer(state);
  player.attributes.popularity = clamp(player.attributes.popularity + LC.amendmentPopularityPerYear * share, 0, 100);
  gov.approval = clamp(gov.approval + LC.amendmentApprovalPerYear * share, 0, 100);
}

/** Parlamentarismo/semipresidencialismo: moção de desconfiança quando a base é minoritária. */
export function confidenceCheck(state: GameState, rng: Rng): void {
  const gov = state.government;
  const regime = state.nation.regime;
  if (!gov || gov.branch !== 'executive' || !isFederalSphere(state)) return;
  if (regime !== 'parliamentary' && regime !== 'semi_presidential') return;
  const chamber = chamberById(state, 'camara') ?? state.congress.chambers[0];
  if (!chamber) return;
  let base = 0;
  for (const [pid, s] of Object.entries(chamber.seats)) if (state.congress.coalition.includes(pid)) base += s;
  const leg = state.legislature;
  if (base >= chamber.totalSeats * LC.confidenceShare) {
    leg.minorityMonths = 0;
    return;
  }
  leg.minorityMonths += 1;
  if (leg.minorityMonths < LC.confidenceMonths) return;
  leg.minorityMonths = 0;
  // Votação da moção: a oposição vota a favor; a base, contra.
  let yes = 0;
  for (const [pid, seats] of Object.entries(chamber.seats)) {
    const inBase = state.congress.coalition.includes(pid);
    const logit = LC.confidenceBaseLogit + (inBase ? -LC.confidenceCoalitionLogit : LC.confidenceOppositionLogit) - (gov.approval - 50) * LC.confidenceApprovalFactor;
    yes += Math.round(seats * clamp(sigmoid(logit) + rng.normal(0, 0.05), 0, 1));
  }
  const required = Math.floor(chamber.totalSeats / 2) + 1;
  const passed = yes >= required;
  leg.lastConfidenceVote = { chamber: chamber.name, chamberId: chamber.id, yes, no: chamber.totalSeats - yes, abstain: 0, required, passed, byParty: {}, kind: 'confidence', date: state.date };
  if (!passed) {
    legNews(state, { headline: `Governo sobrevive à moção de desconfiança (${yes} votos a favor)`, category: 'congress', importance: 2 }, 'confianca');
    return;
  }
  if (regime === 'semi_presidential') {
    gov.ministers = [];
    gov.stability = clamp(gov.stability - 15, 0, 100);
    gov.politicalCapital = clamp(gov.politicalCapital - 20, 0, 100);
    legNews(state, { headline: 'Moção de desconfiança derruba o gabinete; ministros deixam os cargos', category: 'government', importance: 3, sentiment: -1 }, 'gabinete');
    addHistory(state, { kind: 'crisis', title: 'Gabinete derrubado por moção de desconfiança', importance: 2, sentiment: -1 });
    return;
  }
  legNews(state, { headline: 'Moção de desconfiança aprovada: o governo cai', category: 'government', importance: 3, sentiment: -1 }, 'queda');
  addHistory(state, { kind: 'crisis', title: 'Governo derrubado por moção de desconfiança', importance: 3, sentiment: -1 });
  legLog(state, 'O governo caiu numa moção de desconfiança.', 'bad');
  endTerm(state);
}

