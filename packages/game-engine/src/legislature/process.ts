import { addDays, diffDays, yearOf } from '../core/date';
import { clamp, sigmoid } from '../core/math';
import type { PartyId } from '../core/types';
import { addHistory } from '../history/history';
import { getLawCategory, getLawOption } from '../laws/laws.data';
import type { Bill, BillInstrument, BillVote, BillChamberStep } from '../laws/types';
import { onLawEnacted } from '../nation/nation';
import type { InterestGroupId } from '../politics/types';
import type { PopTypeId } from '../population/popTypes';
import { getPlayer, nextId } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { GameConstants } from '../config/constants';
import { LegislatureConstants as LC } from './constants';
import {
  baselineOptionId,
  billLabel,
  billNote,
  chamberShortName,
  currentChamberId,
  executiveInfo,
  isExecutiveBill,
  isPlayerBill,
  legAlert,
  legLog,
  legNews,
  legRng,
  optionName,
  playerChamberId,
} from './context';
import { agendaPlan, designateRelator, relatorReport } from './leadership';
import { nextBillNumber } from './legislature';
import { plebisciteResult } from './plebiscite';
import { billPartyLogit, ideologicalGain, resolveChamberVote, type PlayerBallot } from './voting';
import type { CaucusId } from './types';

const L = GameConstants.laws;

export interface FileBillInput {
  categoryId: string;
  optionId: string;
  instrument: BillInstrument;
  authorId: Bill['authorId'];
  authorLabel: string;
  authorPartyId: PartyId | null;
  authorRole: NonNullable<Bill['authorRole']>;
  caucusId?: CaucusId;
  urgency?: boolean;
  /** Casa onde a proposição começa (projeto de senador começa no Senado). */
  originChamberId?: string;
}

/** Caminho pelas casas (casa de origem primeiro). */
function pathFor(state: GameState, instrument: BillInstrument, origin?: string): BillChamberStep[] {
  const rounds = instrument === 'pec' ? 2 : 1;
  const chambers = state.congress.chambers.map((c) => c.id);
  if (origin && chambers.includes(origin)) chambers.sort((a, b) => Number(b === origin) - Number(a === origin));
  return chambers.map((chamberId) => ({ chamberId, rounds }));
}

/** Aplica imediatamente a opção de uma MP (guarda a anterior para reverter). */
function applyMp(state: GameState, bill: Bill): void {
  bill.previousOptionId = state.laws.enacted[bill.categoryId];
  state.laws.enacted[bill.categoryId] = bill.optionId;
  state.laws.strength[bill.categoryId] = 1;
  bill.mpExpires = addDays(state.date, LC.mpMaxDays);
  onLawEnacted(state, bill.categoryId, bill.optionId);
}

function revertMp(state: GameState, bill: Bill): void {
  if (!bill.previousOptionId) return;
  if (state.laws.enacted[bill.categoryId] === bill.optionId) {
    state.laws.enacted[bill.categoryId] = bill.previousOptionId;
    state.laws.strength[bill.categoryId] = 1;
    onLawEnacted(state, bill.categoryId, bill.previousOptionId);
  }
  state.legislature.mpBlocked ??= {};
  state.legislature.mpBlocked[`${bill.categoryId}:${bill.optionId}`] = yearOf(state.date);
}

/** Entra na comissão da casa atual (relator designado pelo presidente da casa). */
function enterCommittee(state: GameState, bill: Bill): void {
  bill.status = 'committee';
  bill.scheduled = false;
  bill.shelved = false;
  bill.floorSince = undefined;
  const days = bill.urgency ? LC.urgentCommitteeDays : LC.committeeDays[bill.instrument];
  bill.nextDate = addDays(state.date, days);
  bill.voteDate = bill.nextDate;
  designateRelator(state, bill, legRng(state, 'relator', bill.id, bill.stepIndex));
  const chamberId = currentChamberId(bill);
  if (chamberId)
    billNote(state, bill, `Enviado às comissões da ${chamberShortName(state, chamberId)}${bill.relator ? `; relator(a): ${bill.relator.name}` : ''}.`);
}

