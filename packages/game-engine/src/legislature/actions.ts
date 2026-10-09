import { addDays, yearOf } from '../core/date';
import { clamp, sigmoid } from '../core/math';
import type { ActionResult, PartyId } from '../core/types';
import { getLawCategory, getLawOption } from '../laws/laws.data';
import { canProposeBill } from '../laws/laws';
import { isBillActive, type Bill, type BillInstrument } from '../laws/types';
import { getPlayer } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { joinCaucus, leaveCaucus, meetCaucus } from './caucuses';
import { LegislatureConstants as LC } from './constants';
import { chamberById, currentChamberId, executiveInfo, isFederalSphere, legLog, playerChamberId } from './context';
import { defendImpeachment, fileImpeachment, playerMustVoteImpeachment, resolveImpeachmentStage } from './impeachment';
import { runForSpeakerAction } from './leadership';
import {
  applyPlayerVoteEffects,
  applySanction,
  fileBill,
  playerMustVoteFloor,
  playerMustVoteVeto,
  resolveFloorVote,
  resolveVetoSession,
} from './process';
import { billPartyLogit } from './voting';
import { candidatePlatform, platformCoherence } from '../laws/platform';
import type { CaucusId } from './types';

const fail = (message: string): ActionResult => ({ ok: false, message });

/** Multiplicador do custo político por instrumento. */
const COST_MULT: Record<BillInstrument, number> = { pl: 1, plp: 1.1, pec: 1.25, mp: 1.3 };

/** Instrumentos que o jogador pode usar para mudar uma categoria agora (com o motivo de cada bloqueio). */
export function availableInstruments(
  state: GameState,
  categoryId: string,
  optionId?: string,
): { instrument: BillInstrument; allowed: boolean; reason: string | null; cost: number }[] {
  const cat = getLawCategory(categoryId);
  if (!cat) return [];
  const option = optionId ? getLawOption(categoryId, optionId) : undefined;
  const exec = executiveInfo(state);
  const gov = state.government;
  const base = option?.politicalCost ?? 0;
  const list: BillInstrument[] = ['pl', 'plp', 'pec', 'mp'];
  return list.map((instrument) => {
    let reason: string | null = null;
    if (cat.instrument === 'pec' && instrument !== 'pec') reason = 'Este tema está na Constituição: só muda por PEC.';
    else if (cat.instrument === 'plp' && instrument === 'pl') reason = 'Este tema exige lei complementar (ou PEC).';
    else if (instrument === 'mp') {
      if (!exec.isPlayer || !isFederalSphere(state)) reason = 'Só o Presidente da República edita medidas provisórias.';
      else if (!cat.allowsMP) reason = 'Este tema não pode ser tratado por medida provisória.';
      else if (option && state.legislature.mpBlocked?.[`${categoryId}:${option.id}`] === yearOf(state.date))
        reason = 'Esta MP já caiu neste ano e não pode ser reeditada.';
    } else if (instrument === 'pec' && cat.instrument !== 'pec' && gov?.branch === 'legislative')
      reason = null;
    return { instrument, allowed: !reason, reason, cost: Math.round(base * COST_MULT[instrument]) };
  });
}

/** Assinaturas necessárias para uma PEC de parlamentar (1/3 da casa). */
export function signaturesNeeded(state: GameState, chamberId: string): number {
  return Math.ceil((chamberById(state, chamberId)?.totalSeats ?? 0) * LC.pecSignatureShare);
}

/** Apoiadores potenciais de uma PEC na casa (assinariam). */
function potentialSigners(state: GameState, bill: Bill, chamberId: string): number {
  const chamber = chamberById(state, chamberId);
  if (!chamber) return 0;
  let n = 0;
  for (const [pid, seats] of Object.entries(chamber.seats)) {
    const party = state.parties[pid];
    if (party) n += seats * sigmoid(billPartyLogit(state, bill, party) + 0.6);
  }
  return n;
}

