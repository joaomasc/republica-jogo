import type { IsoDate, StateId } from '../../core/types';
import type { PopTypeId } from '../../population/popTypes';
import type { BudgetCategory } from '../types';

/**
 * Economia industrial (inspirada em Victoria 3), em escala de gameplay.
 *
 * Convenções de unidade (valem para TODO o módulo):
 * - Dinheiro: R$ bilhões por ano (fluxos) ou R$ bilhões (estoques).
 * - Quantidade de bens: "unidades" = R$ bilhões/ano a PREÇOS-BASE (valor real).
 *   Assim, 1 unidade vendida ao preço relativo `p` rende `p` R$ bi/ano.
 * - Preço de um bem: relativo ao preço-base (1 = base). Exibição em R$ é cosmética (`displayPrice`).
 * - Empregos/pessoas: na mesma escala dos Pops (eleitores; ver `population.scale`).
 * - Salários: R$/mês por pessoa (como `Pop.income`).
 *
 * É um MODELO SIMPLIFICADO de jogo: as relações são do modelo, não previsões sobre o mundo real.
 */

// ---------------------------------------------------------------------------
// Bens
// ---------------------------------------------------------------------------

export const GOOD_IDS = [
  'grain',
  'soy',
  'meat',
  'cash_crops',
  'wood',
  'iron_ore',
  'oil',
  'fuel',
  'electricity',
  'steel',
  'chemicals',
  'construction_materials',
  'textiles',
  'processed_food',
  'consumer_goods',
  'electronics',
  'machinery',
  'vehicles',
  'pharmaceuticals',
  'aircraft',
  'transport',
  'services',
  'finance',
  'software',
] as const;
export type GoodId = (typeof GOOD_IDS)[number];

export const GOOD_CATEGORIES = [
  'agro',
  'mineral',
  'energy',
  'industrial',
  'consumer',
  'high_tech',
  'service',
] as const;
export type GoodCategory = (typeof GOOD_CATEGORIES)[number];

export interface GoodDefinition {
  id: GoodId;
  name: string;
  icon: string;
  color: string;
  category: GoodCategory;
  description: string;
  /** Preço de exibição em R$ por `displayUnit` quando o preço relativo é 1 (cosmético). */
  displayPrice: number;
  displayUnit: string;
  /** Pode ser importado/exportado. Não comercializáveis precisam ser produzidos no país. */
  tradeable: boolean;
  /** Preço mundial inicial (relativo ao preço-base, em moeda estrangeira; multiplicar pelo câmbio). */
  worldPrice: number;
  /** Desvio-padrão mensal do passeio aleatório do preço mundial (log). */
  worldVolatility: number;
  /** Custo de frete/seguro internacional (fração do preço). */
  transportCost: number;
}

// ---------------------------------------------------------------------------
// Edifícios (setores produtivos) e métodos de produção
// ---------------------------------------------------------------------------

export const BUILDING_IDS = [
  // Agropecuária
  'farm_grain',
  'farm_soy',
  'ranch',
  'plantation',
  'forestry',
  // Extração
  'mine',
  'oil_field',
  // Energia
  'power_hydro',
  'power_thermal',
  'power_renewable',
  // Indústria de base
  'refinery',
  'steel_mill',
  'chemical_plant',
  'cement_plant',
  // Indústria de transformação
  'food_industry',
  'textile_mill',
  'consumer_factory',
  'machinery_factory',
  'auto_plant',
  'electronics_factory',
  'pharma_plant',
  'aerospace',
  // Serviços
  'construction_sector',
  'logistics',
  'commerce',
  'bank',
  'tech_hub',
  // Setor público (financiado pelo orçamento)
  'public_admin',
  'hospital',
  'school',
  // Economia informal (equivalente à "agricultura de subsistência" do Victoria 3)
  'informal',
] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

export const SECTOR_IDS = [
  'agro',
  'extraction',
  'energy',
  'heavy_industry',
  'manufacturing',
  'high_tech',
  'services',
  'public',
  'informal',
] as const;
export type SectorId = (typeof SECTOR_IDS)[number];

/** Tipos de Pop que ocupam empregos (estudantes, aposentados e desempregados não). */
export const LABOR_TYPE_IDS = [
  'workers',
  'industrial_workers',
  'farmers',
  'business',
  'merchants',
  'middle_class',
  'civil_servants',
  'health_workers',
  'tech_workers',
] as const satisfies readonly PopTypeId[];
export type LaborTypeId = (typeof LABOR_TYPE_IDS)[number];

export const RESOURCE_IDS = ['arable', 'pasture', 'forest', 'iron', 'oil', 'hydro', 'wind_solar'] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

