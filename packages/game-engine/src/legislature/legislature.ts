import { addDays, yearOf } from '../core/date';
import type { Rng } from '../core/rng';
import type { PartyId } from '../core/types';
import { getLawCategory, getLawOption } from '../laws/laws.data';
import { isBillActive } from '../laws/types';
import { ensureLegislature, executiveInfo } from './context';
import { driftCaucusRelations, updateCaucuses } from './caucuses';
import { playerMustVoteImpeachment, impeachmentRisk, processImpeachmentDay } from './impeachment';
import { driftLeadership, holdLeadershipElection, initLeadership } from './leadership';
import { computeGovernmentCoalition, confidenceCheck, npcBills, npcFederalDrift, processAmendments } from './npc';
import { advanceBill, checkMpExpiry, playerMustVoteFloor, playerMustVoteVeto } from './process';
import { npcManeuvers } from './maneuvers';
import type { Bill, BillChamberStep, BillInstrument, LegalInstrument } from '../laws/types';
import type { GameState } from '../simulation/state';
import { CAUCUS_IDS, type CaucusState, type LegislatureState, type PendingLegislativeDecision } from './types';
import { LegislatureConstants as LC } from './constants';

/**
 * Processo legislativo: montagem do Legislativo, ticks diário e mensal, decisões pendentes e
 * numeração das proposições. A tramitação fica em `process.ts`; o voto, em `voting.ts`.
 */

export function createLegislatureState(): LegislatureState {
  return {
    leadership: {},
    caucuses: Object.fromEntries(
      CAUCUS_IDS.map((id) => [id, { id, members: {}, relation: 0, strength: 0.5 } as CaucusState]),
    ) as LegislatureState['caucuses'],
    playerCaucuses: [],
    governmentCoalition: [],
    counters: {},
    impeachment: null,
    minorityMonths: 0,
    amendments: { year: 0, budget: 0, executed: 0, blocked: 0 },
    log: [],
  };
}

/**
 * (Re)monta mesas diretoras, bancadas e base do governo para as casas em `state.congress.chambers`.
 * Chamado no início da partida e sempre que o Legislativo é recomposto (posse).
 */
export function initLegislature(state: GameState, rng: Rng): void {
  if (!state.legislature) state.legislature = createLegislatureState();
  const leg = ensureLegislature(state);
  leg.governmentCoalition = computeGovernmentCoalition(state);
  initLeadership(state, rng);
  updateCaucuses(state, true);
  leg.minorityMonths = 0;
  leg.governmentLoyalty = leg.governmentCoalition.includes(state.candidates[state.playerId]?.partyId ?? '')
    ? LC.loyaltyInCoalition
    : LC.loyaltyStart;
}

/** O jogador tem mandato e o Legislativo da sua esfera está ativo. */
function active(state: GameState): boolean {
  return !!state.government && (state.phase === 'governing' || state.phase === 'legislating');
}

/** Tick diário: etapas vencidas (comissão, votação, sanção, veto, MP, plebiscito, impeachment). */
export function processLegislatureDay(state: GameState, _rng: Rng): void {
  if (!active(state)) return;
  ensureLegislature(state);
  for (const bill of [...state.laws.bills]) {
    if (!isBillActive(bill)) continue;
    checkMpExpiry(state, bill);
    if (!isBillActive(bill) || bill.nextDate > state.date) continue;
    advanceBill(state, bill);
    if (!state.government) return;
  }
  processImpeachmentDay(state);
}

/** Tick mensal: projetos NPC, eleição das mesas, bancadas, emendas, moção de desconfiança. */
export function processLegislatureMonth(state: GameState, rng: Rng): void {
  ensureLegislature(state);
  npcFederalDrift(state, rng);
  if (!active(state)) return;
  const leg = state.legislature;
  if (!executiveInfo(state).isPlayer) leg.governmentCoalition = computeGovernmentCoalition(state);
  for (const lead of Object.values(leg.leadership))
    if (lead.nextElection <= state.date) holdLeadershipElection(state, lead.chamberId);
  driftLeadership(state);
  updateCaucuses(state);
  driftCaucusRelations(state);
  npcBills(state, rng);
  npcManeuvers(state);
  processAmendments(state);
  impeachmentRisk(state, rng);
  if (!state.government) return;
  confidenceCheck(state, rng);
  // Mantém o histórico de proposições enxuto.
  const bills = state.laws.bills;
  if (bills.length > LC.billsKeep) {
    let inactive = 0;
    state.laws.bills = bills.filter((b) => isBillActive(b) || inactive++ < LC.inactiveKeep);
  }
}

