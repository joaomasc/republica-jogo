import type { IsoDate } from '../core/types';

export type HistoryKind =
  | 'scandal'
  | 'victory'
  | 'defeat'
  | 'reform'
  | 'speech'
  | 'promise'
  | 'crisis'
  | 'alliance'
  | 'rupture'
  | 'party_switch'
  | 'party_founded'
  | 'debate'
  | 'event'
  | 'office'
  | 'career';

/** Memória política: acontecimentos que o jogo "lembra" e reutiliza (entrevistas, ataques, notícias). */
export interface HistoryEntry {
  id: string;
  date: IsoDate;
  kind: HistoryKind;
  title: string;
  description: string;
  /** 1 = menor, 3 = marcante. */
  importance: 1 | 2 | 3;
  /** Sentimento para a imagem do jogador. */
  sentiment: -1 | 0 | 1;
  tags: string[];
}
