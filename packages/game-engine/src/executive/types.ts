import type { IsoDate } from '../core/types';
import type { BuildingId, GoodCategory, GoodId, SectorId } from '../economy/industry/types';

/** Atos do Executivo que não passam pelo Congresso (decretos e portarias), em escala de jogo. */
export const DECREE_KINDS = [
  'tariff',
  'ipi',
  'export_ban',
  'price_freeze',
  'subsidy',
  'credit_line',
  'selic',
  'emergency',
  'expropriation',
  'privatization',
] as const;
export type DecreeKind = (typeof DECREE_KINDS)[number];

/** Que tipo de alvo/parâmetro o decreto pede na interface. */
export type DecreeTarget =
  | 'good'
  | 'category'
  | 'sector'
  | 'building_state'
  | 'none';

export interface DecreeDefinition {
  kind: DecreeKind;
  name: string;
  description: string;
  icon: string;
  target: DecreeTarget;
  /** Faixa do valor numérico (quando houver) e rótulo da unidade. */
  value?: { min: number; max: number; step: number; default: number; unit: string };
  politicalCost: number;
  /** Duração padrão em meses (null = até revogar). */
  durationMonths: number | null;
  /** Chance mensal de o STF suspender o decreto quando ele extrapola a lei (0..1). */
  legalRisk: number;
  /** Ato instantâneo (expropriação/privatização): não fica "ativo". */
  instant?: boolean;
}

export interface ActiveDecree {
  id: string;
  kind: DecreeKind;
  label: string;
  /** Alvo: bem, categoria de bens, setor, 'all' (todos) ou `${StateId}:${BuildingId}`. */
  target: GoodId | GoodCategory | SectorId | 'all' | `${string}:${BuildingId}` | null;
  value: number | null;
  issuedOn: IsoDate;
  expiresOn: IsoDate | null;
  suspended: boolean;
  /** Data da suspensão pelo STF (some da lista alguns meses depois). */
  suspendedOn?: IsoDate;
}

export interface ExecutiveState {
  decrees: ActiveDecree[];
  /** Taxa Selic definida pelo Executivo quando o Banco Central é controlado pelo governo. */
  selicTarget: number | null;
  /**
   * Plano de investimento estatal: pesos por setor. Na economia planificada e no
   * desenvolvimentismo o fundo estatal constrói automaticamente seguindo estes pesos.
   */
  plan: { weights: Partial<Record<SectorId, number>>; since: IsoDate } | null;
  /** Histórico de atos (para a interface). */
  log: { date: IsoDate; text: string }[];
}
