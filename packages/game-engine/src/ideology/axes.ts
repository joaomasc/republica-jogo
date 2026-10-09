/**
 * Eixos ideológicos. Cada eixo vai de 0 (polo esquerdo do rótulo) a 100 (polo direito).
 * Nenhum polo é "melhor": são apenas coordenadas usadas pelas fórmulas de afinidade.
 */
export const IDEOLOGY_AXES = [
  'economy',
  'social',
  'fiscal',
  'security',
  'federalism',
  'environment',
  'trade',
  'institutions',
  'foreign',
] as const;

export type IdeologyAxis = (typeof IDEOLOGY_AXES)[number];
export type IdeologyVector = Record<IdeologyAxis, number>;

export interface AxisDefinition {
  id: IdeologyAxis;
  name: string;
  low: string;
  high: string;
  description: string;
}

export const AXIS_DEFINITIONS: Record<IdeologyAxis, AxisDefinition> = {
  economy: {
    id: 'economy',
    name: 'Economia',
    low: 'Estado',
    high: 'Mercado',
    description: 'Papel do Estado versus do mercado na atividade econômica.',
  },
  social: {
    id: 'social',
    name: 'Costumes',
    low: 'Progressista',
    high: 'Conservador',
    description: 'Posição sobre mudanças de costumes e valores tradicionais.',
  },
  fiscal: {
    id: 'fiscal',
    name: 'Fiscal',
    low: 'Mais impostos',
    high: 'Menos impostos',
    description: 'Carga tributária desejada.',
  },
  security: {
    id: 'security',
    name: 'Segurança',
    low: 'Preventiva',
    high: 'Punitiva',
    description: 'Ênfase em prevenção social versus repressão e punição.',
  },
  federalism: {
    id: 'federalism',
    name: 'Federalismo',
    low: 'União',
    high: 'Estados/Municípios',
    description: 'Concentração de poder na União ou nos entes subnacionais.',
  },
  environment: {
    id: 'environment',
    name: 'Meio ambiente',
    low: 'Regulação',
    high: 'Produção',
    description: 'Prioridade entre proteção ambiental e expansão produtiva.',
  },
  trade: {
    id: 'trade',
    name: 'Comércio',
    low: 'Protecionismo',
    high: 'Livre comércio',
    description: 'Abertura comercial externa.',
  },
  institutions: {
    id: 'institutions',
    name: 'Instituições',
    low: 'Centralização',
    high: 'Descentralização',
    description: 'Concentração de decisões em poucos órgãos ou distribuição de poder.',
  },
  foreign: {
    id: 'foreign',
    name: 'Relações exteriores',
    low: 'Integração',
    high: 'Soberania',
    description: 'Integração a blocos e organismos internacionais versus autonomia.',
  },
};

export function neutralIdeology(): IdeologyVector {
  return {
    economy: 50,
    social: 50,
    fiscal: 50,
    security: 50,
    federalism: 50,
    environment: 50,
    trade: 50,
    institutions: 50,
    foreign: 50,
  };
}