/** Chega ao plenário: o presidente da casa decide quando pautar (ou engaveta). */
function enterFloor(state: GameState, bill: Bill): void {
  const chamberId = currentChamberId(bill);
  if (!chamberId) return;
  bill.status = 'floor';
  bill.floorSince ??= state.date;
  const plan = agendaPlan(state, bill, chamberId);
  if (plan.shelve) {
    bill.shelved = true;
    bill.scheduled = false;
    bill.nextDate = addDays(state.date, LC.shelveRecheckDays);
    billNote(state, bill, `O presidente da ${chamberShortName(state, chamberId)} segurou o projeto na gaveta.`, 'bad');
    if (isPlayerBill(state, bill))
      legAlert(state, { kind: 'bill_shelved', severity: 'warning', title: 'Projeto engavetado', message: `${billLabel(bill)} está parado: negocie a pauta ou peça urgência.`, link: 'congress' });
    return;
  }
  bill.shelved = false;
  bill.scheduled = true;
  bill.nextDate = addDays(state.date, plan.days);
  bill.voteDate = bill.nextDate;
  billNote(state, bill, `Pautado no plenário da ${chamberShortName(state, chamberId)} para ${bill.nextDate.split('-').reverse().join('/')}.`);
  if (playerChamberId(state) === chamberId && !isPlayerBill(state, bill))
    legAlert(state, { kind: 'bill_vote_soon', severity: 'info', title: 'Votação marcada', message: `${billLabel(bill)} vai a voto em ${bill.nextDate.split('-').reverse().join('/')}.`, link: 'congress' });
}

/** Apresenta uma proposição e a coloca em tramitação. */
export function fileBill(state: GameState, input: FileBillInput): Bill {
  const option = getLawOption(input.categoryId, input.optionId);
  const bill: Bill = {
    id: nextId(state, 'bill'),
    number: nextBillNumber(state, input.instrument),
    categoryId: input.categoryId,
    optionId: input.optionId,
    instrument: input.instrument,
    authorId: input.authorId,
    authorLabel: input.authorLabel,
    authorPartyId: input.authorPartyId,
    authorRole: input.authorRole,
    ...(input.caucusId ? { caucusId: input.caucusId } : {}),
    proposedOn: state.date,
    voteDate: state.date,
    status: 'committee',
    path: pathFor(state, input.instrument, input.originChamberId),
    stepIndex: 0,
    round: 1,
    nextDate: state.date,
    scheduled: false,
    urgency: !!input.urgency,
    relator: null,
    concessions: 0,
    partyBonus: {},
    caucusBonus: {},
    publicCampaign: false,
    votes: [],
    playerVote: null,
    playerVotes: {},
    timeline: [{ date: state.date, text: `Apresentado por ${input.authorLabel}.` }],
  };
  state.laws.bills.unshift(bill);
  if (bill.instrument === 'mp') {
    applyMp(state, bill);
    billNote(state, bill, 'Medida provisória em vigor desde a publicação; o Congresso tem 120 dias para convertê-la em lei.');
  }
  enterCommittee(state, bill);
  legLog(state, `${bill.number} apresentado: ${option?.name ?? bill.optionId}.`, 'info', bill.id);
  return bill;
}

/** O jogador precisa votar hoje nesta proposição (plenário da sua casa). */
export function playerMustVoteFloor(state: GameState, bill: Bill): boolean {
  if (bill.status !== 'floor' || !bill.scheduled || bill.nextDate > state.date) return false;
  const chamberId = currentChamberId(bill);
  if (!chamberId || playerChamberId(state) !== chamberId) return false;
  return !bill.playerVotes?.[`${chamberId}:${bill.round}`];
}

