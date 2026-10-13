import { nationalSatisfaction } from '../legislature/plebiscite';
import type { GameState } from '../simulation/state';
import { driftParties, governmentScore } from './parties';

/** Deriva dos partidos com as causas tiradas do estado (quem governa e como vai o governo). */
export function driftPartiesInState(state: GameState, days: number): void {
  const gov = state.government;
  const playerGoverns = gov?.branch === 'executive';
  const federalByPlayer = playerGoverns && gov.jurisdiction.level === 'federal';
  driftParties(state.parties, days, {
    governingPartyId: federalByPlayer ? null : state.landscape.presidentPartyId,
    governingScore: governmentScore(nationalSatisfaction(state)),
    playerPartyId: playerGoverns ? (state.candidates[state.playerId]?.partyId ?? null) : null,
    playerScore: playerGoverns ? governmentScore(gov.approval) : null,
  });
}
