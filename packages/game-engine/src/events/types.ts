import type { AttributeId } from '../candidate/attributes';
import type { IsoDate, PartyId } from '../core/types';
import type { BudgetCategory } from '../economy/types';
import type { HistoryKind } from '../history/types';
import type { IdeologyVector } from '../ideology/axes';
import type { IssueId } from '../ideology/issues';
import type { InterviewType } from '../media/interactions';
import type { NewsCategory } from '../media/types';
import type { BuildingId, GoodId, OwnerKind } from '../economy/industry/types';
import type { StateId } from '../core/types';
import type { InterestGroupId } from '../politics/types';
import type { PopTypeId } from '../population/popTypes';
import type { GamePhase, GameState } from '../simulation/state';

export const EVENT_CATEGORIES = [
  'politics',
  'economy',
  'campaign',
  'media',
  'scandal',
  'crisis',
  'opportunity',
  'party',
  'opponent',
  'regional',
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export type UnitScope = 'all' | 'home' | 'context' | 'random';

/** Efeitos são dados (serializáveis) e aplicados por `applyEffects`. */
export type Effect =
  | { type: 'money'; amount: number }
  | { type: 'attribute'; attribute: AttributeId; delta: number }
  | { type: 'fame'; delta: number }
  | { type: 'knowledge'; delta: number; scope?: UnitScope }
  | { type: 'presence'; delta: number; scope?: UnitScope }
  | { type: 'regionalMomentum'; delta: number; scope?: UnitScope }
  | { type: 'popMomentum'; popTypes: PopTypeId[] | 'all'; delta: number }
  | { type: 'rejection'; delta: number }
  | { type: 'scandal'; delta: number }
  | { type: 'enthusiasm'; delta: number }
  | { type: 'militants'; pct: number }
  | { type: 'energy'; delta: number }
  | { type: 'prep'; delta: number }
  | {
      type: 'opponent';
      target: 'context' | 'leader' | 'random';
      popMomentum?: number;
      rejection?: number;
      knowledge?: number;
    }
  | { type: 'partyUnity'; delta: number }
  | { type: 'partyPopularity'; delta: number; partyId?: PartyId | 'context' }
  | {
      type: 'economyShock';
      label: string;
      months: number;
      growth?: number;
      inflation?: number;
      unemployment?: number;
      confidence?: number;
    }
  | { type: 'approval'; delta: number }
  /** Multiplica o preço mundial dos bens (mercado nacional). */
  | { type: 'worldPrice'; goods: GoodId[]; factor: number; label: string }
  /** Soma níveis a um edifício num estado (cria o edifício se não existir). */
  | { type: 'buildingLevels'; stateId: StateId; buildingId: BuildingId; delta: number; owner?: OwnerKind }
  | { type: 'legitimacy'; delta: number }
  | { type: 'unrest'; delta: number }
  | { type: 'radicalism'; groupId: InterestGroupId | 'context'; delta: number }
  /** Tira (negativo) ou põe (positivo) dinheiro nos fundos de investimento, em fração. */
  | { type: 'capitalFlow'; privateFactor: number; foreignFactor: number }
  | { type: 'exchangeRate'; factor: number }
  | { type: 'politicalCapital'; delta: number }
  | { type: 'interestGroup'; groupId: InterestGroupId | 'context'; delta: number }
  | { type: 'popSatisfaction'; popTypes: PopTypeId[] | 'all'; delta: number }
  | { type: 'ideologyShift'; shift: Partial<IdeologyVector> }
  | { type: 'issueFocus'; issue: IssueId; delta: number }
  | { type: 'relation'; partyId: PartyId | 'context' | 'coalition' | 'all'; delta: number }
  | { type: 'budgetSpend'; category: BudgetCategory; share: number }
  | { type: 'chain'; eventId: string; inDays: number; chance?: number }
  | { type: 'modifier'; id: string; label: string; days: number; daily: Effect[] }
  | { type: 'removeStaff' }
  | { type: 'interview'; interviewType: InterviewType }
  | {
      type: 'history';
      kind: HistoryKind;
      title: string;
      importance?: 1 | 2 | 3;
      sentiment?: -1 | 0 | 1;
    }
  | {
      type: 'news';
      headline: string;
      body?: string;
      sentiment?: -1 | 0 | 1;
      category?: NewsCategory;
    };

export interface EventContext {
  unitId?: string;
  unitName?: string;
  stateName?: string;
  opponentId?: string;
  opponentName?: string;
  groupId?: InterestGroupId;
  groupName?: string;
  partyId?: PartyId;
  partyName?: string;
  playerName?: string;
  playerParty?: string;
  issueName?: string;
}

export interface EventOptionDefinition {
  id: string;
  label: string;
  description?: string;
  effects: Effect[];
  /** Requisito para a opção estar disponível. */
  requirement?: (state: GameState) => boolean;
  requirementText?: string;
}

export interface EventDefinition {
  id: string;
  category: EventCategory;
  title: string;
  description: string;
  phases: GamePhase[];
  /** Peso base no sorteio (probabilidade relativa). */
  weight: number;
  /** Gatilho: condição para o evento ser elegível. */
  condition?: (state: GameState) => boolean;
  /** Multiplicador dinâmico de peso. */
  weightModifier?: (state: GameState) => number;
  cooldownDays?: number;
  once?: boolean;
  /** Só ocorre como continuação de outro evento. */
  chainOnly?: boolean;
  /** Evento negativo para o jogador (afetado pela dificuldade). */
  negative?: boolean;
  /** Dias para decidir antes de a primeira opção ser escolhida automaticamente. */
  durationDays?: number;
  /** Define o contexto (unidade, adversário, grupo) usado no texto e nos efeitos. */
  context?: Array<'unit' | 'opponent' | 'group' | 'party'>;
  /** Acusa o adversário do contexto (escândalo, dossiê): nunca escolhe personagens de paródia. */
  accusesOpponent?: boolean;
  options: EventOptionDefinition[];
}

export interface PendingEventOption {
  id: string;
  label: string;
  description: string;
  available: boolean;
  reason?: string;
  preview: string[];
}

export interface PendingEvent {
  instanceId: string;
  eventId: string;
  category: EventCategory;
  firedOn: IsoDate;
  expiresOn: IsoDate;
  title: string;
  description: string;
  context: EventContext;
  options: PendingEventOption[];
}

export interface ActiveModifier {
  id: string;
  label: string;
  endsOn: IsoDate;
  daily: Effect[];
  context: EventContext;
}

export interface EventsState {
  pending: PendingEvent[];
  scheduled: { eventId: string; date: IsoDate; context: EventContext }[];
  log: {
    instanceId: string;
    eventId: string;
    date: IsoDate;
    title: string;
    choiceLabel: string | null;
  }[];
  lastFired: Record<string, IsoDate>;
  firedCount: Record<string, number>;
  modifiers: ActiveModifier[];
}