/** O jogador precisa votar hoje na sessão do veto. */
export function playerMustVoteVeto(state: GameState, bill: Bill): boolean {
  if (bill.status !== 'veto' || bill.nextDate > state.date) return false;
  const mine = playerChamberId(state);
  return !!mine && !bill.playerVotes?.veto && state.government?.branch === 'legislative';
}

function ballot(state: GameState, vote: 'yes' | 'no' | 'abstain'): PlayerBallot {
  const player = getPlayer(state);
  return { vote, partyId: player.partyId, caucuses: state.legislature.playerCaucuses ?? [] };
}

/** Reação ao voto do jogador parlamentar: partido, Pops, grupos e governo. */
export function applyPlayerVoteEffects(state: GameState, bill: Bill, vote: 'yes' | 'no' | 'abstain'): string {
  const gov = state.government;
  if (!gov) return '';
  gov.votesCast += 1;
  const player = getPlayer(state);
  const party = state.parties[player.partyId];
  const partyLine = party ? sigmoid(billPartyLogit(state, bill, party)) > 0.5 : true;
  const follows = vote === 'abstain' || (vote === 'yes') === partyLine;
  gov.partyLoyalty = clamp(gov.partyLoyalty + (follows ? LC.voteLoyaltyGain : -LC.voteLoyaltyLoss), 0, 100);
  // Fidelidade ao governo (libera emendas) quando o projeto é do Executivo NPC.
  const exec = executiveInfo(state);
  if (!exec.isPlayer && isExecutiveBill(bill) && vote !== 'abstain') {
    const leg = state.legislature;
    const loyal = vote === 'yes';
    leg.governmentLoyalty = clamp((leg.governmentLoyalty ?? LC.loyaltyStart) + (loyal ? LC.loyaltyVoteGain : -LC.loyaltyVoteLoss), 0, 100);
  }
  const option = getLawOption(bill.categoryId, bill.optionId);
  if (option && vote !== 'abstain') {
    const sign = vote === 'yes' ? 1 : -1;
    const home = gov.jurisdiction.stateId;
    for (const [t, v] of Object.entries(option.pops) as [PopTypeId, number][])
      for (const pop of Object.values(state.population.pops))
        if (pop.typeId === t) {
          const k = !home || pop.stateId === home ? 1 : LC.voteOutsideStateFactor;
          pop.satisfaction = clamp(pop.satisfaction + sign * v * LC.votePopEffect * k, 0, 100);
        }
    for (const [g, v] of Object.entries(option.groups) as [InterestGroupId, number][]) {
      const group = state.interestGroups[g];
      if (group) group.approval = clamp(group.approval + sign * v * LC.voteGroupEffect, 0, 100);
    }
  }
  return follows ? 'Voto alinhado à orientação do seu partido.' : 'Voto contra a orientação do seu partido.';
}

