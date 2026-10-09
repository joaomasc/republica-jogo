import { approach, clamp, clamp100, sum } from '../core/math';
import { INTEREST_GROUP_IDS } from '../politics/types';
import type { GameState } from '../simulation/state';
import { NationConstants as NC } from './constants';
import { groupRadicalism } from './groups';
import { countTag, effectiveEnacted } from './identity';

export interface LegitimacyFactor {
  id: string;
  label: string;
  /** Contribuição em pontos para a legitimidade-alvo (pode ser negativa). */
  value: number;
}

/** Aprovação do governo do jogador (50 quando não há mandato). */
function approvalOf(state: GameState): number {
  return state.government?.approval ?? 50;
}

/** Radicalismo médio ponderado pelo clout (ou simples, sem clout). */
export function averageRadicalism(state: GameState): number {
  let total = 0;
  let weight = 0;
  for (const id of INTEREST_GROUP_IDS) {
    const g = state.interestGroups[id];
    if (!g) continue;
    const w = g.clout ?? 1 / INTEREST_GROUP_IDS.length;
    total += groupRadicalism(state, id) * w;
    weight += w;
  }
  return weight > 0 ? total / weight : NC.initialRadicalism;
}

/** Legitimidade-alvo e os fatores que a compõem (seção 7). */
export function legitimacyFactors(state: GameState): {
  target: number;
  factors: LegitimacyFactor[];
} {
  const enacted = effectiveEnacted(state);
  const nation = state.nation;
  const factors: LegitimacyFactor[] = [];
  const add = (id: string, label: string, value: number) => {
    if (Math.abs(value) >= 0.05) factors.push({ id, label, value });
  };

  add('base', 'Base institucional', NC.legitimacyBase);
  add('approval', 'Aprovação do governo', (approvalOf(state) - 50) * NC.legitimacyApprovalFactor);
  add(
    'democratic',
    'Instituições democráticas',
    Math.min(
      NC.legitimacyDemocraticCap,
      countTag(enacted, 'democratic') * NC.legitimacyDemocraticTag,
    ),
  );
  add(
    'authoritarian',
    'Medidas autoritárias',
    Math.max(
      NC.legitimacyAuthoritarianCap,
      countTag(enacted, 'authoritarian') * NC.legitimacyAuthoritarianTag,
    ),
  );
  add(
    'unrest',
    'Inquietação social',
    -(nation.unrest - NC.legitimacyUnrestReference) * NC.legitimacyUnrestFactor,
  );
  const scandal = state.candidates[state.playerId]?.scandal ?? 0;
  add('scandal', 'Escândalos', -scandal * NC.legitimacyScandalFactor);
  add('regime', 'Regime político', NC.legitimacyRegime[nation.regime] ?? 0);
  if (state.executive.decrees.some((d) => d.kind === 'emergency' && !d.suspended))
    add('emergency', 'Estado de calamidade', NC.legitimacyEmergency);
  const suspended = state.executive.decrees.filter((d) => d.suspended).length;
  add(
    'stf',
    'Decretos barrados pelo STF',
    Math.max(NC.legitimacyStfCap, suspended * NC.legitimacyStfPerDecree),
  );

  const target = clamp100(sum(factors.map((f) => f.value)));
  return { target, factors };
}

/** Inquietação-alvo (0..100). */
export function unrestTarget(state: GameState): number {
  const e = state.economy;
  const value =
    NC.unrestBase +
    (50 - approvalOf(state)) * NC.unrestApprovalFactor +
    Math.max(0, e.unemployment - NC.unrestUnemploymentReference) * NC.unrestUnemploymentFactor +
    Math.max(0, e.inflation - NC.unrestInflationReference) * NC.unrestInflationFactor +
    Math.max(0, averageRadicalism(state) - NC.unrestRadicalismReference) *
      NC.unrestRadicalismFactor +
    Math.min(NC.unrestStrikeCap, state.nation.strikes.length * NC.unrestStrikeFactor) +
    Math.max(0, NC.unrestLegitimacyReference - state.nation.legitimacy) * NC.unrestLegitimacyFactor;
  return clamp(value, 0, 100);
}

/** Atualiza inquietação e legitimidade um mês na direção dos alvos. */
export function updateUnrestAndLegitimacy(state: GameState): void {
  const nation = state.nation;
  nation.unrest = clamp100(approach(nation.unrest, unrestTarget(state), NC.unrestRate));
  nation.legitimacy = clamp100(
    approach(nation.legitimacy, legitimacyFactors(state).target, NC.legitimacyRate),
  );
}

export function levelLabel(
  levels: readonly { max: number; label: string }[],
  value: number,
): string {
  return (levels.find((l) => value < l.max) ?? levels[levels.length - 1])?.label ?? '';
}
