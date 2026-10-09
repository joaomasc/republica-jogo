import type { StateId } from '../core/types';
import { STATES } from './states';

const DA = new Set(['BA', 'PB']);
const DO = new Set(['AC', 'AP', 'AM', 'CE', 'DF', 'ES', 'MA', 'PA', 'PI', 'PR', 'RJ', 'RN', 'RS', 'TO']);

/** Nome do estado com preposição: "da Bahia", "do Pará", "de São Paulo". */
export function stateOfName(stateId: StateId): string {
  const n = STATES[stateId].name;
  if (DA.has(stateId)) return `da ${n}`;
  if (DO.has(stateId)) return `do ${n}`;
  return `de ${n}`;
}
