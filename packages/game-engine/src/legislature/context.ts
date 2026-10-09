import { hashSeed, Rng } from '../core/rng';
import { isStateId, type PartyId, type StateId } from '../core/types';
import type { OfficeLevel } from '../election/offices';
import { getLawOption } from '../laws/laws.data';
import type { Bill, BillInstrument } from '../laws/types';
import { pushAlert, type AlertInput } from '../media/alerts';
import { publishNews, type NewsInput } from '../media/news';
import { NEWS_OUTLETS } from '../media/outlets';
import type { Chamber } from '../politics/types';
import type { GameState } from '../simulation/state';
import { LegislatureConstants as LC } from './constants';
import { CAUCUS_IDS, type CaucusState, type LegislatureState } from './types';

/**
 * Utilitários compartilhados do processo legislativo: esfera, Executivo da esfera, casa do
 * jogador, RNG derivado, registros (log, linha do tempo, notícias e alertas).
 */

/** RNG derivado da seed, da data e de rótulos (não consome o RNG principal da partida). */
export function legRng(state: GameState, ...parts: (string | number)[]): Rng {
  return new Rng(hashSeed(state.meta.seed, 'legislature', state.date, ...parts));
}

/** Completa campos opcionais ausentes (saves antigos ou estados criados por outros módulos). */
export function ensureLegislature(state: GameState): LegislatureState {
  const leg = state.legislature;
  leg.leadership ??= {};
  leg.caucuses ??= {} as LegislatureState['caucuses'];
  for (const id of CAUCUS_IDS)
    leg.caucuses[id] ??= { id, members: {}, relation: 0, strength: 0.5 } as CaucusState;
  leg.playerCaucuses ??= [];
  leg.governmentCoalition ??= [];
  leg.counters ??= {};
  leg.impeachment ??= null;
  leg.minorityMonths ??= 0;
  leg.amendments ??= { year: 0, budget: 0, executed: 0, blocked: 0 };
  leg.log ??= [];
  leg.governmentLoyalty ??= LC.loyaltyStart;
  leg.mpBlocked ??= {};
  leg.lastConfidenceVote ??= null;
  return leg;
}

/** Esfera das leis do jogador (`state.laws`). */
export function sphereLevel(state: GameState): OfficeLevel {
  const key = state.laws.jurisdictionKey;
  if (key.startsWith('estadual')) return 'estadual';
  if (key.startsWith('municipal')) return 'municipal';
  return 'federal';
}

export function sphereStateId(state: GameState): StateId | null {
  const id = state.laws.jurisdictionKey.split(':')[1] ?? '';
  if (isStateId(id)) return id;
  return state.government?.jurisdiction.stateId ?? null;
}

export function isFederalSphere(state: GameState): boolean {
  return state.laws.jurisdictionKey === 'federal';
}

export interface ExecutiveInfo {
  /** O jogador chefia o Executivo da esfera. */
  isPlayer: boolean;
  partyId: PartyId;
  /** Rótulo do autor das proposições do Executivo. */
  label: string;
  /** Cargo do chefe do Executivo ("Presidente da República"...). */
  office: string;
  level: OfficeLevel;
}

const EXEC_LABEL: Record<OfficeLevel, string> = {
  federal: 'Presidência da República',
  estadual: 'Governo do Estado',
  municipal: 'Prefeitura',
};
const EXEC_OFFICE: Record<OfficeLevel, string> = {
  federal: 'Presidente da República',
  estadual: 'Governador(a)',
  municipal: 'Prefeito(a)',
};

/** Quem chefia o Executivo da esfera do Legislativo do jogador (o próprio jogador ou um NPC). */
export function executiveInfo(state: GameState): ExecutiveInfo {
  const level = sphereLevel(state);
  const gov = state.government;
  const player = state.candidates[state.playerId];
  if (gov && gov.branch === 'executive' && player)
    return {
      isPlayer: true,
      partyId: player.partyId,
      label: player.ballotName,
      office: EXEC_OFFICE[level],
      level,
    };
  const stateId = sphereStateId(state);
  const land = state.landscape;
  const partyId =
    level === 'estadual' && stateId
      ? (land.governors[stateId] ?? land.presidentPartyId)
      : level === 'municipal' && stateId
        ? (land.mayors[stateId] ?? land.presidentPartyId)
        : land.presidentPartyId;
  return { isPlayer: false, partyId, label: EXEC_LABEL[level], office: EXEC_OFFICE[level], level };
}

/** Casa do jogador parlamentar (`null` se ele não é legislador). */
export function playerChamberId(state: GameState): string | null {
  const gov = state.government;
  if (!gov || gov.branch !== 'legislative') return null;
  const chambers = state.congress.chambers;
  if (gov.officeId === 'senador' && chambers.some((c) => c.id === 'senado')) return 'senado';
  if (gov.officeId === 'deputado_federal' && chambers.some((c) => c.id === 'camara'))
    return 'camara';
  return chambers[0]?.id ?? null;
}

