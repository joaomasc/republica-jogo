import type { CaucusDefinition, CaucusId } from './types';

/**
 * Bancadas temáticas do Congresso do jogo. Frentes suprapartidárias inspiradas no
 * funcionamento real do Legislativo brasileiro; nomes de lideranças são fictícios e as
 * posições são PARÂMETROS DO MODELO (nenhuma bancada é tratada como moralmente superior).
 */
export const CAUCUSES: Record<CaucusId, CaucusDefinition> = {
  ruralista: {
    id: 'ruralista',
    name: 'Frente Parlamentar da Agropecuária',
    shortName: 'Ruralista',
    icon: 'tractor',
    color: '#8a9a5b',
    description:
      'A maior bancada temática: defende o agronegócio, o direito de propriedade rural e licenciamento ágil.',
    ideology: { environment: 82, economy: 64, trade: 68 },
    baseSize: 0.3,
    cohesion: 0.75,
    interestGroups: ['agribusiness'],
    preferredLaws: {
      environment: 'env_flexible',
      land: 'land_latifundio',
      trade: 'trade_open',
      taxation: 'tax_low',
    },
    opposedLaws: {
      land: ['land_reform', 'land_collective'],
      environment: ['env_strict'],
      economic_system: ['econ_cooperative', 'econ_planned'],
      trade: ['trade_autarky'],
    },
    leaderName: 'Dep. Anselmo Ribas',
  },
  evangelica: {
    id: 'evangelica',
    name: 'Frente Parlamentar Evangélica',
    shortName: 'Evangélica',
    icon: 'book-open',
    color: '#6d597a',
    description:
      'Bancada de base religiosa, coesa em pautas de costumes, educação e comunicação.',
    ideology: { social: 86, security: 66 },
    baseSize: 0.17,
    cohesion: 0.72,
    interestGroups: [],
    preferredLaws: {
      education: 'edu_vouchers',
      security: 'sec_punitive',
      media: 'media_free',
    },
    opposedLaws: {
      media: ['media_state'],
      regime: ['reg_one_party'],
      economic_system: ['econ_planned'],
    },
    leaderName: 'Dep. Pastora Lídia Monteiro',
  },
  seguranca: {
    id: 'seguranca',
    name: 'Frente da Segurança Pública',
    shortName: 'Segurança',
    icon: 'shield',
    color: '#495057',
    description: 'Policiais, militares da reserva e defensores do endurecimento penal.',
    ideology: { security: 88, social: 68 },
    baseSize: 0.12,
    cohesion: 0.7,
    interestGroups: [],
    preferredLaws: { security: 'sec_punitive' },
    opposedLaws: { security: ['sec_preventive'] },
    leaderName: 'Dep. Coronel Teobaldo',
  },
  sindical: {
    id: 'sindical',
    name: 'Frente Parlamentar em Defesa do Trabalhador',
    shortName: 'Sindical',
    icon: 'hard-hat',
    color: '#d62828',
    description:
      'Deputados ligados às centrais sindicais: salário mínimo, direitos trabalhistas e previdência.',
    ideology: { economy: 24, fiscal: 30 },
    baseSize: 0.1,
    cohesion: 0.8,
    interestGroups: ['unions', 'workers'],
    preferredLaws: {
      labor: 'labor_protective',
      minimum_wage: 'mw_high',
      unions: 'unions_free',
      pensions: 'pen_expanded',
    },
    opposedLaws: {
      labor: ['labor_flexible', 'labor_deregulated'],
      minimum_wage: ['mw_none', 'mw_low'],
      unions: ['unions_banned', 'unions_restricted'],
      pensions: ['pen_reform', 'pen_capitalization'],
    },
    leaderName: 'Dep. Juvenal "Juva" Ferraz',
  },
  empresarial: {
    id: 'empresarial',
    name: 'Frente do Empreendedorismo e da Indústria',
    shortName: 'Empresarial',
    icon: 'briefcase',
    color: '#1d3557',
    description:
      'Representa confederações da indústria, do comércio e do sistema financeiro: menos impostos e mais segurança jurídica.',
    ideology: { economy: 80, fiscal: 80 },
    baseSize: 0.2,
    cohesion: 0.65,
    interestGroups: ['business', 'industry', 'commerce'],
    preferredLaws: {
      taxation: 'tax_low',
      labor: 'labor_flexible',
      economic_system: 'econ_mixed',
      banking: 'bank_regulated',
      central_bank: 'cb_independent',
    },
    opposedLaws: {
      taxation: ['tax_wealth'],
      economic_system: ['econ_cooperative', 'econ_planned'],
      banking: ['bank_nationalized'],
      labor: ['labor_councils'],
    },
    leaderName: 'Dep. Heitor Vasconcellos',
  },
  ambientalista: {
    id: 'ambientalista',
    name: 'Frente Parlamentar Ambientalista',
    shortName: 'Ambientalista',
    icon: 'leaf',
    color: '#2d6a4f',
    description: 'Defende a proteção dos biomas, a transição energética e a economia verde.',
    ideology: { environment: 15 },
    baseSize: 0.08,
    cohesion: 0.75,
    interestGroups: ['social_movements', 'youth'],
    preferredLaws: { environment: 'env_strict', science: 'sci_innovation_state' },
    opposedLaws: { environment: ['env_flexible'], land: ['land_latifundio'] },
    leaderName: 'Dep. Iara Tupinambá',
  },
};

export const CAUCUS_LIST: CaucusDefinition[] = Object.values(CAUCUSES);
