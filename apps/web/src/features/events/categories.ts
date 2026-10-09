import type { EventCategory } from '@republica/game-engine';

/** Rótulo, ícone e tom de cada categoria de evento. */
export const CATEGORY_INFO: Record<
  EventCategory,
  { label: string; icon: string; tone: 'neutral' | 'good' | 'bad' | 'warn' | 'info' | 'gold' }
> = {
  politics: { label: 'Política', icon: 'landmark', tone: 'info' },
  economy: { label: 'Economia', icon: 'trending-up', tone: 'gold' },
  campaign: { label: 'Campanha', icon: 'megaphone', tone: 'info' },
  media: { label: 'Mídia', icon: 'newspaper', tone: 'info' },
  scandal: { label: 'Escândalo', icon: 'flame', tone: 'bad' },
  crisis: { label: 'Crise', icon: 'flame', tone: 'bad' },
  opportunity: { label: 'Oportunidade', icon: 'sparkles', tone: 'good' },
  party: { label: 'Partido', icon: 'flag', tone: 'warn' },
  opponent: { label: 'Adversários', icon: 'users', tone: 'warn' },
  regional: { label: 'Regional', icon: 'map-pin', tone: 'info' },
};