export function chamberById(state: GameState, id: string): Chamber | undefined {
  return state.congress.chambers.find((c) => c.id === id);
}

export function chamberName(state: GameState, id: string): string {
  return chamberById(state, id)?.name ?? id;
}

/** Nome curto da casa para manchetes ("Câmara", "Senado", "Assembleia"). */
export function chamberShortName(state: GameState, id: string): string {
  if (id === 'camara') return 'Câmara';
  if (id === 'senado') return 'Senado';
  if (id === 'assembleia') return 'Assembleia';
  if (id === 'camara_municipal') return 'Câmara Municipal';
  return chamberName(state, id);
}

/** Tratamento dos membros da casa ("Dep.", "Sen.", "Ver."). */
export function memberPrefix(chamberId: string): string {
  if (chamberId === 'senado') return 'Sen.';
  if (chamberId === 'camara_municipal') return 'Ver.';
  if (chamberId === 'assembleia') return 'Dep. Est.';
  return 'Dep.';
}

export function currentChamberId(bill: Bill): string | null {
  return bill.path[bill.stepIndex]?.chamberId ?? null;
}

/** Proposição do jogador (ou do governo do jogador). */
export function isPlayerBill(state: GameState, bill: Bill): boolean {
  return bill.authorId === 'government' || bill.authorId === state.playerId;
}

/** Proposição de autoria do Executivo (jogador ou NPC). */
export function isExecutiveBill(bill: Bill): boolean {
  return bill.authorId === 'government' || bill.authorRole === 'executive';
}

/** Pauta de parlamentar ou bancada NPC. */
export function isNpcLegislatorBill(bill: Bill): boolean {
  return bill.authorId === 'npc' && bill.authorRole !== 'executive';
}

export function isMp(bill: Pick<Bill, 'instrument'>): boolean {
  return bill.instrument === 'mp';
}

/** Opção que vale se a proposição cair (para MP, a anterior à edição). */
export function baselineOptionId(state: GameState, bill: Bill): string | null {
  if (bill.instrument === 'mp' && bill.previousOptionId) return bill.previousOptionId;
  return state.laws.enacted[bill.categoryId] ?? null;
}

/** Base do governo da esfera: a do jogador (Executivo) ou a do Executivo NPC. */
export function governmentCoalition(state: GameState): PartyId[] {
  const exec = executiveInfo(state);
  const list = exec.isPlayer ? state.congress.coalition : state.legislature.governmentCoalition;
  return list.includes(exec.partyId) ? list : [exec.partyId, ...list];
}

/** Maior partido fora da base (na primeira casa). */
export function mainOpposition(state: GameState, coalition: PartyId[]): PartyId | null {
  const chamber = state.congress.chambers[0];
  if (!chamber) return null;
  let best: PartyId | null = null;
  let bestSeats = 0;
  for (const [pid, seats] of Object.entries(chamber.seats)) {
    if (coalition.includes(pid) || seats <= bestSeats) continue;
    best = pid;
    bestSeats = seats;
  }
  return best;
}

export function optionName(categoryId: string, optionId: string): string {
  return getLawOption(categoryId, optionId)?.name ?? optionId;
}

export const INSTRUMENT_LABELS: Record<BillInstrument, string> = {
  pl: 'Projeto de lei',
  plp: 'Projeto de lei complementar',
  pec: 'Proposta de emenda constitucional',
  mp: 'Medida provisória',
};

export const INSTRUMENT_SHORT: Record<BillInstrument, string> = {
  pl: 'PL',
  plp: 'PLP',
  pec: 'PEC',
  mp: 'MP',
};

/** "PL 1.001/2027 (Ensino técnico)". */
export function billLabel(bill: Bill): string {
  return `${bill.number} (${optionName(bill.categoryId, bill.optionId)})`;
}

/** Registro do processo legislativo (painel do Congresso). */
export function legLog(
  state: GameState,
  text: string,
  tone: 'info' | 'good' | 'bad' = 'info',
  billId?: string,
): void {
  const log = state.legislature.log;
  log.unshift({ date: state.date, text, tone, ...(billId ? { billId } : {}) });
  if (log.length > LC.logLimit) log.length = LC.logLimit;
}

/** Evento na linha do tempo da proposição. */
export function billNote(
  state: GameState,
  bill: Bill,
  text: string,
  tone: 'info' | 'good' | 'bad' = 'info',
): void {
  bill.timeline.push({ date: state.date, text, tone });
  if (bill.timeline.length > LC.timelineLimit)
    bill.timeline.splice(0, bill.timeline.length - LC.timelineLimit);
}

/** Publica notícia com veículo sorteado por RNG derivado (não mexe no RNG principal). */
export function legNews(state: GameState, input: NewsInput, salt: string): void {
  const outlet = input.outlet ?? legRng(state, 'news', salt).pick(NEWS_OUTLETS);
  publishNews(state, { ...input, outlet });
}

export function legAlert(state: GameState, input: AlertInput): void {
  pushAlert(state, input);
}
