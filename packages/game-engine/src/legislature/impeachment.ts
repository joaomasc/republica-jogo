import { addDays, diffMonths } from '../core/date';
import { clamp, sigmoid } from '../core/math';
import type { Rng } from '../core/rng';
import type { ActionResult, PartyId } from '../core/types';
import { endTerm } from '../government/government';
import { addHistory } from '../history/history';
import { getPlayer, nextId } from '../simulation/access';
import type { GameState } from '../simulation/state';
import type { BillVote } from '../laws/types';
import { LegislatureConstants as LC } from './constants';
import { chamberById, executiveInfo, governmentCoalition, isFederalSphere, legAlert, legLog, legNews, legRng, playerChamberId } from './context';
import { nationalSatisfaction } from './plebiscite';
import { tallySegments, type VoteSegment } from './voting';

/** Logit de um partido a favor do impeachment. */
function impeachLogit(state: GameState, partyId: PartyId): number {
  const imp = state.legislature.impeachment;
  const exec = executiveInfo(state);
  const coalition = governmentCoalition(state);
  const party = state.parties[partyId];
  if (!imp || !party) return 0;
  const approval = imp.targetIsPlayer ? (state.government?.approval ?? 50) : nationalSatisfaction(state);
  let logit = LC.impeachBaseLogit + (LC.impeachApprovalRef - approval) * LC.impeachApprovalFactor;
  if (partyId === exec.partyId) logit -= LC.impeachTargetPartyLogit;
  else if (coalition.includes(partyId)) logit -= LC.impeachCoalitionLogit;
  else logit += LC.impeachOppositionLogit;
  if (imp.targetIsPlayer) {
    logit -= (state.congress.relations[partyId] ?? 0) * LC.impeachRelationFactor;
    logit += getPlayer(state).scandal * LC.impeachScandalFactor;
  }
  logit += (50 - state.nation.legitimacy) * LC.impeachLegitimacyFactor;
  logit += imp.partyBonus[partyId] ?? 0;
  return logit;
}

function impeachVote(state: GameState, chamberId: string, playerVote: 'yes' | 'no' | 'abstain' | null): BillVote | null {
  const chamber = chamberById(state, chamberId);
  if (!chamber) return null;
  const segments: VoteSegment[] = Object.entries(chamber.seats)
    .filter(([, s]) => s > 0)
    .map(([partyId, seats]) => ({ partyId, caucusId: null, seats, logit: impeachLogit(state, partyId) }));
  const rng = legRng(state, 'impeachment', chamberId);
  const mine = playerChamberId(state) === chamberId && playerVote;
  const player = getPlayer(state);
  const t = tallySegments(segments, rng, mine ? { vote: playerVote, partyId: player.partyId, caucuses: [] } : null);
  const required = Math.ceil(chamber.totalSeats * LC.impeachmentQuorum - 1e-9);
  return {
    chamber: chamber.name,
    chamberId,
    yes: t.yes,
    no: t.no,
    abstain: t.abstain,
    required,
    passed: t.yes >= required,
    byParty: t.byParty,
    kind: 'impeachment',
    date: state.date,
  };
}

/** Abre um processo de impeachment (pedido aceito pelo presidente da Câmara). */
export function openImpeachment(state: GameState, targetIsPlayer: boolean, reason: string): void {
  const exec = executiveInfo(state);
  state.legislature.impeachment = {
    id: nextId(state, 'impeachment'),
    targetIsPlayer,
    targetName: exec.label,
    stage: 'camara',
    openedOn: state.date,
    nextDate: addDays(state.date, LC.impeachCamaraDays),
    reason,
    votes: [],
    partyBonus: {},
    playerVote: null,
    outcome: null,
  };
  legNews(state, { headline: `Câmara aceita pedido de impeachment contra ${exec.label}`, category: 'congress', importance: 3, sentiment: targetIsPlayer ? -1 : 0 }, 'impeachment');
  legLog(state, `Pedido de impeachment aceito: ${reason}`, 'bad');
  if (targetIsPlayer) {
    legAlert(state, { kind: 'impeachment', severity: 'danger', title: 'Processo de impeachment aberto', message: 'A Câmara vota em 30 dias. Negocie votos para barrar o processo.', link: 'congress' });
    addHistory(state, { kind: 'crisis', title: 'Pedido de impeachment aceito pela Câmara', importance: 3, sentiment: -1 });
  }
}

