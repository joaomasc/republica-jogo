import type { PlayerPromise, PromiseStatus } from '../campaign/types';
import { clamp } from '../core/math';
import type { BudgetCategory } from '../economy/types';
import { OFFICES } from '../election/offices';
import { federalOption } from '../laws/federal';
import { getLawCategory, getLawOption } from '../laws/laws.data';
import { pushAlert } from '../media/alerts';
import { publishNews } from '../media/news';
import type { GameState } from '../simulation/state';

/** Credibilidade ao cumprir uma promessa de lei da própria esfera / de outra esfera / ao recuar. */
const KEEP_OWN = 3;
const KEEP_OTHER = 1.5;
const REVERT_COST = 3;

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const monthLabel = (date: string) => `${MONTHS[Number(date.slice(5, 7)) - 1] ?? ''}/${date.slice(0, 4)}`;

/** Opções em vigor numa categoria: a da esfera do jogador e a federal (podem diferir). */
function optionsInForce(state: GameState, categoryId: string): string[] {
  const out: string[] = [];
  const own = state.laws.enacted[categoryId];
  if (own) out.push(own);
  const fed = federalOption(state, categoryId);
  if (fed && !out.includes(fed)) out.push(fed);
  return out;
}

/** O cargo do jogador legisla sobre esta categoria? (senão, a promessa depende de outra esfera) */
export function promiseInOwnSphere(state: GameState, categoryId: string): boolean {
  const officeId = state.government?.officeId ?? state.election?.officeId;
  const level = officeId ? OFFICES[officeId].level : null;
  const cat = getLawCategory(categoryId);
  return !!level && !!cat && cat.levels.includes(level);
}

function fulfil(state: GameState, p: PlayerPromise, note: string, ownSphere: boolean): void {
  p.status = 'fulfilled';
  p.evaluatedOn = state.date;
  p.note = note;
  const player = state.candidates[state.playerId];
  if (player)
    player.attributes.credibility = clamp(player.attributes.credibility + (ownSphere ? KEEP_OWN : KEEP_OTHER), 0, 100);
  publishNews(state, { headline: `Promessa cumprida: ${p.title}`, category: 'government', sentiment: 1, importance: 2 });
  pushAlert(state, { kind: 'promise_kept', severity: 'info', title: 'Promessa cumprida', message: `${p.title} — ${note}`, link: 'candidato' });
}

/**
 * Uma lei foi aprovada (vai à implementação) ou entrou em vigor: cumpre na hora as promessas que
 * pediam essa lei — seja quem for o autor — e as de "apresentar projeto" do próprio jogador.
 */
export function promisesOnLawApproved(
  state: GameState,
  categoryId: string,
  optionId: string,
  billNumber: string | null,
  byPlayer: boolean,
): void {
  if (!state.government) return;
  const opt = getLawOption(categoryId, optionId);
  const when = monthLabel(state.date);
  for (const p of state.promises) {
    if (p.status !== 'pending') continue;
    const t = p.target;
    if (t.kind === 'law' && t.categoryId === categoryId && t.optionIds.includes(optionId)) {
      const own = promiseInOwnSphere(state, categoryId);
      fulfil(state, p, `Lei aprovada em ${when}${billNumber ? ` · ${billNumber}` : ''}${own ? '' : ' (outra esfera)'}`, own);
    } else if (t.kind === 'billProposed' && t.categoryId === categoryId && byPlayer) {
      fulfil(state, p, `${billNumber ?? 'Seu projeto'} aprovado em ${when}: ${opt?.name ?? optionId}`, true);
    }
  }
}

/** O jogador (ou o governo dele) apresentou um projeto: registra o avanço da promessa. */
export function promisesOnBillFiled(state: GameState, categoryId: string, billNumber: string): void {
  for (const p of state.promises) {
    if (p.status !== 'pending' || p.target.kind !== 'billProposed' || p.target.categoryId !== categoryId) continue;
    p.billNumber = billNumber;
    p.note = `${billNumber} apresentado em ${monthLabel(state.date)}`;
  }
}

/** Mudança de lei: cumpre promessas ainda pendentes e detecta recuos em promessas já cumpridas. */
export function promisesOnLawChanged(state: GameState, categoryId: string, optionId: string): void {
  if (!state.government) return;
  promisesOnLawApproved(state, categoryId, optionId, null, false);
  for (const p of state.promises) {
    const t = p.target;
    if (p.status !== 'fulfilled' || p.reverted || t.kind !== 'law' || t.categoryId !== categoryId) continue;
    if (t.optionIds.includes(optionId)) continue;
    p.reverted = true;
    p.note = `${p.note ?? 'Cumprida'} — depois revogada em ${monthLabel(state.date)}`;
    const player = state.candidates[state.playerId];
    if (player) player.attributes.credibility = clamp(player.attributes.credibility - REVERT_COST, 0, 100);
    publishNews(state, {
      headline: `Recuo: lei prometida por ${player?.ballotName ?? 'governo'} é revogada`,
      category: 'government',
      sentiment: -1,
      importance: 2,
    });
  }
}


