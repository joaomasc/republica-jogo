import { sigmoid } from '../core/math';
import type { IsoDate, PartyId } from '../core/types';
import { getLawCategory, getLawOption } from '../laws/laws.data';
import { projectBill } from '../laws/laws';
import { isBillActive, type Bill, type BillInstrument, type BillStatus, type BillVote } from '../laws/types';
import { POP_TYPES, type PopTypeId } from '../population/popTypes';
import type { GameState } from '../simulation/state';
import { availableInstruments, signaturesNeeded } from './actions';
import { CAUCUSES } from './caucuses.data';
import { caucusMembersTotal } from './caucuses';
import {
  chamberById,
  chamberShortName,
  currentChamberId,
  executiveInfo,
  governmentCoalition,
  INSTRUMENT_LABELS,
  INSTRUMENT_SHORT,
  isPlayerBill,
  playerChamberId,
} from './context';
import { impeachmentSupport } from './impeachment';
import { playerMustVoteFloor, playerMustVoteVeto } from './process';
import { CAUCUS_IDS, type CaucusId } from './types';

/**
 * Seletores do processo legislativo para a interface (puros).
 */

export { INSTRUMENT_LABELS, INSTRUMENT_SHORT };

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  committee: 'Nas comissões',
  floor: 'No plenário',
  sanction: 'Aguardando sanção',
  veto: 'Veto em análise',
  plebiscite: 'Aguardando plebiscito',
  passed: 'Virou lei',
  rejected: 'Rejeitado',
  withdrawn: 'Retirado',
  expired: 'Caducou',
};

export interface BillSummary {
  id: string;
  number: string;
  title: string;
  categoryName: string;
  instrument: BillInstrument;
  instrumentLabel: string;
  status: BillStatus;
  statusLabel: string;
  /** Casa atual e etapa, ex.: "Câmara · 2º turno". */
  stage: string;
  /** Progresso da tramitação (0..1). */
  progress: number;
  nextDate: IsoDate;
  author: string;
  mine: boolean;
  urgency: boolean;
  shelved: boolean;
  /** O jogador precisa agir (votar hoje, sancionar). */
  needsPlayer: boolean;
  /** Projeção: passa na casa atual? */
  likely: boolean | null;
  closedOn: IsoDate | null;
}

function stageOf(state: GameState, bill: Bill): string {
  const chamberId = currentChamberId(bill);
  const where = chamberId ? chamberShortName(state, chamberId) : '';
  const rounds = bill.path[bill.stepIndex]?.rounds ?? 1;
  const turn = rounds > 1 ? ` · ${bill.round}º turno` : '';
  switch (bill.status) {
    case 'committee':
      return `${where} · comissão${bill.signatures !== undefined ? ' (coletando assinaturas)' : ''}`;
    case 'floor':
      return `${where} · plenário${turn}${bill.shelved ? ' (engavetado)' : ''}`;
    default:
      return BILL_STATUS_LABELS[bill.status];
  }
}

function progressOf(bill: Bill): number {
  if (!isBillActive(bill)) return 1;
  const steps = bill.path.length || 1;
  const within = bill.status === 'committee' ? 0.2 : bill.status === 'floor' ? 0.6 : 1;
  if (bill.status === 'sanction' || bill.status === 'veto' || bill.status === 'plebiscite') return 0.92;
  return Math.min(0.9, (bill.stepIndex + within) / steps);
}