/** Votação no plenário da casa atual; avança ou derruba a proposição. */
export function resolveFloorVote(state: GameState, bill: Bill, playerVote: 'yes' | 'no' | 'abstain' | null): BillVote | null {
  const chamberId = currentChamberId(bill);
  if (!chamberId) return null;
  const mine = playerChamberId(state) === chamberId;
  if (mine && playerVote) {
    bill.playerVotes = { ...(bill.playerVotes ?? {}), [`${chamberId}:${bill.round}`]: playerVote };
    bill.playerVote = playerVote;
  }
  const rng = legRng(state, 'vote', bill.id, chamberId, bill.round, bill.votes.length);
  const vote = resolveChamberVote(state, bill, chamberId, 'floor', rng, mine && playerVote ? ballot(state, playerVote) : null);
  vote.round = bill.round;
  vote.kind = 'floor';
  vote.date = state.date;
  bill.votes.push(vote);
  const step = bill.path[bill.stepIndex];
  const turn = (step?.rounds ?? 1) > 1 ? ` (${bill.round}º turno)` : '';
  const score = `${vote.yes} a ${vote.no}`;
  const where = chamberShortName(state, chamberId);
  if (!vote.passed) {
    billNote(state, bill, `Rejeitado no plenário da ${where}${turn}: ${score} (precisava de ${vote.required}).`, 'bad');
    closeBill(state, bill, 'rejected', `${where} rejeita ${optionName(bill.categoryId, bill.optionId)} (${score})`);
    return vote;
  }
  billNote(state, bill, `Aprovado no plenário da ${where}${turn}: ${score}.`, 'good');
  legLog(state, `${where} aprova ${bill.number}${turn} (${score}).`, 'good', bill.id);
  if (bill.round < (step?.rounds ?? 1)) {
    bill.round += 1;
    bill.scheduled = true;
    bill.nextDate = addDays(state.date, LC.pecRoundGapDays);
    bill.voteDate = bill.nextDate;
    return vote;
  }
  if (bill.stepIndex < bill.path.length - 1) {
    bill.stepIndex += 1;
    bill.round = 1;
    legNews(state, { headline: `${where} aprova ${optionName(bill.categoryId, bill.optionId)}; texto segue para a ${chamberShortName(state, currentChamberId(bill) ?? '')}`, category: 'congress', importance: 2 }, bill.id);
    // MP: a comissão mista já analisou; vai direto ao plenário da casa revisora.
    if (bill.instrument === 'mp') enterFloor(state, bill);
    else enterCommittee(state, bill);
    return vote;
  }
  finishCongress(state, bill);
  return vote;
}

/** Tramitação no Congresso terminou com aprovação: promulgação (PEC) ou sanção/veto. */
function finishCongress(state: GameState, bill: Bill): void {
  bill.scheduled = false;
  if (bill.instrument === 'pec') {
    billNote(state, bill, 'Promulgada pelo Congresso (emendas constitucionais não passam por sanção).', 'good');
    afterSanction(state, bill);
    return;
  }
  const exec = executiveInfo(state);
  const parliamentary = state.nation.regime === 'parliamentary';
  if (parliamentary || (exec.isPlayer && isPlayerBill(state, bill)) || bill.instrument === 'mp' && exec.isPlayer) {
    bill.sanctionDecision = { date: state.date, decision: 'sanction', by: 'auto' };
    billNote(state, bill, 'Sancionado.', 'good');
    afterSanction(state, bill);
    return;
  }
  bill.status = 'sanction';
  bill.nextDate = addDays(state.date, exec.isPlayer ? LC.sanctionDays : LC.npcSanctionDays);
  billNote(state, bill, `Enviado à sanção (${exec.office}).`);
  if (exec.isPlayer)
    legAlert(state, { kind: 'sanction', severity: 'warning', title: 'Projeto aguardando sua sanção', message: `${billLabel(bill)}: sancione ou vete até ${bill.nextDate.split('-').reverse().join('/')} (depois disso, sanção tácita).`, link: 'congress' });
}

/** Sanção ou veto (jogador, Executivo NPC, automático ou tácito). */
export function applySanction(state: GameState, bill: Bill, decision: 'sanction' | 'veto', by: 'player' | 'npc' | 'auto' | 'tacit'): void {
  bill.sanctionDecision = { date: state.date, decision, by };
  const exec = executiveInfo(state);
  if (decision === 'sanction') {
    billNote(state, bill, by === 'tacit' ? 'Sanção tácita: o prazo terminou sem decisão.' : `Sancionado por ${exec.office}.`, 'good');
    afterSanction(state, bill);
    return;
  }
  bill.vetoed = true;
  bill.status = 'veto';
  bill.nextDate = addDays(state.date, LC.vetoSessionDays);
  billNote(state, bill, `Vetado por ${exec.office}; o Congresso pode derrubar o veto em sessão.`, 'bad');
  legNews(state, { headline: `${exec.office} veta ${optionName(bill.categoryId, bill.optionId)}`, category: 'congress', sentiment: isPlayerBill(state, bill) ? -1 : 0, importance: 2 }, bill.id);
  legLog(state, `Veto a ${bill.number}.`, 'bad', bill.id);
}

