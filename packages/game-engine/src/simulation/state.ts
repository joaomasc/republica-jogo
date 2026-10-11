import type { WorldId } from '../world/parody';
import type { CampaignState, PlayerPromise } from '../campaign/types';
import type { Candidate } from '../candidate/types';
import type { CareerState } from '../career/types';
import type { DifficultyId } from '../config/difficulty';
import type { CandidateId, IsoDate, PartyId, StateId, UnitId } from '../core/types';
import type { EconomyState } from '../economy/types';
import type { IndustryState, MarketState } from '../economy/industry/types';
import type { ExecutiveState } from '../executive/types';
import type { LegislatureState } from '../legislature/types';
import type { NationState } from '../nation/types';
import type { Election } from '../election/types';
import type { EventsState } from '../events/types';
import type { GovernmentState } from '../government/types';
import type { HistoryEntry } from '../history/types';
import type { LawsState } from '../laws/types';
import type { InteractionsState } from '../media/interactions';
import type { Alert, MediaState } from '../media/types';
import type { Party } from '../parties/types';
import type { CongressState, InterestGroup, InterestGroupId } from '../politics/types';
import type { PopulationState, RegionState } from '../population/types';

export type GamePhase =
  'campaign' | 'election_day' | 'results' | 'governing' | 'legislating' | 'career' | 'retired';

export type GameMode = 'career' | 'sandbox' | 'scenario';

export interface GameSettings {
  difficulty: DifficultyId;
  mode: GameMode;
  scenarioId: string | null;
  populationScale: number;
  /** Mundo dos partidos e adversários (ausente em saves antigos = fictício). */
  world?: WorldId;
  /** Campanha dinâmica: reunião semanal com cartas, pauta da semana e rivais que reagem. */
  weekly?: boolean;
}

export interface GameMeta {
  id: string;
  version: number;
  seed: number;
  createdAt: string;
  name: string;
  /** Contador de ações processadas (útil para replays/multiplayer). */
  turn: number;
}

/** Quem governa o quê fora do controle do jogador (NPCs). */
export interface PoliticalLandscape {
  presidentPartyId: PartyId;
  governors: Record<StateId, PartyId>;
  /** Prefeitos das capitais. */
  mayors: Record<StateId, PartyId>;
  /** Prefeitos das demais cidades jogáveis (código IBGE → partido); ausente em saves antigos. */
  cityMayors?: Record<string, PartyId>;
}

/** Valores de referência para detectar mudanças e gerar alertas/notícias. */
export interface TrackingState {
  lastPlayerShare: number | null;
  lastUnitShares: Record<UnitId, number>;
  lastPopTypeShares: Record<string, number>;
  lastApproval: number | null;
  lastCheck: IsoDate | null;
}

/** Estado completo de uma partida. Deve ser sempre serializável em JSON. */
export interface GameState {
  meta: GameMeta;
  settings: GameSettings;
  rngState: number;
  idCounter: number;
  date: IsoDate;
  phase: GamePhase;
  playerId: CandidateId;
  candidates: Record<CandidateId, Candidate>;
  parties: Record<PartyId, Party>;
  election: Election | null;
  population: PopulationState;
  regions: Record<StateId, RegionState>;
  campaign: CampaignState | null;
  promises: PlayerPromise[];
  economy: EconomyState;
  government: GovernmentState | null;
  congress: CongressState;
  laws: LawsState;
  interestGroups: Record<InterestGroupId, InterestGroup>;
  landscape: PoliticalLandscape;
  media: MediaState;
  events: EventsState;
  interactions: InteractionsState;
  history: HistoryEntry[];
  alerts: Alert[];
  career: CareerState;
  tracking: TrackingState;
  /** Economia industrial: edifícios por estado, fila de obras, investimento, emprego. */
  industry: IndustryState;
  /** Mercado nacional de bens, preços, comércio exterior e câmbio. */
  market: MarketState;
  /** Processo legislativo: mesas, bancadas, impeachment, emendas. */
  legislature: LegislatureState;
  /** Atos do Executivo: decretos, Selic (se o BC for do governo) e plano de investimentos. */
  executive: ExecutiveState;
  /** Nação: legitimidade, regime, inquietação, greves, identidade, objetivos e leis federais. */
  nation: NationState;
}
