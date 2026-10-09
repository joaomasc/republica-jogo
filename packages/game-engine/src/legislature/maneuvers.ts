import { addDays } from '../core/date';
import { clamp, sigmoid } from '../core/math';
import type { ActionResult, PartyId } from '../core/types';
import { getLawCategory, getLawOption } from '../laws/laws.data';
import { projectBill } from '../laws/laws';
import type { Bill } from '../laws/types';
import { getPlayer } from '../simulation/access';
import type { GameState } from '../simulation/state';
import {
  baselineOptionId,
  billNote,
  chamberShortName,
  currentChamberId,
  executiveInfo,
  isPlayerBill,
  legLog,
  legNews,
  legRng,
  playerChamberId,
} from './context';

/**
 * Manobras regimentais: o que um parlamentar (ou o governo, pelo seu líder) faz para atrasar,
 * desidratar ou derrubar uma proposição de que discorda — e o que a oposição faz contra as suas.
 *
 * - Pedido de vista: na comissão, adia o parecer (direito do parlamentar; uma vez por casa).
 * - Obstrução: no plenário, discursos e requerimentos para adiar a votação (sucesso depende do
 *   tamanho de quem obstrui).
 * - Retirada de pauta: requerimento votado pelo plenário; se passar, o projeto sai da pauta.
 * - Emenda substitutiva: troca o texto por uma versão mais branda (mais perto da lei atual).
 * - Destaque (DVS): derruba trechos — a lei passa mais fraca.
 * - Articulação contra: negocia com um partido para votar contra.
 * - Engavetar: acordo com o presidente da casa (ou ordem sua, se você presidir).
 */

export type ManeuverId = 'review' | 'obstruct' | 'postpone' | 'amend' | 'highlight' | 'lobby_against' | 'shelve';

export const MANEUVERS: Record<ManeuverId, { name: string; icon: string; description: string; cost: number }> = {
  review: {
    name: 'Pedido de vista',
    icon: 'file-clock',
    description: 'Pede mais tempo para analisar o projeto na comissão: o parecer atrasa duas semanas.',
    cost: 3,
  },
  obstruct: {
    name: 'Obstrução',
    icon: 'ban',
    description: 'Discursos, requerimentos e kit obstrução para impedir a votação hoje. Funciona melhor com muitos aliados contra.',
    cost: 6,
  },
  postpone: {
    name: 'Retirada de pauta',
    icon: 'calendar-check',
    description: 'Requerimento para tirar o projeto da pauta. O plenário vota: precisa de maioria contra o projeto ou de um presidente da casa simpático.',
    cost: 8,
  },
  amend: {
    name: 'Emenda substitutiva',
    icon: 'file-pen',
    description: 'Troca o texto por uma versão mais branda, mais perto da lei atual. Passa se o plenário preferir a versão moderada.',
    cost: 10,
  },
  highlight: {
    name: 'Destaque (DVS)',
    icon: 'file-x',
    description: 'Vota trechos em separado para derrubá-los: a lei passa, mas mais fraca.',
    cost: 5,
  },
  lobby_against: {
    name: 'Articular votos contra',
    icon: 'handshake',
    description: 'Negocia com um partido (cargos, emendas, apoio futuro) para votar contra o projeto.',
    cost: 8,
  },
  shelve: {
    name: 'Engavetar',
    icon: 'file-stack',
    description: 'Acordo com o presidente da casa para não pautar o projeto. Se você preside a casa, basta mandar.',
    cost: 10,
  },
};

export interface ManeuverView {
  id: ManeuverId;
  name: string;
  icon: string;
  description: string;
  cost: number;
  available: boolean;
  reason: string | null;
  /** Chance de sucesso (0..1) quando há sorteio/votação; null = efeito garantido. */
  chance: number | null;
  /** O que acontece se der certo. */
  effect: string;
}

const MANEUVER_LIMIT: Partial<Record<ManeuverId, number>> = { obstruct: 3, highlight: 2, postpone: 1, amend: 1, review: 1, shelve: 1 };