function summarize(state: GameState, bill: Bill): BillSummary {
  const option = getLawOption(bill.categoryId, bill.optionId);
  let likely: boolean | null = null;
  if (bill.status === 'committee' || bill.status === 'floor') {
    const proj = projectBill(state, bill);
    const c = proj.chambers.find((x) => x.id === currentChamberId(bill));
    likely = c ? c.expectedYes >= c.required : null;
  }
  return {
    id: bill.id,
    number: bill.number,
    title: option?.name ?? bill.optionId,
    categoryName: getLawCategory(bill.categoryId)?.name ?? bill.categoryId,
    instrument: bill.instrument,
    instrumentLabel: INSTRUMENT_LABELS[bill.instrument],
    status: bill.status,
    statusLabel: BILL_STATUS_LABELS[bill.status],
    stage: stageOf(state, bill),
    progress: progressOf(bill),
    nextDate: bill.nextDate,
    author: bill.authorLabel,
    mine: isPlayerBill(state, bill),
    urgency: bill.urgency,
    shelved: !!bill.shelved,
    needsPlayer:
      playerMustVoteFloor(state, bill) ||
      playerMustVoteVeto(state, bill) ||
      (bill.status === 'sanction' && executiveInfo(state).isPlayer),
    likely,
    closedOn: bill.closedOn ?? null,
  };
}

/** Proposições ativas e as encerradas recentemente. */
export function billsOverview(state: GameState): { active: BillSummary[]; closed: BillSummary[] } {
  const active: BillSummary[] = [];
  const closed: BillSummary[] = [];
  for (const b of state.laws.bills) (isBillActive(b) ? active : closed).push(summarize(state, b));
  active.sort((a, b) => Number(b.needsPlayer) - Number(a.needsPlayer) || a.nextDate.localeCompare(b.nextDate));
  return { active, closed: closed.slice(0, 15) };
}

export interface BillDetail {
  summary: BillSummary;
  description: string;
  path: { chamberId: string; name: string; rounds: number; done: boolean; current: boolean }[];
  relator: { name: string; party: string; report: string; isPlayer: boolean } | null;
  timeline: Bill['timeline'];
  votes: BillVote[];
  projection: ReturnType<typeof projectBill>;
  playerVote: 'yes' | 'no' | 'abstain' | null;
  signatures: { have: number; need: number } | null;
  mpExpires: IsoDate | null;
  concessions: number;
}

const REPORT_LABELS: Record<string, string> = {
  pending: 'Pendente',
  favorable: 'Favorável',
  amended: 'Favorável com emendas',
  unfavorable: 'Contrário',
};

/** Detalhe de uma proposição (painel do Congresso). */
export function billDetail(state: GameState, billId: string): BillDetail | null {
  const bill = state.laws.bills.find((b) => b.id === billId);
  if (!bill) return null;
  const option = getLawOption(bill.categoryId, bill.optionId);
  const mine = playerChamberId(state);
  return {
    summary: summarize(state, bill),
    description: option?.description ?? '',
    path: bill.path.map((p, i) => ({
      chamberId: p.chamberId,
      name: chamberById(state, p.chamberId)?.name ?? p.chamberId,
      rounds: p.rounds,
      done: i < bill.stepIndex || !isBillActive(bill),
      current: i === bill.stepIndex && isBillActive(bill),
    })),
    relator: bill.relator
      ? {
          name: bill.relator.name,
          party: state.parties[bill.relator.partyId]?.acronym ?? '',
          report: REPORT_LABELS[bill.relator.report] ?? bill.relator.report,
          isPlayer: !!bill.relator.isPlayer,
        }
      : null,
    timeline: [...bill.timeline].reverse(),
    votes: bill.votes,
    projection: projectBill(state, bill),
    playerVote: mine ? (bill.playerVotes?.[`${mine}:${bill.round}`] ?? null) : null,
    signatures: bill.signatures !== undefined && mine ? { have: bill.signatures, need: signaturesNeeded(state, mine) } : null,
    mpExpires: bill.mpExpires ?? null,
    concessions: bill.concessions,
  };
}

export interface ChamberViewRow {
  partyId: PartyId;
  acronym: string;
  color: string;
  seats: number;
  inGovernment: boolean;
  relation: number;
  caucuses: Partial<Record<CaucusId, number>>;
}

export interface ChamberView {
  id: string;
  name: string;
  total: number;
  government: number;
  rows: ChamberViewRow[];
  speaker: { name: string; party: string; relation: number; isPlayer: boolean; nextElection: IsoDate } | null;
}

