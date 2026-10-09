/**
 * API pública dos atos do Executivo (reexportada por `src/index.ts`).
 * Acrescente aqui os seletores para a interface — nomes únicos no pacote inteiro.
 */
export * from './types';
export { DECREES, DECREE_LIST } from './decrees.data';
export { decreeLegalRisk, hasLegalCover, isFederalExecutive } from './executive';
export {
  activeDecreesView,
  decreeOptions,
  planView,
  decreeRiskLabel,
  type ActiveDecreeView,
  type DecreeOptionView,
  type DecreeTargetOption,
  type PlanSectorView,
  type PlanView,
} from './selectors';