function used(bill: Bill, id: ManeuverId, chamberId: string | null): number {
  return (bill.maneuvers ?? []).filter((m) => m.id === id && m.by === 'player' && (chamberId === null || m.chamberId === chamberId)).length;
}

/** Fração (0..1) dos votos esperados contra o projeto na casa atual. */
function oppositionShare(state: GameState, bill: Bill): number {
  const chamberId = currentChamberId(bill);
  const c = projectBill(state, bill).chambers.find((x) => x.id === chamberId);
  if (!c || c.total <= 0) return 0.5;
  return clamp((c.total - c.expectedYes) / c.total, 0, 1);
}

/** Versão mais branda (uma opção mais perto da lei atual), se existir. */
function milderOption(state: GameState, bill: Bill): string | null {
  const cat = getLawCategory(bill.categoryId);
  const current = baselineOptionId(state, bill);
  if (!cat || !current) return null;
  const ids = cat.options.map((o) => o.id);
  const from = ids.indexOf(bill.optionId);
  const to = ids.indexOf(current);
  if (from < 0 || to < 0 || Math.abs(from - to) < 2) return null;
  return ids[from + Math.sign(to - from)] ?? null;
}

function chanceFor(state: GameState, bill: Bill, id: ManeuverId): number | null {
  const opp = oppositionShare(state, bill);
  const chamberId = currentChamberId(bill);
  const lead = chamberId ? state.legislature.leadership[chamberId] : undefined;
  const speaker = lead ? (lead.isPlayer ? 1 : lead.relation / 100) : 0;
  const player = getPlayer(state);
  const negotiation = (player.attributes.negotiation - 50) / 100;
  switch (id) {
    case 'obstruct':
      return clamp(0.15 + opp * 1.1 + negotiation * 0.3 - used(bill, 'obstruct', chamberId) * 0.15, 0.05, 0.9);
    case 'postpone':
      return clamp(sigmoid((opp - 0.5) * 9 + speaker * 1.5 + negotiation), 0.03, 0.95);
    case 'amend': {
      const mild = milderOption(state, bill);
      if (!mild) return null;
      const original = projectBill(state, bill);
      const moderated = projectBill(state, { ...bill, optionId: mild });
      const c0 = original.chambers.find((x) => x.id === chamberId);
      const c1 = moderated.chambers.find((x) => x.id === chamberId);
      if (!c0 || !c1) return null;
      return clamp(sigmoid(((c1.expectedYes - c0.expectedYes) / Math.max(1, c0.total)) * 12 + opp * 2 - 0.6 + negotiation), 0.05, 0.92);
    }
    case 'highlight':
      return clamp(0.25 + opp * 0.9 + negotiation * 0.3 - used(bill, 'highlight', chamberId) * 0.15, 0.05, 0.9);
    case 'shelve':
      return lead?.isPlayer ? null : clamp(0.1 + Math.max(0, speaker) * 0.85, 0.05, 0.9);
    default:
      return null;
  }
}

function effectText(state: GameState, bill: Bill, id: ManeuverId): string {
  switch (id) {
    case 'review':
      return 'Parecer adiado em 14 dias.';
    case 'obstruct':
      return 'Votação adiada em 10 dias.';
    case 'postpone':
      return 'Projeto sai da pauta por 45 dias.';
    case 'amend': {
      const mild = milderOption(state, bill);
      return mild ? `Texto passa a ser: ${getLawOption(bill.categoryId, mild)?.name}.` : 'Sem versão mais branda possível.';
    }
    case 'highlight':
      return 'A lei perde força (−15% de efeito se aprovada).';
    case 'lobby_against':
      return 'O partido escolhido passa a tender a votar contra.';
    case 'shelve':
      return 'Projeto engavetado por 60 dias.';
  }
}