export interface ProductionMethod {
  id: string;
  name: string;
  description: string;
  /**
   * Empregos por nível, por tipo de Pop (pessoas). Empregos `business` são de "donos/diretores":
   * existem como `business` na fatia privada/estrangeira, viram `middle_class` (gestores) na fatia
   * estatal e o tipo principal de trabalhador na fatia cooperativa.
   */
  jobs: Partial<Record<LaborTypeId, number>>;
  /** Insumos por nível (unidades/ano). */
  inputs: Partial<Record<GoodId, number>>;
  /** Produção por nível (unidades/ano). */
  outputs: Partial<Record<GoodId, number>>;
  /** Pontos de construção gerados por nível por mês (só `construction_sector`). */
  constructionPoints?: number;
  /** Nível tecnológico nacional mínimo. */
  minTech?: number;
  /** Exige alguma destas opções de lei federal em vigor. */
  requiresLaws?: string[];
  /** Impacto ambiental relativo (0..1). */
  pollution?: number;
}

export interface BuildingDefinition {
  id: BuildingId;
  name: string;
  icon: string;
  sector: SectorId;
  description: string;
  /** Pontos de construção para erguer 1 nível. */
  constructionCost: number;
  /** Quem pode mandar construir. Setor público e informal: só o Estado / ninguém. */
  buildableBy: ('private' | 'state')[];
  /** Setor público: categoria do orçamento que paga salários e insumos. */
  budgetCategory?: BudgetCategory;
  /** Recurso natural que limita o número de níveis por estado. */
  resource?: ResourceId;
  /** Setor estratégico (desenvolvimentismo e planificação priorizam; piso estatal possível). */
  strategic?: boolean;
  /** Pesos de alocação inicial por perfil do estado (usados na geração da economia inicial). */
  profileWeights: Partial<
    Record<'agro' | 'industry' | 'tech' | 'urbanization' | 'publicSector' | 'income', number>
  >;
  /** Métodos de produção (o primeiro é o padrão inicial). */
  methods: ProductionMethod[];
}

// ---------------------------------------------------------------------------
// Estado dinâmico da indústria
// ---------------------------------------------------------------------------

export const OWNER_KINDS = ['private', 'state', 'cooperative', 'foreign'] as const;
export type OwnerKind = (typeof OWNER_KINDS)[number];

export interface BuildingState {
  /** Níveis existentes (inteiro ≥ 0). */
  level: number;
  /** Método de produção ativo. */
  methodId: string;
  /** Fatia de cada tipo de dono (soma = 1). */
  ownership: Record<OwnerKind, number>;
  /** Fração dos postos ativos (0..1): cai com prejuízo/greve, sobe com lucro. */
  staffing: number;
  /** Multiplicador do salário sobre o salário de referência (≥ piso legal). */
  wageFactor: number;
  /** Fator de produtividade específico (choques, infraestrutura). 1 = normal. */
  productivity: number;
  /** Último mês (R$ bi/ano, anualizado). */
  revenue: number;
  inputCost: number;
  wageBill: number;
  profit: number;
  /** Margem suavizada (lucro/receita) usada em contratações e investimento. */
  avgMargin: number;
  /** Subsídio recebido no último mês (R$ bi/ano). */
  subsidy: number;
  /** Meses consecutivos com prejuízo (fecha níveis quando alto). */
  lossMonths: number;
  /** Lotação de referência (calibrada na geração; a lotação-alvo gira em torno dela). */
  baseStaffing?: number;
  /** Margem de referência (calibrada na geração): acima dela contrata, abaixo demite. */
  refMargin?: number;
}

export type ConstructionOwner = 'state' | 'private' | 'cooperative' | 'foreign';

export interface ConstructionProject {
  id: string;
  stateId: StateId;
  buildingId: BuildingId;
  owner: ConstructionOwner;
  /** Quem decidiu a obra. */
  origin: 'player' | 'plan' | 'market' | 'npc_gov';
  totalPoints: number;
  progress: number;
  /** Custo estimado total (R$ bi) e já desembolsado. */
  estimatedCost: number;
  spent: number;
  startedOn: IsoDate;
  /** Pontos aplicados no último mês (estimativa de prazo na interface). */
  lastPoints?: number;
}

export interface LaborMarketState {
  laborForce: number;
  formalJobs: number;
  filledJobs: number;
  informal: number;
  unemployed: number;
  /** Empregos ofertados por tipo de Pop. */
  jobsByType: Partial<Record<LaborTypeId, number>>;
  /** Salário médio formal (R$/mês). */
  avgWage: number;
}

