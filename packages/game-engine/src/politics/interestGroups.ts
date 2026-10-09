import { GameConstants } from '../config/constants';
import { diffDays } from '../core/date';
import { approach, clamp } from '../core/math';
import type { Rng } from '../core/rng';
import { BUDGET_CATEGORIES } from '../economy/types';
import { BUDGET_INFO, serviceQuality } from '../economy/budget';
import { NationConstants as NC } from '../nation/constants';
import { fireEvent } from '../events/events';
import { getEventDefinition } from '../events/events.data';
import { ideologyAffinity } from '../ideology/ideology';
import { aggregateLawEffects } from '../laws/laws';
import { candidatePlatform, platformGroupStance } from '../laws/platform';
import { getPlayer } from '../simulation/access';
import type { GameState } from '../simulation/state';
import type { InterestGroup } from './types';

const G = GameConstants.interestGroups;

/** Alvo de aprovação de um grupo: leis vigentes, orçamento das prioridades e afinidade ideológica. */
export function groupApprovalTarget(state: GameState, group: InterestGroup): number {
  const laws = aggregateLawEffects(state, 'any');
  let target = 50 + (laws.groups[group.id] ?? 0);
  const player = getPlayer(state);
  target += (ideologyAffinity(player.ideology, group.ideology) - 0.65) * 60;
  // Bandeiras: o que o jogador defende publicamente pesa para o grupo.
  target += clamp((platformGroupStance(candidatePlatform(state, player.id))[group.id] ?? 0) * 0.6, -12, 12);
  if (state.government?.budget) {
    for (const c of BUDGET_CATEGORIES) {
      const relevant = BUDGET_INFO[c].issues.some((i) => group.priorities.includes(i));
      if (relevant) target += (serviceQuality(state, c) - 1) * G.budgetImpact;
    }
  }
  return clamp(target, 0, 100);
}

export function updateInterestGroups(state: GameState, rng: Rng): void {
  for (const group of Object.values(state.interestGroups)) {
    group.approval = clamp(
      approach(group.approval, groupApprovalTarget(state, group), G.approvalAdjustRate) +
        rng.normal(0, 1),
      0,
      100,
    );
    // Grupos satisfeitos melhoram o humor dos Pops que representam; insatisfeitos protestam.
    if (group.approval >= G.donationThreshold) {
      for (const pop of Object.values(state.population.pops))
        if (group.relatedPopTypes.includes(pop.typeId))
          pop.satisfaction = clamp(pop.satisfaction + 0.5, 0, 100);
    }
    if (state.phase === 'governing' && protestRolls(state, group, rng)) {
      const def = getEventDefinition('group_protest');
      if (def && state.events.pending.length === 0)
        fireEvent(state, def, { groupId: group.id, groupName: group.name });
    }
  }
}

/**
 * Protesto do grupo: aprovação baixa ou radicalismo alto. Grupos em greve (ou prestes a parar,
 * quando podem fazê-lo) não protestam por evento: a pressão já vira paralisação (nation/strikes).
 */
function protestRolls(state: GameState, group: InterestGroup, rng: Rng): boolean {
  const radicalism = group.radicalism ?? NC.initialRadicalism;
  const angry = group.approval <= G.protestThreshold || radicalism >= NC.protest.radicalismThreshold;
  if (!angry) return false;
  if (state.nation.strikes.some((s) => s.groupId === group.id)) return false;
  const last = state.events.lastFired.group_protest;
  if (last && diffDays(last, state.date) < NC.protest.cooldownDays) return false;
  if (NC.strikeGroups.includes(group.id) && radicalism >= NC.strikeThreshold) return false;
  return rng.chance(NC.protest.baseChance + (NC.protest.radicalismChance * radicalism) / 100);
}

/** Doações de grupos simpáticos durante a campanha (por dia). */
export function interestGroupDonations(state: GameState): number {
  let total = 0;
  const scale = state.campaign?.moneyScale ?? 1;
  const count = Math.max(1, Object.keys(state.interestGroups).length);
  for (const group of Object.values(state.interestGroups)) {
    if (group.approval < G.donationThreshold) continue;
    total +=
      ((group.approval - G.donationThreshold) / 35) *
      groupWeight(group, count) *
      G.donationScale *
      scale *
      0.05;
  }
  return Math.round(total);
}

/** Peso do grupo (0..1): o clout, quando já calculado, senão a influência-base. */
export function groupWeight(group: InterestGroup, groupCount: number): number {
  if (group.clout === undefined) return group.influence / 100;
  return Math.min(1, group.clout * groupCount * NC.donationCloutFactor);
}
