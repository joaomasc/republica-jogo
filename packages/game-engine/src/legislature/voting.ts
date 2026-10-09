import { GameConstants } from '../config/constants';
import { clamp, sigmoid } from '../core/math';
import type { Rng } from '../core/rng';
import type { PartyId } from '../core/types';
import { ideologyAffinity, ideologyExtremity } from '../ideology/ideology';
import { getLawCategory, getLawOption } from '../laws/laws.data';
import { optionIdeology } from '../laws/laws';
import type { Bill, BillInstrument, BillVote, LawOptionDefinition } from '../laws/types';
import type { Party } from '../parties/types';
import { getDifficulty } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { caucusCohesion, caucusPosition } from './caucuses';
import { LegislatureConstants as LC } from './constants';
import {
  baselineOptionId,
  chamberById,
  executiveInfo,
  governmentCoalition,
  isExecutiveBill,
  isNpcLegislatorBill,
  isPlayerBill,
  mainOpposition,
  type ExecutiveInfo,
} from './context';
import { CAUCUS_IDS, type CaucusId } from './types';

const L = GameConstants.laws;

/**
 * Voto nominal (seção 5.3): cada casa é dividida em segmentos partido × bancada. O logit do
 * segmento soma o logit do partido (ideologia ponderada pelo pragmatismo, base do governo, relação,
 * negociação, pressão popular, grupos de interesse, dificuldade), a posição da bancada × coesão,
 * o parecer do relator e ruído.
 */

export type VoteKind = 'floor' | 'veto';

/** Regra de quórum de uma votação. */
export type QuorumRule = 'simple' | 'absolute' | 'qualified' | 'two_thirds';

export interface VoteContext {
  option: LawOptionDefinition;
  current: LawOptionDefinition | undefined;
  exec: ExecutiveInfo;
  coalition: PartyId[];
  opposition: PartyId | null;
  /** Proposição do jogador (ou do governo do jogador). */
  playerBill: boolean;
  execBill: boolean;
  npcLegislatorBill: boolean;
  /** Orientação do governo à base em projetos que não são dele (+1 a favor, −1 contra). */
  govOrientation: -1 | 0 | 1;
}

/** Afinidade ideológica de um partido com a mudança (opção − atual). */
export function ideologicalGain(
  ideology: Party['ideology'],
  option: LawOptionDefinition,
  current: LawOptionDefinition | undefined,
): number {
  if (!current) return 0;
  return (
    ideologyAffinity(ideology, optionIdeology(option, ideology)) -
    ideologyAffinity(ideology, optionIdeology(current, ideology))
  );
}

/**
 * Pragmatismo (0..1) = 1 − extremismo ideológico. O extremismo é o afastamento médio do centro
 * reescalado para a faixa real dos partidos (0,5 de afastamento médio = extremismo máximo).
 */
export function partyPragmatism(party: Party): number {
  return clamp(1 - ideologyExtremity(party.ideology) * 2, 0, 1);
}

export function voteContext(state: GameState, bill: Bill): VoteContext | null {
  const option = getLawOption(bill.categoryId, bill.optionId);
  if (!option) return null;
  const currentId = baselineOptionId(state, bill);
  const current = currentId ? getLawOption(bill.categoryId, currentId) : undefined;
  const exec = executiveInfo(state);
  const coalition = governmentCoalition(state);
  const execBill = isExecutiveBill(bill);
  let govOrientation: -1 | 0 | 1 = 0;
  const execParty = state.parties[exec.partyId];
  if (!execBill && execParty) {
    const gain = ideologicalGain(execParty.ideology, option, current);
    govOrientation =
      gain > LC.govOrientationMinGain ? 1 : gain < -LC.govOrientationMinGain ? -1 : 0;
  }
  return {
    option,
    current,
    exec,
    coalition,
    opposition: mainOpposition(state, coalition),
    playerBill: isPlayerBill(state, bill),
    execBill,
    npcLegislatorBill: isNpcLegislatorBill(bill),
    govOrientation,
  };
}