export interface TaxBreakdown {
  income: number;
  corporate: number;
  consumption: number;
  tariffs: number;
  exportTax: number;
  dividends: number;
  wealth: number;
  /** Lucros/dividendos de estatais que vão ao Tesouro. */
  stateCompanies: number;
}

export interface IndustryStats {
  /** PIB real (R$ bi/ano a preços-base, antes da calibração κ). */
  realOutput: number;
  valueAddedBySector: Record<SectorId, number>;
  employmentBySector: Record<SectorId, number>;
  /** Participação da indústria de transformação (manufacturing + high_tech + heavy_industry) no valor adicionado. */
  manufacturingShare: number;
  wageBill: number;
  profits: number;
  privateInvestment: number;
  stateInvestment: number;
  foreignInvestment: number;
  taxes: TaxBreakdown;
  exports: number;
  imports: number;
  tradeBalance: number;
  /** Pontos de construção usados no mês. */
  constructionUsed: number;
  /** Remessas de lucros ao exterior (R$ bi/ano). */
  remittances?: number;
  /** Transferências e aposentadorias pagas às famílias (R$ bi/ano). */
  transfers?: number;
  /** Dividendos pagos aos Pops `business` (R$ bi/ano). */
  dividends?: number;
  /** Consumo das famílias e compras do governo (R$ bi/ano, a preços correntes). */
  householdSpending?: number;
  governmentSpending?: number;
  /** Fluxo de obras (R$ bi/ano) no mês. */
  investmentFlow?: number;
}

/** Indicadores da economia de um estado no último mês. */
export interface RegionalIndustryStats {
  /** Valor adicionado real (unidades/ano a preços-base). */
  valueAdded: number;
  valueAddedPrev: number;
  /** Crescimento real anualizado e suavizado (%). */
  growth: number;
  /** Participação da indústria (pesada, transformação e alta tecnologia) no valor adicionado. */
  industrialShare: number;
  wageBill: number;
  /** Arrecadação do estado (base do motor, antes de `taxScale`). */
  taxes: number;
  /** Dividendos suavizados recebidos pelos empresários do estado (R$ bi/ano). */
  dividends: number;
  /** Informais / força de trabalho. */
  informalShare: number;
  /** Desempregados / força de trabalho (medida ampla, sem âncora). */
  unemploymentRaw: number;
  /** Pontos de construção aplicados no mês em obras no estado. */
  constructionPoints: number;
  /** Renda média dos Pops (R$/mês por pessoa). */
  avgIncome: number;
}

/** Âncoras calibradas na geração da economia (ver `bootstrapEconomy`). */
export interface IndustryCalibration {
  /** Multiplicador da demanda final (famílias + governo) por bem: fecha a oferta inicial. */
  finalDemandMult: Record<GoodId, number>;
  /** Preço mundial-âncora (o preço mundial reverte para ele). */
  worldAnchor: Record<GoodId, number>;
  /** Pesos do IPC do mercado (gasto inicial das famílias por bem). */
  cpiWeights: Partial<Record<GoodId, number>>;
  /** Empregos formais iniciais por tipo de Pop e estado. */
  jobs0: Record<StateId, Partial<Record<LaborTypeId, number>>>;
  /** Pessoas iniciais por tipo de Pop de trabalho (e desempregados) e estado. */
  people0: Record<StateId, Partial<Record<string, number>>>;
  /** Pessoas sem emprego formal modelado no início (folga), por estado. */
  slack0: Record<StateId, number>;
  /** Renda inicial (R$/mês por pessoa) por id de Pop. */
  income0: Record<string, number>;
  /** Transferência inicial por tipo de Pop (R$/mês por pessoa), já com a execução do orçamento. */
  transfer0: Partial<Record<string, number>>;
  /** Lucro privado distribuível inicial por estado (âncora dos dividendos). */
  dividends0: Record<StateId, number>;
  /** Produto real, base tributária, VA da alta tecnologia e margem privada média iniciais. */
  output0: number;
  taxBase0: number;
  highTechVA0: number;
  privateMargin0: number;
  /** Juro real e confiança iniciais (referência do fator de demanda e do câmbio). */
  realRate0: number;
  confidence0: number;
  /** Saldo comercial inicial (fração do produto). */
  tradeBalance0: number;
  /** Taxa de desemprego inicial por estado e nacional (%): âncoras da taxa medida. */
  unemploymentRate0: Record<StateId, number>;
  nationalUnemployment0: number;
}

export interface IndustrySnapshot {
  date: IsoDate;
  realOutput: number;
  manufacturingShare: number;
  exports: number;
  imports: number;
  unemployment: number;
  avgWage: number;
  constructionCapacity: number;
  investment: number;
}

