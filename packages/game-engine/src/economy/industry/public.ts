/**
 * API pública da economia industrial (reexportada por `src/index.ts`).
 */
export * from './types';
export { GOODS, GOOD_LIST, getGood } from './goods.data';
export { BUILDINGS, BUILDING_LIST, getBuilding, getMethod } from './buildings.data';
export { STATE_RESOURCES, STATE_SPECIALTIES } from './resources.data';
export { canOrderConstruction, stateConstructionCost } from './actions';
export * from './selectors';
