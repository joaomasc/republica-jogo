/**
 * Constantes de balanceamento dos atos do Executivo. Reexportadas em `GameConstants.executive`.
 */
export const ExecutiveConstants = {
  /** Máximo de decretos ativos ao mesmo tempo. */
  maxActiveDecrees: 12,
  /** Entradas guardadas no histórico de atos. */
  logLimit: 80,
  /** Máximo de alvos devolvidos por seletor para atos sobre edifícios (os de maior valor). */
  maxBuildingTargets: 120,

  // --- Risco jurídico (chance mensal de suspensão pelo STF = legalRisk × multiplicador) ---
  /** Congelamento de preços sem calamidade nem controle de preços: risco alto. */
  freezeUncoveredRiskMult: 2.5,
  /** Congelamento ou proibição de exportação amparados por calamidade/controle de preços. */
  coveredRiskMult: 0.25,
  /** Tarifa acima da margem da política comercial vigente: extrapola a lei. */
  tariffOverMarginRiskMult: 4,
  /** Margem de tarifa (p.p.) que o Executivo pode usar por decreto, por opção de comércio. */
  tariffMargin: {
    trade_open: 0.1,
    trade_mixed: 0.2,
    trade_protectionist: 0.3,
    trade_isi: 0.35,
    trade_autarky: 0.35,
  } as Record<string, number>,
  /** Margem usada quando a opção de comércio não está na tabela. */
  tariffMarginDefault: 0.2,
  /** Efeitos de uma suspensão pelo STF. */
  stfLegitimacyHit: 1.5,
  stfApprovalHit: 1,
  /** Meses que um decreto suspenso permanece na lista antes de ser arquivado. */
  suspendedKeepMonths: 3,
  /** Teto da chance mensal de suspensão. */
  maxMonthlyRisk: 0.6,

  // --- Atos instantâneos ---
  /** Valor de um edifício como múltiplo da receita anual (R$ bi/ano → R$ bi). */
  assetValueToRevenue: 1.4,
  /** Receita mínima de um nível quando o edifício ainda não tem receita registrada (R$ bi/ano). */
  fallbackRevenuePerLevel: 0.4,
  /** Fatia mínima para o ato fazer sentido. */
  minSlice: 0.02,
  /** Desapropriação: indenização como fração do valor da fatia. */
  expropriationCompensation: 1,
  /** Desapropriação: queda da confiança (pontos) e perdas dos fundos de investimento (fração). */
  expropriationConfidenceHit: 5,
  expropriationPrivatePoolLoss: 0.1,
  expropriationForeignPoolLoss: 0.16,
  expropriationLegitimacyHit: 1,
  /** Choque de confiança que acompanha a desapropriação (duração em meses e pontos por mês). */
  expropriationShockMonths: 6,
  expropriationShockConfidence: -2,
  /** Reação dos grupos (pontos de aprovação). */
  expropriationGroups: {
    business: -10,
    industry: -8,
    commerce: -3,
    unions: 4,
    workers: 2,
    social_movements: 3,
  },
  expropriationRadicalism: { business: 8, industry: 5 },
  /** Privatização: preço de venda como fração do valor da fatia (deságio). */
  privatizationPrice: 0.9,
  privatizationConfidenceGain: 2,
  privatizationGroups: {
    business: 6,
    industry: 4,
    commerce: 2,
    unions: -8,
    civil_servants: -5,
    workers: -3,
    social_movements: -3,
  },
  privatizationRadicalism: { unions: 7, civil_servants: 5 },

  /** Estado de calamidade: golpe imediato na legitimidade ao decretar. */
  emergencyLegitimacyHit: 2,

  /** Reações pontuais dos grupos ao decreto (pontos de aprovação); sinal conforme o valor. */
  tariffGroupReaction: 3,
  ipiGroupReaction: 3,
  subsidyGroupReaction: 4,
  creditGroupReaction: 3,
  exportBanGroupReaction: 5,
  freezeGroupReaction: 4,
  selicGroupReaction: 3,
} as const;