/** Apresenta uma proposição (PL, PLP, PEC ou MP) para mudar uma categoria de lei. */
export function proposeLegislation(
  state: GameState,
  categoryId: string,
  optionId: string,
  instrument: BillInstrument,
): ActionResult {
  const error = canProposeBill(state, categoryId, optionId);
  if (error) return fail(error);
  const choice = availableInstruments(state, categoryId, optionId).find((i) => i.instrument === instrument);
  if (!choice || !choice.allowed) return fail(choice?.reason ?? 'Instrumento inválido.');
  const gov = state.government!;
  if (gov.politicalCapital < choice.cost) return fail(`Capital político insuficiente (precisa de ${choice.cost}).`);
  gov.politicalCapital -= choice.cost;
  const player = getPlayer(state);
  const exec = executiveInfo(state);
  const mine = playerChamberId(state);
  const bill = fileBill(state, {
    categoryId,
    optionId,
    instrument,
    authorId: exec.isPlayer ? 'government' : player.id,
    authorLabel: player.ballotName,
    authorPartyId: player.partyId,
    authorRole: exec.isPlayer ? 'executive' : 'legislator',
    ...(mine ? { originChamberId: mine } : {}),
  });
  if (exec.isPlayer) bill.authorRole = 'executive';
  // PEC de parlamentar precisa de 1/3 de assinaturas antes de andar.
  if (instrument === 'pec' && !exec.isPlayer && mine) {
    bill.signatures = Math.min(signaturesNeeded(state, mine), Math.round(potentialSigners(state, bill, mine) * 0.5));
  }
  const option = getLawOption(categoryId, optionId);
  const details: string[] = [];
  // Coerência com as bandeiras: cumprir o que defendeu dá credibilidade; contrariar custa.
  const coherence = platformCoherence(candidatePlatform(state, player.id), categoryId, optionId);
  if (coherence !== 0) {
    const delta = coherence > 0 ? LC.platformKeepCredibility : -LC.platformBreakCredibility;
    player.attributes.credibility = clamp(player.attributes.credibility + delta, 0, 100);
    details.push(
      coherence > 0
        ? `Bandeira de campanha: credibilidade +${LC.platformKeepCredibility}.`
        : `Contraria uma bandeira sua: acusado de incoerência (credibilidade −${LC.platformBreakCredibility}).`,
    );
  }
  if (instrument === 'mp') details.push('A medida já está em vigor; o Congresso tem 120 dias para aprová-la.');
  if (bill.signatures !== undefined && mine)
    details.push(`Assinaturas: ${bill.signatures} de ${signaturesNeeded(state, mine)} necessárias.`);
  return { ok: true, message: `${bill.number} apresentado: ${option?.name ?? optionId}.`, ...(details.length ? { details } : {}) };
}

/** Voto do jogador parlamentar (plenário ou sessão de veto). Fora do dia, registra a intenção. */
export function voteOnBill(state: GameState, billId: string, vote: 'yes' | 'no' | 'abstain'): ActionResult {
  const bill = state.laws.bills.find((b) => b.id === billId && isBillActive(b));
  const gov = state.government;
  if (!bill || !gov || gov.branch !== 'legislative') return fail('Votação indisponível.');
  const mine = playerChamberId(state);
  if (playerMustVoteVeto(state, bill)) {
    applyPlayerVoteEffects(state, bill, vote);
    resolveVetoSession(state, bill, vote);
    return { ok: true, message: bill.status === 'veto' ? 'Voto registrado.' : `Sessão do veto encerrada: ${bill.status === 'rejected' ? 'veto mantido' : 'veto derrubado'}.` };
  }
  if (!mine || currentChamberId(bill) !== mine) return fail('Este projeto não está na sua casa agora.');
  const effect = applyPlayerVoteEffects(state, bill, vote);
  if (playerMustVoteFloor(state, bill)) {
    const result = resolveFloorVote(state, bill, vote);
    const score = result ? `${result.yes} a ${result.no}` : '';
    return { ok: true, message: `${result?.passed ? 'Aprovado' : 'Rejeitado'} no plenário (${score}). ${effect}` };
  }
  bill.playerVotes = { ...(bill.playerVotes ?? {}), [`${mine}:${bill.round}`]: vote };
  bill.playerVote = vote;
  return { ok: true, message: `Voto registrado para a votação de ${bill.number}. ${effect}` };
}

/** Sanção ou veto do jogador (Executivo) a um projeto aprovado pelo Legislativo. */
export function decideSanction(state: GameState, billId: string, decision: 'sanction' | 'veto'): ActionResult {
  const bill = state.laws.bills.find((b) => b.id === billId && b.status === 'sanction');
  if (!bill || !executiveInfo(state).isPlayer) return fail('Não há projeto aguardando sua sanção.');
  applySanction(state, bill, decision, 'player');
  return { ok: true, message: decision === 'sanction' ? `${bill.number} sancionado.` : `${bill.number} vetado: o Congresso pode derrubar o veto.` };
}

/** Pede urgência (Executivo ou parlamentar autor). */
export function requestUrgency(state: GameState, billId: string): ActionResult {
  const bill = state.laws.bills.find((b) => b.id === billId && (b.status === 'committee' || b.status === 'floor'));
  const gov = state.government;
  if (!bill || !gov) return fail('Projeto não encontrado.');
  if (bill.urgency) return fail('O projeto já tramita em regime de urgência.');
  const cost = executiveInfo(state).isPlayer ? LC.urgencyCapital : LC.urgencyLegislatorCapital;
  if (gov.politicalCapital < cost) return fail('Capital político insuficiente.');
  gov.politicalCapital -= cost;
  bill.urgency = true;
  const soon = addDays(state.date, bill.status === 'committee' ? LC.urgentCommitteeDays : LC.agendaUrgentDays);
  if (bill.nextDate > soon) bill.nextDate = soon;
  bill.shelved = false;
  legLog(state, `Urgência aprovada para ${bill.number}.`, 'info', bill.id);
  return { ok: true, message: `Urgência para ${bill.number}: etapas aceleradas.` };
}

