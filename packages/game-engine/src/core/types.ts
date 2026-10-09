/** Data no formato ISO `YYYY-MM-DD` (sempre UTC, sem horário). */
export type IsoDate = string;

export type CandidateId = string;
export type PartyId = string;
export type PopId = string;
export type UnitId = string;

export const STATE_IDS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;
export type StateId = (typeof STATE_IDS)[number];

export const REGION_IDS = ['norte', 'nordeste', 'centro_oeste', 'sudeste', 'sul'] as const;
export type RegionId = (typeof REGION_IDS)[number];

export function isStateId(value: string): value is StateId {
  return (STATE_IDS as readonly string[]).includes(value);
}

/** Resultado padrão devolvido por qualquer ação do jogador. */
export interface ActionResult {
  ok: boolean;
  /** Mensagem curta para feedback na interface. */
  message: string;
  /** Detalhes opcionais (efeitos aplicados, números etc.). */
  details?: string[];
}

export interface EngineOutput<S> {
  state: S;
  result: ActionResult;
}
