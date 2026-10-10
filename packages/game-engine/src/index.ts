/**
 * @republica/game-engine — motor de simulação política e eleitoral.
 * TypeScript puro: roda no navegador, no servidor ou em scripts de balanceamento.
 */

// Núcleo
export * from './core/types';
export { Rng, hashSeed, withRng } from './core/rng';
export * from './core/date';
export * from './core/math';

// Configuração e balanceamento
export { GameConstants, type GameConstantsType } from './config/constants';
export * from './config/difficulty';

// Ideologia e temas
export * from './ideology/axes';
export * from './ideology/ideology';
export * from './ideology/issues';

// Território e população
export * from './map/states';
export * from './map/regions';
export { buildNationalUnits } from './map/units';
export * from './population/popTypes';
export * from './population/types';
export { popId, popsOfState, popsByType, popShares } from './population/population';
export { satisfactionTarget } from './population/satisfaction';

// Partidos e candidatos
export * from './parties/types';
export * from './world/parody';
export { DEFAULT_PARTIES } from './parties/parties.data';
export { REAL_PARTIES, REAL_PARTY_EQUIVALENTS } from './parties/realParties.data';
export {
  computeUnity,
  defaultPartyId,
  initParties,
  partyCompatibility,
  partyIdForWorld,
  partySeeds,
  validatePartyInput,
  type CreatePartyInput,
} from './parties/parties';
export * from './candidate/attributes';
export * from './candidate/appearance';
export * from './candidate/backgrounds';
export * from './candidate/names';
export * from './candidate/types';
export {
  applyBackground,
  candidateFullName,
  personalAppeal,
  pointsSpent,
  validateCandidateInput,
  type CreateCandidateInput,
} from './candidate/candidate';

// Eleições
export * from './election/offices';
export * from './election/types';
export { latestPoll, rankByPoll } from './election/polls';
export {
  computeIntentions,
  OTHERS_KEY,
  type AggregateIntention,
  type IntentionSnapshot,
} from './election/voterModel';
export { electionSeed, type SimulateOptions } from './election/simulate';
export { dhondt } from './election/proportional';

// Campanha
export * from './campaign/types';
export * from './campaign/actions.data';
export { actionCost, canPerformAction, type CampaignActionInput } from './campaign/actions';
export { AD_TONES, estimateAdCost, type AdCampaignInput } from './campaign/ads';
export {
  STAFF_LEVELS,
  STAFF_ROLES,
  hiringCost,
  staffBonus,
  staffDailyCost,
  type StaffRoleDefinition,
} from './campaign/staff';
export * from './campaign/proposals';
export {
  estimateDailyIncome,
  incomeByCategory,
  spendingByCategory,
  computeMoneyScale,
} from './campaign/finance';
export { internalPollCost } from './campaign/research';
export { describeImpact, IMPACT_SOURCE_LABEL } from './campaign/impact';
export { RIVAL_STYLE_INFO } from './campaign/weekly';
export {
  AGENDA_ACTIONS,
  AGENDA_PRESETS,
  DEFAULT_AGENDA,
  agendaItemLabel,
  isDayActivity,
} from './campaign/agenda';

// Mídia, entrevistas e debates
export * from './media/channels';
export * from './media/interactions';
export * from './media/types';
export * from './media/outlets';
export { STRATEGY_TEXT } from './media/textBank';
export { STRATEGY_PROFILES, canStartDebate } from './media/debate';
export { INTERVIEW_TYPE_INFO, canStartInterview, interviewAverage } from './media/interview';
export { fillTemplate } from './media/news';

// Eventos
export * from './events/types';
export { EVENT_DEFINITIONS, getEventDefinition } from './events/events.data';
export { describeEffect } from './events/effects';

// Economia, leis, política e governo
export * from './economy/types';
export { BUDGET_INFO, budgetTotals, serviceQuality } from './economy/budget';
export { ECONOMIC_SITUATIONS, economySummary, type EconomicSituation } from './economy/economy';
export * from './laws/types';
export { LAW_CATEGORIES, defaultLaws, getLawCategory, getLawOption } from './laws/laws.data';
export {
  canProposeBill,
  categoriesForLevel,
  legislativeLevel,
  partyPreferredOption,
  partySupportLogit,
  projectBill,
  requiredVotes,
  type BillProjection,
} from './laws/laws';
export * from './politics/types';
export { INTEREST_GROUP_SEEDS } from './politics/interestGroups.data';
export { groupApprovalTarget } from './politics/interestGroups';
export { coalitionSeats } from './politics/congress';
export { PORTFOLIOS, availablePortfolios } from './politics/negotiation';
export * from './government/types';
export { evaluatePromise, promiseStatusLabel } from './government/promises';
export * from './career/types';
export { careerOptions, nextAvailableElection, type CareerOption } from './career/career';
export * from './history/types';

// Economia industrial, processo legislativo, Executivo e Nação
export * from './economy/industry/public';
export * from './legislature/public';
export * from './executive/public';
export * from './nation/public';
export { aggregateEconomyModifiers, decreeModifiers, mergeModifiers } from './laws/modifiers';
export { federalLaws, federalOption, localLaws } from './laws/federal';
export { describeModifiers, MODIFIER_WHY, type ModifierLine } from './laws/describe';

// Simulação: estado, ações, tempo e seletores
export * from './simulation/state';
export { dispatch, type GameAction } from './simulation/dispatch';
export * from './simulation/api';
export { blockingReason, type AdvanceResult, type Interrupt } from './simulation/time';
export { validateNewGame, type NewGameConfig, type SandboxOptions } from './simulation/startGame';
export * from './simulation/selectors';
export {
  getCandidate,
  getParty,
  getPlayer,
  getPlayerParty,
  getPlayerStatus,
  getDifficulty,
} from './simulation/access';

// Persistência
export {
  MemorySaveStorage,
  SaveFormatError,
  createEnvelope,
  deserializeGame,
  parseEnvelope,
  serializeGame,
  summarize,
  type SaveEnvelope,
  type SaveSlotInfo,
  type SaveStorage,
  type SaveSummary,
} from './save/save';

// IA generativa (somente texto)
export * from './ai/provider';
export { ProceduralAIProvider } from './ai/procedural';
export { candidateBrief, interviewQuestionContext } from './ai/context';

// Cenários e objetivos
export * from './scenarios/public';
export { deepClone } from './core/clone';
export { previewDecreeImpact, previewLawImpact, simulateImpact, type ImpactReport, type ImpactRow } from './simulation/impact';
export * from './laws/platform';
export * from './economy/works/works';
export * from './economy/works/works.data';
export { localScope, type LocalScope } from './simulation/localScope';
export { stateOfName } from './map/stateNames';
export { STREET_STAGES, streetView, streetFactors, type StreetResponse, type StreetView, type StreetFactor, type StreetResponseView } from './nation/revolt';
