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

/** Parcelas do alvo de satisfação de um Pop (somadas, antes do limite 0–100). */
export interface SatisfactionParts {
  base: number;
  unemployment: number;
  inflation: number;
  growth: number;
  services: number;
  laws: number;
  standardOfLiving: number;
  mood: number;
}

export const SATISFACTION_PART_LABEL: Record<keyof SatisfactionParts, string> = {
  base: 'Patamar',
  unemployment: 'Desemprego',
  inflation: 'Inflação',
  growth: 'Crescimento',
  services: 'Serviços públicos',
  laws: 'Leis vigentes',
  standardOfLiving: 'Padrão de vida',
  mood: 'Humor (notícias recentes)',
};

/**
 * Alvo de satisfação de um Pop, em parcelas: economia (desemprego, inflação, crescimento),
 * serviços públicos (orçamento × prioridades), leis vigentes (efeitos diretos + alinhamento
 * ideológico), padrão de vida e humor.
 */
export function satisfactionParts(state: GameState, pop: Pop): SatisfactionParts {
  const e = state.economy;
  const region = state.regions[pop.stateId];
  const unemployment = region?.unemployment ?? e.unemployment;
  let services = 0;
  if (governsPop(state, pop)) {
    let num = 0;
    let den = 0;
    for (const c of BUDGET_CATEGORIES) {
      const weight = BUDGET_INFO[c].issues.reduce((a, i) => a + pop.priorities[i], 0) / 100;
      num += weight * (serviceQuality(state, c) - 1);
      den += weight;
    }
    if (den > 0) services = (num / den) * GameConstants.budget.satisfactionPerQuality;
  }
  // Leis federais valem para todos; as da esfera subnacional do jogador, só para os Pops dela.
  let laws = lawSatisfaction(state, pop, 'national');
  if (state.laws.jurisdictionKey !== 'federal' && lawsApplyTo(state, pop))
    laws += lawSatisfaction(state, pop, 'local');
  return {
    base: P.baseSatisfaction,
    unemployment:
      -(unemployment - P.satisfactionReferenceUnemployment) *
      P.satisfactionUnemploymentFactor *
      (pop.priorities.jobs / 80),
    inflation: -(e.inflation - 4) * G.inflationApprovalFactor * (pop.priorities.inflation / 70),
    growth: (e.growth - 2) * G.incomeApprovalFactor,
    services,
    laws,
    // Padrão de vida (renda real e escassez, calculado pela economia industrial).
    standardOfLiving: pop.sol !== undefined ? (pop.sol - 50) * P.solSatisfactionFactor : 0,
    mood: pop.mood * 10,
  };
}

/** Alvo de satisfação de um Pop (soma das parcelas, limitada a 0–100). */
export function satisfactionTarget(state: GameState, pop: Pop): number {
  const p = satisfactionParts(state, pop);
  return clamp100(
    p.base + p.unemployment + p.inflation + p.growth + p.services + p.laws + p.standardOfLiving + p.mood,
  );
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