/** Logit de apoio de um partido à proposição (sem bancadas, relator e ruído). */
export function billPartyLogit(
  state: GameState,
  bill: Bill,
  party: Party,
  ctx: VoteContext | null = voteContext(state, bill),
  kind: VoteKind = 'floor',
): number {
  if (!ctx) return 0;
  const pragmatism = partyPragmatism(party);
  const ideologyWeight = 1 + LC.pragmatismIdeologyCut * (0.5 - pragmatism);
  const deal = 1 + LC.pragmatismDealWeight * (pragmatism - 0.5);
  const gain = ideologicalGain(party.ideology, ctx.option, ctx.current);
  let logit = gain * L.ideologyFactor * 2 * ideologyWeight;
  const inCoalition = ctx.coalition.includes(party.id);
  if (ctx.execBill) {
    if (inCoalition) logit += L.coalitionBonus * deal;
    if (party.id === ctx.opposition) logit -= L.oppositionPenalty;
  } else if (inCoalition) {
    logit += ctx.govOrientation * LC.govOrientationLogit * deal;
  }
  if (bill.authorPartyId === party.id) logit += LC.authorPartyLogit;
  // Bandeiras explícitas do partido: votar a favor da própria bandeira e contra quem a derruba.
  const flag = party.lawPositions?.[bill.categoryId];
  if (flag) logit += flag === bill.optionId ? LC.platformLogit : flag === ctx.current?.id ? -LC.platformLogit : 0;
  const gov = state.government;
  const player = state.candidates[state.playerId];
  if (ctx.playerBill && player) {
    logit += (state.congress.relations[party.id] ?? 0) * L.relationFactor;
    const approval = gov?.approval ?? 50;
    logit +=
      (approval - 50) *
      L.approvalPressureFactor *
      (bill.publicCampaign ? 1 + L.publicCampaignBonus * 2 : 0.4);
    logit += (player.attributes.negotiation - 50) * L.negotiationFactor;
    logit -= getDifficulty(state).lawDifficulty;
    if (bill.authorId === state.playerId && gov?.branch === 'legislative')
      logit -= L.legislatorAuthorPenalty;
  }
  logit += (bill.partyBonus[party.id] ?? 0) * deal;
  logit += bill.concessions * L.concessionBonus;
  const currentId = ctx.current?.id ?? null;
  for (const g of Object.values(state.interestGroups)) {
    const pref = g.preferredLaws[bill.categoryId];
    if (!pref) continue;
    const sign = pref === bill.optionId ? 1 : pref === currentId ? -0.6 : 0;
    if (sign === 0) continue;
    logit +=
      sign * g.influence * L.interestGroupFactor * ideologyAffinity(party.ideology, g.ideology);
  }
  if (ctx.npcLegislatorBill) logit -= LC.npcBillPenalty;
  if (kind === 'veto') {
    // Derrubar o veto: a base segue o governo que vetou; a oposição tende a derrubar.
    if (inCoalition) logit -= LC.vetoLoyaltyLogit * deal;
    else logit += LC.vetoOppositionLogit;
  }
  return logit;
}

/** Efeito do parecer do relator no plenário da casa em que ele relatou. */
export function relatorLogit(bill: Bill, chamberId: string): number {
  const r = bill.relator;
  if (!r) return 0;
  if (r.chamberId && r.chamberId !== chamberId) return 0;
  return LC.relatorReportLogit[r.report];
}

export interface VoteSegment {
  partyId: PartyId;
  caucusId: CaucusId | null;
  seats: number;
  logit: number;
}

/** Segmentos partido × bancada da casa, com o logit de cada um. */
export function chamberSegments(
  state: GameState,
  bill: Bill,
  chamberId: string,
  kind: VoteKind,
  ctx: VoteContext | null = voteContext(state, bill),
): VoteSegment[] {
  const chamber = chamberById(state, chamberId);
  if (!chamber || !ctx) return [];
  const relator = kind === 'floor' ? relatorLogit(bill, chamberId) : 0;
  const caucusTerm: Partial<Record<CaucusId, number>> = {};
  for (const c of CAUCUS_IDS)
    caucusTerm[c] = caucusCohesion(state, c) * caucusPosition(state, bill, c, ctx.playerBill);
  const out: VoteSegment[] = [];
  for (const [pid, seats] of Object.entries(chamber.seats)) {
    const party = state.parties[pid];
    if (!party || seats <= 0) continue;
    const base = billPartyLogit(state, bill, party, ctx, kind) + relator;
    let rest = seats;
    for (const c of CAUCUS_IDS) {
      const m = Math.min(rest, state.legislature.caucuses[c]?.members[chamberId]?.[pid] ?? 0);
      if (m <= 0) continue;
      out.push({ partyId: pid, caucusId: c, seats: m, logit: base + (caucusTerm[c] ?? 0) });
      rest -= m;
    }
    if (rest > 0) out.push({ partyId: pid, caucusId: null, seats: rest, logit: base });
  }
  return out;
}

