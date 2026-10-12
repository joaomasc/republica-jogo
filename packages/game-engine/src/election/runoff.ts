/**
 * 2º TURNO DE VERDADE — negociar o apoio dos derrotados.
 *
 * Ao começar o 2º turno, cada candidato eliminado com votação relevante vira uma negociação:
 * tem afinidade com cada finalista e um preço (cargo ou pauta). O apoio fechado transfere parte
 * dos eleitores ligados ao partido dele para o finalista apoiado (termo no modelo de voto).
 * O rival também negocia, um apoio por semana.
 */
import { GameConstants } from '../config/constants';
import { withRng, type Rng } from '../core/rng';
import type { ActionResult, CandidateId } from '../core/types';
import { ideologyAffinity, shiftIdeology } from '../ideology/ideology';
import { publishNews } from '../media/news';
import { getPlayer } from '../simulation/access';
import type { GameState } from '../simulation/state';
import type { RunoffDeal, RunoffOffer } from './types';

const R = GameConstants.runoff;

function affinity(state: GameState, a: CandidateId, b: CandidateId): number {
  const ca = state.candidates[a];
  const cb = state.candidates[b];
  if (!ca || !cb) return 0.5;
  const party = ca.partyId === cb.partyId ? 0.15 : 0;
  return Math.min(1, ideologyAffinity(ca.ideology, cb.ideology) + party);
}

/** Abre as negociações (chamada ao montar o 2º turno com o jogador entre os finalistas). */
export function openRunoffDeals(state: GameState): void {
  const election = state.election;
  if (!election || election.round !== 2) return;
  const first = election.results.find((r) => r.round === 1);
  if (!first) return;
  const me = state.playerId;
  const rival = election.candidateIds.find((id) => id !== me);
  if (!rival || !election.candidateIds.includes(me)) return;
  const deals: RunoffDeal[] = [];
  for (const id of first.ranking) {
    if (election.candidateIds.includes(id)) continue;
    const pct = first.pct[id] ?? 0;
    const c = state.candidates[id];
    if (!c || pct < R.minShare) continue;
    const withMe = affinity(state, id, me);
    const withRival = affinity(state, id, rival);
    deals.push({
      candidateId: id,
      partyId: c.partyId,
      name: c.ballotName,
      share: pct,
      affinityPlayer: Math.round(withMe * 100) / 100,
      affinityRival: Math.round(withRival * 100) / 100,
      asks: pct >= R.cargoShare ? 'cargo' : 'pauta',
      status: 'open',
    });
  }
  election.runoffDeals = deals.slice(0, R.maxDeals);
  election.endorsements ??= {};
  withRng(state, (rng) => rivalMoves(state, rng));
}

/** Chance de o derrotado aceitar a oferta do jogador. */
export function dealChance(deal: RunoffDeal, offer: RunoffOffer): number {
  const lean = deal.affinityPlayer - deal.affinityRival;
  const priceMatch = offer === deal.asks ? R.priceMatchBonus : 0;
  const base = offer === 'cargo' ? R.cargoBase : R.pautaBase;
  return Math.max(0.05, Math.min(0.95, base + lean * R.leanFactor + priceMatch));
}

function endorse(state: GameState, deal: RunoffDeal, to: CandidateId): void {
  const election = state.election!;
  const list = election.endorsements?.[to] ?? [];
  list.push({ partyId: deal.partyId, weight: R.transfer });
  election.endorsements = { ...election.endorsements, [to]: list };
}

/** O jogador faz uma oferta a um derrotado (uma tentativa por candidato). */
export function offerRunoffDeal(
  state: GameState,
  candidateId: CandidateId,
  offer: RunoffOffer,
): ActionResult {
  const election = state.election;
  const deal = election?.runoffDeals?.find((d) => d.candidateId === candidateId);
  if (!election || state.phase !== 'campaign' || election.round !== 2 || !deal)
    return { ok: false, message: 'Não há negociação de 2º turno com esse candidato.' };
  if (deal.status !== 'open') return { ok: false, message: 'Essa negociação já terminou.' };
  const player = getPlayer(state);
  const party = state.parties[player.partyId];
  const chance = dealChance(deal, offer);
  const ok = withRng(state, (rng) => rng.chance(chance));
  deal.offer = offer;
  // O preço é pago de qualquer jeito: a base vê a negociação.
  if (offer === 'cargo' && party) party.unity = Math.max(0, party.unity - R.cargoUnityCost);
  if (offer === 'pauta') {
    const ally = state.candidates[candidateId];
    const status = election.participants[state.playerId];
    if (ally && status)
      status.perceivedIdeology = shiftIdeology(status.perceivedIdeology, {
        economy: (ally.ideology.economy - status.perceivedIdeology.economy) * R.pautaShift,
        social: (ally.ideology.social - status.perceivedIdeology.social) * R.pautaShift,
      });
  }
  if (!ok) {
    deal.status = 'neutral';
    publishNews(state, {
      headline: `${deal.name} recusa apoio e libera os eleitores no 2º turno`,
      category: 'election',
      importance: 1,
    });
    return { ok: true, message: `${deal.name} recusou a proposta e ficou neutro.` };
  }
  deal.status = 'player';
  endorse(state, deal, state.playerId);
  const rel = state.congress.relations;
  rel[deal.partyId] = Math.min(100, (rel[deal.partyId] ?? 0) + R.relationGain);
  publishNews(state, {
    headline: `${deal.name} declara apoio a ${player.ballotName} no 2º turno`,
    category: 'election',
    sentiment: 1,
    importance: 2,
  });
  return {
    ok: true,
    message: `${deal.name} fechou com você (${offer === 'cargo' ? 'promessa de cargo' : 'compromisso de pauta'}).`,
  };
}

/** O rival negocia: tenta fechar com quem está mais perto dele (um por chamada). */
export function rivalMoves(state: GameState, rng: Rng): void {
  const election = state.election;
  if (!election?.runoffDeals || election.round !== 2) return;
  const rival = election.candidateIds.find((id) => id !== state.playerId);
  if (!rival) return;
  const open = election.runoffDeals
    .filter((d) => d.status === 'open' && d.affinityRival > d.affinityPlayer)
    .sort((a, b) => b.share - a.share);
  const target = open[0];
  if (!target || !rng.chance(R.rivalChance)) return;
  target.status = 'rival';
  endorse(state, target, rival);
  publishNews(state, {
    headline: `${target.name} anuncia apoio a ${state.candidates[rival]?.ballotName ?? 'adversário'}`,
    category: 'election',
    sentiment: -1,
    importance: 2,
  });
}

/** Termo de utilidade do modelo de voto: eleitores dos partidos que apoiam o finalista. */
export function endorsementPull(
  endorsements: Record<CandidateId, { partyId: string; weight: number }[]> | undefined,
  candidateId: CandidateId,
  partyAffinity: Record<string, number>,
): number {
  const list = endorsements?.[candidateId];
  if (!list) return 0;
  let sum = 0;
  for (const e of list) sum += (partyAffinity[e.partyId] ?? 0) * e.weight;
  return sum;
}