/** O jogador precisa votar hoje no impeachment (parlamentar da casa que vota). */
export function playerMustVoteImpeachment(state: GameState): boolean {
  const imp = state.legislature.impeachment;
  if (!imp || imp.stage === 'concluded' || imp.targetIsPlayer || imp.nextDate > state.date) return false;
  const chamber = imp.stage === 'camara' ? 'camara' : 'senado';
  return playerChamberId(state) === chamber && !imp.playerVote;
}

/** Votação do impeachment na etapa atual. */
export function resolveImpeachmentStage(state: GameState, playerVote: 'yes' | 'no' | 'abstain' | null): void {
  const imp = state.legislature.impeachment;
  if (!imp || imp.stage === 'concluded') return;
  const chamberId = imp.stage === 'camara' ? 'camara' : 'senado';
  if (playerVote) imp.playerVote = playerVote;
  const vote = impeachVote(state, chamberId, playerVote);
  if (!vote) {
    imp.stage = 'concluded';
    imp.outcome = 'archived';
    return;
  }
  imp.votes.push(vote);
  const score = `${vote.yes} a ${vote.no}`;
  if (!vote.passed) {
    imp.stage = 'concluded';
    imp.outcome = 'acquitted';
    legNews(state, { headline: `${chamberId === 'camara' ? 'Câmara barra' : 'Senado absolve'} impeachment de ${imp.targetName} (${score})`, category: 'congress', importance: 3, sentiment: imp.targetIsPlayer ? 1 : 0 }, 'impeachment:fim');
    if (imp.targetIsPlayer) addHistory(state, { kind: 'victory', title: 'Sobreviveu ao processo de impeachment', importance: 3, sentiment: 1 });
    return;
  }
  if (imp.stage === 'camara') {
    imp.stage = 'senado';
    imp.playerVote = null;
    imp.nextDate = addDays(state.date, LC.impeachSenadoDays);
    legNews(state, { headline: `Câmara autoriza impeachment de ${imp.targetName} (${score}); julgamento vai ao Senado`, category: 'congress', importance: 3, sentiment: imp.targetIsPlayer ? -1 : 0 }, 'impeachment:camara');
    return;
  }
  imp.stage = 'concluded';
  imp.outcome = 'removed';
  legNews(state, { headline: `Senado aprova impeachment: ${imp.targetName} é afastado(a) do cargo (${score})`, category: 'congress', importance: 3, sentiment: imp.targetIsPlayer ? -1 : 0 }, 'impeachment:senado');
  if (imp.targetIsPlayer) {
    addHistory(state, { kind: 'defeat', title: 'Afastado(a) do cargo por impeachment', importance: 3, sentiment: -1 });
    endTerm(state);
  } else {
    // Executivo NPC removido: o vice (outro partido da base) assume; a base é recomposta.
    state.nation.legitimacy = clamp(state.nation.legitimacy - 8, 0, 100);
  }
}

/** Tick diário do impeachment. */
export function processImpeachmentDay(state: GameState): void {
  const imp = state.legislature.impeachment;
  if (!imp || imp.stage === 'concluded' || imp.nextDate > state.date) return;
  if (playerMustVoteImpeachment(state)) return; // aguarda o voto do jogador
  resolveImpeachmentStage(state, null);
}

