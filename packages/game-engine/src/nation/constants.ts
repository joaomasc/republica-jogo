import type { SectorId } from '../economy/industry/types';
import type { InterestGroupId } from '../politics/types';

/**
 * Constantes de balanceamento da Nação (legitimidade, inquietação, greves, regime).
 * Reexportadas em `GameConstants.nation`.
 */
export const NationConstants = {
  startingLegitimacy: 68,
  startingUnrest: 18,

  // --- Peso dos grupos (clout) ---
  /** Radicalismo inicial de um grupo. */
  initialRadicalism: 18,
  /** Pesos do clout: base histórica, tamanho×renda dos Pops ligados e peso econômico do setor. */
  cloutWeights: { base: 0.4, pop: 0.25, econ: 0.35 },
  /** Expoente e limites da razão (atual / referência) de Pops e setores. */
  cloutRatioExponent: 0.7,
  cloutRatioMin: 0.4,
  cloutRatioMax: 2.5,
  /** Velocidade com que `influence` acompanha o peso calculado (por mês). */
  influenceRate: 0.15,
  influenceMin: 5,
  influenceMax: 100,
  /** Fator das leis sobre o peso dos sindicatos (opção de lei → multiplicador). */
  unionLawFactor: {
    unions_banned: 0.35,
    unions_restricted: 0.7,
    unions_corporatist: 0.85,
    unions_free: 1,
  } as Record<string, number>,
  /** Cogestão fortalece o peso sindical. */
  laborCouncilsUnionFactor: 1.1,
  /** Participação de cada setor no valor adicionado na partida (referência do peso econômico). */
  referenceSectorShares: {
    agro: 0.07,
    extraction: 0.05,
    energy: 0.03,
    heavy_industry: 0.08,
    manufacturing: 0.12,
    high_tech: 0.03,
    services: 0.47,
    public: 0.1,
    informal: 0.05,
  } as Record<SectorId, number>,
  /** Quanto cada setor pesa no poder de cada grupo. */
  groupSectorLinks: {
    agribusiness: { agro: 1, extraction: 0.2 },
    industry: { heavy_industry: 1, manufacturing: 1, energy: 0.3 },
    tech: { high_tech: 1 },
    commerce: { services: 0.7 },
    business: {
      services: 0.5,
      heavy_industry: 0.3,
      extraction: 0.3,
      energy: 0.3,
      manufacturing: 0.2,
      agro: 0.1,
    },
    civil_servants: { public: 1 },
    unions: { heavy_industry: 0.5, manufacturing: 0.5, public: 0.2 },
    workers: { manufacturing: 0.4, services: 0.3, heavy_industry: 0.2 },
  } as Partial<Record<InterestGroupId, Partial<Record<SectorId, number>>>>,

  // --- Radicalismo ---
  /** Aprovação de referência (acima, o radicalismo cai; abaixo, sobe). */
  radicalismNeutralApproval: 50,
  /** Pontos por mês na aprovação mais baixa (pressão = 1) e na mais alta (pressão = -1). */
  radicalismRise: 6,
  radicalismFall: 4,
  /** Peso da inquietação social acima de 50 sobre o radicalismo. */
  radicalismUnrestFactor: 0.03,

  // --- Greves ---
  /** Radicalismo a partir do qual o grupo pode parar. */
  strikeThreshold: 70,
  /** Radicalismo a partir do qual os sindicatos podem convocar greve geral. */
  generalStrikeThreshold: 85,
  generalStrikeShare: 0.3,
  /** Setores em que os sindicatos podem parar quando não convocam greve geral. */
  unionStrikeSectors: ['heavy_industry', 'manufacturing'] as SectorId[],
  /** Chance mensal: base + inclinação × (excesso sobre o limiar / 30), com teto. */
  strikeBaseChance: 0.12,
  strikeChanceSlope: 0.25,
  strikeMaxChance: 0.4,
  strikeMonths: [2, 4] as [number, number],
  /** Intensidade (fração da produção do setor perdida). */
  sectorStrikeIntensity: [0.12, 0.28] as [number, number],
  generalStrikeIntensity: [0.06, 0.14] as [number, number],
  truckersIntensity: 0.2,
  lockoutIntensity: 0.15,
  publicStrikeIntensity: 0.3,
  /** Quanto o radicalismo do grupo cai quando a greve termina. */
  strikeRelief: 25,
  /** Efeito de uma greve nova. */
  strikeUnrestBump: 5,
  strikeApprovalHit: 1.5,
  /** Grupos que podem parar a economia (os demais protestam via eventos). */
  strikeGroups: ['unions', 'workers', 'agribusiness', 'civil_servants', 'business'] as InterestGroupId[],
  /** Fuga de capitais (empresários radicalizados). */
  capitalFlightPrivateLoss: 0.12,
  capitalFlightForeignLoss: 0.2,
  capitalFlightExchange: 0.08,
  capitalFlightConfidence: 4,
  capitalFlightRelief: 25,
  capitalFlightChance: 0.25,

  // --- Inquietação social (0..100) ---
  unrestBase: 12,
  unrestApprovalFactor: 0.45,
  unrestUnemploymentReference: 8,
  unrestUnemploymentFactor: 1.6,
  unrestInflationReference: 6,
  unrestInflationFactor: 1.8,
  unrestRadicalismReference: 40,
  unrestRadicalismFactor: 0.5,
  unrestStrikeFactor: 5,
  unrestStrikeCap: 20,
  unrestLegitimacyReference: 50,
  unrestLegitimacyFactor: 0.3,
  unrestRate: 0.2,
  unrestAlert: 70,
  /** Intervalo mínimo entre alertas repetidos de legitimidade/inquietação (meses). */
  alertCooldownMonths: 6,

  // --- Legitimidade (0..100) ---
  legitimacyBase: 54,
  legitimacyApprovalFactor: 0.3,
  legitimacyDemocraticTag: 4,
  legitimacyDemocraticCap: 16,
  legitimacyAuthoritarianTag: -10,
  legitimacyAuthoritarianCap: -30,
  legitimacyUnrestFactor: 0.25,
  /** Inquietação de referência: acima dela a legitimidade-alvo cai; abaixo, sobe. */
  legitimacyUnrestReference: 20,
  legitimacyScandalFactor: 0.3,
  legitimacyRegime: {
    presidential: 0,
    semi_presidential: 0,
    parliamentary: 0,
    one_party: -12,
  } as Record<string, number>,
  legitimacyEmergency: -6,
  legitimacyStfPerDecree: -2,
  legitimacyStfCap: -6,
  legitimacyRate: 0.12,
  legitimacyAlert: 30,
  legitimacyCrisis: 25,

  // --- Protestos e doações ligados ao radicalismo (politics/interestGroups.ts) ---
  protest: {
    /** Chance mensal mínima de protesto. */
    baseChance: 0.1,
    /** Acréscimo de chance com o radicalismo (× radicalismo/100). */
    radicalismChance: 0.3,
    /** Radicalismo a partir do qual o grupo protesta mesmo com aprovação média. */
    radicalismThreshold: 55,
    /** Intervalo mínimo (dias) entre dois protestos de quaisquer grupos: evita enxurrada de eventos. */
    cooldownDays: 60,
  },
  /** Doações: peso do grupo = clout × nº de grupos × fator (teto 1). */
  donationCloutFactor: 0.55,

  // --- Rótulos (interface) ---
  radicalismLevels: [
    { max: 30, label: 'Moderado' },
    { max: 50, label: 'Inquieto' },
    { max: 70, label: 'Mobilizado' },
    { max: 101, label: 'Radicalizado' },
  ] as { max: number; label: string }[],
  legitimacyLevels: [
    { max: 25, label: 'Em colapso' },
    { max: 40, label: 'Frágil' },
    { max: 60, label: 'Contestada' },
    { max: 80, label: 'Sólida' },
    { max: 101, label: 'Consagrada' },
  ] as { max: number; label: string }[],
  unrestLevels: [
    { max: 25, label: 'Calma' },
    { max: 45, label: 'Tensa' },
    { max: 70, label: 'Agitada' },
    { max: 101, label: 'Explosiva' },
  ] as { max: number; label: string }[],

  // --- Regime ---
  /** Partido único: fração das cadeiras da oposição que passa ao partido do Executivo. */
  oneParty: {
    seatShare: 0.95,
    termExtensionMonths: 48,
    termExtensionLegitimacyHit: 4,
  },

  // --- Marcos ---
  milestoneLimit: 40,
  milestoneCrisisCooldownMonths: 24,
  /** Choque de legitimidade mínimo (em módulo) que vira marco histórico. */
  milestoneShock: 5,

  /** Rótulos dos regimes de governo. */
  regimeLabels: {
    presidential: 'Presidencialismo de coalizão',
    semi_presidential: 'Semipresidencialismo',
    parliamentary: 'Parlamentarismo',
    one_party: 'Partido único',
  } as Record<string, string>,
} as const;
