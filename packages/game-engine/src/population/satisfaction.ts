import { GameConstants } from '../config/constants';
import { approach, clamp, clamp100 } from '../core/math';
import { BUDGET_INFO, serviceQuality } from '../economy/budget';
import { BUDGET_CATEGORIES } from '../economy/types';
import { ideologyAffinity } from '../ideology/ideology';
import { ISSUES, type IssueId } from '../ideology/issues';
import { aggregateLawEffects, optionIdeology } from '../laws/laws';
import { getLawCategory } from '../laws/laws.data';
import type { GameState } from '../simulation/state';
import { computeProblems, popsOfState, aggregateProblems } from './population';
import type { Pop } from './types';

const P = GameConstants.population;
const G = GameConstants.government;

/** O jogador governa (Executivo) o território deste Pop? */
function governsPop(state: GameState, pop: Pop): boolean {
  const gov = state.government;
  if (!gov || gov.branch !== 'executive') return false;
  return gov.jurisdiction.level === 'federal' || gov.jurisdiction.stateId === pop.stateId;
}

function lawsApplyTo(state: GameState, pop: Pop): boolean {
  const key = state.laws.jurisdictionKey;
  return key === 'federal' || key.endsWith(`:${pop.stateId}`);
}

/**
 * Alvo de satisfação de um Pop: economia (desemprego, inflação, crescimento), serviços públicos
 * (orçamento × prioridades) e leis vigentes (efeitos diretos + alinhamento ideológico).
 */
export function satisfactionTarget(state: GameState, pop: Pop): number {
  const e = state.economy;
  const region = state.regions[pop.stateId];
  const unemployment = region?.unemployment ?? e.unemployment;
  let target =
    P.baseSatisfaction -
    (unemployment - P.satisfactionReferenceUnemployment) *
      P.satisfactionUnemploymentFactor *
      (pop.priorities.jobs / 80) -
    (e.inflation - 4) * G.inflationApprovalFactor * (pop.priorities.inflation / 70) +
    (e.growth - 2) * G.incomeApprovalFactor;

  if (governsPop(state, pop)) {
    let num = 0;
    let den = 0;
    for (const c of BUDGET_CATEGORIES) {
      const weight = BUDGET_INFO[c].issues.reduce((a, i) => a + pop.priorities[i], 0) / 100;
      num += weight * (serviceQuality(state, c) - 1);
      den += weight;
    }
    if (den > 0) target += (num / den) * GameConstants.budget.satisfactionPerQuality;
  }

  // Leis federais valem para todos; as da esfera subnacional do jogador, só para os Pops dela.
  target += lawSatisfaction(state, pop, 'national');
  if (state.laws.jurisdictionKey !== 'federal' && lawsApplyTo(state, pop))
    target += lawSatisfaction(state, pop, 'local');
  // Padrão de vida (renda real e escassez, calculado pela economia industrial).
  if (pop.sol !== undefined) target += (pop.sol - 50) * P.solSatisfactionFactor;
  return clamp100(target + pop.mood * 10);
}

/** Efeito das leis vigentes de uma esfera na satisfação de um Pop. */
function lawSatisfaction(state: GameState, pop: Pop, scope: 'national' | 'local'): number {
  const laws = aggregateLawEffects(state, scope);
  let out = (laws.pops[pop.typeId] ?? 0) * G.lawSatisfactionScale;
  let issueBonus = 0;
  for (const [issue, v] of Object.entries(laws.issues) as [IssueId, number][])
    issueBonus += (v * pop.priorities[issue]) / 100;
  out += issueBonus * 0.5;
  let align = 0;
  let count = 0;
  for (const { categoryId, option, strength } of laws.options) {
    const cat = getLawCategory(categoryId);
    if (!cat || cat.defaultOptionId === option.id) continue;
    align += (ideologyAffinity(pop.ideology, optionIdeology(option, pop.ideology)) - 0.75) * strength;
    count += 1;
  }
  if (count > 0) out += (align / count) * G.policyAlignmentFactor;
  return out;
}

/** Atualização mensal da satisfação e dos problemas percebidos. */
export function updatePopulationMonthly(state: GameState): void {
  for (const pop of Object.values(state.population.pops)) {
    pop.satisfaction = clamp100(
      approach(pop.satisfaction, satisfactionTarget(state, pop), P.satisfactionRate),
    );
    pop.mood = clamp(pop.mood * 0.5, -1, 1);
    pop.problems = computeProblems(pop, state.regions[pop.stateId]);
  }
  for (const region of Object.values(state.regions))
    region.problems = aggregateProblems(popsOfState(state.population, region.id));
}

export function issuesList(): readonly IssueId[] {
  return ISSUES;
}