/** Negocia a pauta com o presidente da casa. */
export function negotiateAgenda(state: GameState, billId: string): ActionResult {
  const bill = state.laws.bills.find((b) => b.id === billId && (b.status === 'committee' || b.status === 'floor'));
  const gov = state.government;
  if (!bill || !gov) return fail('Projeto não encontrado.');
  if (gov.politicalCapital < LC.agendaCapital) return fail('Capital político insuficiente.');
  const chamberId = currentChamberId(bill);
  const lead = chamberId ? state.legislature.leadership[chamberId] : undefined;
  if (!lead) return fail('Mesa diretora indisponível.');
  gov.politicalCapital -= LC.agendaCapital;
  if (!lead.isPlayer) lead.relation = clamp(lead.relation + LC.agendaRelationGain, -100, 100);
  bill.agendaDeal = true;
  if (bill.status === 'floor') {
    bill.shelved = false;
    const deal = addDays(state.date, LC.agendaDealDays);
    if (!bill.scheduled || bill.nextDate > deal) {
      bill.scheduled = true;
      bill.nextDate = deal;
      bill.voteDate = deal;
    }
  }
  return { ok: true, message: `Acordo com ${lead.presidentName}: ${bill.number} será votado em até ${LC.agendaDealDays} dias após chegar ao plenário.` };
}

/** Trabalha o relator do projeto (ou, se o jogador é o relator, apresenta parecer favorável). */
export function lobbyRelator(state: GameState, billId: string): ActionResult {
  const bill = state.laws.bills.find((b) => b.id === billId && b.status === 'committee');
  const gov = state.government;
  if (!bill || !gov || !bill.relator) return fail('O projeto não está na comissão.');
  if (bill.relator.isPlayer) {
    bill.relator.report = bill.relator.report === 'favorable' ? 'unfavorable' : 'favorable';
    return { ok: true, message: `Seu parecer: ${bill.relator.report === 'favorable' ? 'favorável' : 'contrário'}.` };
  }
  if (gov.politicalCapital < LC.relatorLobbyCapital) return fail('Capital político insuficiente.');
  gov.politicalCapital -= LC.relatorLobbyCapital;
  bill.relator.lean = (bill.relator.lean ?? 0) + LC.relatorLobbyLean;
  return { ok: true, message: `Conversa com o relator (${bill.relator.name}): parecer favorável mais provável.` };
}

/** Coleta assinaturas para uma PEC de autoria do jogador parlamentar. */
export function gatherSignatures(state: GameState, billId: string): ActionResult {
  const bill = state.laws.bills.find((b) => b.id === billId && b.signatures !== undefined && isBillActive(b));
  const gov = state.government;
  const mine = playerChamberId(state);
  if (!bill || !gov || !mine) return fail('Não há PEC sua coletando assinaturas.');
  const needed = signaturesNeeded(state, mine);
  if ((bill.signatures ?? 0) >= needed) return fail('A PEC já tem as assinaturas necessárias.');
  if (gov.politicalCapital < LC.signatureCapital) return fail('Capital político insuficiente.');
  gov.politicalCapital -= LC.signatureCapital;
  const potential = potentialSigners(state, bill, mine);
  const gain = Math.max(1, Math.round((potential - (bill.signatures ?? 0)) * LC.signatureCollectRate));
  bill.signatures = Math.min(needed, (bill.signatures ?? 0) + gain);
  return { ok: true, message: `Assinaturas: ${bill.signatures} de ${needed}.` };
}

/** Entrar, sair ou reunir-se com uma bancada temática. */
export function caucusAction(state: GameState, caucusId: CaucusId, op: 'join' | 'leave' | 'meet'): ActionResult {
  if (op === 'join') return joinCaucus(state, caucusId);
  if (op === 'leave') return leaveCaucus(state, caucusId);
  return meetCaucus(state, caucusId);
}

/** Candidatura do jogador à presidência da casa (ou apoio do Executivo a um aliado). */
export function runForSpeaker(state: GameState, chamberId: string): ActionResult {
  return runForSpeakerAction(state, chamberId);
}

/** Impeachment: votar (parlamentar), defender-se (Executivo) ou protocolar pedido. */
export function impeachmentAction(
  state: GameState,
  op: 'vote' | 'defend' | 'file',
  vote?: 'yes' | 'no' | 'abstain',
  partyId?: PartyId,
): ActionResult {
  if (op === 'defend') return defendImpeachment(state, partyId);
  if (op === 'file') return fileImpeachment(state);
  if (!playerMustVoteImpeachment(state)) return fail('Não há votação de impeachment para você hoje.');
  resolveImpeachmentStage(state, vote ?? 'abstain');
  const imp = state.legislature.impeachment;
  return { ok: true, message: imp?.outcome === 'removed' ? 'Impeachment aprovado.' : imp?.outcome ? 'Impeachment rejeitado.' : 'Voto registrado; o processo segue.' };
}