/** Regra de quórum por instrumento (tabela 5.1). */
export function quorumRule(instrument: BillInstrument, kind: VoteKind): QuorumRule {
  if (kind === 'veto') return 'absolute';
  if (instrument === 'pec') return 'qualified';
  if (instrument === 'plp') return 'absolute';
  return 'simple';
}

/** Votos "sim" necessários. Na maioria simples, depende de quantos votaram sim/não. */
export function requiredFor(rule: QuorumRule, total: number, yes = 0, no = 0): number {
  switch (rule) {
    case 'simple':
      return Math.floor((yes + no) / 2) + 1;
    case 'absolute':
      return Math.floor(total * LC.absoluteMajority) + 1;
    case 'qualified':
      return Math.ceil(total * LC.pecQuorum);
    case 'two_thirds':
      return Math.ceil(total * LC.impeachmentQuorum - 1e-9);
  }
}

export const QUORUM_LABELS: Record<QuorumRule, string> = {
  simple: 'Maioria simples dos presentes',
  absolute: 'Maioria absoluta dos membros',
  qualified: '3/5 dos membros, em dois turnos',
  two_thirds: '2/3 dos membros',
};

/** Requisito legado (maioria absoluta ou 3/5 do total). */
export function requiredVotes(total: number, constitutional: boolean): number {
  return constitutional
    ? Math.ceil(total * L.qualifiedMajority)
    : Math.floor(total * L.simpleMajority) + 1;
}

export interface PlayerBallot {
  vote: 'yes' | 'no' | 'abstain';
  partyId: PartyId;
  caucuses: CaucusId[];
}

/** Apura votos de segmentos (com ruído e ausências) e soma o voto do jogador. */
export function tallySegments(
  segments: VoteSegment[],
  rng: Rng,
  player: PlayerBallot | null,
): Pick<BillVote, 'yes' | 'no' | 'abstain' | 'byParty' | 'byCaucus'> & { absent: number } {
  const segs = segments.map((s) => ({ ...s }));
  if (player) {
    // O jogador ocupa uma das cadeiras do partido (de preferência fora das bancadas).
    const own = segs.filter((s) => s.partyId === player.partyId && s.seats > 0);
    const target =
      own.find((s) => s.caucusId === null) ?? own.sort((a, b) => b.seats - a.seats)[0] ?? null;
    if (target) target.seats -= 1;
  }
  let yes = 0;
  let no = 0;
  let abstain = 0;
  let absent = 0;
  const byParty: BillVote['byParty'] = {};
  const byCaucus: NonNullable<BillVote['byCaucus']> = {};
  for (const s of segs) {
    if (s.seats <= 0) continue;
    const p = clamp(sigmoid(s.logit) + rng.normal(0, L.voteNoiseSd), 0, 1);
    const away = Math.round(s.seats * rng.range(0, LC.absenceMax));
    const y = Math.round((s.seats - away) * p);
    const n = s.seats - away - y;
    yes += y;
    no += n;
    absent += away;
    const bp = (byParty[s.partyId] ??= { yes: 0, no: 0 });
    bp.yes += y;
    bp.no += n;
    if (s.caucusId) {
      const bc = (byCaucus[s.caucusId] ??= { yes: 0, no: 0 });
      bc.yes += y;
      bc.no += n;
    }
  }
  if (player) {
    const bp = (byParty[player.partyId] ??= { yes: 0, no: 0 });
    if (player.vote === 'yes') {
      yes += 1;
      bp.yes += 1;
    } else if (player.vote === 'no') {
      no += 1;
      bp.no += 1;
    } else abstain += 1;
    if (player.vote !== 'abstain')
      for (const c of player.caucuses) {
        const bc = (byCaucus[c] ??= { yes: 0, no: 0 });
        if (player.vote === 'yes') bc.yes += 1;
        else bc.no += 1;
      }
  }
  abstain += absent;
  return { yes, no, abstain, absent, byParty, byCaucus };
}

/** Votação nominal de uma proposição numa casa. */
export function resolveChamberVote(
  state: GameState,
  bill: Bill,
  chamberId: string,
  kind: VoteKind,
  rng: Rng,
  player: PlayerBallot | null,
): BillVote {
  const chamber = chamberById(state, chamberId);
  const total = chamber?.totalSeats ?? 0;
  const segments = chamberSegments(state, bill, chamberId, kind);
  const t = tallySegments(segments, rng, player);
  const rule = quorumRule(bill.instrument, kind);
  const required = requiredFor(rule, total, t.yes, t.no);
  const present = total - t.absent;
  const quorumOk = present >= Math.floor(total * LC.absoluteMajority) + 1;
  return {
    chamber: chamber?.name ?? chamberId,
    chamberId,
    yes: t.yes,
    no: t.no,
    abstain: t.abstain,
    required,
    passed: quorumOk && t.yes >= required,
    byParty: t.byParty,
    byCaucus: t.byCaucus,
    round: bill.round,
    kind,
    date: state.date,
  };
}