export interface IndustryState {
  /** Edifícios por estado e tipo (ausente = 0 níveis). */
  buildings: Record<StateId, Partial<Record<BuildingId, BuildingState>>>;
  queue: ConstructionProject[];
  /** Pontos de construção disponíveis no último mês (nacional). */
  constructionCapacity: number;
  /** Custo médio de 1 ponto de construção (R$ bi) no último mês. */
  constructionPointCost: number;
  /** Fundo de investimento privado acumulado (R$ bi). */
  investmentPool: number;
  /** Fundo de investimento estrangeiro disponível (R$ bi). */
  foreignPool: number;
  /** Fundo do plano/estatais (economia planificada e desenvolvimentista) (R$ bi). */
  statePool: number;
  /** Tecnologia nacional: nível (destrava métodos) e progresso (0..1) para o próximo. */
  tech: { level: number; progress: number };
  /** Absorção calibrada do setor informal por estado (0..1). */
  informalAbsorption: Record<StateId, number>;
  /** Mercado de trabalho por estado no último mês. */
  labor: Record<StateId, LaborMarketState>;
  /** Constante de calibração: PIB nominal inicial / produto real inicial. */
  gdpScale: number;
  /** Constante de calibração tributária (receita inicial / base tributária inicial). */
  taxScale: number;
  stats: IndustryStats;
  history: IndustrySnapshot[];
  /** Âncoras da calibração inicial (ausente antes de `bootstrapEconomy`). */
  calib?: IndustryCalibration;
  /** Indicadores por estado no último mês. */
  regions?: Record<StateId, RegionalIndustryStats>;
  /** Nível geral de preços acumulado pela inflação (1 = início). */
  priceLevel?: number;
  /** Ganho acumulado de produtividade por difusão tecnológica (fração). */
  tfp?: number;
  /** Choque acumulado de produtividade vindo de eventos (fração). */
  shockLevel?: number;
  /** Efeito acumulado dos choques de desemprego dos eventos (p.p.). */
  unemploymentShock?: number;
  /** Índice salarial por estado (aperto do mercado de trabalho e produtividade). */
  wageIndex?: Record<StateId, number>;
  /** Disponibilidade de mão de obra por estado (1 = sem falta). */
  laborAvail?: Record<StateId, number>;
  /** Fator da arrecadação do estado governado pelas leis locais (1 = neutro). */
  localTaxFactor?: number;
  /** Contador de ids das obras. */
  nextProjectId?: number;
}

// ---------------------------------------------------------------------------
// Mercado nacional e comércio exterior
// ---------------------------------------------------------------------------

export interface GoodMarketHistoryPoint {
  date: IsoDate;
  price: number;
  supply: number;
  demand: number;
  imports: number;
  exports: number;
}

export interface GoodMarketState {
  /** Preço relativo ao preço-base (1 = base). */
  price: number;
  /** Produção doméstica (unidades/ano). */
  supply: number;
  /** Demanda doméstica total e por origem. */
  demand: number;
  demandPops: number;
  demandIndustry: number;
  demandGovernment: number;
  demandConstruction: number;
  imports: number;
  exports: number;
  /** Preço mundial (moeda estrangeira, relativo ao base). */
  worldPrice: number;
  /** Tarifa efetiva de importação (fração). */
  tariff: number;
  /** Fração da demanda não atendida (0..1). */
  shortage: number;
  history: GoodMarketHistoryPoint[];
}

export interface MarketState {
  goods: Record<GoodId, GoodMarketState>;
  /** Câmbio real (R$ por moeda estrangeira; 1 = início). Sobe = real desvalorizado. */
  exchangeRate: number;
  /** Índice de preços ao consumidor (1 = início). */
  cpi: number;
  cpiHistory: { date: IsoDate; value: number }[];
  /** Fator de demanda agregada (1 = neutro): juros, confiança, crédito, choques. */
  demandFactor: number;
  /** Histórico do câmbio (36 meses). */
  exchangeHistory?: { date: IsoDate; value: number }[];
  /** Alvo do câmbio no último mês (explica a tendência na interface). */
  exchangeTarget?: number;
}

// ---------------------------------------------------------------------------
// Modificadores econômicos (leis + decretos) — vocabulário ÚNICO entre leis e motor
// ---------------------------------------------------------------------------

/**
 * Efeitos das leis e decretos sobre o motor industrial. Regras de agregação
 * (ver `laws/modifiers.ts`): campos numéricos somam (ponderados pela força da lei),
 * campos `*Mult`, `tradeOpenness`, `laborFlexibility` e `techRate` multiplicam,
 * `minimumWage` usa o maior valor, booleanos usam OU, registros somam por chave
 * (`stateShareFloor` usa o maior valor por chave).
 */
