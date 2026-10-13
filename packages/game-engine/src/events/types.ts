import type { AttributeId } from '../candidate/attributes';
import type { IsoDate, PartyId } from '../core/types';
import type { BudgetCategory } from '../economy/types';
import type { HistoryKind } from '../history/types';
import type { IdeologyVector } from '../ideology/axes';
import type { IssueId } from '../ideology/issues';
import type { InterviewType } from '../media/interactions';
import type { NewsCategory } from '../media/types';
import type { BuildingId, GoodId, OwnerKind } from '../economy/industry/types';
import type { RegionId, StateId } from '../core/types';
import type { Rng } from '../core/rng';
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
  | {
      type: 'chain';
      eventId: string;
      inDays: number;
      chance?: number;
      /** Variáveis extras passadas à continuação (arcos narrativos). */
      vars?: Record<string, string>;
    }
  /** Memória de escolhas: soma `delta` à marca (cria com 0). Lida por condições de outros eventos. */
  | { type: 'flag'; id: string; delta?: number }
  /** Lealdade ao partido no mandato legislativo (relação com a liderança). */
  | { type: 'partyLoyalty'; delta: number }
  /** Desgaste do governo (negativo = renovação: obras, boas notícias, mudanças na equipe). */
  | { type: 'wear'; delta: number }
  /** Reputação da carreira (0..100), usada fora do cargo e nas avaliações. */
  | { type: 'reputation'; delta: number }
  /** Recursos da pré-campanha (entressafra): base eleitoral (pontos) e caixa (fração do inicial). */
  | { type: 'interlude'; base?: number; warChest?: number }
  /** Dinheiro de campanha por fora (caixa 2): entra no caixa e fica registrado como não declarado. */
  | { type: 'undeclaredMoney'; amount: number }
  /** Inelegibilidade (Lei da Ficha Limpa) por N anos a partir de agora. */
  | { type: 'ineligible'; years: number }
  /** Perda do mandato (cassação): o governo termina no dia seguinte. */
  | { type: 'removeFromOffice'; reason: string }
  /** Exonera o ministro da pasta do contexto (`extra.pasta`). */
  | { type: 'dismissMinister' }
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
  /** Cidade e UF do jogador (ou do evento regional). */
  cityName?: string;
  /** Variáveis próprias do evento ou do arco (`{aliado}`, `{empresa}`...), mantidas na continuação. */
  extra?: Record<string, string>;
}

/** Esfera de governo em que um evento faz sentido. */
export type EventScope = 'municipal' | 'estadual' | 'federal';

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
  /** Por que o evento saiu (texto para o jogador), quando o gatilho é uma condição própria. */
  why?: (state: GameState) => string;
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
  /** Meses (1–12) em que o evento pode sair: estações e festas (ausente = o ano todo). */
  months?: number[];
  /** O adversário do contexto é o nêmesis do jogador (o evento só sai com ele na disputa). */
  nemesis?: boolean;
  /** Esferas do jogador em que o evento pode ocorrer (ausente = qualquer). */
  scope?: EventScope[];
  /** Só em jurisdições destas UFs (o presidente vê eventos de qualquer UF). */
  states?: StateId[];
  /** Só em jurisdições destas regiões. */
  regions?: RegionId[];
  /** Só nestas cidades (código IBGE): o prefeito da cidade ou o governador do estado. */
  cities?: string[];
  /** Variáveis sorteadas quando o evento começa (nomes de aliados, empresas, bairros...). */
  vars?: Record<string, (rng: Rng, state: GameState) => string>;
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
  /** Por que o evento saiu agora (consequência de uma decisão, tema do estado). */
  cause?: string;
  /** Saiu por puro sorteio: um imprevisto. */
  unforeseen?: boolean;
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
  scheduled: {
    eventId: string;
    date: IsoDate;
    context: EventContext;
    /** Decisão que agendou a continuação ("Proposta de lobista → Aceitar"). */
    origin?: string;
  }[];
  log: {
    instanceId: string;
    eventId: string;
    date: IsoDate;
    title: string;
    choiceLabel: string | null;
    /** Por que saiu (ver PendingEvent.cause). */
    cause?: string;
  }[];
  lastFired: Record<string, IsoDate>;
  firedCount: Record<string, number>;
  /** Última opção escolhida em cada evento (para objetivos e conquistas). */
  choices?: Record<string, string>;
  modifiers: ActiveModifier[];
  /** Memória de escolhas (marcas de eventos e arcos). Ausente em saves antigos. */
  flags?: Record<string, number>;
  /** Último disparo por categoria (evita dois escândalos seguidos). Ausente em saves antigos. */
  lastCategory?: Record<string, IsoDate>;
}
