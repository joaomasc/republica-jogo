import { GameConstants } from '../config/constants';
import { withRng } from '../core/rng';
import type { UnitId } from '../core/types';
import { nextId } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { NEWS_OUTLETS } from './outlets';
import type { NewsCategory, NewsItem } from './types';

export interface NewsInput {
  headline: string;
  body?: string;
  category: NewsCategory;
  sentiment?: -1 | 0 | 1;
  importance?: 1 | 2 | 3;
  unitId?: UnitId;
  outlet?: string;
}

/** Substitui {chaves} num modelo de texto. */
export function fillTemplate(
  template: string,
  vars: Record<string, string | number | undefined>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    return v === undefined ? `{${key}}` : String(v);
  });
}

/** Publica uma notícia no feed. Notícias são sempre consequência de algo que aconteceu na simulação. */
export function publishNews(state: GameState, input: NewsInput): NewsItem {
  const outlet = input.outlet ?? withRng(state, (rng) => rng.pick(NEWS_OUTLETS));
  const item: NewsItem = {
    id: nextId(state, 'news'),
    date: state.date,
    outlet,
    headline: input.headline,
    body: input.body ?? '',
    category: input.category,
    sentiment: input.sentiment ?? 0,
    importance: input.importance ?? 1,
    ...(input.unitId ? { unitId: input.unitId } : {}),
  };
  state.media.news.unshift(item);
  if (state.media.news.length > GameConstants.news.limit)
    state.media.news.length = GameConstants.news.limit;
  return item;
}

/** Escolhe aleatoriamente uma variação de manchete. */
export function pickHeadline(
  state: GameState,
  templates: readonly string[],
  vars: Record<string, string | number | undefined>,
): string {
  return fillTemplate(
    withRng(state, (rng) => rng.pick(templates)),
    vars,
  );
}
