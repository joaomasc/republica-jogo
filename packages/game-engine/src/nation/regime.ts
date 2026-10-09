import type { PartyId } from '../core/types';
import { OFFICES } from '../election/offices';
import { addHistory } from '../history/history';
import { pushAlert } from '../media/alerts';
import { publishNews } from '../media/news';
import { isFederalExecutive } from '../executive/executive';
import { getPlayer } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { NationConstants as NC } from './constants';
import { recordMilestone } from './groups';

/** Partido do Executivo federal (o do jogador quando ele governa o país). */
export function executivePartyId(state: GameState): PartyId {
  if (isFederalExecutive(state) && state.candidates[state.playerId])
    return getPlayer(state).partyId;
  return state.landscape.presidentPartyId;
}

/** Partidos da base governista (sempre inclui o partido do Executivo). */
export function governmentBase(state: GameState): PartyId[] {
  const exec = executivePartyId(state);
  const coalition = isFederalExecutive(state)
    ? state.congress.coalition
    : state.legislature.governmentCoalition;
  return [...new Set([exec, ...coalition])];
}

/**
 * Partido único: a fração configurada das cadeiras dos partidos fora da base passa ao partido
 * do Executivo, em todas as casas. Devolve o total de cadeiras transferidas.
 */
export function transferSeatsToExecutive(state: GameState): number {
  const exec = executivePartyId(state);
  const base = new Set(governmentBase(state));
  let moved = 0;
  for (const chamber of state.congress.chambers) {
    for (const partyId of Object.keys(chamber.seats).sort()) {
      if (base.has(partyId)) continue;
      const seats = chamber.seats[partyId] ?? 0;
      const take = Math.round(seats * NC.oneParty.seatShare);
      if (take <= 0) continue;
      chamber.seats[partyId] = seats - take;
      chamber.seats[exec] = (chamber.seats[exec] ?? 0) + take;
      moved += take;
    }
  }
  return moved;
}

/** O jogador é parlamentar FEDERAL e seu partido está fora da base governista? */
export function playerIsOpposition(state: GameState): boolean {
  const gov = state.government;
  if (!gov || gov.branch !== 'legislative' || OFFICES[gov.officeId].level !== 'federal') return false;
  if (!state.candidates[state.playerId]) return false;
  return !governmentBase(state).includes(getPlayer(state).partyId);
}

/** Cassa o mandato do jogador parlamentar de oposição: o mandato acaba na próxima passagem de dia. */
export function revokePlayerMandate(state: GameState): void {
  const gov = state.government;
  if (!gov) return;
  const player = getPlayer(state);
  gov.endDate = state.date;
  addHistory(state, {
    kind: 'rupture',
    title: `${player.ballotName} tem o mandato cassado pelo regime de partido único`,
    description: 'A oposição é extinta e o partido do governo assume as cadeiras.',
    importance: 3,
    sentiment: -1,
  });
  publishNews(state, {
    headline: `Parlamentares de oposição são cassados, incluindo ${player.ballotName}`,
    category: 'government',
    sentiment: -1,
    importance: 3,
  });
  pushAlert(state, {
    kind: 'mandate_revoked',
    severity: 'danger',
    title: 'Seu mandato foi cassado',
    message: 'O regime de partido único extinguiu a oposição parlamentar.',
    link: 'nation',
  });
  recordMilestone(state, 'Oposição cassada', 'O partido único extingue os mandatos da oposição.');
}