/** Depois da sanção/promulgação: plebiscito (quando exigido) ou lei. */
function afterSanction(state: GameState, bill: Bill): void {
  const option = getLawOption(bill.categoryId, bill.optionId);
  if (option?.plebiscite && bill.instrument !== 'mp') {
    bill.status = 'plebiscite';
    bill.nextDate = addDays(state.date, LC.plebisciteDays);
    billNote(state, bill, `Plebiscito marcado para ${bill.nextDate.split('-').reverse().join('/')}.`);
    legNews(state, { headline: `Plebiscito sobre ${option.name} será realizado em ${LC.plebisciteDays} dias`, category: 'congress', importance: 3 }, bill.id);
    return;
  }
  enactBill(state, bill);
}

/** Vira lei: entra em implementação (MP já está em vigor). */
export function enactBill(state: GameState, bill: Bill): void {
  const option = getLawOption(bill.categoryId, bill.optionId);
  const cat = getLawCategory(bill.categoryId);
  bill.status = 'passed';
  bill.closedOn = state.date;
  bill.scheduled = false;
  if (bill.instrument !== 'mp' && option) {
    const strength = clamp(1 - bill.concessions * L.concessionEffectCut, 0.3, 1);
    state.laws.implementing = state.laws.implementing.filter((i) => i.categoryId !== bill.categoryId);
    state.laws.implementing.push({ categoryId: bill.categoryId, optionId: bill.optionId, monthsLeft: option.implementationMonths, strength });
  } else if (bill.instrument === 'mp') {
    state.laws.strength[bill.categoryId] = clamp(1 - bill.concessions * L.concessionEffectCut, 0.3, 1);
  }
  const authored = isPlayerBill(state, bill);
  const last = bill.votes[bill.votes.length - 1];
  const score = last ? `${last.yes} a ${last.no}` : '';
  if (authored && state.government) {
    state.government.billsPassed += 1;
    state.government.approval = clamp(state.government.approval + 2, 0, 100);
    addHistory(state, { kind: 'reform', title: `Aprovou: ${option?.name ?? bill.optionId}`, description: `${cat?.name ?? ''} — ${bill.number}${score ? `, votação ${score}` : ''}.`, importance: bill.instrument === 'pec' ? 3 : 2, sentiment: 1, tags: [bill.categoryId] });
  }
  legNews(state, { headline: `Aprovado: ${option?.name ?? bill.optionId}${score ? ` (${score})` : ''}`, category: 'congress', sentiment: authored ? 1 : 0, importance: 2 }, `${bill.id}:lei`);
  legLog(state, `${bill.number} virou lei: ${option?.name ?? ''}.`, 'good', bill.id);
}

/** Encerra a tramitação sem virar lei. */
export function closeBill(state: GameState, bill: Bill, status: 'rejected' | 'withdrawn' | 'expired', headline?: string): void {
  bill.status = status;
  bill.closedOn = state.date;
  bill.scheduled = false;
  if (bill.instrument === 'mp') revertMp(state, bill);
  const authored = isPlayerBill(state, bill);
  const option = getLawOption(bill.categoryId, bill.optionId);
  if (status !== 'withdrawn' && authored) {
    if (state.government) state.government.politicalCapital = clamp(state.government.politicalCapital - 5, 0, 100);
    addHistory(state, { kind: 'defeat', title: `${status === 'expired' ? 'Medida provisória caducou' : 'Derrota no plenário'}: ${option?.name ?? bill.optionId}`, importance: 1, sentiment: -1, tags: [bill.categoryId] });
  }
  if (headline) legNews(state, { headline, category: 'congress', sentiment: authored ? -1 : 0 }, `${bill.id}:fim`);
  legLog(state, `${bill.number} ${status === 'expired' ? 'caducou' : status === 'withdrawn' ? 'foi retirado' : 'foi rejeitado'}.`, 'bad', bill.id);
}

