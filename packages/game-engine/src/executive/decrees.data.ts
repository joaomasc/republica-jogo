import type { DecreeDefinition, DecreeKind } from './types';

/**
 * Atos do Executivo federal (decretos, portarias e resoluções), em escala de jogo.
 * Custam capital político, valem na hora e podem ser suspensos pelo STF quando
 * extrapolam a lei vigente (risco jurídico).
 */
export const DECREES: Record<DecreeKind, DecreeDefinition> = {
  tariff: {
    kind: 'tariff',
    name: 'Alíquota de importação',
    description:
      'Muda o Imposto de Importação de uma categoria de bens dentro da margem da política comercial.',
    icon: 'ship',
    target: 'category',
    value: { min: -0.2, max: 0.35, step: 0.05, default: 0.1, unit: 'p.p.' },
    politicalCost: 8,
    durationMonths: null,
    legalRisk: 0.02,
  },
  ipi: {
    kind: 'ipi',
    name: 'Redução de IPI',
    description:
      'Corta (ou eleva) o imposto sobre produtos industrializados de uma categoria: estimula o consumo e custa arrecadação.',
    icon: 'badge-percent',
    target: 'category',
    value: { min: -0.15, max: 0.1, step: 0.05, default: -0.05, unit: 'p.p.' },
    politicalCost: 6,
    durationMonths: 12,
    legalRisk: 0.01,
  },
  export_ban: {
    kind: 'export_ban',
    name: 'Proibição de exportação',
    description:
      'Proíbe exportar um bem para segurar o preço interno. Produtores perdem; consumidores ganham.',
    icon: 'ban',
    target: 'good',
    politicalCost: 12,
    durationMonths: 6,
    legalRisk: 0.08,
  },
  price_freeze: {
    kind: 'price_freeze',
    name: 'Congelamento de preços',
    description:
      'Congela o preço de um bem. Segura a inflação no curto prazo, mas gera escassez e desabastecimento.',
    icon: 'thermometer',
    target: 'good',
    politicalCost: 15,
    durationMonths: 6,
    legalRisk: 0.15,
  },
  subsidy: {
    kind: 'subsidy',
    name: 'Subsídio setorial',
    description:
      'Transfere recursos do orçamento para as empresas de um setor: mais lucro, empregos e investimento ali.',
    icon: 'coins',
    target: 'sector',
    value: { min: 5, max: 120, step: 5, default: 20, unit: 'R$ bi/ano' },
    politicalCost: 10,
    durationMonths: 12,
    legalRisk: 0.03,
  },
  credit_line: {
    kind: 'credit_line',
    name: 'Linha de crédito do banco de fomento',
    description:
      'Crédito barato para investir num setor. Acelera a construção privada ali e custa ao Tesouro.',
    icon: 'landmark',
    target: 'sector',
    value: { min: 0.5, max: 4, step: 0.5, default: 1.5, unit: 'p.p. de juros' },
    politicalCost: 8,
    durationMonths: 24,
    legalRisk: 0.02,
  },
  selic: {
    kind: 'selic',
    name: 'Definir a taxa Selic',
    description:
      'Só com o Banco Central subordinado ao governo: juros baixos aquecem a economia hoje e cobram inflação amanhã.',
    icon: 'percent',
    target: 'none',
    value: { min: 2, max: 25, step: 0.25, default: 10, unit: '% a.a.' },
    politicalCost: 5,
    durationMonths: null,
    legalRisk: 0,
  },
  emergency: {
    kind: 'emergency',
    name: 'Estado de calamidade',
    description:
      'Suspende regras fiscais por 6 meses, permite congelamentos e gastos extras. Desgasta a legitimidade.',
    icon: 'siren',
    target: 'none',
    politicalCost: 20,
    durationMonths: 6,
    legalRisk: 0.1,
  },
  expropriation: {
    kind: 'expropriation',
    name: 'Desapropriação',
    description:
      'Estatiza a fatia privada de um setor num estado, pagando indenização pelo orçamento. Assusta investidores.',
    icon: 'gavel',
    target: 'building_state',
    politicalCost: 18,
    durationMonths: null,
    legalRisk: 0.12,
    instant: true,
  },
  privatization: {
    kind: 'privatization',
    name: 'Privatização',
    description:
      'Vende a fatia estatal de um setor num estado. Gera receita única e alivia o caixa; sindicatos reagem.',
    icon: 'handshake',
    target: 'building_state',
    politicalCost: 14,
    durationMonths: null,
    legalRisk: 0.06,
    instant: true,
  },
};

export const DECREE_LIST: DecreeDefinition[] = Object.values(DECREES);