/** Composição de uma casa por partido e bancada, base do governo e presidente da casa. */
export function chamberView(state: GameState, chamberId: string): ChamberView | null {
  const chamber = chamberById(state, chamberId);
  if (!chamber) return null;
  const coalition = governmentCoalition(state);
  const rows: ChamberViewRow[] = [];
  let government = 0;
  for (const [pid, seats] of Object.entries(chamber.seats)) {
    const party = state.parties[pid];
    if (!party || seats <= 0) continue;
    const caucuses: Partial<Record<CaucusId, number>> = {};
    for (const c of CAUCUS_IDS) {
      const m = state.legislature.caucuses[c]?.members[chamberId]?.[pid] ?? 0;
      if (m > 0) caucuses[c] = m;
    }
    const inGovernment = coalition.includes(pid);
    if (inGovernment) government += seats;
    rows.push({ partyId: pid, acronym: party.acronym, color: party.color, seats, inGovernment, relation: state.congress.relations[pid] ?? 0, caucuses });
  }
  rows.sort((a, b) => Number(b.inGovernment) - Number(a.inGovernment) || b.seats - a.seats);
  const lead = state.legislature.leadership[chamberId];
  return {
    id: chamber.id,
    name: chamber.name,
    total: chamber.totalSeats,
    government,
    rows,
    speaker: lead
      ? { name: lead.presidentName, party: state.parties[lead.presidentPartyId]?.acronym ?? '', relation: lead.relation, isPlayer: lead.isPlayer, nextElection: lead.nextElection }
      : null,
  };
}

export interface CaucusView {
  id: CaucusId;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  description: string;
  leader: string;
  members: number;
  relation: number;
  strength: number;
  playerMember: boolean;
  agenda: string[];
}

/** Bancadas temáticas: tamanho, relação, força e pauta. */
export function caucusesView(state: GameState): CaucusView[] {
  return CAUCUS_IDS.map((id) => {
    const def = CAUCUSES[id];
    const st = state.legislature.caucuses[id];
    return {
      id,
      name: def.name,
      shortName: def.shortName,
      icon: def.icon,
      color: def.color,
      description: def.description,
      leader: def.leaderName,
      members: caucusMembersTotal(state, id),
      relation: st?.relation ?? 0,
      strength: st?.strength ?? 0.5,
      playerMember: state.legislature.playerCaucuses.includes(id),
      agenda: Object.entries(def.preferredLaws).map(([c, o]) => getLawOption(c, o)?.name ?? o),
    };
  });
}

export interface LawProposalPreview {
  instruments: ReturnType<typeof availableInstruments>;
  defaultInstrument: BillInstrument;
  projection: ReturnType<typeof projectBill>;
  caucuses: { id: CaucusId; name: string; stance: number }[];
  groups: { id: string; name: string; delta: number }[];
  winners: string[];
  losers: string[];
}

