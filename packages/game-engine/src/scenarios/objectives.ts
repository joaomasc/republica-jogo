import { addMonths, makeDate, yearOf } from '../core/date';
import { localScope } from '../simulation/localScope';
import { clamp01, mean, round } from '../core/math';
import { addHistory } from '../history/history';
import { federalLaws } from '../laws/federal';
import { LAW_CATEGORIES } from '../laws/laws.data';
import { isBillActive } from '../laws/types';
import { pushAlert } from '../media/alerts';
import { publishNews } from '../media/news';
import type { ScenarioObjective } from '../nation/types';
import { getPlayer } from '../simulation/access';
import type { GameState } from '../simulation/state';

/**
 * Objetivos de cenário, avaliados na virada de mês (`nationalMonthlyTick`).
 *
 * Dois tipos de métrica:
 * - MARCOS (`manufacturing_share`, `law_enacted`, `industry_levels`, `bills_passed`): cumpridos
 *   assim que a condição é atingida;
 * - MANUTENÇÃO (`gdp_growth_avg`, `unemployment_max`, `inflation_max`, `approval_min`,
 *   `legitimacy_min`, `avg_wage_growth`, `trade_balance_min`): julgados no prazo (ou na última
 *   virada de mês do mandato), com o valor vigente naquele momento. Entre uma data e outra, só o
 *   progresso (0..1) é atualizado.
 * No prazo, o que não foi cumprido falha; no fim do mandato, todos os ativos falham.
 */

/** Definição de objetivo vinda da configuração/cenário (antes de registrar no estado). */
export type ObjectiveDefinition = Omit<ScenarioObjective, 'status' | 'progress'> & {
  /**
   * `true`: `target` é um ganho sobre o valor no início do mandato (ex.: +0,03 de participação
   * industrial). Na criação da partida vira alvo absoluto (valor inicial + ganho).
   */
  relative?: boolean;
};

/** Objetivo guardado no estado: pode carregar o valor de partida usado no cálculo do progresso. */
export type ObjectiveRecord = ScenarioObjective & { baseline?: number };

export type ObjectiveMetric = ScenarioObjective['metric'];

const MAINTAINED: ReadonlySet<ObjectiveMetric> = new Set<ObjectiveMetric>([
  'gdp_growth_avg',
  'unemployment_max',
  'inflation_max',
  'approval_min',
  'legitimacy_min',
  'avg_wage_growth',
  'trade_balance_min',
]);

/** Métrica avaliada ao fim do prazo (e não assim que atinge o alvo). */
export function isMaintainedMetric(metric: ObjectiveMetric): boolean {
  return MAINTAINED.has(metric);
}