export interface EconomyModifiers {
  // --- Propriedade e investimento ---
  /** Fração do lucro privado reinvestida (soma sobre a base). */
  reinvestment?: number;
  /** Multiplica o investimento privado. */
  privateInvestmentMult?: number;
  /** Proíbe novos projetos privados (economia planificada). */
  banPrivateInvestment?: boolean;
  /** Proíbe o Estado de construir edifícios não públicos (liberalismo). */
  banStateIndustry?: boolean;
  /** Desconto no custo das obras estatais (0.15 = 15% mais barato). */
  stateConstructionDiscount?: number;
  /** Fração da propriedade privada convertida em estatal por mês. */
  nationalizationRate?: number;
  /** Fração da propriedade privada convertida em cooperativa por mês. */
  cooperativizationRate?: number;
  /** Fração da propriedade estatal vendida ao setor privado por mês. */
  privatizationRate?: number;
  /** Novos projetos de mercado nascem como cooperativas. */
  newPrivateAsCooperative?: boolean;
  /** Multiplica o investimento estrangeiro. */
  foreignInvestmentMult?: number;
  /** Fração da propriedade estrangeira expropriada por mês. */
  expropriationRate?: number;
  /** Participação estatal mínima por edifício (ex.: petróleo 0.5). */
  stateShareFloor?: Partial<Record<BuildingId, number>>;
  /** Parcela do lucro distribuída aos empregados (cogestão/participação nos lucros). */
  profitSharing?: number;

  // --- Trabalho ---
  /** Piso salarial como fração do salário de referência dos trabalhadores (maior valor vence). */
  minimumWage?: number;
  /** Multiplica todos os salários. */
  wageMult?: number;
  /** Multiplica a velocidade de contratação/demissão. */
  laborFlexibility?: number;
  /** Soma na absorção do setor informal (+ = mais informalidade, menos desemprego aberto). */
  informality?: number;

  // --- Tributos (frações somadas às alíquotas de referência) ---
  incomeTax?: number;
  corporateTax?: number;
  consumptionTax?: number;
  consumptionTaxByCategory?: Partial<Record<GoodCategory, number>>;
  dividendTax?: number;
  /** Imposto anual sobre o patrimônio dos `business` (fração da renda anual equivalente). */
  wealthTax?: number;

  // --- Comércio exterior ---
  tariff?: number;
  tariffByCategory?: Partial<Record<GoodCategory, number>>;
  exportTax?: number;
  /** Capacidade de comércio (0 = autarquia, 1 = normal). Multiplica. */
  tradeOpenness?: number;
  /** Exportação proibida (decreto). */
  exportBans?: GoodId[];

  // --- Produtividade e inovação ---
  productivity?: number;
  productivityBySector?: Partial<Record<SectorId, number>>;
  /** Multiplica a velocidade da pesquisa tecnológica. */
  techRate?: number;

  // --- Moeda, crédito e preços ---
  /** Variação (p.p.) do custo do crédito para investimento (bancos públicos/subsídios). */
  interestRateOffset?: number;
  /** Regime do Banco Central (definido pela lei do grupo `central_bank`). */
  centralBank?: 'independent' | 'dual' | 'government';
  /** Crédito subsidiado por setor (reduz o custo de capital; soma). */
  creditSubsidy?: Partial<Record<SectorId, number>>;
  /** Controle geral de preços (economia planificada): preços presos perto da base, com escassez. */
  priceControls?: boolean;
  /** Bens com preço congelado (decreto). */
  frozenGoods?: GoodId[];

  // --- Terra, recursos e ambiente ---
  /** Intensidade da reforma agrária (0..1): propriedade agrícola migra para agricultores/cooperativas. */
  landReform?: number;
  /** Participação estatal mínima na extração (petróleo/minério). */
  resourceStateShare?: number;
  /** Multiplica o potencial de recursos agrícolas/extrativos (licenciamento, desmatamento). */
  resourceExpansion?: number;
  /** Penalidade de produtividade/custo para edifícios poluentes (soma). */
  pollutionPenalty?: number;

  // --- Transferências e Estado ---
  /** Transferências por pessoa (R$/mês), por tipo de Pop. */
  transfers?: Partial<Record<PopTypeId, number>>;
  /** Subsídios setoriais (R$ bi/ano), pagos pelo orçamento federal. */
  subsidies?: Partial<Record<SectorId, number>>;
  /** Estado de calamidade: gastos extras e congelamentos permitidos. */
  emergency?: boolean;
}
