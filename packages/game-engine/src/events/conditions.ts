import { latestPoll } from '../election/polls';
import { OFFICES } from '../election/offices';
import type { GoodId } from '../economy/industry/types';
import { NationConstants as NC } from '../nation/constants';
import type { InterestGroupId } from '../politics/types';
import type { GameState } from '../simulation/state';

/** Predicados reutilizáveis para gatilhos de eventos. */

export const inCampaign = (s: GameState): boolean => s.phase === 'campaign' && s.election !== null;
export const inGovernment = (s: GameState): boolean =>
  s.phase === 'governing' && s.government !== null;
export const isLegislator = (s: GameState): boolean => s.phase === 'legislating';
export const isPresident = (s: GameState): boolean => s.government?.officeId === 'presidente';

export function playerPollShare(s: GameState): number {
  const poll = latestPoll(s);
  return poll?.total.shares[s.playerId] ?? 0;
}

export function playerIsLeading(s: GameState): boolean {
  const poll = latestPoll(s);
  if (!poll) return false;
  const mine = poll.total.shares[s.playerId] ?? 0;
  return Object.entries(poll.total.shares).every(([id, v]) => id === s.playerId || v <= mine);
}

export function partyUnity(s: GameState): number {
  return s.parties[s.candidates[s.playerId]?.partyId ?? '']?.unity ?? 70;
}

export function hasStaff(s: GameState): boolean {
  return (s.campaign?.staff.length ?? 0) > 0;
}

export function isMajoritarianCampaign(s: GameState): boolean {
  return s.election !== null && OFFICES[s.election.officeId].system === 'majoritarian';
}

export function deficitIsHigh(s: GameState): boolean {
  const b = s.government?.budget;
  if (!b) return false;
  const spending = Object.values(b.spending).reduce((a, x) => a + x, 0);
  return spending > (b.revenueTaxes + b.revenueOther) * 1.05;
}

export function hasCoalition(s: GameState): boolean {
  return s.congress.coalition.length > 0;
}

/** Radicalismo do grupo (valor inicial quando o campo ainda não existe). */
export function groupRadicalismOf(s: GameState, id: InterestGroupId): number {
  return s.interestGroups[id]?.radicalism ?? NC.initialRadicalism;
}

/** O grupo está em greve neste momento? */
export function groupIsStriking(s: GameState, id: InterestGroupId): boolean {
  return s.nation.strikes.some((x) => x.groupId === id);
}

/** Escassez (0..1) de um bem no mercado nacional. */
export function goodShortage(s: GameState, id: GoodId): number {
  return s.market.goods[id]?.shortage ?? 0;
}

/** Preço relativo de um bem no mercado nacional (1 = base). */
export function goodPrice(s: GameState, id: GoodId): number {
  return s.market.goods[id]?.price ?? 1;
}

export function scandalLevel(s: GameState): number {
  return s.candidates[s.playerId]?.scandal ?? 0;
}