/** Prévia de uma proposta: instrumentos, votos esperados, bancadas, grupos e Pops afetados. */
export function lawProposalPreview(state: GameState, categoryId: string, optionId: string): LawProposalPreview | null {
  const cat = getLawCategory(categoryId);
  const option = getLawOption(categoryId, optionId);
  if (!cat || !option) return null;
  const instruments = availableInstruments(state, categoryId, optionId);
  const preferred = instruments.find((i) => i.instrument === cat.instrument && i.allowed) ?? instruments.find((i) => i.allowed);
  const fake: Bill = {
    id: 'preview',
    number: '',
    categoryId,
    optionId,
    instrument: preferred?.instrument ?? cat.instrument,
    authorId: executiveInfo(state).isPlayer ? 'government' : state.playerId,
    authorLabel: '',
    authorPartyId: state.candidates[state.playerId]?.partyId ?? null,
    proposedOn: state.date,
    voteDate: state.date,
    status: 'committee',
    path: state.congress.chambers.map((c) => ({ chamberId: c.id, rounds: cat.instrument === 'pec' ? 2 : 1 })),
    stepIndex: 0,
    round: 1,
    nextDate: state.date,
    scheduled: false,
    urgency: false,
    relator: null,
    concessions: 0,
    partyBonus: {},
    caucusBonus: {},
    publicCampaign: false,
    votes: [],
    playerVote: null,
    timeline: [],
  };
  const pops = Object.entries(option.pops) as [PopTypeId, number][];
  return {
    instruments,
    defaultInstrument: fake.instrument,
    projection: projectBill(state, fake),
    caucuses: CAUCUS_IDS.map((id) => ({ id, name: CAUCUSES[id].shortName, stance: option.caucuses?.[id] ?? 0 })).filter((c) => c.stance !== 0),
    groups: Object.entries(option.groups).map(([id, delta]) => ({ id, name: state.interestGroups[id as keyof typeof state.interestGroups]?.name ?? id, delta: delta ?? 0 })),
    winners: pops.filter(([, v]) => v > 0).map(([t]) => POP_TYPES[t].plural),
    losers: pops.filter(([, v]) => v < 0).map(([t]) => POP_TYPES[t].plural),
  };
}

export interface ImpeachmentView {
  active: boolean;
  targetIsPlayer: boolean;
  targetName: string;
  stage: string;
  nextDate: IsoDate;
  reason: string;
  expectedYes: number;
  required: number;
  total: number;
  votes: BillVote[];
  outcome: string | null;
}

/** Processo de impeachment (se houver). */
export function impeachmentView(state: GameState): ImpeachmentView | null {
  const imp = state.legislature.impeachment;
  if (!imp) return null;
  const support = impeachmentSupport(state);
  const stages: Record<string, string> = { request: 'Pedido', camara: 'Votação na Câmara', senado: 'Julgamento no Senado', concluded: 'Encerrado' };
  const outcomes: Record<string, string> = { removed: 'Afastado(a) do cargo', acquitted: 'Absolvido(a)', archived: 'Arquivado' };
  return {
    active: imp.stage !== 'concluded',
    targetIsPlayer: imp.targetIsPlayer,
    targetName: imp.targetName,
    stage: stages[imp.stage] ?? imp.stage,
    nextDate: imp.nextDate,
    reason: imp.reason,
    expectedYes: support?.expectedYes ?? 0,
    required: support?.required ?? 0,
    total: support?.total ?? 0,
    votes: imp.votes,
    outcome: imp.outcome ? (outcomes[imp.outcome] ?? imp.outcome) : null,
  };
}

/** Próximas votações marcadas (calendário do plenário). */
export function legislativeAgenda(state: GameState): { date: IsoDate; billId: string; number: string; title: string; chamber: string }[] {
  return state.laws.bills
    .filter((b) => (b.status === 'floor' && b.scheduled && !b.shelved) || b.status === 'veto' || b.status === 'plebiscite')
    .map((b) => ({
      date: b.nextDate,
      billId: b.id,
      number: b.number,
      title: getLawOption(b.categoryId, b.optionId)?.name ?? b.optionId,
      chamber: b.status === 'veto' ? 'Sessão do Congresso' : b.status === 'plebiscite' ? 'Plebiscito' : chamberShortName(state, currentChamberId(b) ?? ''),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Probabilidade (0..1) de um partido apoiar uma proposição (para tabelas da interface). */
export function partySupportChance(state: GameState, billId: string, partyId: PartyId): number {
  const bill = state.laws.bills.find((b) => b.id === billId);
  const party = state.parties[partyId];
  if (!bill || !party) return 0;
  const proj = projectBill(state, bill);
  return proj.chambers[0]?.byParty[partyId] ?? sigmoid(0);
}

/** Chefe do Executivo da esfera do jogador (é o jogador? cargo, partido). */
export function executiveInfoView(state: GameState): ReturnType<typeof executiveInfo> {
  return executiveInfo(state);
}