/** Manobras possíveis do jogador contra (ou sobre) uma proposição, com custo, chance e motivo. */
export function maneuverOptions(state: GameState, billId: string): ManeuverView[] {
  const bill = state.laws.bills.find((b) => b.id === billId);
  const gov = state.government;
  if (!bill || !gov) return [];
  const chamberId = currentChamberId(bill);
  const mine = playerChamberId(state);
  const exec = executiveInfo(state).isPlayer;
  const capital = gov.politicalCapital;
  const own = isPlayerBill(state, bill);
  return (Object.keys(MANEUVERS) as ManeuverId[]).map((id) => {
    const def = MANEUVERS[id];
    // O governo manobra pelo líder do governo: custa um pouco mais.
    const cost = def.cost + (exec ? 2 : 0);
    let reason: string | null = null;
    if (own) reason = 'É um projeto seu.';
    else if (bill.status !== 'committee' && bill.status !== 'floor') reason = 'O projeto não está em tramitação nas casas.';
    else if (!exec && mine !== chamberId) reason = `O projeto está na ${chamberShortName(state, chamberId ?? '')}, não na sua casa.`;
    else if (id === 'review' && bill.status !== 'committee') reason = 'Só na comissão.';
    else if ((id === 'obstruct' || id === 'postpone' || id === 'amend' || id === 'highlight') && bill.status !== 'floor')
      reason = 'Só quando o projeto está no plenário.';
    else if (id === 'obstruct' && (!bill.scheduled || bill.shelved)) reason = 'Não há votação marcada para obstruir.';
    else if (id === 'amend' && !milderOption(state, bill)) reason = 'Não há versão mais branda entre o projeto e a lei atual.';
    else if (id === 'shelve' && bill.shelved) reason = 'O projeto já está engavetado.';
    else if (id === 'shelve' && bill.urgency) reason = 'Projetos com urgência não podem ser engavetados.';
    else if ((MANEUVER_LIMIT[id] ?? 99) <= used(bill, id, chamberId)) reason = 'Você já usou esta manobra aqui.';
    else if (capital < cost) reason = `Capital político insuficiente (precisa de ${cost}).`;
    return {
      id,
      name: def.name,
      icon: def.icon,
      description: def.description,
      cost,
      available: reason === null,
      reason,
      chance: chanceFor(state, bill, id),
      effect: effectText(state, bill, id),
    };
  });
}

function record(state: GameState, bill: Bill, id: ManeuverId, by: 'player' | 'npc', success: boolean): void {
  bill.maneuvers ??= [];
  bill.maneuvers.push({ id, by, success, date: state.date, chamberId: currentChamberId(bill) ?? '' });
}

/** Aplica o efeito de uma manobra bem-sucedida. */
function applyEffect(state: GameState, bill: Bill, id: ManeuverId, partyId?: PartyId): void {
  const chamberId = currentChamberId(bill);
  switch (id) {
    case 'review':
      bill.nextDate = addDays(bill.nextDate > state.date ? bill.nextDate : state.date, 14);
      break;
    case 'obstruct':
      bill.nextDate = addDays(bill.nextDate > state.date ? bill.nextDate : state.date, 10);
      bill.voteDate = bill.nextDate;
      break;
    case 'postpone':
      bill.scheduled = false;
      bill.nextDate = addDays(state.date, 45);
      break;
    case 'amend': {
      const mild = milderOption(state, bill);
      if (mild) bill.optionId = mild;
      break;
    }
    case 'highlight':
      bill.concessions += 1;
      break;
    case 'lobby_against':
      if (partyId) bill.partyBonus[partyId] = (bill.partyBonus[partyId] ?? 0) - (executiveInfo(state).isPlayer ? 1.2 : 0.8);
      break;
    case 'shelve':
      bill.shelved = true;
      bill.scheduled = false;
      bill.nextDate = addDays(state.date, 60);
      break;
  }
  if (chamberId && id === 'shelve') {
    const lead = state.legislature.leadership[chamberId];
    if (lead && !lead.isPlayer) lead.relation = clamp(lead.relation - 6, -100, 100);
  }
}