/** Opções de lei alternativas num `law_enacted` (separadas por `|`). */
export function lawTargets(target: number | string): string[] {
  return String(target)
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

function categoryOf(optionId: string): string | null {
  for (const cat of LAW_CATEGORIES) if (cat.options.some((o) => o.id === optionId)) return cat.id;
  return null;
}

/** Total de níveis de edifícios no país (soma de todos os estados e tipos). */
function totalIndustryLevels(state: GameState): number {
  let total = 0;
  for (const byType of Object.values(state.industry.buildings))
    for (const b of Object.values(byType)) total += b?.level ?? 0;
  return total;
}

/** Crescimento médio do PIB (%) desde a posse, incluindo o mês corrente. */
function averageGrowth(state: GameState): number {
  const start = state.government?.startDate ?? state.date;
  const samples = state.economy.history.filter((h) => h.date >= start).map((h) => h.growth);
  if (samples.length === 0) samples.push(state.economy.growth);
  return mean(samples);
}

/** Ganho acumulado (%) da renda média desde o início do mandato. */
function wageGrowth(state: GameState): number {
  const base = state.economy.termBaseline?.income ?? 0;
  return base > 0 ? (state.economy.income / base - 1) * 100 : 0;
}

/** Valor atual da métrica (mesma unidade do `target`). */
export function measureObjective(
  state: GameState,
  metric: ObjectiveMetric,
  target: number | string = 0,
): number {
  switch (metric) {
    case 'manufacturing_share':
      return state.industry.stats.manufacturingShare;
    case 'gdp_growth_avg':
      return averageGrowth(state);
    case 'unemployment_max':
      // Desemprego do lugar governado (cidade, estado ou país).
      return localScope(state).unemployment;
    case 'inflation_max':
      return state.economy.inflation;
    case 'approval_min':
      return state.government?.approval ?? 0;
    case 'legitimacy_min':
      return state.nation.legitimacy;
    case 'trade_balance_min':
      return state.industry.stats.tradeBalance;
    case 'industry_levels':
      return totalIndustryLevels(state);
    case 'avg_wage_growth':
      return wageGrowth(state);
    case 'bills_passed':
      return state.government?.billsPassed ?? 0;
    case 'law_enacted': {
      const laws = federalLaws(state);
      return lawTargets(target).some((opt) => {
        const cat = categoryOf(opt);
        return cat !== null && laws.enacted[cat] === opt;
      })
        ? 1
        : 0;
    }
  }
}

/** Valor de partida usado para medir progresso de ganhos (marcos incrementais). */
export function objectiveBaseline(state: GameState, metric: ObjectiveMetric): number | undefined {
  if (metric === 'manufacturing_share' || metric === 'industry_levels')
    return measureObjective(state, metric);
  return undefined;
}

/** Progresso de uma lei: em vigor = 1; em implementação = 0,75; em tramitação = 0,25. */
function lawProgress(state: GameState, target: number | string): number {
  if (measureObjective(state, 'law_enacted', target) >= 1) return 1;
  const laws = federalLaws(state);
  const options = lawTargets(target);
  if (laws.implementing.some((i) => options.includes(i.optionId))) return 0.75;
  if (laws.bills.some((b) => isBillActive(b) && options.includes(b.optionId))) return 0.25;
  return 0;
}

function ratioUp(current: number, target: number): number {
  return target > 0 ? clamp01(current / target) : current >= target ? 1 : 0;
}

function ratioDown(current: number, target: number): number {
  if (current <= target) return 1;
  return current > 0 ? clamp01(target / current) : 0;
}

/** Progresso (0..1) e se a condição está satisfeita neste momento. */
export function objectiveProgress(
  state: GameState,
  objective: ObjectiveRecord,
): { progress: number; met: boolean; current: number } {
  const target = typeof objective.target === 'number' ? objective.target : 0;
  const current = measureObjective(state, objective.metric, objective.target);
  switch (objective.metric) {
    case 'law_enacted':
      return { progress: lawProgress(state, objective.target), met: current >= 1, current };
    case 'unemployment_max':
    case 'inflation_max':
      return { progress: ratioDown(current, target), met: current <= target, current };
    case 'manufacturing_share':
    case 'industry_levels': {
      const base = objective.baseline ?? 0;
      const span = target - base;
      const progress = span > 0 ? clamp01((current - base) / span) : current >= target ? 1 : 0;
      return { progress, met: current >= target, current };
    }
    default:
      return { progress: ratioUp(current, target), met: current >= target, current };
  }
}

/** Data do primeiro dia do mês seguinte. */
function nextMonthStart(date: string): string {
  return makeDate(yearOf(date), Number(date.slice(5, 7)) + 1, 1);
}

function resolveObjective(
  state: GameState,
  objective: ObjectiveRecord,
  status: 'completed' | 'failed',
  reason: string,
): void {
  objective.status = status;
  const player = getPlayer(state);
  const done = status === 'completed';
  if (done) objective.progress = 1;
  publishNews(state, {
    headline: done
      ? `${player.ballotName} cumpre meta de governo: ${objective.title}`
      : `Meta de governo não cumprida: ${objective.title}`,
    body: reason,
    category: 'government',
    sentiment: done ? 1 : -1,
    importance: 2,
  });
  pushAlert(state, {
    kind: done ? 'objective_completed' : 'objective_failed',
    severity: done ? 'success' : 'warning',
    title: done ? 'Objetivo cumprido' : 'Objetivo não cumprido',
    message: `${objective.title}. ${reason}`,
    link: 'nation',
  });
  addHistory(state, {
    kind: done ? 'reform' : 'crisis',
    title: done ? `Objetivo cumprido: ${objective.title}` : `Objetivo falhou: ${objective.title}`,
    description: reason,
    importance: 2,
    sentiment: done ? 1 : -1,
  });
}

/** Avaliação mensal dos objetivos ativos (chamada em `nationalMonthlyTick`). */
export function evaluateObjectives(state: GameState): void {
  const objectives = state.nation.objectives as ObjectiveRecord[];
  if (objectives.length === 0) return;
  const gov = state.government;
  if (!gov) return;
  // Última virada de mês antes do fim do mandato: o que ainda estiver ativo é decidido agora.
  const lastTick = nextMonthStart(state.date) > gov.endDate;

  for (const obj of objectives) {
    if (obj.status !== 'active') continue;
    const { progress, met } = objectiveProgress(state, obj);
    obj.progress = round(progress, 3);

    const deadlineReached = obj.deadline !== null && state.date >= obj.deadline;
    const termEnding = lastTick || state.date >= gov.endDate;
    const judgeNow = deadlineReached || termEnding;

    if (isMaintainedMetric(obj.metric)) {
      if (!judgeNow) continue;
      if (met) resolveObjective(state, obj, 'completed', 'A meta foi mantida até o prazo.');
      else
        resolveObjective(
          state,
          obj,
          'failed',
          deadlineReached
            ? 'O prazo terminou sem que a meta fosse atingida.'
            : 'O mandato terminou sem que a meta fosse atingida.',
        );
      continue;
    }
    if (met) resolveObjective(state, obj, 'completed', 'A meta foi atingida.');
    else if (judgeNow)
      resolveObjective(
        state,
        obj,
        'failed',
        deadlineReached
          ? 'O prazo terminou sem que a meta fosse atingida.'
          : 'O mandato terminou sem que a meta fosse atingida.',
      );
  }
}

/** Cria o registro de um objetivo no estado (status ativo, progresso 0). */
export function registerObjective(state: GameState, def: ObjectiveDefinition): ObjectiveRecord {
  const { relative, ...rest } = def;
  const baseline = objectiveBaseline(state, def.metric);
  const target =
    relative && typeof def.target === 'number' && baseline !== undefined
      ? round(baseline + def.target, 6)
      : def.target;
  const record: ObjectiveRecord = { ...rest, target, status: 'active', progress: 0 };
  if (baseline !== undefined) record.baseline = baseline;
  state.nation.objectives.push(record);
  return record;
}

// ---------------------------------------------------------------------------
// Visão para a interface
// ---------------------------------------------------------------------------

export interface ObjectiveView {
  id: string;
  title: string;
  description: string;
  metric: ObjectiveMetric;
  status: ScenarioObjective['status'];
  /** 0..1 */
  progress: number;
  target: number | string;
  /** Valor atual da métrica (mesma unidade do alvo); `null` para leis. */
  current: number | null;
  deadline: string | null;
  /** Meses até o prazo (ou até o fim do mandato); `null` sem governo. */
  monthsLeft: number | null;
  /** `true` se a meta só é julgada no prazo (manutenção). */
  maintained: boolean;
}

/** Objetivos do cenário com valor atual e prazo, prontos para exibir. */
export function objectivesView(state: GameState): ObjectiveView[] {
  const end = state.government?.endDate ?? null;
  return (state.nation.objectives as ObjectiveRecord[]).map((o) => {
    const limit = o.deadline ?? end;
    let monthsLeft: number | null = null;
    if (limit !== null) {
      let months = 0;
      while (months < 240 && addMonths(state.date, months + 1) <= limit) months++;
      monthsLeft = months;
    }
    return {
      id: o.id,
      title: o.title,
      description: o.description,
      metric: o.metric,
      status: o.status,
      progress: o.progress,
      target: o.target,
      current:
        o.metric === 'law_enacted' ? null : round(measureObjective(state, o.metric, o.target), 3),
      deadline: o.deadline,
      monthsLeft,
      maintained: isMaintainedMetric(o.metric),
    };
  });
}
