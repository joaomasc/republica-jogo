import { IndustryConstants } from '../economy/industry/constants';
import { ExecutiveConstants } from '../executive/constants';
import { LegislatureConstants } from '../legislature/constants';
import { NationConstants } from '../nation/constants';

/**
 * GameConstants — todos os números de balanceamento do motor.
 *
 * Regra do projeto: nenhum "número mágico" de gameplay fora deste arquivo
 * (ou de arquivos de dados em `data/`). Ajuste aqui para rebalancear o jogo.
 */
export const GameConstants = {
  save: {
    version: 2,
    format: 'republica-save',
  },

  population: {
    /** Fração da população que é eleitora. */
    voterRatio: 0.76,
    /** Desvio-padrão do ruído ideológico de cada Pop em relação ao arquétipo. */
    popIdeologyNoiseSd: 5,
    /** Desvio-padrão do deslocamento ideológico aleatório de cada estado (muda a cada partida). */
    stateIdeologyNoiseSd: 4,
    /** Intensidade com que fatores econômicos do estado deslocam a ideologia local. */
    stateShift: {
      publicToEconomy: -18,
      incomeToEconomy: 8,
      incomeToFiscal: 10,
      agroToEnvironment: 28,
      agroToTrade: 8,
      industryToTrade: -14,
      ruralToSocial: 14,
      ruralToSecurity: 6,
    },
    /** Quanto um fator regional altera a participação de cada tipo de Pop. */
    shareFloor: 0.05,
    priorityNoise: 5,
    stateIssueBonus: 10,
    defaultPriority: 15,
    /** Total de eleitores com identificação partidária (o resto é independente). */
    partyIdentificationTotal: 0.42,
    partyAffinityExponent: 3,
    priorityPopBonus: 1.5,
    baseSatisfaction: 50,
    satisfactionUnemploymentFactor: 2.2,
    satisfactionReferenceUnemployment: 8,
    /** Velocidade com que a satisfação converge ao alvo (por mês). */
    satisfactionRate: 0.35,
    moodDecayPerDay: 0.04,
    /** Pontos de satisfação por ponto de padrão de vida acima/abaixo de 50. */
    solSatisfactionFactor: 0.35,
  },

  voter: {
    weights: {
      ideology: 1.7,
      party: 2.2,
      appeal: 0.9,
      issues: 0.7,
      momentum: 0.8,
      presence: 0.55,
      economy: 0.6,
      rejection: 1.2,
      incumbency: 0.12,
      /** Pauta da semana × ênfase do candidato no tema (campanha dinâmica). */
      trend: 0.3,
      /** Bandeiras (leis defendidas) × quanto cada Pop ganha ou perde com elas (cresce com o conhecimento). */
      platform: 0.55,
    },
    /** Temperatura do softmax: menor = eleitores mais "decididos". */
    temperature: 0.24,
    knowledgeExponent: 1.5,
    minKnowledge: 0.01,
    baseUndecided: 0.3,
    undecidedEndFactor: 0.3,
    undecidedKnowledgeFactor: 0.22,
    undecidedEngagementFactor: 0.14,
    minUndecided: 0.02,
    maxUndecided: 0.65,
    blankNullBase: 0.045,
    blankNullRejectionFactor: 0.06,
    baseRejection: 0.05,
    rejectionCredibilityFactor: 0.16,
    rejectionPolarizationFactor: 0.75,
    rejectionDistanceThreshold: 0.2,
    rejectionScandalFactor: 0.0035,
    rejectionMax: 0.85,
    /** Peso da distância ideológica de acordo com a saliência dos temas. */
    issueAxisSalience: 0.012,
    appealWeights: {
      charisma: 0.28,
      credibility: 0.22,
      communication: 0.2,
      popularity: 0.18,
      oratory: 0.12,
    },
    loyaltyPartyFactor: 1.6,
    loyaltyEnthusiasmFactor: 0.4,
    pollNoiseSd: 0.03,
  },

  election: {
    runoffThreshold: 0.5,
    nationalSwingSd: 0.045,
    regionalSwingSd: 0.055,
    popSwingSd: 0.07,
    turnoutNoiseSd: 0.025,
    undecidedAbstainShare: 0.3,
    undecidedConcentration: 1.15,
    enthusiasmTurnoutBonus: 0.04,
    runoffDays: 21,
    debateDaysBefore: [30, 16, 4],
    runoffDebateDaysBefore: [8],
    debateMaxParticipants: 4,
    proportional: {
      notableCandidates: 8,
      notableFromPlayerParty: 2,
      /** Fatia do voto decidido que vai para os "demais candidatos" (não individualizados). */
      othersShare: 0.84,
      othersShareNoiseSd: 0.04,
      syntheticCandidatesPerSeat: 2,
      syntheticExtra: 6,
      syntheticPareto: 0.85,
      /** Peso da identificação partidária (vs. força da chapa) na divisão dos votos "dos demais". */
      affinityWeight: 0.25,
      /** Expoente (<1 fragmenta mais as bancadas). */
      listExponent: 0.8,
    },
    /** Fração do eleitorado considerada em disputas municipais (capital). */
    municipalOpponents: 4,
  },

  campaign: {
    defaultDays: 60,
    energyMax: 100,
    energyRegenPerDay: 26,
    energyRegenOrganizationBonus: 10,
    youngAgeEnergyBonus: 6,
    youngAgeLimit: 40,
    presenceDecayPerDay: 0.035,
    presenceDecayRegionalStaffFactor: 0.6,
    popMomentumDecayPerDay: 0.03,
    regionalMomentumDecayPerDay: 0.035,
    knowledgeDecayPerDay: 0.0015,
    minMoneyScale: 0.35,
    moneyScaleExponent: 0.75,
    baseStartingMoney: 1_200_000,
    partyFundDaily: 5_000,
    smallDonorDaily: 3_500,
    militantDonation: 0.6,
    spilloverFactor: 0.25,
    attributeEffectMin: 0.6,
    attributeEffectRange: 0.8,
    variationMin: 0.8,
    variationMax: 1.2,
    enthusiasmDecayPerDay: 0.4,
    baseEnthusiasm: 45,
    militantsPerPartyMilitancy: 220,
    militantsScaleExponent: 0.8,
    freeAirtimeDaysBefore: 35,
    freeAirtimeKnowledgeGain: 0.9,
    freeAirtimeProportionalFactor: 0.15,
    promiseInflationThreshold: 5,
    promiseInflationCredibility: -2,
    proposalIdeologyShift: 5,
    proposalIssueFocus: 22,
    maxIssueFocus: 100,
    gaffeRejection: 2.5,
    gaffeCredibility: -2,
    ledgerLimit: 400,
    pollCost: 80_000,
    analystPollDiscount: 0.5,
    analystSampleBonus: 1.6,
    knowledgeHomeStateBonus: 18,
    repeatFatigue: 0.5,
    momentumSoftCap: 60,
  },

  ads: {
    /** Custo diário por canal para alcançar 100% do eleitorado (antes da escala de dinheiro). */
    targetingCostMultiplier: 1.25,
    targetingEfficiency: 1.8,
    knowledgeGain: 2.5,
    momentumGain: 2.5,
    regionalShare: 0.6,
    attackOpponentFactor: 1.3,
    attackRejectionPerDay: 0.12,
    contrastOpponentFactor: 0.6,
    contrastRejectionPerDay: 0.04,
    maxDays: 30,
    minDays: 1,
    costShareExponent: 0.85,
  },

  polls: {
    publicIntervalDays: 7,
    publicSampleSize: 2000,
    internalSampleSize: 1200,
    designEffect: 1.2,
    houseEffectSd: 0.012,
    historyLimit: 80,
  },

  opponents: {
    dailySpendShare: 0.022,
    knowledgeGrowth: 0.55,
    presenceGain: 6,
    momentumGain: 0.35,
    attackChance: 0.08,
    attackMomentum: -1.2,
    startingKnowledgeIncumbent: 82,
    startingKnowledgeMin: 20,
    startingKnowledgeMax: 65,
    favoriteStrength: 1.12,
    minorStrength: 0.88,
    favoriteFameMin: 55,
    favoriteFameMax: 78,
    minorFameMin: 12,
    minorFameMax: 38,
    notableFameMin: 40,
    notableFameMax: 75,
  },

  events: {
    dailyChanceCampaign: 0.2,
    monthlyChanceGovernment: 0.85,
    monthlyChanceLegislature: 0.6,
    maxPending: 1,
    defaultCooldownDays: 45,
    expireDays: 7,
  },

  news: {
    limit: 160,
    actionNewsChance: 0.45,
    pollShiftThreshold: 0.03,
  },

  alerts: {
    limit: 60,
    popularityDrop: 0.02,
    regionalDrop: 0.04,
    partyUnityWarning: 40,
    lowMoneyDays: 7,
    approvalDrop: 3,
  },

  debate: {
    rounds: 4,
    noiseSd: 0.14,
    prepBonus: 0.12,
    coachBonus: 0.08,
    knowledgeGainBase: 6,
    momentumScale: 4,
    rejectionScale: 1.2,
    declinePenaltyRejection: 1.5,
    declineMomentum: -2,
  },

  interview: {
    questions: 3,
    knowledgeGain: 3,
    momentumScale: 2.5,
  },

  economy: {
    potentialGrowth: 2.0,
    inflationTarget: 4.0,
    growthAdjustRate: 0.25,
    inflationAdjustRate: 0.2,
    growthNoiseSd: 0.18,
    inflationNoiseSd: 0.12,
    okunFactor: 0.045,
    confidenceGrowthFactor: 1.2,
    fiscalStimulusFactor: 0.12,
    interestDragFactor: 0.09,
    neutralInterest: 9,
    overheatInflationFactor: 0.4,
    deficitInflationFactor: 0.22,
    taylorBase: 4,
    taylorFactor: 1.3,
    interestAdjustRate: 0.25,
    minUnemployment: 3,
    maxUnemployment: 25,
    debtGrowthDrag: 0.01,
    confidenceAdjustRate: 0.2,
    historyLimit: 120,
    regionalSensitivity: 1.0,
    regionalNoiseSd: 0.08,
    baseTaxRate: 0.32,
  },

  budget: {
    qualityFloor: 0.5,
    qualityCeiling: 1.6,
    satisfactionPerQuality: 22,
    maxAdjustment: 0.5,
    deficitWarning: -0.03,
  },

  government: {
    honeymoonMonths: 6,
    honeymoonBonus: 8,
    approvalAdjustRate: 0.3,
    politicalCapitalStart: 60,
    politicalCapitalBaseRegen: 3,
    politicalCapitalApprovalFactor: 0.05,
    politicalCapitalLeadershipFactor: 0.04,
    politicalCapitalMax: 100,
    unemploymentApprovalFactor: 2.0,
    inflationApprovalFactor: 1.2,
    incomeApprovalFactor: 0.8,
    policyAlignmentFactor: 18,
    lawSatisfactionScale: 1,
    promiseCredibilityFulfilled: 4,
    promiseCredibilityBroken: -6,
    termLimit: 2,
    ministrySlots: { federal: 10, estadual: 7, municipal: 5 },
    managementEfficiency: 0.25,
  },

  laws: {
    committeeMonths: 2,
    simpleMajority: 0.5,
    qualifiedMajority: 0.6,
    ideologyFactor: 7,
    coalitionBonus: 1.1,
    oppositionPenalty: 0.6,
    relationFactor: 0.02,
    approvalPressureFactor: 0.025,
    concessionBonus: 0.35,
    concessionEffectCut: 0.2,
    maxConcessions: 3,
    amendmentFactor: 1.2,
    amendmentCostScale: 0.002,
    negotiationFactor: 0.012,
    interestGroupFactor: 0.015,
    voteNoiseSd: 0.04,
    legislatorAuthorPenalty: 0.5,
    npcBillChancePerMonth: 0.45,
    publicCampaignCapital: 10,
    meetingCapital: 5,
    meetingRelationGain: 12,
    ministryRelationGain: 30,
    dismissRelationLoss: 35,
    publicCampaignBonus: 0.5,
  },

  interestGroups: {
    approvalAdjustRate: 0.25,
    lawPreferenceImpact: 12,
    budgetImpact: 18,
    donationThreshold: 65,
    protestThreshold: 28,
    donationScale: 40_000,
  },

  congress: {
    coattailFactor: 0.25,
    seatNoiseSd: 0.15,
    /** Fatia mínima do peso total para eleger alguém (aproxima o quociente eleitoral). */
    minSeatShare: 0.006,
  },

  career: {
    fameDecayPerYearOutOfOffice: 6,
    fameGainPerYearInOffice: 3,
    experiencePerYearInOffice: 3,
    credibilityPartySwitch: -8,
    militancyPartySwitch: 0.5,
    partyFoundingMoney: 400_000,
    partyFoundingPopularity: 8,
  },

  party: {
    unityDecayPerDay: 0.02,
    factionDistanceFactor: 60,
    popularityDriftSd: 1.5,
    supportBaseShare: 0.3,
    compatibilityMoneyFactor: 0.6,
  },

  /** Economia industrial (edifícios, mercado, comércio exterior). */
  industry: IndustryConstants,
  /** Processo legislativo (PL, PLP, PEC, MP, vetos, impeachment). */
  legislature: LegislatureConstants,
  /** Atos do Executivo (decretos). */
  executive: ExecutiveConstants,
  /** Nação (legitimidade, inquietação, greves, regime). */
  nation: NationConstants,
} as const;

export type GameConstantsType = typeof GameConstants;
