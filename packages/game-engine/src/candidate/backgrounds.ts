import type { PopTypeId } from '../population/popTypes';
import type { AttributeId } from './attributes';

export interface BackgroundDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  bonuses: Partial<Record<AttributeId, number>>;
  /** Grupos com quem a origem gera simpatia inicial (momentum). */
  affinityPops: PopTypeId[];
  /** Multiplicador do dinheiro inicial de campanha. */
  moneyMultiplier: number;
  /** Bônus de conhecimento público inicial. */
  fameBonus: number;
}

export const BACKGROUNDS: BackgroundDefinition[] = [
  {
    id: 'teacher',
    name: 'Professor(a)',
    icon: 'book-open',
    description: 'Sabe explicar e é respeitado(a) na comunidade.',
    bonuses: { oratory: 8, credibility: 10, communication: 4 },
    affinityPops: ['students', 'civil_servants'],
    moneyMultiplier: 0.9,
    fameBonus: 0,
  },
  {
    id: 'entrepreneur',
    name: 'Empresário(a)',
    icon: 'building-2',
    description: 'Experiência de gestão e boa rede de doadores.',
    bonuses: { management: 12, campaignCapacity: 8, negotiation: 4 },
    affinityPops: ['business', 'merchants'],
    moneyMultiplier: 1.35,
    fameBonus: 0,
  },
  {
    id: 'unionist',
    name: 'Sindicalista',
    icon: 'users',
    description: 'Mobilizador(a) nato(a), com base organizada.',
    bonuses: { leadership: 10, oratory: 8, organization: 4 },
    affinityPops: ['workers', 'industrial_workers'],
    moneyMultiplier: 0.85,
    fameBonus: 2,
  },
  {
    id: 'journalist',
    name: 'Comunicador(a)',
    icon: 'mic',
    description: 'Rosto conhecido do rádio e da TV.',
    bonuses: { communication: 14, popularity: 6 },
    affinityPops: ['retirees'],
    moneyMultiplier: 1,
    fameBonus: 10,
  },
  {
    id: 'doctor',
    name: 'Médico(a)',
    icon: 'stethoscope',
    description: 'Credibilidade técnica e prestígio social.',
    bonuses: { credibility: 12, management: 4, experience: 2 },
    affinityPops: ['health_workers', 'retirees'],
    moneyMultiplier: 1.1,
    fameBonus: 2,
  },
  {
    id: 'lawyer',
    name: 'Advogado(a)',
    icon: 'scale',
    description: 'Argumentação afiada e trânsito institucional.',
    bonuses: { negotiation: 8, oratory: 8, experience: 4 },
    affinityPops: ['middle_class'],
    moneyMultiplier: 1.1,
    fameBonus: 0,
  },
  {
    id: 'security',
    name: 'Agente de segurança',
    icon: 'shield',
    description: 'Discurso de ordem e disciplina.',
    bonuses: { leadership: 10, credibility: 4, organization: 6 },
    affinityPops: ['merchants', 'retirees'],
    moneyMultiplier: 0.95,
    fameBonus: 3,
  },
  {
    id: 'influencer',
    name: 'Influenciador(a) digital',
    icon: 'smartphone',
    description: 'Milhões de seguidores, mas pouca experiência.',
    bonuses: { popularity: 14, communication: 10, credibility: -6, experience: -4 },
    affinityPops: ['students', 'tech_workers'],
    moneyMultiplier: 1,
    fameBonus: 14,
  },
  {
    id: 'civil_servant',
    name: 'Servidor(a) de carreira',
    icon: 'landmark',
    description: 'Conhece a máquina pública por dentro.',
    bonuses: { management: 8, experience: 8 },
    affinityPops: ['civil_servants'],
    moneyMultiplier: 0.9,
    fameBonus: 0,
  },
  {
    id: 'community',
    name: 'Liderança comunitária',
    icon: 'heart-handshake',
    description: 'Conhece cada rua do bairro.',
    bonuses: { charisma: 10, organization: 8 },
    affinityPops: ['workers', 'unemployed'],
    moneyMultiplier: 0.8,
    fameBonus: 2,
  },
  {
    id: 'farmer',
    name: 'Produtor(a) rural',
    icon: 'tractor',
    description: 'Voz do campo e do interior.',
    bonuses: { organization: 6, credibility: 6, negotiation: 4 },
    affinityPops: ['farmers'],
    moneyMultiplier: 1.15,
    fameBonus: 0,
  },
  {
    id: 'scientist',
    name: 'Cientista',
    icon: 'flask-conical',
    description: 'Rigor técnico, porém pouco traquejo popular.',
    bonuses: { experience: 10, credibility: 8, charisma: -4 },
    affinityPops: ['tech_workers', 'students'],
    moneyMultiplier: 0.9,
    fameBonus: 0,
  },
];

export function getBackground(id: string): BackgroundDefinition {
  return BACKGROUNDS.find((b) => b.id === id) ?? (BACKGROUNDS[0] as BackgroundDefinition);
}
