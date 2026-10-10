import { GameConstants } from '../config/constants';
import { clamp } from '../core/math';
import type { Rng } from '../core/rng';
import type { PartyId, StateId } from '../core/types';
import type { Jurisdiction } from '../election/offices';
import { dhondt } from '../election/proportional';
import { ideologyAffinity } from '../ideology/ideology';
import { cityCouncilSeats, stateAssemblySeats } from '../map/states';
import type { Party } from '../parties/types';
import type { GameState } from '../simulation/state';
import type { Chamber, CongressState } from './types';

const C = GameConstants.congress;

function partyWeights(
  state: GameState,
  stateId: StateId | null,
  rng: Rng,
  boost: Record<PartyId, number>,
): Record<PartyId, number> {
  const out: Record<PartyId, number> = {};
  for (const party of Object.values(state.parties)) {
    const local = stateId ? (state.regions[stateId]?.partyStrength[party.id] ?? 50) / 50 : 1;
    const base = (party.popularity * 0.6 + party.influence * 0.4) * local;
    out[party.id] = Math.max(
      0.5,
      base ** 1.15 * Math.exp(rng.normal(0, C.seatNoiseSd)) * (1 + (boost[party.id] ?? 0)),
    );
  }
  // Cláusula de barreira: quem não alcança o quociente em nenhum estado fica sem cadeiras.
  const total = Object.values(out).reduce((a, b) => a + b, 0);
  for (const [id, weight] of Object.entries(out)) if (weight < total * C.minSeatShare) out[id] = 0;
  return out;
}

function makeChamber(
  id: string,
  name: string,
  total: number,
  weights: Record<PartyId, number>,
): Chamber {
  return { id, name, totalSeats: total, seats: dhondt(weights, total) };
}

/** Gera a composição do Legislativo da esfera (com efeito "puxador" do partido do jogador). */
export function buildChambers(
  state: GameState,
  jurisdiction: Jurisdiction,
  rng: Rng,
  coattail: Record<PartyId, number> = {},
): Chamber[] {
  if (jurisdiction.level === 'federal' || !jurisdiction.stateId) {
    return [
      makeChamber('camara', 'Câmara dos Deputados', 513, partyWeights(state, null, rng, coattail)),
      makeChamber('senado', 'Senado Federal', 81, partyWeights(state, null, rng, coattail)),
    ];
  }
  if (jurisdiction.level === 'estadual') {
    return [
      makeChamber(
        'assembleia',
        'Assembleia Legislativa',
        stateAssemblySeats(jurisdiction.stateId),
        partyWeights(state, jurisdiction.stateId, rng, coattail),
      ),
    ];
  }
  return [
    makeChamber(
      'camara_municipal',
      'Câmara Municipal',
      cityCouncilSeats(jurisdiction.stateId),
      partyWeights(state, jurisdiction.stateId, rng, coattail),
    ),
  ];
}

export function initialRelations(
  parties: Record<PartyId, Party>,
  playerPartyId: PartyId,
): Record<PartyId, number> {
  const own = parties[playerPartyId];
  const out: Record<PartyId, number> = {};
  for (const p of Object.values(parties)) {
    if (p.id === playerPartyId) out[p.id] = 60;
    else
      out[p.id] = own
        ? clamp((ideologyAffinity(own.ideology, p.ideology) - 0.65) * 160, -60, 40)
        : 0;
  }
  return out;
}

export function initCongress(
  state: GameState,
  jurisdiction: Jurisdiction,
  rng: Rng,
  coattail: Record<PartyId, number> = {},
): CongressState {
  const playerParty = state.candidates[state.playerId]?.partyId ?? '';
  return {
    chambers: buildChambers(state, jurisdiction, rng, coattail),
    coalition: playerParty ? [playerParty] : [],
    relations: initialRelations(state.parties, playerParty),
    log: [],
  };
}

export function coalitionSeats(
  state: GameState,
  chamberIndex = 0,
): { coalition: number; opposition: number; total: number } {
  const chamber = state.congress.chambers[chamberIndex];
  if (!chamber) return { coalition: 0, opposition: 0, total: 0 };
  let coalition = 0;
  for (const [pid, seats] of Object.entries(chamber.seats))
    if (state.congress.coalition.includes(pid)) coalition += seats;
  return { coalition, opposition: chamber.totalSeats - coalition, total: chamber.totalSeats };
}

/** Relações decaem lentamente para o "natural" ideológico. */
export function driftRelations(state: GameState): void {
  const natural = initialRelations(state.parties, state.candidates[state.playerId]?.partyId ?? '');
  for (const [pid, value] of Object.entries(state.congress.relations)) {
    const target = (natural[pid] ?? 0) + (state.congress.coalition.includes(pid) ? 20 : 0);
    state.congress.relations[pid] = value + (target - value) * 0.05;
  }
}
