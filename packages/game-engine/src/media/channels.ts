export const MEDIA_CHANNELS = [
  'tv',
  'radio',
  'internet',
  'social',
  'newspaper',
  'podcast',
  'influencer',
  'outdoor',
  'events',
] as const;
export type MediaChannel = (typeof MEDIA_CHANNELS)[number];

export interface ChannelDefinition {
  id: MediaChannel;
  name: string;
  icon: string;
  description: string;
  /** Custo diário (R$) para cobrir 100% do eleitorado com escala de dinheiro = 1. */
  dailyCost: number;
  /** Alcance bruto (0..1). */
  reach: number;
  /** Força de persuasão (0..1). */
  persuasion: number;
  /** Ganho de conhecimento (0..1). */
  knowledge: number;
  /** Risco diário de repercussão negativa. */
  risk: number;
  /** Permite segmentar por grupo demográfico. */
  targetable: boolean;
  /** Pode ser veiculado só em parte do território. */
  regional: boolean;
  /** Bônus de militância/entusiasmo. */
  enthusiasm: number;
}

export const CHANNELS: Record<MediaChannel, ChannelDefinition> = {
  tv: {
    id: 'tv',
    name: 'Televisão',
    icon: 'tv',
    description: 'Alcance massivo, caro, fala com o eleitor mais velho.',
    dailyCost: 60_000,
    reach: 1,
    persuasion: 0.65,
    knowledge: 1,
    risk: 0.012,
    targetable: false,
    regional: true,
    enthusiasm: 0,
  },
  radio: {
    id: 'radio',
    name: 'Rádio',
    icon: 'radio',
    description: 'Barato e regional, forte no interior.',
    dailyCost: 12_000,
    reach: 0.55,
    persuasion: 0.6,
    knowledge: 0.7,
    risk: 0.01,
    targetable: false,
    regional: true,
    enthusiasm: 0,
  },
  internet: {
    id: 'internet',
    name: 'Internet (portais e busca)',
    icon: 'globe',
    description: 'Anúncios em portais e buscadores, segmentáveis.',
    dailyCost: 12_000,
    reach: 0.45,
    persuasion: 0.45,
    knowledge: 0.6,
    risk: 0.012,
    targetable: true,
    regional: true,
    enthusiasm: 0,
  },
  social: {
    id: 'social',
    name: 'Redes sociais',
    icon: 'share-2',
    description: 'Altamente segmentável e viral — e arriscado.',
    dailyCost: 15_000,
    reach: 0.5,
    persuasion: 0.7,
    knowledge: 0.6,
    risk: 0.03,
    targetable: true,
    regional: true,
    enthusiasm: 0.3,
  },
  newspaper: {
    id: 'newspaper',
    name: 'Jornais',
    icon: 'newspaper',
    description: 'Público pequeno, mas formador de opinião.',
    dailyCost: 6_000,
    reach: 0.22,
    persuasion: 0.8,
    knowledge: 0.4,
    risk: 0.008,
    targetable: false,
    regional: true,
    enthusiasm: 0,
  },
  podcast: {
    id: 'podcast',
    name: 'Podcasts',
    icon: 'mic',
    description: 'Conversas longas com público jovem e escolarizado.',
    dailyCost: 5_000,
    reach: 0.22,
    persuasion: 0.75,
    knowledge: 0.45,
    risk: 0.015,
    targetable: true,
    regional: false,
    enthusiasm: 0.1,
  },
  influencer: {
    id: 'influencer',
    name: 'Influenciadores',
    icon: 'sparkles',
    description: 'Persuasivo entre jovens, mas imprevisível.',
    dailyCost: 14_000,
    reach: 0.5,
    persuasion: 0.8,
    knowledge: 0.7,
    risk: 0.045,
    targetable: true,
    regional: false,
    enthusiasm: 0.2,
  },
  outdoor: {
    id: 'outdoor',
    name: 'Outdoor',
    icon: 'rectangle-horizontal',
    description: 'Fixa o nome na cabeça do eleitor local.',
    dailyCost: 8_000,
    reach: 0.35,
    persuasion: 0.3,
    knowledge: 0.85,
    risk: 0.004,
    targetable: false,
    regional: true,
    enthusiasm: 0,
  },
  events: {
    id: 'events',
    name: 'Eventos patrocinados',
    icon: 'party-popper',
    description: 'Carreatas e festas: animam a militância.',
    dailyCost: 11_000,
    reach: 0.15,
    persuasion: 0.9,
    knowledge: 0.5,
    risk: 0.02,
    targetable: true,
    regional: true,
    enthusiasm: 1,
  },
};