/** O jogador executa uma manobra contra uma proposição. */
export function performManeuver(state: GameState, billId: string, id: ManeuverId, partyId?: PartyId): ActionResult {
  const view = maneuverOptions(state, billId).find((m) => m.id === id);
  const bill = state.laws.bills.find((b) => b.id === billId);
  const gov = state.government;
  if (!view || !bill || !gov) return { ok: false, message: 'Manobra indisponível.' };
  if (!view.available) return { ok: false, message: view.reason ?? 'Manobra indisponível.' };
  if (id === 'lobby_against') {
    if (!partyId || !state.parties[partyId]) return { ok: false, message: 'Escolha um partido para negociar.' };
    if ((bill.maneuvers ?? []).filter((m) => m.id === 'lobby_against' && m.partyId === partyId).length >= 2)
      return { ok: false, message: 'Você já negociou com este partido sobre este projeto.' };
  }
  gov.politicalCapital -= view.cost;
  const rng = legRng(state, 'maneuver', bill.id, id, (bill.maneuvers ?? []).length);
  const success = view.chance === null || rng.next() < view.chance;
  record(state, bill, id, 'player', success);
  if (partyId && bill.maneuvers) {
    const last = bill.maneuvers[bill.maneuvers.length - 1];
    if (last) last.partyId = partyId;
  }
  const label = MANEUVERS[id].name;
  if (success) {
    applyEffect(state, bill, id, partyId);
    const target = id === 'lobby_against' && partyId ? ` (${state.parties[partyId]?.acronym})` : '';
    billNote(state, bill, `${label}${target}: ${view.effect}`, 'bad');
    legLog(state, `Sua manobra deu certo: ${label} contra ${bill.number}.`, 'good', bill.id);
    if (id === 'obstruct' || id === 'shelve' || id === 'postpone')
      legNews(state, { headline: `${label} trava ${getLawOption(bill.categoryId, bill.optionId)?.name ?? bill.number}`, category: 'congress', importance: 1 }, `${bill.id}:${id}:${bill.maneuvers?.length ?? 0}`);
    return { ok: true, message: `${label} deu certo. ${view.effect}` };
  }
  billNote(state, bill, `${label} tentada e derrotada.`, 'info');
  legLog(state, `Sua manobra falhou: ${label} contra ${bill.number}.`, 'bad', bill.id);
  // Manobra derrotada irrita quem apoia o projeto (o presidente da casa, se for obstrução/pauta).
  const chamberId = currentChamberId(bill);
  const lead = chamberId ? state.legislature.leadership[chamberId] : undefined;
  if (lead && !lead.isPlayer && (id === 'obstruct' || id === 'postpone' || id === 'shelve')) lead.relation = clamp(lead.relation - 3, -100, 100);
  return { ok: true, message: `${label} foi derrotada no plenário.` };
}

/**
 * A oposição (NPC) manobra contra os projetos do jogador: quanto maior o bloco contrário, mais
 * provável obstruir ou pedir vista. Chamado no tick mensal; no máximo uma manobra por projeto/mês.
 */
export function npcManeuvers(state: GameState): void {
  for (const bill of state.laws.bills) {
    if (!isPlayerBill(state, bill) || (bill.status !== 'committee' && bill.status !== 'floor') || bill.urgency) continue;
    const chamberId = currentChamberId(bill);
    const opp = oppositionShare(state, bill);
    const npcUsed = (bill.maneuvers ?? []).filter((m) => m.by === 'npc' && m.chamberId === chamberId).length;
    if (opp < 0.3 || npcUsed >= 2) continue;
    const rng = legRng(state, 'npc-maneuver', bill.id, npcUsed);
    if (rng.next() > (opp - 0.25) * 1.4) continue;
    const id: ManeuverId = bill.status === 'committee' ? 'review' : 'obstruct';
    if (id === 'obstruct' && !bill.scheduled) continue;
    record(state, bill, id, 'npc', true);
    applyEffect(state, bill, id);
    const text = id === 'review' ? 'A oposição pediu vista: o parecer atrasou.' : 'A oposição obstruiu a votação: ficou para depois.';
    billNote(state, bill, text, 'bad');
    legLog(state, `${text} (${bill.number})`, 'bad', bill.id);
  }
}
