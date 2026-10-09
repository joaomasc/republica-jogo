import type { BudgetCategory } from '../types';
import type { BuildingId, GoodId, OwnerKind, SectorId } from './types';

/**
 * Constantes de balanceamento da economia industrial. Ficam aqui (e não espalhadas pelo código)
 * e são reexportadas em `GameConstants.industry`. Todos os valores são PARÂMETROS DO MODELO.
 */
export const IndustryConstants = {
  /** Referência de escala: pessoas empregadas por nível de edifício no método padrão. */
  jobsPerLevel: 5000,
  /** Limites do preço relativo (1 = base). */
  priceMin: 0.25,
  priceMax: 1.75,
  /** Quanto do desequilíbrio oferta/demanda vira preço (estilo Victoria 3). */
  priceImbalanceFactor: 0.75,
  /** Velocidade de ajuste do preço por mês (0..1). */
  priceAdjustRate: 0.35,
  /** Meses guardados no histórico de cada bem e da indústria. */
  historyMonths: 36,
  /** Fração do lucro privado reinvestida na ausência de leis. */
  baseReinvestment: 0.35,
  /** Alíquotas de referência (antes das leis), aplicadas às bases e calibradas por `taxScale`. */
  baseIncomeTax: 0.1,
  baseCorporateTax: 0.25,
  baseConsumptionTax: 0.18,
  baseDividendTax: 0,
  baseTariff: 0.12,
  /** Salário mínimo de referência como fração do salário-base dos trabalhadores. */
  baseMinimumWage: 0.6,
  /** Divisões protegidas contra zero. */
  epsilon: 1e-9,

  // -------------------------------------------------------------------------
  // Geração inicial (bootstrapEconomy)
  // -------------------------------------------------------------------------
  bootstrap: {
    /** Fração do Pop principal que ocupa os edifícios do seu setor. */
    mainTypeShare: {
      farmers: 0.93,
      industrial_workers: 0.8,
      tech_workers: 0.62,
      health_workers: 0.9,
      civil_servants: 0.93,
      merchants: 0.72,
    } as Record<string, number>,
    /** Uso máximo do potencial de recursos na geração (o resto fica para expansão). */
    resourceUseCap: 0.72,
    /** Bens exportáveis: escala máxima dos produtores no dimensionamento inicial. */
    exportableMaxScale: 3,
    /** Extração: ganho máximo de produtividade (renda do recurso) quando o potencial limita os níveis. */
    resourceRentMax: 2.5,
    /** Parcela mínima de informais entre os trabalhadores (`workers`). */
    minInformalShare: 0.18,
    /** Mix nacional de geração elétrica (antes dos limites de recurso). */
    powerMix: { power_hydro: 0.6, power_renewable: 0.18, power_thermal: 0.22 } as Partial<
      Record<BuildingId, number>
    >,
    /** Iterações do dimensionamento dos não comercializáveis e da calibração do mercado. */
    sizingIterations: 6,
    calibrationIterations: 8,
    /** Lotação inicial: base e sensibilidade ao desemprego inicial (situação econômica). */
    staffingBase: 0.95,
    staffingUnemploymentSlope: 0.012,
    staffingMin: 0.82,
    staffingMax: 0.99,
    /** Margem mínima no início (abaixo disso a produtividade do edifício é calibrada). */
    minStartMargin: 0.04,
    /** Margem máxima tomada como referência (acima disso, a referência é limitada). */
    maxRefMargin: 0.4,
    /** Saldo comercial inicial desejado (fração do produto real). */
    tradeBalanceTarget: 0.012,
    /** Compras de bens do governo (fora dos edifícios públicos), fração do produto real. */
    governmentPurchases: 0.05,
    /** Investimento inicial (obras), fração do produto real; dimensiona a construção civil. */
    investmentShare: 0.055,
    /** Utilização inicial da construção civil. */
    constructionUtilization: 0.85,
    /** Meses de obras na fila inicial (projetos em andamento). */
    initialQueueMonths: 5,
    /** Ruído da produtividade de cada edifício na geração (desvio-padrão). */
    productivityNoise: 0.03,
    /** Nível mínimo fracionário para gerar 1 nível. */
    minFractionalLevel: 0.35,
  },

  /**
   * Absorção doméstica inicial por bem (demanda interna ÷ produção). < 1: o país exporta o excedente;
   * > 1: importa a diferença. É o retrato "commodities para fora, alta tecnologia para dentro".
   */
  absorption: {
    grain: 0.95,
    soy: 0.45,
    meat: 0.78,
    cash_crops: 0.6,
    wood: 0.75,
    iron_ore: 0.3,
    oil: 0.8,
    fuel: 1.12,
    electricity: 1,
    steel: 0.88,
    chemicals: 1.45,
    construction_materials: 1,
    textiles: 1.12,
    processed_food: 0.92,
    consumer_goods: 1.06,
    electronics: 1.7,
    machinery: 1.3,
    vehicles: 1.02,
    pharmaceuticals: 1.3,
    aircraft: 0.35,
    transport: 1,
    services: 1,
    finance: 1,
    software: 1.06,
  } as Record<GoodId, number>,

  /** Mercado de trabalho (modelo aditivo sobre a composição inicial). */
  jobs: {
    /** Fração dos postos formais perdidos (ou ganhos) que vira informalidade em vez de desemprego. */
    informalAbsorption: 0.45,
    /** Força de trabalho máxima ocupável (o resto é desemprego friccional). */
    maxEmployment: 0.985,
    /** Efeito do salário mínimo nos salários baixos: (piso − 0,6) × fator. */
    minimumWageEffect: 0.35,
    /** Transferências da lei padrão (programa focalizado), referência da renda inicial. */
  },

  /** Propriedade inicial típica por edifício (o resto é privado). */
  initialOwnership: {
    farm_grain: { cooperative: 0.06, foreign: 0.02 },
    farm_soy: { cooperative: 0.08, foreign: 0.08 },
    ranch: { cooperative: 0.03, foreign: 0.05 },
    plantation: { cooperative: 0.05, foreign: 0.08 },
    forestry: { foreign: 0.15 },
    mine: { state: 0.05, foreign: 0.2 },
    oil_field: { state: 0.5, foreign: 0.2 },
    power_hydro: { state: 0.45, foreign: 0.15 },
    power_thermal: { state: 0.2, foreign: 0.2 },
    power_renewable: { foreign: 0.3 },
    refinery: { state: 0.8, foreign: 0.05 },
    steel_mill: { foreign: 0.3 },
    chemical_plant: { state: 0.1, foreign: 0.35 },
    cement_plant: { foreign: 0.25 },
    food_industry: { cooperative: 0.06, foreign: 0.2 },
    textile_mill: { foreign: 0.08 },
    consumer_factory: { foreign: 0.25 },
    machinery_factory: { foreign: 0.3 },
    auto_plant: { foreign: 0.75 },
    electronics_factory: { foreign: 0.55 },
    pharma_plant: { state: 0.05, foreign: 0.45 },
    aerospace: { foreign: 0.15 },
    construction_sector: { foreign: 0.03 },
    logistics: { state: 0.08, foreign: 0.1 },
    commerce: { cooperative: 0.02, foreign: 0.08 },
    bank: { state: 0.3, cooperative: 0.04, foreign: 0.1 },
    tech_hub: { foreign: 0.25 },
  } as Partial<Record<BuildingId, Partial<Record<OwnerKind, number>>>>,

  // -------------------------------------------------------------------------
  // Mundo e câmbio
  // -------------------------------------------------------------------------
  world: {
    /** Reversão à média (log) do preço mundial por mês. */
    meanReversion: 0.05,
    worldPriceMin: 0.2,
    worldPriceMax: 5,
  },
  exchange: {
    /** Velocidade com que o câmbio segue o alvo (por mês). */
    adjustRate: 0.06,
    /** Sensibilidade do alvo ao saldo comercial (fração do produto) — superávit valoriza. */
    tradeBalance: 4,
    /** Remessas de lucros (fração do produto) — desvalorizam. */
    remittances: 4,
    /** Juro real acima do inicial (p.p.) atrai capital e valoriza. */
    realRate: 0.02,
    /** Confiança abaixo da inicial (pontos/50) desvaloriza. */
    confidence: 0.1,
    min: 0.4,
    max: 3,
  },

  // -------------------------------------------------------------------------
  // Mercado
  // -------------------------------------------------------------------------
  market: {
    /** Capacidade de comércio de cada bem: fração de max(demanda, oferta) × abertura. */
    tradeCapacity: 1,
    /** Controle de preços (planificação): faixa permitida em torno do preço-base. */
    priceControlBand: 0.06,
    /** Escassez máxima que um insumo pode impor à produção. */
    minInputAvailability: 0.25,
  },

  /** Cestas de consumo das famílias por faixa de renda (participação no gasto; normalizadas). */
  baskets: {
    /** Renda (R$/mês por pessoa) de referência de cada cesta (interpolação em log). */
    anchors: [1500, 6000, 18000] as [number, number, number],
    poor: {
      processed_food: 0.25,
      grain: 0.05,
      meat: 0.07,
      cash_crops: 0.02,
      textiles: 0.06,
      consumer_goods: 0.07,
      electronics: 0.02,
      vehicles: 0.01,
      pharmaceuticals: 0.04,
      fuel: 0.03,
      electricity: 0.05,
      transport: 0.09,
      services: 0.2,
      finance: 0.02,
      software: 0.005,
      construction_materials: 0.005,
    } as Partial<Record<GoodId, number>>,
    middle: {
      processed_food: 0.15,
      grain: 0.02,
      meat: 0.05,
      cash_crops: 0.015,
      textiles: 0.05,
      consumer_goods: 0.09,
      electronics: 0.05,
      vehicles: 0.07,
      pharmaceuticals: 0.035,
      fuel: 0.045,
      electricity: 0.035,
      transport: 0.05,
      services: 0.27,
      finance: 0.05,
      software: 0.02,
      construction_materials: 0.01,
    } as Partial<Record<GoodId, number>>,
    rich: {
      processed_food: 0.07,
      grain: 0.005,
      meat: 0.03,
      cash_crops: 0.015,
      textiles: 0.04,
      consumer_goods: 0.07,
      electronics: 0.05,
      vehicles: 0.1,
      pharmaceuticals: 0.025,
      fuel: 0.04,
      electricity: 0.02,
      transport: 0.04,
      services: 0.33,
      finance: 0.11,
      software: 0.035,
      construction_materials: 0.02,
    } as Partial<Record<GoodId, number>>,
    /** Poupança por faixa (fração da renda disponível). */
    savings: [0.02, 0.1, 0.25] as [number, number, number],
  },

  /** Compras do governo: peso de cada categoria e cesta de bens (participações). */
  government: {
    weights: {
      infrastructure: 0.45,
      security: 0.22,
      health: 0.1,
      education: 0.1,
      administration: 0.08,
      science: 0.05,
    } as Partial<Record<BudgetCategory, number>>,
    baskets: {
      infrastructure: {
        construction_materials: 0.35,
        steel: 0.25,
        machinery: 0.2,
        transport: 0.1,
        fuel: 0.1,
      },
      security: { vehicles: 0.35, fuel: 0.25, services: 0.2, aircraft: 0.1, electronics: 0.1 },
      health: { pharmaceuticals: 0.55, services: 0.25, electronics: 0.1, consumer_goods: 0.1 },
      education: { consumer_goods: 0.3, electronics: 0.2, services: 0.3, software: 0.2 },
      administration: { software: 0.35, services: 0.55, electronics: 0.1 },
      science: { software: 0.4, electronics: 0.3, services: 0.2, machinery: 0.1 },
    } as Partial<Record<BudgetCategory, Partial<Record<GoodId, number>>>>,
    /**
     * Peso de cada esfera no gasto de cada categoria (federal, estadual, municipal): define quanto
     * o orçamento do jogador mexe nos serviços do estado.
     */
    sphereWeights: {
      health: [0.45, 0.3, 0.25],
      education: [0.25, 0.4, 0.35],
      security: [0.15, 0.75, 0.1],
      infrastructure: [0.4, 0.35, 0.25],
      pensions: [0.75, 0.2, 0.05],
      administration: [0.45, 0.35, 0.2],
      social: [0.8, 0.12, 0.08],
      industry: [0.7, 0.25, 0.05],
      science: [0.85, 0.15, 0],
    } as Record<BudgetCategory, [number, number, number]>,
    /** Execução orçamentária (gasto/referência) admitida no motor. */
    executionMin: 0,
    executionMax: 3,
    /** Parcelas da receita nacional por esfera (mesma regra de `initBudget`). */
    federalRevenueShare: 0.62,
    stateRevenueShare: 0.27,
    stateRevenueBonus: 1.1,
    municipalRevenueShare: 0.11,
    municipalRevenueBonus: 1.6,
    taxShareOfRevenue: 0.9,
  },

  // -------------------------------------------------------------------------
  // Produção, finanças e ajustes dos edifícios
  // -------------------------------------------------------------------------
  production: {
    /** Bônus de produtividade por nível tecnológico. */
    techBonusPerLevel: 0.015,
    /** Deriva anual de produtividade (difusão tecnológica, aprendizado). */
    tfpDrift: 0.009,
    productivityMin: 0.3,
    productivityMax: 3,
    /** Suavização da margem (por mês). */
    marginSmoothing: 0.3,
    /** Lotação: sensibilidade à margem (relativa à margem de referência). */
    staffingMarginSlope: 4,
    hireRate: 0.03,
    fireRate: 0.05,
    staffingMin: 0.05,
    /** Salário por edifício: sensibilidade à margem e faixa. */
    wageMarginSlope: 0.6,
    wageFactorMin: 0.85,
    wageFactorMax: 1.2,
    wageFactorRate: 0.04,
    /** Prejuízo grave (margem suavizada) e meses até perder um nível. */
    severeLossMargin: -0.05,
    lossMonthsToClose: 12,
    /** Troca de método (empresas privadas): chance mensal e ganho mínimo de lucro por nível. */
    methodSwitchChance: 0.025,
    methodSwitchGain: 0.1,
    /** Novo nível começa vazio: a lotação é diluída. */
    /** Fração do lucro das estatais retida para reinvestimento (o resto vai ao Tesouro). */
    stateRetention: 0.5,
    /** Fração do lucro estrangeiro reinvestida no país (antes de leis). */
    foreignReinvestment: 0.35,
    /** Parcela nacional dos dividendos (o resto fica no estado do edifício). */
    nationalDividendShare: 0.3,
    /** Suavização dos dividendos (por mês). */
    dividendSmoothing: 0.3,
    /** Subsídio: fração do prejuízo coberta pelo Tesouro nas estatais majoritárias. */
    stateMajority: 0.5,
    /** Margem sobre o custo do ponto de construção. */
    constructionMarkup: 0.14,
    /** Margem mínima para manter o quadro (abaixo dela a empresa demite). */
    staffingMarginFloor: 0.03,
  },

  /** Movimento da propriedade (por mês). */
  ownership: {
    /** Velocidade para atingir pisos estatais (stateShareFloor / resourceStateShare). */
    floorRate: 0.05,
    /** Reforma agrária: fração privada do agro convertida em cooperativa por mês × intensidade. */
    landReformRate: 0.02,
    /** Edifícios de extração afetados por `resourceStateShare`. */
    resourceBuildings: ['mine', 'oil_field'] as BuildingId[],
  },

  // -------------------------------------------------------------------------
  // Trabalho e Pops
  // -------------------------------------------------------------------------
  labor: {
    /** Migração mensal dos Pops para a composição-alvo (governo e campanha/outras fases). */
    migrationRate: 0.1,
    migrationRateSlow: 0.02,
    /** Pessoas por emprego novo: limites do fator nacional. */
    kappaMin: 0.6,
    kappaMax: 1.6,
    /** Desemprego mínimo (fração do desemprego "bruto" inicial do estado). */
    minUnemploymentShare: 0.25,
    /** Absorção informal: limites. */
    informalMin: 0.05,
    informalMax: 0.95,
    /** Efeito legado das leis (p.p. de desemprego) sobre a absorção informal. */
    legacyUnemploymentToInformal: 0.02,
    /** Salário por estado: aperto do mercado e repasse da produtividade. */
    wageTightness: 0.15,
    wageProductivityPassThrough: 0.8,
    wageIndexRate: 0.02,
    wageIndexMin: 0.6,
    wageIndexMax: 2.5,
    /** Suavização da renda dos Pops (por mês). */
    incomeSmoothing: 0.5,
    incomeFloor: 50,
    /** Padrão de vida: sensibilidade ao poder de compra (log) e penalidade de escassez. */
    solIncomeFactor: 40,
    solShortagePenalty: 60,
    /** Ruído regional do desemprego (fração do desvio do modelo antigo). */
    regionalNoiseScale: 0.25,
  },

  // -------------------------------------------------------------------------
  // Investimento e construção
  // -------------------------------------------------------------------------
  investment: {
    /** Retorno: custo de capital = (juros + ajuste − subsídio de crédito) × fator. */
    hurdleFactor: 0.6,
    creditSubsidyPoints: 1.5,
    /** Bônus de retorno por substituir importações e por escassez. */
    importBonus: 0.08,
    shortageBonus: 0.15,
    /** Mão de obra ociosa: fator = clamp((ociosa/ociosa inicial − mín)/(1 − mín), 0, máx). */
    idleMin: 0.5,
    idleMax: 1.3,
    /** Peso das especialidades estaduais na escolha. */
    specialtyWeight: 0.1,
    /** Projetos novos por mês (escala de população 1) por tipo de investidor. */
    maxNewPrivate: 14,
    maxNewForeign: 6,
    maxNewState: 6,
    /** Candidatos considerados no sorteio ponderado. */
    topCandidates: 12,
    /** Fila: no máximo estes meses de capacidade em pontos ainda por executar. */
    queueMonths: 6,
    /** Cada obra consome no máximo esta fração do custo por mês (mínimo de meses por nível). */
    maxProjectShare: 0.25,
    /** Juros e confiança sobre o reinvestimento privado. */
    interestSensitivity: 0.03,
    confidenceSensitivity: 0.006,
    reinvestmentMax: 0.9,
    /** Investimento direto estrangeiro exógeno (fração do produto por ano). */
    fdiShare: 0.006,
    /** Vazamento mensal dos fundos para dividendos/remessas (evita acúmulo ocioso). */
    poolLeak: 0.01,
    /** Efeito legado `economy.investment` (p.p. do PIB sobre 17). */
    legacyInvestmentBase: 17,
    /** Pesos setoriais do governo federal NPC conforme a ideologia (eixo econômico). */
    npcLeftThreshold: 40,
    npcRightThreshold: 65,
    npcLeftWeights: {
      heavy_industry: 1,
      energy: 1,
      extraction: 0.6,
      high_tech: 0.6,
      manufacturing: 0.4,
      services: 0.2,
    } as Partial<Record<SectorId, number>>,
    npcCenterWeights: { energy: 1, heavy_industry: 0.5, extraction: 0.5, services: 0.3 } as Partial<
      Record<SectorId, number>
    >,
  },

  construction: {
    /** Insumos de 1 ponto (média dos métodos ponderada pela capacidade) são calculados no motor. */
    /** Ordem: obras estatais primeiro. */
    statePriority: true,
    /** Níveis por ordem do jogador. */
    minOrderLevels: 1,
    maxOrderLevels: 10,
  },

  // -------------------------------------------------------------------------
  // Tecnologia
  // -------------------------------------------------------------------------
  tech: {
    /** Progresso mensal base (fração de um nível) com orçamento de ciência de referência. */
    baseProgress: 0.028,
    /** Pesos: ciência (execução), educação (execução) e alta tecnologia (VA relativo ao inicial). */
    scienceWeight: 0.55,
    educationWeight: 0.2,
    highTechWeight: 0.25,
    /** Cada nível custa mais: progresso ÷ (1 + crescimento × nível). */
    levelCostGrowth: 0.35,
    maxLevel: 6,
  },

  // -------------------------------------------------------------------------
  // Ponte macro
  // -------------------------------------------------------------------------
  macro: {
    /** Suavização do crescimento anualizado do produto real. */
    growthSmoothing: 0.12,
    growthNoiseScale: 0.3,
    /** Repasse da variação de 12 meses do IPC do mercado para a inflação. */
    costPassThrough: 0.6,
    costPressureMax: 25,
    /** Banco Central com mandato duplo: peso do desemprego na regra de Taylor. */
    dualMandateWeight: 0.5,
    /** Velocidade de convergência à Selic do Executivo (BC do governo). */
    executiveSelicRate: 0.5,
    /** Fator de demanda: confiança, juro real, choques e velocidade. */
    demandConfidence: 0.06,
    demandRealRate: 0.012,
    demandShock: 0.004,
    demandAdjustRate: 0.1,
    demandMin: 0.7,
    demandMax: 1.3,
    /** Juro real neutro (p.p.). */
    realNeutral: 5,
    /** Choques de crescimento dos eventos viram choques de produtividade (por mês). */
    shockProductivity: 1 / 1200,
    shockLevelMin: -0.2,
    shockLevelMax: 0.2,
    /** Choques de desemprego: acúmulo mensal e decaimento do efeito. */
    unemploymentShockDecay: 0.05,
    /** Efeito legado `economy.growth` das leis vira deriva de produtividade (por ano, ÷100). */
    legacyGrowthToTfp: 0.01,
    /** Clima de investimento: confiança ganha com a margem privada média acima da inicial. */
    climateFactor: 40,
    climateMax: 5,
    /** Inflação inicial de referência para o nível de preços. */
    priceLevelStart: 1,
  },
} as const;

export type IndustryConstantsType = typeof IndustryConstants;
