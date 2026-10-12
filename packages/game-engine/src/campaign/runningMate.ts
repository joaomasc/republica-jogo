/**
 * VICE E CHAPA — a escolha do vice nas eleições majoritárias.
 *
 * Vice do próprio partido agrada a base; vice de um partido aliado (que não lançou candidato)
 * traz parte dos eleitores desse partido, mas irrita quem queria a vaga. No governo, o vice
 * de outro partido tem agenda própria — e mais chance de conspirar.
 */
import { randomName } from '../candidate/names';
import { GameConstants } from '../config/constants';
import { withRng } from '../core/rng';
import type { ActionResult, PartyId } from '../core/types';
import { OFFICES } from '../election/offices';
import { ideologyAffinity } from '../ideology/ideology';
import { publishNews } from '../media/news';
import { getPlayer, getPlayerParty } from '../simulation/access';
import type { GameState } from '../simulation/state';

const RM = GameConstants.runningMate;

export interface RunningMate {
  name: string;
  partyId: PartyId;
  /** Lealdade ao titular (0..100): cai com o tempo se o vice é de outro partido. */
  loyalty: number;
}

/** A eleição atual tem vice (prefeito, governador, presidente)? */
export function needsRunningMate(state: GameState): boolean {
  const election = state.election;
  if (!election || state.phase !== 'campaign' || election.round !== 1) return false;
  const office = OFFICES[election.officeId];
  return office.system === 'majoritarian' && office.branch === 'executive';
}

/** Partidos que podem indicar o vice: o próprio e aliados sem candidato nesta eleição. */
export function runningMateOptions(state: GameState): { partyId: PartyId; affinity: number }[] {
  const election = state.election;
  if (!election) return [];
  const player = getPlayer(state);
  const running = new Set(election.candidateIds.map((id) => state.candidates[id]?.partyId));
  const allies = Object.values(state.parties)
    .filter((p) => p.id !== player.partyId && !running.has(p.id))
    .map((p) => ({ partyId: p.id, affinity: ideologyAffinity(player.ideology, p.ideology) }))
    .filter((x) => x.affinity >= RM.minAffinity)
    .sort(
      (a, b) =>
        b.affinity * (state.parties[b.partyId]?.popularity ?? 1) -
        a.affinity * (state.parties[a.partyId]?.popularity ?? 1),
    )
    .slice(0, RM.maxAllies);
  return [{ partyId: player.partyId, affinity: 1 }, ...allies];
}

/** Escolhe o vice da chapa (uma vez por campanha). */
export function chooseRunningMate(state: GameState, partyId: PartyId): ActionResult {
  const campaign = state.campaign;
  const election = state.election;
  if (!needsRunningMate(state) || !campaign || !election)
    return { ok: false, message: 'Não há vice a escolher nesta eleição.' };
  if (campaign.runningMate) return { ok: false, message: 'O vice já foi escolhido.' };
  const option = runningMateOptions(state).find((o) => o.partyId === partyId);
  if (!option) return { ok: false, message: 'Esse partido não pode indicar o vice.' };
  const player = getPlayer(state);
  const own = getPlayerParty(state);
  const name = withRng(state, (rng) => {
    const n = randomName(rng, rng.chance(0.5) ? 'female' : 'male');
    return `${n.firstName} ${n.lastName}`;
  });
  const ally = partyId !== player.partyId;
  campaign.runningMate = { name, partyId, loyalty: ally ? RM.allyLoyalty : RM.ownLoyalty };
  if (ally) {
    own.unity = Math.max(0, own.unity - RM.allyUnityCost);
    const list = election.endorsements?.[player.id] ?? [];
    list.push({ partyId, weight: RM.allyTransfer * option.affinity });
    election.endorsements = { ...election.endorsements, [player.id]: list };
    state.congress.relations[partyId] = Math.min(
      100,
      (state.congress.relations[partyId] ?? 0) + RM.relationGain,
    );
  } else {
    own.unity = Math.min(100, own.unity + RM.ownUnityGain);
  }
  const party = state.parties[partyId];
  publishNews(state, {
    headline: `${player.ballotName} anuncia ${name} (${party?.acronym ?? ''}) como vice`,
    category: 'campaign',
    importance: 2,
  });
  return {
    ok: true,
    message: ally
      ? `${name}, do ${party?.acronym}, é seu vice: a chapa ganha eleitores do partido aliado.`
      : `${name}, do seu partido, é seu vice: a base aprovou.`,
  };
}