export interface ChamberProjection {
  id: string;
  name: string;
  expectedYes: number;
  required: number;
  total: number;
  /** Probabilidade média de voto "sim" por partido. */
  byParty: Record<PartyId, number>;
  expectedNo?: number;
  /** Probabilidade média de voto "sim" por bancada. */
  byCaucus?: Partial<Record<CaucusId, number>>;
  rule?: QuorumRule;
  rounds?: number;
  passes?: boolean;
}

export interface BillProjection {
  chambers: ChamberProjection[];
  passes: boolean;
}

/** Projeção (sem ruído) da votação em cada casa do caminho, com o quórum do instrumento. */
export function projectBill(
  state: GameState,
  bill: Bill,
  kind: VoteKind = bill.status === 'veto' ? 'veto' : 'floor',
): BillProjection {
  const ctx = voteContext(state, bill);
  const result: BillProjection = { chambers: [], passes: true };
  const steps =
    bill.path.length > 0
      ? bill.path
      : state.congress.chambers.map((c) => ({ chamberId: c.id, rounds: 1 }));
  const seen = new Set<string>();
  steps.forEach((step, index) => {
    if (seen.has(step.chamberId)) return;
    seen.add(step.chamberId);
    const chamber = chamberById(state, step.chamberId);
    if (!chamber) return;
    const segments = chamberSegments(state, bill, step.chamberId, kind, ctx);
    let yesSeats = 0;
    const partyYes: Record<PartyId, number> = {};
    const partySeats: Record<PartyId, number> = {};
    const caucusYes: Partial<Record<CaucusId, number>> = {};
    const caucusSeats: Partial<Record<CaucusId, number>> = {};
    for (const s of segments) {
      const p = sigmoid(s.logit);
      yesSeats += s.seats * p;
      partyYes[s.partyId] = (partyYes[s.partyId] ?? 0) + s.seats * p;
      partySeats[s.partyId] = (partySeats[s.partyId] ?? 0) + s.seats;
      if (s.caucusId) {
        caucusYes[s.caucusId] = (caucusYes[s.caucusId] ?? 0) + s.seats * p;
        caucusSeats[s.caucusId] = (caucusSeats[s.caucusId] ?? 0) + s.seats;
      }
    }
    const presence = 1 - LC.absenceMax / 2;
    const expectedYes = yesSeats * presence;
    const expectedNo = (chamber.totalSeats - yesSeats) * presence;
    const rule = quorumRule(bill.instrument, kind);
    const required = requiredFor(rule, chamber.totalSeats, expectedYes, expectedNo);
    const byParty: Record<PartyId, number> = {};
    for (const [pid, seats] of Object.entries(partySeats))
      if (seats > 0) byParty[pid] = (partyYes[pid] ?? 0) / seats;
    const byCaucus: Partial<Record<CaucusId, number>> = {};
    for (const [cid, seats] of Object.entries(caucusSeats) as [CaucusId, number][])
      if (seats > 0) byCaucus[cid] = (caucusYes[cid] ?? 0) / seats;
    const passes = expectedYes >= required;
    result.chambers.push({
      id: chamber.id,
      name: chamber.name,
      expectedYes: Math.round(expectedYes),
      expectedNo: Math.round(expectedNo),
      required,
      total: chamber.totalSeats,
      byParty,
      byCaucus,
      rule,
      rounds: kind === 'veto' ? 1 : step.rounds,
      passes,
    });
    const pending = kind === 'veto' || index >= bill.stepIndex;
    if (pending && !passes) result.passes = false;
  });
  return result;
}

/** Logit de apoio de um partido (API legada usada pela interface e pelos testes). */
export function partySupportLogit(state: GameState, bill: Bill, party: Party): number {
  return billPartyLogit(state, bill, party);
}

/** Probabilidade de o partido seguir a mudança (linha partidária). */
export function partyLineYes(state: GameState, bill: Bill, partyId: PartyId, kind: VoteKind): boolean {
  const party = state.parties[partyId];
  if (!party) return true;
  return sigmoid(billPartyLogit(state, bill, party, voteContext(state, bill), kind)) > 0.5;
}

/** Categoria constitucional (exige PEC). */
export function isConstitutional(categoryId: string): boolean {
  return getLawCategory(categoryId)?.constitutional ?? false;
}
