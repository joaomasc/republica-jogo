import type { CampaignState } from '../campaign/types';
import type { Candidate } from '../candidate/types';
import { DIFFICULTIES, type DifficultyPreset } from '../config/difficulty';
import type { CandidateId, PartyId } from '../core/types';
import type { CampaignStatus, Election } from '../election/types';
import type { Party } from '../parties/types';
import type { GameState } from './state';

/** Helpers de acesso com verificação — evitam `!` espalhados pelo código. */

export function getCandidate(state: GameState, id: CandidateId): Candidate {
  const c = state.candidates[id];
  if (!c) throw new Error(`Candidato inexistente: ${id}`);
  return c;
}

export function getPlayer(state: GameState): Candidate {
  return getCandidate(state, state.playerId);
}

export function getParty(state: GameState, id: PartyId): Party {
  const p = state.parties[id];
  if (!p) throw new Error(`Partido inexistente: ${id}`);
  return p;
}

export function getPlayerParty(state: GameState): Party {
  return getParty(state, getPlayer(state).partyId);
}

export function requireElection(state: GameState): Election {
  if (!state.election) throw new Error('Não há eleição em andamento');
  return state.election;
}

export function requireCampaign(state: GameState): CampaignState {
  if (!state.campaign) throw new Error('Não há campanha em andamento');
  return state.campaign;
}

export function getStatus(election: Election, id: CandidateId): CampaignStatus {
  const s = election.participants[id];
  if (!s) throw new Error(`Participante inexistente: ${id}`);
  return s;
}

export function getPlayerStatus(state: GameState): CampaignStatus | null {
  return state.election?.participants[state.playerId] ?? null;
}

export function getDifficulty(state: GameState): DifficultyPreset {
  return DIFFICULTIES[state.settings.difficulty];
}

/** Gera um id único e determinístico na partida. */
export function nextId(state: GameState, prefix: string): string {
  state.idCounter += 1;
  return `${prefix}_${state.idCounter.toString(36)}`;
}

export function partyList(state: GameState): Party[] {
  return Object.values(state.parties);
}

export function opponentsOf(state: GameState): CandidateId[] {
  return state.election ? state.election.candidateIds.filter((id) => id !== state.playerId) : [];
}
