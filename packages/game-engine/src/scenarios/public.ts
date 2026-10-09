/**
 * API pública de cenários e objetivos (reexportada por `src/index.ts`).
 */
export * from './scenarios';
export {
  isMaintainedMetric,
  measureObjective,
  objectivesView,
  type ObjectiveDefinition,
  type ObjectiveView,
} from './objectives';
export { LAW_PRESETS, type LawPresetId } from './presets';