/** Tick mensal: risco de um pedido ser aceito. */
export function impeachmentRisk(state: GameState, rng: Rng): void {
  if (!isFederalSphere(state)) return;
  const leg = state.legislature;
  const imp = leg.impeachment;
  if (imp && imp.stage !== 'concluded') return;
  if (imp && diffMonths(imp.openedOn, state.date) < LC.impeachCooldownMonths) return;
  const gov = state.government;
  const exec = executiveInfo(state);
  if (exec.isPlayer && gov) {
    const chamber = chamberById(state, 'camara');
    let base = 0;
    if (chamber) for (const [pid, s] of Object.entries(chamber.seats)) if (state.congress.coalition.includes(pid)) base += s;
    const weak = chamber ? base < chamber.totalSeats * LC.impeachWeakBaseShare : false;
    const scandal = getPlayer(state).scandal >= LC.impeachScandalMin;
    if (gov.approval > LC.impeachApprovalMax || (!weak && !scandal)) return;
    const speaker = leg.leadership.camara;
    const hostile = !speaker || speaker.relation < 0;
    if (!hostile) return;
    const chance = LC.impeachBaseChance * ((LC.impeachApprovalMax - gov.approval) / LC.impeachApprovalMax + (scandal ? 0.5 : 0));
    if (rng.chance(clamp(chance, 0, 0.6)))
      openImpeachment(state, true, scandal ? 'Denúncias de crime de responsabilidade em meio a escândalos' : 'Crise política e perda de apoio no Congresso');
    return;
  }
  if (!exec.isPlayer && nationalSatisfaction(state) < LC.npcImpeachSatisfactionMax && rng.chance(LC.npcImpeachChance))
    openImpeachment(state, false, 'Crise de governabilidade e insatisfação popular');
}

/** Defesa do jogador: negociar votos contra o impeachment (capital, cargos, emendas). */
export function defendImpeachment(state: GameState, partyId?: PartyId): ActionResult {
  const imp = state.legislature.impeachment;
  const gov = state.government;
  if (!imp || imp.stage === 'concluded' || !imp.targetIsPlayer || !gov) return { ok: false, message: 'Não há processo de impeachment contra você.' };
  if (gov.politicalCapital < LC.impeachDefenseCapital) return { ok: false, message: 'Capital político insuficiente.' };
  gov.politicalCapital -= LC.impeachDefenseCapital;
  if (partyId && state.parties[partyId]) {
    imp.partyBonus[partyId] = (imp.partyBonus[partyId] ?? 0) - LC.impeachDefenseTargetLogit;
    state.congress.relations[partyId] = clamp((state.congress.relations[partyId] ?? 0) + LC.impeachDefenseRelation, -100, 100);
    return { ok: true, message: `Negociação com o ${state.parties[partyId]!.acronym}: menos votos pelo impeachment.` };
  }
  for (const pid of Object.keys(state.parties)) imp.partyBonus[pid] = (imp.partyBonus[pid] ?? 0) - LC.impeachDefenseLogit;
  return { ok: true, message: 'Articulação geral contra o impeachment: o apoio ao processo cai.' };
}

/** Jogador parlamentar protocola pedido de impeachment contra o Executivo NPC. */
export function fileImpeachment(state: GameState): ActionResult {
  const gov = state.government;
  if (!gov || gov.branch !== 'legislative' || !isFederalSphere(state)) return { ok: false, message: 'Só parlamentares federais protocolam pedidos de impeachment.' };
  const leg = state.legislature;
  if (leg.impeachment && leg.impeachment.stage !== 'concluded') return { ok: false, message: 'Já há um processo em andamento.' };
  if (gov.politicalCapital < LC.fileImpeachCapital) return { ok: false, message: 'Capital político insuficiente.' };
  gov.politicalCapital -= LC.fileImpeachCapital;
  if (nationalSatisfaction(state) > LC.fileImpeachMaxSatisfaction || (leg.leadership.camara?.relation ?? 0) < 20) {
    legLog(state, 'O presidente da Câmara arquivou seu pedido de impeachment.', 'bad');
    return { ok: true, message: 'Pedido protocolado, mas o presidente da Câmara o arquivou.' };
  }
  openImpeachment(state, false, 'Pedido apresentado por parlamentares da oposição');
  return { ok: true, message: 'O presidente da Câmara aceitou o pedido: o processo começou.' };
}

/** Pontos de vista do jogador sobre o processo (para a interface). */
export function impeachmentSupport(state: GameState): { chamberId: string; expectedYes: number; required: number; total: number } | null {
  const imp = state.legislature.impeachment;
  if (!imp || imp.stage === 'concluded') return null;
  const chamberId = imp.stage === 'camara' ? 'camara' : 'senado';
  const chamber = chamberById(state, chamberId);
  if (!chamber) return null;
  let expected = 0;
  for (const [pid, seats] of Object.entries(chamber.seats)) expected += seats * sigmoid(impeachLogit(state, pid));
  return { chamberId, expectedYes: Math.round(expected), required: Math.ceil(chamber.totalSeats * LC.impeachmentQuorum - 1e-9), total: chamber.totalSeats };
}
