import { GameConstants } from '../config/constants';
import { clamp } from '../core/math';
import type { UnitId } from '../core/types';
import type { CampaignStatus, Election } from '../election/types';
import { STATES } from '../map/states';
import type { PopTypeId } from '../population/popTypes';

/** Operações elementares sobre a situação de campanha de um candidato (com retornos decrescentes). */

export function addKnowledge(status: CampaignStatus, unitId: UnitId, amount: number): number {
  const k = status.knowledge[unitId] ?? 0;
  const gain = amount >= 0 ? amount * (1 - k / 100) : amount;
  status.knowledge[unitId] = clamp(k + gain, 0, 100);
  return gain;
}

export function addKnowledgeEverywhere(
  status: CampaignStatus,
  election: Election,
  amount: number,
): void {
  for (const unit of election.units) addKnowledge(status, unit.id, amount);
}

export function addPresence(status: CampaignStatus, unitId: UnitId, amount: number): number {
  const p = status.presence[unitId] ?? 0;
  const gain = amount >= 0 ? amount * (1 - p / 120) : amount;
  status.presence[unitId] = clamp(p + gain, 0, 100);
  return gain;
}

/** Ganhos de momentum têm retornos decrescentes na mesma direção (difícil "saturar" um grupo). */
function softMomentum(current: number, amount: number): number {
  const cap = GameConstants.campaign.momentumSoftCap;
  const sameSign = Math.sign(current) === Math.sign(amount) ? Math.abs(current) : 0;
  return clamp(current + amount * Math.max(0, 1 - sameSign / cap), -50, 50);
}

export function addRegionalMomentum(status: CampaignStatus, unitId: UnitId, amount: number): void {
  status.regionalMomentum[unitId] = softMomentum(status.regionalMomentum[unitId] ?? 0, amount);
}

export function addPopMomentum(status: CampaignStatus, popType: PopTypeId, amount: number): void {
  status.popMomentum[popType] = softMomentum(status.popMomentum[popType] ?? 0, amount);
}

/** Unidades vizinhas (mesma macrorregião na eleição nacional; demais zonas nas eleições locais). */
export function neighborUnits(election: Election, unitId: UnitId): UnitId[] {
  const unit = election.units.find((u) => u.id === unitId);
  if (!unit) return [];
  if (unit.kind === 'state') {
    const region = STATES[unit.stateId].region;
    return election.units
      .filter((u) => u.id !== unitId && STATES[u.stateId].region === region)
      .map((u) => u.id);
  }
  return election.units.filter((u) => u.id !== unitId).map((u) => u.id);
}

export function spillover(
  status: CampaignStatus,
  election: Election,
  unitId: UnitId,
  presence: number,
  knowledge: number,
): void {
  const f = GameConstants.campaign.spilloverFactor;
  const neighbors = neighborUnits(election, unitId);
  const share = election.units.length > 20 ? 1 : 0.5;
  for (const n of neighbors) {
    if (presence) addPresence(status, n, presence * f * share);
    if (knowledge) addKnowledge(status, n, knowledge * f * share);
  }
}

/** Decaimento diário de presença e momentum. */
export function decayStatus(status: CampaignStatus, presenceDecay: number): void {
  const C = GameConstants.campaign;
  for (const id of Object.keys(status.presence))
    status.presence[id] = (status.presence[id] ?? 0) * (1 - presenceDecay);
  for (const id of Object.keys(status.regionalMomentum))
    status.regionalMomentum[id] =
      (status.regionalMomentum[id] ?? 0) * (1 - C.regionalMomentumDecayPerDay);
  for (const id of Object.keys(status.popMomentum) as PopTypeId[])
    status.popMomentum[id] = (status.popMomentum[id] ?? 0) * (1 - C.popMomentumDecayPerDay);
  for (const id of Object.keys(status.knowledge))
    status.knowledge[id] = (status.knowledge[id] ?? 0) * (1 - C.knowledgeDecayPerDay);
  status.rejectionMod *= 0.995;
}
