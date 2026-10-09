/**
 * API pública da Nação (reexportada por `src/index.ts`).
 * Acrescente aqui os seletores para a interface — nomes únicos no pacote inteiro.
 */
export * from './types';
export { DEFAULT_IDENTITY } from './nation';
export {
  countryIdentity,
  interestGroupsOverview,
  nationOverview,
  type GroupCaucusView,
  type GroupLawView,
  type InterestGroupView,
  type NationOverview,
  type NationStrikeView,
} from './selectors';
export { legitimacyFactors, type LegitimacyFactor } from './legitimacy';
export { strikeLossForSector } from './strikes';