/** Sessão do Congresso que analisa o veto (maioria absoluta em cada casa para derrubar). */
export function resolveVetoSession(state: GameState, bill: Bill, playerVote: 'yes' | 'no' | 'abstain' | null): void {
  const mine = playerChamberId(state);
  if (mine && playerVote) bill.playerVotes = { ...(bill.playerVotes ?? {}), veto: playerVote };
  let overridden = true;
  for (const step of bill.path) {
    const rng = legRng(state, 'veto', bill.id, step.chamberId);
    const vote = resolveChamberVote(state, bill, step.chamberId, 'veto', rng, mine === step.chamberId && playerVote ? ballot(state, playerVote) : null);
    vote.kind = 'veto';
    vote.date = state.date;
    bill.votes.push(vote);
    if (!vote.passed) {
      overridden = false;
      break;
    }
  }
  if (overridden) {
    billNote(state, bill, 'O Congresso derrubou o veto.', 'good');
    legNews(state, { headline: `Congresso derruba veto e ${optionName(bill.categoryId, bill.optionId)} vira lei`, category: 'congress', importance: 2, sentiment: isPlayerBill(state, bill) ? 1 : executiveInfo(state).isPlayer ? -1 : 0 }, `${bill.id}:veto`);
    afterSanction(state, bill);
  } else {
    billNote(state, bill, 'O veto foi mantido.', 'bad');
    closeBill(state, bill, 'rejected', `Veto mantido: ${optionName(bill.categoryId, bill.optionId)} não vira lei`);
  }
}

/** Decisão do Executivo NPC sobre a sanção (ideologia do partido do chefe do Executivo). */
function npcSanction(state: GameState, bill: Bill): void {
  const exec = executiveInfo(state);
  const party = state.parties[exec.partyId];
  const option = getLawOption(bill.categoryId, bill.optionId);
  const currentId = baselineOptionId(state, bill);
  const current = currentId ? getLawOption(bill.categoryId, currentId) : undefined;
  const gain = party && option ? ideologicalGain(party.ideology, option, current) : 0;
  applySanction(state, bill, gain < LC.npcVetoGain && !isExecutiveBill(bill) ? 'veto' : 'sanction', 'npc');
}

