import type { IsoDate, UnitId } from '../core/types';

export type NewsCategory =
  | 'campaign'
  | 'poll'
  | 'debate'
  | 'scandal'
  | 'economy'
  | 'party'
  | 'government'
  | 'congress'
  | 'event'
  | 'election'
  | 'opponent'
  | 'interview';

export interface NewsItem {
  id: string;
  date: IsoDate;
  outlet: string;
  headline: string;
  body: string;
  category: NewsCategory;
  /** Sentimento para o jogador: -1 negativo, 0 neutro, 1 positivo. */
  sentiment: -1 | 0 | 1;
  importance: 1 | 2 | 3;
  unitId?: UnitId;
}

export type AlertSeverity = 'info' | 'success' | 'warning' | 'danger';

export interface Alert {
  id: string;
  date: IsoDate;
  kind: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  read: boolean;
  /** Rota da interface relacionada (ex.: 'polls', 'finance'). */
  link?: string;
}

export interface MediaState {
  news: NewsItem[];
}
