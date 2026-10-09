import { randomName } from '../candidate/names';
import { GameConstants } from '../config/constants';
import type { Rng } from '../core/rng';
import type { CandidateId, PartyId } from '../core/types';
import type { ProportionalListEntry, ProportionalOutcome } from './types';

const P = GameConstants.election.proportional;

/** Método D'Hondt (maiores médias) — simplificação do sistema proporcional brasileiro. */
export function dhondt(
  partyVotes: Record<PartyId, number>,
  seats: number,
): Record<PartyId, number> {
  const result: Record<PartyId, number> = {};
  for (const id of Object.keys(partyVotes)) result[id] = 0;
  for (let s = 0; s < seats; s++) {
    let best: PartyId | null = null;
    let bestValue = -1;
    for (const [id, votes] of Object.entries(partyVotes)) {
      const value = votes / ((result[id] ?? 0) + 1);
      if (value > bestValue) {
        bestValue = value;
        best = id;
      }
    }
    if (!best) break;
    result[best] = (result[best] ?? 0) + 1;
  }
  return result;
}

/** Divide os votos "dos demais" de um partido entre candidatos sintéticos (distribuição de Pareto). */
export function syntheticCandidates(totalVotes: number, count: number): number[] {
  const weights = Array.from({ length: count }, (_, i) => 1 / (i + 1) ** P.syntheticPareto);
  const wsum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.round((totalVotes * w) / wsum));
}

export interface ProportionalInput {
  seats: number;
  /** Votos nominais dos candidatos individualizados. */
  candidateVotes: Record<CandidateId, number>;
  candidateParty: Record<CandidateId, PartyId>;
  candidateNames: Record<CandidateId, string>;
  /** Votos "dos demais candidatos" por partido. */
  othersByParty: Record<PartyId, number>;
  playerId: CandidateId;
}

export function resolveProportional(input: ProportionalInput, rng: Rng): ProportionalOutcome {
  const partyVotes: Record<PartyId, number> = { ...input.othersByParty };
  for (const [id, votes] of Object.entries(input.candidateVotes)) {
    const party = input.candidateParty[id];
    if (party) partyVotes[party] = (partyVotes[party] ?? 0) + votes;
  }
  const partySeats = dhondt(partyVotes, input.seats);

  const lists: Record<PartyId, ProportionalListEntry[]> = {};
  for (const [id, votes] of Object.entries(input.candidateVotes)) {
    const party = input.candidateParty[id];
    if (!party) continue;
    (lists[party] ??= []).push({
      name: input.candidateNames[id] ?? id,
      partyId: party,
      votes,
      elected: false,
      candidateId: id,
    });
  }
  for (const [party, votes] of Object.entries(input.othersByParty)) {
    const count = (partySeats[party] ?? 0) * P.syntheticCandidatesPerSeat + P.syntheticExtra;
    for (const v of syntheticCandidates(votes, count)) {
      const n = randomName(rng, rng.chance(0.5) ? 'male' : 'female');
      (lists[party] ??= []).push({
        name: `${n.firstName} ${n.lastName}`,
        partyId: party,
        votes: v,
        elected: false,
      });
    }
  }

  const all: ProportionalListEntry[] = [];
  for (const [party, list] of Object.entries(lists)) {
    list.sort((a, b) => b.votes - a.votes);
    const seats = partySeats[party] ?? 0;
    list.forEach((entry, i) => {
      entry.elected = i < seats;
    });
    all.push(...list);
  }

  const playerParty = input.candidateParty[input.playerId] ?? '';
  const playerList = lists[playerParty] ?? [];
  const playerRank = playerList.findIndex((e) => e.candidateId === input.playerId) + 1;
  const playerSeats = partySeats[playerParty] ?? 0;
  const electedInParty = playerList.filter((e) => e.elected);
  const allElected = all.filter((e) => e.elected);
  const cutLine =
    playerSeats > 0
      ? (electedInParty.at(-1)?.votes ?? 0)
      : Math.min(...allElected.map((e) => e.votes), Number.POSITIVE_INFINITY);

  return {
    seats: input.seats,
    partyVotes,
    partySeats,
    playerVotes: input.candidateVotes[input.playerId] ?? 0,
    playerRankInParty: playerRank,
    playerPartySeats: playerSeats,
    cutLine: Number.isFinite(cutLine) ? cutLine : 0,
    playerElected: playerRank > 0 && playerRank <= playerSeats,
    topList: all.sort((a, b) => b.votes - a.votes).slice(0, 20),
  };
}