/** Etapa vencida de uma proposição (chamado pelo tick diário). */
export function advanceBill(state: GameState, bill: Bill): void {
  const chamberId = currentChamberId(bill);
  switch (bill.status) {
    case 'committee': {
      // PEC de parlamentar: só anda com 1/3 de assinaturas da casa.
      if (bill.signatures !== undefined) {
        const chamber = state.congress.chambers.find((c) => c.id === currentChamberId(bill));
        const needed = Math.ceil((chamber?.totalSeats ?? 0) * LC.pecSignatureShare);
        if (bill.signatures < needed) {
          if (diffDays(bill.proposedOn, state.date) > LC.signatureWindowDays) {
            billNote(state, bill, 'Arquivada: a PEC não reuniu as assinaturas necessárias.', 'bad');
            closeBill(state, bill, 'rejected');
          } else bill.nextDate = addDays(state.date, 30);
          return;
        }
      }
      const report = relatorReport(state, bill, legRng(state, 'parecer', bill.id, bill.stepIndex));
      if (bill.relator) bill.relator.report = report;
      if (report === 'amended') bill.concessions = Math.min(L.maxConcessions, bill.concessions + 1);
      const label = { favorable: 'favorável', amended: 'favorável com emendas', unfavorable: 'contrário', pending: 'pendente' }[report];
      billNote(state, bill, `Parecer do relator: ${label}.`, report === 'unfavorable' ? 'bad' : 'good');
      // Pautas de parlamentares/bancadas NPC muitas vezes morrem na comissão.
      if (bill.authorId === 'npc' && bill.authorRole !== 'executive' && report === 'unfavorable' && legRng(state, 'morte', bill.id).chance(LC.npcCommitteeDeathChance * 2)) {
        closeBill(state, bill, 'rejected');
        return;
      }
      enterFloor(state, bill);
      return;
    }
    case 'floor': {
      if (!chamberId) return;
      if (bill.shelved) {
        if (bill.floorSince && diffDays(bill.floorSince, state.date) > LC.shelveMaxDays) {
          billNote(state, bill, 'Arquivado depois de muito tempo na gaveta.', 'bad');
          closeBill(state, bill, 'rejected');
          return;
        }
        enterFloor(state, bill);
        return;
      }
      // MP pendente há muito tempo tranca a pauta da casa.
      if (bill.instrument !== 'mp') {
        const lock = state.laws.bills.find((b) => b.instrument === 'mp' && b.status === 'floor' && currentChamberId(b) === chamberId && diffDays(b.proposedOn, state.date) > LC.mpLockDays);
        if (lock) {
          bill.nextDate = addDays(state.date, LC.mpLockPostponeDays);
          lock.scheduled = true;
          lock.nextDate = lock.nextDate > state.date ? state.date : lock.nextDate;
          return;
        }
      }
      if (playerChamberId(state) === chamberId && state.government?.branch === 'legislative') return; // aguarda o voto do jogador
      resolveFloorVote(state, bill, null);
      return;
    }
    case 'sanction': {
      if (executiveInfo(state).isPlayer) applySanction(state, bill, 'sanction', 'tacit');
      else npcSanction(state, bill);
      return;
    }
    case 'veto': {
      if (playerChamberId(state) && state.government?.branch === 'legislative') return; // aguarda o voto do jogador
      resolveVetoSession(state, bill, null);
      return;
    }
    case 'plebiscite': {
      const result = plebisciteResult(state, bill, legRng(state, 'plebiscito', bill.id));
      bill.plebiscite = { date: state.date, ...result };
      const pct = `${Math.round(result.yesShare * 100)}%`;
      if (result.approved) {
        billNote(state, bill, `Aprovado em plebiscito com ${pct} dos votos válidos.`, 'good');
        legNews(state, { headline: `Plebiscito aprova ${optionName(bill.categoryId, bill.optionId)} com ${pct}`, category: 'congress', importance: 3 }, `${bill.id}:pleb`);
        enactBill(state, bill);
      } else {
        billNote(state, bill, `Rejeitado em plebiscito: só ${pct} votaram sim.`, 'bad');
        closeBill(state, bill, 'rejected', `Plebiscito rejeita ${optionName(bill.categoryId, bill.optionId)} (${pct} de sim)`);
      }
      return;
    }
    default:
      return;
  }
}

/**
 * Urgência urgentíssima: todas as etapas restantes no mesmo dia (comissão, turnos, casa revisora).
 * O jogador parlamentar autor vota a favor do próprio projeto.
 */
export function rushBill(state: GameState, bill: Bill): BillVote | null {
  bill.rushed = true;
  bill.urgency = true;
  let last: BillVote | null = null;
  let guard = 0;
  while ((bill.status === 'committee' || bill.status === 'floor') && guard++ < 12) {
    if (bill.status === 'committee') {
      advanceBill(state, bill);
      continue;
    }
    bill.shelved = false;
    const mine = playerChamberId(state) === currentChamberId(bill);
    last = resolveFloorVote(state, bill, mine ? 'yes' : null);
  }
  if (bill.status === 'sanction' && !executiveInfo(state).isPlayer) npcSanction(state, bill);
  if (bill.status === 'plebiscite') advanceBill(state, bill);
  return last;
}

/** Prazo da MP: caduca se o Congresso não concluir em 120 dias. */
export function checkMpExpiry(state: GameState, bill: Bill): void {
  if (bill.instrument !== 'mp' || !bill.mpExpires) return;
  if (bill.status !== 'committee' && bill.status !== 'floor') return;
  if (state.date < bill.mpExpires) return;
  billNote(state, bill, 'A medida provisória caducou: o Congresso não a votou em 120 dias.', 'bad');
  closeBill(state, bill, 'expired', `Medida provisória caduca: ${optionName(bill.categoryId, bill.optionId)} deixa de valer`);
}

