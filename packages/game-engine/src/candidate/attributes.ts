export const ATTRIBUTE_IDS = [
  'charisma',
  'oratory',
  'leadership',
  'negotiation',
  'credibility',
  'communication',
  'management',
  'experience',
  'popularity',
  'organization',
  'campaignCapacity',
] as const;
export type AttributeId = (typeof ATTRIBUTE_IDS)[number];
export type CandidateAttributes = Record<AttributeId, number>;

export interface AttributeDefinition {
  id: AttributeId;
  name: string;
  icon: string;
  description: string;
}

export const ATTRIBUTES: Record<AttributeId, AttributeDefinition> = {
  charisma: {
    id: 'charisma',
    name: 'Carisma',
    icon: 'smile',
    description: 'Apelo pessoal. Fortalece comícios, eventos e o voto de simpatia.',
  },
  oratory: {
    id: 'oratory',
    name: 'Oratória',
    icon: 'megaphone',
    description: 'Domínio da palavra. Decisivo em discursos e debates.',
  },
  leadership: {
    id: 'leadership',
    name: 'Liderança',
    icon: 'flag',
    description: 'Mobiliza militância, equipe e partido; gera capital político.',
  },
  negotiation: {
    id: 'negotiation',
    name: 'Negociação',
    icon: 'handshake',
    description: 'Alianças, Congresso e grupos de interesse.',
  },
  credibility: {
    id: 'credibility',
    name: 'Credibilidade',
    icon: 'badge-check',
    description: 'Confiança do eleitor. Reduz rejeição e dá peso às promessas.',
  },
  communication: {
    id: 'communication',
    name: 'Comunicação',
    icon: 'message-circle',
    description: 'Eficiência de propaganda, entrevistas e redes sociais.',
  },
  management: {
    id: 'management',
    name: 'Gestão',
    icon: 'clipboard-list',
    description: 'Eficiência do orçamento e da máquina de governo.',
  },
  experience: {
    id: 'experience',
    name: 'Experiência',
    icon: 'award',
    description: 'Conhecimento técnico; menos gafes e respostas melhores.',
  },
  popularity: {
    id: 'popularity',
    name: 'Popularidade',
    icon: 'star',
    description: 'Quanto as pessoas gostam de você hoje.',
  },
  organization: {
    id: 'organization',
    name: 'Organização',
    icon: 'calendar-check',
    description: 'Energia, logística e presença regional duradoura.',
  },
  campaignCapacity: {
    id: 'campaignCapacity',
    name: 'Capacidade de campanha',
    icon: 'rocket',
    description: 'Arrecadação e eficiência geral das ações de campanha.',
  },
};

export const ATTRIBUTE_POINT_BUY = {
  base: 35,
  freePoints: 110,
  min: 10,
  max: 85,
} as const;

export function baseAttributes(value: number = ATTRIBUTE_POINT_BUY.base): CandidateAttributes {
  const out = {} as CandidateAttributes;
  for (const id of ATTRIBUTE_IDS) out[id] = value;
  return out;
}

/** Fator multiplicador [min, min+range] a partir de uma média ponderada de atributos. */
export function attributeFactor(
  attrs: CandidateAttributes,
  weights: Partial<Record<AttributeId, number>>,
  min: number,
  range: number,
): number {
  let total = 0;
  let wsum = 0;
  for (const [id, w] of Object.entries(weights) as [AttributeId, number][]) {
    total += attrs[id] * w;
    wsum += w;
  }
  const avg = wsum === 0 ? 50 : total / wsum;
  return min + (range * avg) / 100;
}
