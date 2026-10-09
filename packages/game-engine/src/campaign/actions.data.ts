import type { AttributeId } from '../candidate/attributes';
import type { MediaChannel } from '../media/channels';

export type ActionTarget = 'none' | 'unit' | 'popType' | 'unitAndProposal' | 'proposal';
export type ActionCategory = 'ground' | 'media' | 'politics' | 'logistics';

export interface CampaignActionEffects {
  /** Presença na unidade-alvo. */
  presence?: number;
  /** Conhecimento na unidade-alvo. */
  knowledge?: number;
  /** Conhecimento em todo o território. */
  knowledgeAll?: number;
  regionalMomentum?: number;
  /** Momentum no grupo-alvo. */
  popMomentum?: number;
  /** Momentum distribuído pelo consumo de mídia do canal. */
  audienceMomentum?: number;
  channel?: MediaChannel;
  enthusiasm?: number;
  /** Variação percentual de militantes. */
  militants?: number;
  /** Arrecadação (R$, multiplicada pela escala da campanha). */
  fundraising?: number;
  energyRestore?: number;
  prep?: number;
  spillover?: boolean;
  /** Ganho de presença proporcional à militância. */
  militantPowered?: boolean;
}

export interface CampaignActionDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: ActionCategory;
  target: ActionTarget;
  /** Custo base em R$ (multiplicado pela escala monetária). */
  cost: number;
  energy: number;
  /** Tempo consumido (dias). 0 = pode repetir no mesmo dia enquanto houver energia. */
  days: number;
  /** Probabilidade base de gafe/repercussão negativa. */
  risk: number;
  attributes: Partial<Record<AttributeId, number>>;
  effects: CampaignActionEffects;
  /** Público principal (texto para a interface). */
  audience: string;
}