const STATUS_LABEL: Record<PromiseStatus, string> = {
  pending: 'Em andamento',
  fulfilled: 'Cumprida',
  partial: 'Parcialmente cumprida',
  broken: 'Não cumprida',
};

export function promiseStatusLabel(status: PromiseStatus): string {
  return STATUS_LABEL[status];
}

/** Valor atual do indicador usado por uma promessa (regional quando o mandato é estadual/municipal). */
export function indicatorValue(
  state: GameState,
  indicator: 'unemployment' | 'inflation' | 'growth' | 'income',
): number {
  const stateId = state.government?.jurisdiction.stateId ?? null;
  const region = stateId ? state.regions[stateId] : undefined;
  switch (indicator) {
    case 'unemployment':
      return region?.unemployment ?? state.economy.unemployment;
    case 'income':
      return region?.income ?? state.economy.income;
    case 'growth':
      return region?.growth ?? state.economy.growth;
    case 'inflation':
      return state.economy.inflation;
  }
}

/** Avalia (sem alterar o estado) a situação atual de uma promessa. */
export function evaluatePromise(state: GameState, promise: PlayerPromise): PromiseStatus {
  const t = promise.target;
  const gov = state.government;
  switch (t.kind) {
    case 'law': {
      if (optionsInForce(state, t.categoryId).some((o) => t.optionIds.includes(o))) return 'fulfilled';
      if (
        state.laws.implementing.some(
          (i) => i.categoryId === t.categoryId && t.optionIds.includes(i.optionId),
        )
      )
        return 'fulfilled';
      if (
        state.laws.bills.some(
          (b) => b.categoryId === t.categoryId && t.optionIds.includes(b.optionId),
        )
      )
        return 'partial';
      return 'broken';
    }
    case 'noLaw':
      return optionsInForce(state, t.categoryId).some((o) => t.forbiddenOptionIds.includes(o)) ? 'broken' : 'fulfilled';
    case 'budget': {
      const b = gov?.budget;
      if (!b) return 'partial';
      const cat = t.category as BudgetCategory;
      const ratio = (b.spending[cat] ?? 0) / Math.max(0.0001, b.baseline[cat] ?? 1);
      if (ratio >= t.minRatio) return 'fulfilled';
      if (ratio >= 1 + (t.minRatio - 1) / 2) return 'partial';
      return 'broken';
    }
    case 'indicator': {
      if (promise.baseline === null) return 'pending';
      const now = indicatorValue(state, t.indicator);
      const change = now - promise.baseline;
      const target = t.indicator === 'income' ? (promise.baseline * t.amount) / 100 : t.amount;
      const progress = t.direction === 'down' ? -change : change;
      if (progress >= target) return 'fulfilled';
      if (progress > 0) return 'partial';
      return 'broken';
    }
    case 'billProposed': {
      // Projetos do Executivo do jogador ficam com autoria "governo".
      const mine = state.laws.bills.filter(
        (b) =>
          b.categoryId === t.categoryId &&
          (b.authorId === state.playerId || (b.authorId === 'government' && gov?.branch === 'executive')),
      );
      if (mine.some((b) => b.status === 'passed')) return 'fulfilled';
      if (mine.length > 0 || promise.billNumber) return 'partial';
      return 'broken';
    }
  }
}

/** Define a linha de base dos indicadores no início do mandato. */
export function setPromiseBaselines(state: GameState): void {
  for (const p of state.promises) {
    if (p.status === 'pending' && p.target.kind === 'indicator')
      p.baseline = indicatorValue(state, p.target.indicator);
  }
}

export function finalizePromises(state: GameState): {
  fulfilled: number;
  partial: number;
  broken: number;
  total: number;
} {
  let fulfilled = 0;
  let partial = 0;
  let broken = 0;
  for (const p of state.promises) {
    if (p.status !== 'pending') continue;
    const status = evaluatePromise(state, p);
    p.status = status === 'pending' ? 'partial' : status;
    p.evaluatedOn = state.date;
    if (p.status === 'fulfilled') fulfilled++;
    else if (p.status === 'partial') partial++;
    else broken++;
  }
  return { fulfilled, partial, broken, total: fulfilled + partial + broken };
}