/** Decisões que aguardam o jogador (votos, sanções, impeachment). */
export function pendingDecisions(state: GameState): PendingLegislativeDecision[] {
  if (!state.government || !state.legislature) return [];
  const out: PendingLegislativeDecision[] = [];
  for (const bill of state.laws.bills) {
    if (!isBillActive(bill)) continue;
    const name = getLawOption(bill.categoryId, bill.optionId)?.name ?? bill.optionId;
    if (playerMustVoteFloor(state, bill))
      out.push({
        kind: 'vote',
        billId: bill.id,
        title: `Votação hoje: ${bill.number}`,
        description: `${name}: registre seu voto no plenário.`,
        deadline: state.date,
        blocking: true,
      });
    else if (playerMustVoteVeto(state, bill))
      out.push({
        kind: 'veto_vote',
        billId: bill.id,
        title: `Sessão do veto: ${bill.number}`,
        description: `Manter ou derrubar o veto a ${name}.`,
        deadline: state.date,
        blocking: true,
      });
    else if (bill.status === 'sanction' && executiveInfo(state).isPlayer)
      out.push({
        kind: 'sanction',
        billId: bill.id,
        title: `Sancionar ou vetar: ${bill.number}`,
        description: `${name} foi aprovado pelo Legislativo.`,
        deadline: bill.nextDate,
        blocking: false,
      });
  }
  const imp = state.legislature.impeachment;
  if (imp && imp.stage !== 'concluded') {
    if (playerMustVoteImpeachment(state))
      out.push({
        kind: 'impeachment_vote',
        billId: null,
        title: `Votação do impeachment de ${imp.targetName}`,
        description: imp.reason,
        deadline: state.date,
        blocking: true,
      });
    else if (imp.targetIsPlayer)
      out.push({
        kind: 'impeachment_defense',
        billId: null,
        title: 'Defenda-se do impeachment',
        description: `Votação em ${imp.nextDate.split('-').reverse().join('/')}: negocie apoios.`,
        deadline: imp.nextDate,
        blocking: false,
      });
  }
  return out;
}

/** Motivo para o tempo não avançar (decisão legislativa obrigatória pendente), ou `null`. */
export function legislatureBlockingReason(state: GameState): string | null {
  const blocking = pendingDecisions(state).find((d) => d.blocking);
  return blocking ? blocking.title : null;
}

/** Instrumento padrão para mudar uma categoria de lei. */
export function defaultInstrument(categoryId: string): LegalInstrument {
  return getLawCategory(categoryId)?.instrument ?? 'pl';
}

/** Casas por onde a proposição passa na esfera atual (Câmara → Senado no federal). */
export function billPath(state: GameState, instrument: BillInstrument): BillChamberStep[] {
  const rounds = instrument === 'pec' ? 2 : 1;
  return state.congress.chambers.map((c) => ({ chamberId: c.id, rounds }));
}

const PREFIX: Record<BillInstrument, string> = { pl: 'PL', plp: 'PLP', pec: 'PEC', mp: 'MPV' };

/** Próximo número oficial ("PL 1.234/2027"). */
export function nextBillNumber(state: GameState, instrument: BillInstrument): string {
  const year = yearOf(state.date);
  const key = `${instrument}:${year}`;
  const base = instrument === 'pl' ? 1000 : instrument === 'mp' ? 1100 : 10;
  const n = (state.legislature.counters[key] ?? base) + 1;
  state.legislature.counters[key] = n;
  return `${PREFIX[instrument]} ${n.toLocaleString('pt-BR')}/${year}`;
}

/** Campos de tramitação de uma proposição nova (início na comissão da primeira casa). */
export function newBillFields(
  state: GameState,
  instrument: BillInstrument,
  authorPartyId: PartyId | null,
): Pick<
  Bill,
  | 'number'
  | 'instrument'
  | 'authorPartyId'
  | 'path'
  | 'stepIndex'
  | 'round'
  | 'nextDate'
  | 'scheduled'
  | 'urgency'
  | 'relator'
  | 'caucusBonus'
  | 'timeline'
> {
  const days = LC.committeeDays[instrument];
  return {
    number: nextBillNumber(state, instrument),
    instrument,
    authorPartyId,
    path: billPath(state, instrument),
    stepIndex: 0,
    round: 1,
    nextDate: addDays(state.date, days),
    scheduled: false,
    urgency: false,
    relator: null,
    caucusBonus: {},
    timeline: [{ date: state.date, text: 'Proposição apresentada e enviada às comissões.' }],
  };
}

/** Migração de saves v1: completa os campos de tramitação de projetos antigos. */
export function upgradeBill(state: GameState, raw: Partial<Bill> & Pick<Bill, 'id'>): Bill {
  const instrument = raw.instrument ?? defaultInstrument(raw.categoryId ?? '');
  const bill = raw as Bill;
  bill.instrument = instrument;
  bill.number ??= `${PREFIX[instrument]} ${raw.id}`;
  bill.authorPartyId ??= null;
  bill.path ??= billPath(state, instrument);
  bill.stepIndex ??= 0;
  bill.round ??= 1;
  bill.nextDate ??= raw.voteDate ?? state.date;
  bill.scheduled ??= raw.status === 'committee';
  bill.urgency ??= false;
  bill.relator ??= null;
  bill.caucusBonus ??= {};
  bill.timeline ??= [];
  return bill;
}