export const CAMPAIGN_ACTIONS: CampaignActionDefinition[] = [
  {
    id: 'rally',
    name: 'Comício',
    icon: 'megaphone',
    category: 'ground',
    target: 'unit',
    cost: 60_000,
    energy: 18,
    days: 1,
    risk: 0.05,
    audience: 'Eleitores da região e militância',
    description: 'Palanque, discurso e multidão. Grande presença local e anima a base.',
    attributes: { charisma: 2, oratory: 2, leadership: 1 },
    effects: {
      presence: 16,
      knowledge: 7,
      regionalMomentum: 4,
      enthusiasm: 4,
      militants: 2,
      spillover: true,
    },
  },
  {
    id: 'caravan',
    name: 'Viagem / caravana',
    icon: 'bus',
    category: 'ground',
    target: 'unit',
    cost: 35_000,
    energy: 22,
    days: 2,
    risk: 0.03,
    audience: 'Lideranças locais e interior',
    description: 'Percorre a região conversando com lideranças locais.',
    attributes: { organization: 2, charisma: 1 },
    effects: { presence: 24, knowledge: 9, regionalMomentum: 2, spillover: true },
  },
  {
    id: 'street_event',
    name: 'Caminhada / evento de rua',
    icon: 'footprints',
    category: 'ground',
    target: 'unit',
    cost: 20_000,
    energy: 12,
    days: 1,
    risk: 0.04,
    audience: 'Comércio e moradores',
    description: 'Corpo a corpo em feiras, praças e comércio.',
    attributes: { charisma: 1, leadership: 1, organization: 1 },
    effects: { presence: 10, knowledge: 4, regionalMomentum: 3, enthusiasm: 3, militants: 3 },
  },
  {
    id: 'door_to_door',
    name: 'Porta a porta',
    icon: 'door-open',
    category: 'ground',
    target: 'unit',
    cost: 8_000,
    energy: 10,
    days: 1,
    risk: 0.01,
    audience: 'Vizinhança (depende da militância)',
    description: 'A militância bate de porta em porta. Barato e persuasivo.',
    attributes: { organization: 2, leadership: 1 },
    effects: { presence: 8, knowledge: 3, regionalMomentum: 4, militantPowered: true },
  },
  {
    id: 'regional_blitz',
    name: 'Campanha regional intensiva',
    icon: 'map',
    category: 'ground',
    target: 'unit',
    cost: 150_000,
    energy: 30,
    days: 3,
    risk: 0.05,
    audience: 'Toda a região',
    description: 'Três dias concentrando estrutura, carros de som e agenda numa região.',
    attributes: { organization: 2, campaignCapacity: 1, charisma: 1 },
    effects: { presence: 38, knowledge: 14, regionalMomentum: 8, spillover: true },
  },
  {
    id: 'group_meeting',
    name: 'Reunião com grupo social',
    icon: 'handshake',
    category: 'politics',
    target: 'popType',
    cost: 12_000,
    energy: 8,
    days: 1,
    risk: 0.03,
    audience: 'Grupo escolhido',
    description: 'Encontro com lideranças de um grupo: ganha apoio dele.',
    attributes: { negotiation: 2, credibility: 1 },
    effects: { popMomentum: 6 },
  },
  {
    id: 'social_media',
    name: 'Ofensiva nas redes',
    icon: 'share-2',
    category: 'media',
    target: 'none',
    cost: 5_000,
    energy: 6,
    days: 0,
    risk: 0.06,
    audience: 'Jovens e conectados',
    description: 'Vídeos, lives e memes. Rápido, barato e arriscado.',
    attributes: { communication: 2, charisma: 1 },
    effects: { knowledgeAll: 0.8, audienceMomentum: 0.9, channel: 'social', enthusiasm: 2 },
  },
  {
    id: 'radio_interview',
    name: 'Rádio local',
    icon: 'radio',
    category: 'media',
    target: 'unit',
    cost: 0,
    energy: 7,
    days: 0,
    risk: 0.04,
    audience: 'Interior, idosos e trabalhadores',
    description: 'Entrevista em rádio regional.',
    attributes: { oratory: 1, communication: 1 },
    effects: { knowledge: 5, regionalMomentum: 2, audienceMomentum: 0.6, channel: 'radio' },
  },
  {
    id: 'tv_program',
    name: 'Programa de TV',
    icon: 'tv',
    category: 'media',
    target: 'none',
    cost: 0,
    energy: 12,
    days: 1,
    risk: 0.06,
    audience: 'Público amplo, mais velho',
    description: 'Participação em programa de auditório ou jornalístico.',
    attributes: { communication: 2, charisma: 1, oratory: 1 },
    effects: { knowledgeAll: 1.3, audienceMomentum: 1.1, channel: 'tv' },
  },
  {
    id: 'newspaper_article',
    name: 'Artigo em jornal',
    icon: 'newspaper',
    category: 'media',
    target: 'none',
    cost: 0,
    energy: 6,
    days: 0,
    risk: 0.02,
    audience: 'Formadores de opinião',
    description: 'Artigo assinado ou entrevista a jornal.',
    attributes: { credibility: 2, experience: 1 },
    effects: { knowledgeAll: 0.5, audienceMomentum: 1.2, channel: 'newspaper' },
  },
  {
    id: 'podcast',
    name: 'Participar de podcast',
    icon: 'mic',
    category: 'media',
    target: 'none',
    cost: 0,
    energy: 8,
    days: 0,
    risk: 0.05,
    audience: 'Jovens e escolarizados',
    description: 'Conversa longa e descontraída.',
    attributes: { communication: 2, charisma: 1 },
    effects: { knowledgeAll: 0.6, audienceMomentum: 1.4, channel: 'podcast' },
  },
  {
    id: 'speech',
    name: 'Discurso temático',
    icon: 'presentation',
    category: 'politics',
    target: 'unitAndProposal',
    cost: 25_000,
    energy: 12,
    days: 1,
    risk: 0.04,
    audience: 'Quem prioriza o tema',
    description: 'Discurso apresentando uma proposta numa região.',
    attributes: { oratory: 2, charisma: 1 },
    effects: { presence: 8, knowledge: 5, regionalMomentum: 2 },
  },
  {
    id: 'proposal',
    name: 'Lançar proposta',
    icon: 'file-text',
    category: 'politics',
    target: 'proposal',
    cost: 15_000,
    energy: 5,
    days: 0,
    risk: 0.02,
    audience: 'Quem prioriza o tema',
    description: 'Registra uma proposta no plano de governo (vira promessa).',
    attributes: { communication: 1, credibility: 1 },
    effects: { knowledgeAll: 0.5 },
  },
  {
    id: 'fundraiser',
    name: 'Jantar de arrecadação',
    icon: 'utensils',
    category: 'logistics',
    target: 'none',
    cost: 25_000,
    energy: 14,
    days: 1,
    risk: 0.05,
    audience: 'Doadores',
    description: 'Evento para doadores. Arrecada, mas pode gerar suspeitas.',
    attributes: { campaignCapacity: 2, negotiation: 1, charisma: 1 },
    effects: { fundraising: 180_000 },
  },
  {
    id: 'volunteer_drive',
    name: 'Mobilizar militância',
    icon: 'users',
    category: 'logistics',
    target: 'none',
    cost: 15_000,
    energy: 10,
    days: 1,
    risk: 0.02,
    audience: 'Militância',
    description: 'Plenárias e formação de voluntários.',
    attributes: { leadership: 2, organization: 1 },
    effects: { militants: 8, enthusiasm: 6 },
  },
  {
    id: 'media_training',
    name: 'Treinamento de mídia',
    icon: 'graduation-cap',
    category: 'logistics',
    target: 'none',
    cost: 20_000,
    energy: 6,
    days: 1,
    risk: 0,
    audience: '—',
    description: 'Prepara para debates e entrevistas.',
    attributes: { experience: 1, communication: 1 },
    effects: { prep: 0.1 },
  },
  {
    id: 'rest',
    name: 'Descansar',
    icon: 'bed',
    category: 'logistics',
    target: 'none',
    cost: 0,
    energy: 0,
    days: 1,
    risk: 0,
    audience: '—',
    description: 'Um dia de folga para recuperar energia.',
    attributes: {},
    effects: { energyRestore: 40 },
  },
];

export function getCampaignAction(id: string): CampaignActionDefinition | undefined {
  return CAMPAIGN_ACTIONS.find((a) => a.id === id);
}
