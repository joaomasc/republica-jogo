import type { CandidateId, IsoDate, UnitId } from '../core/types';
import type { IssueId } from '../ideology/issues';
import type { MediaChannel } from '../media/channels';
import type { InterviewType } from '../media/interactions';
import type { Effect, EventContext } from '../events/types';
import type { PopTypeId } from '../population/popTypes';

export type LedgerCategory =
  | 'party_fund'
  | 'donations'
  | 'fundraising'
  | 'interest_group'
  | 'staff'
  | 'ads'
  | 'travel'
  | 'events'
  | 'polls'
  | 'fines'
  | 'other';

export interface LedgerEntry {
  date: IsoDate;
  amount: number;
  category: LedgerCategory;
  description: string;
}

export const STAFF_ROLE_IDS = [
  'coordinator',
  'marketer',
  'press',
  'analyst',
  'treasurer',
  'regional',
  'social_media',
  'coach',
] as const;
export type StaffRoleId = (typeof STAFF_ROLE_IDS)[number];

export interface StaffMember {
  id: string;
  roleId: StaffRoleId;
  level: 1 | 2 | 3;
  name: string;
  hiredOn: IsoDate;
}

export type AdTone = 'positive' | 'contrast' | 'attack';

export interface AdCampaign {
  id: string;
  channel: MediaChannel;
  /** Unidades-alvo (vazio = todo o território da eleição). */
  unitIds: UnitId[];
  targetPopTypes: PopTypeId[];
  tone: AdTone;
  targetCandidateId: CandidateId | null;
  theme: IssueId | null;
  /** 0.5 (leve) a 2 (saturação) — retornos decrescentes. */
  intensity: number;
  startDate: IsoDate;
  endDate: IsoDate;
  dailyCost: number;
  totalCost: number;
  active: boolean;
}

export interface CampaignLogEntry {
  date: IsoDate;
  actionId: string;
  label: string;
  summary: string;
  cost: number;
  /** Efeito imediato da ação na situação do jogador (ausente em saves antigos). */
  impact?: ImpactDelta;
  /** Executada pela agenda automática. */
  auto?: boolean;
}

/** Frequência de um compromisso da agenda: a cada N dias de campanha. */
export type AgendaFrequency = 1 | 2 | 3 | 7;

export interface AgendaItem {
  id: string;
  kind: 'action' | 'interview';
  /** Ação de campanha (kind = 'action'). */
  actionId?: string;
  /** Veículo (kind = 'interview'); as respostas são escolhidas pela assessoria. */
  interviewType?: InterviewType;
  every: AgendaFrequency;
  /** Região-alvo: 'auto' escolhe onde há mais eleitores e menos presença sua. */
  unit: 'auto' | UnitId;
  /** Grupo-alvo: 'auto' escolhe o maior grupo onde seu momentum é mais fraco. */
  popTypeId: 'auto' | PopTypeId;
  enabled: boolean;
}

export interface AgendaConfig {
  enabled: boolean;
  /** Em ordem de prioridade. Só uma "atividade do dia" (ação de 1+ dia ou entrevista longa) roda por dia. */
  items: AgendaItem[];
  /** Não gasta se o caixa ficar abaixo disso. */
  minMoney: number;
  /** Descansa quando não houve atividade do dia e a energia está baixa. */
  autoRest: boolean;
}

export interface AgendaState extends AgendaConfig {
  /** Ocupado com uma ação de vários dias até esta data (exclusive). */
  busyUntil?: IsoDate | null;
  /** Último dia em que a agenda rodou (evita rodar duas vezes no mesmo dia). */
  lastRun?: IsoDate | null;
}

/** Variação (em fração, 0,01 = 1 p.p.) da situação do jogador no modelo de voto. */
export interface ImpactDelta {
  /** Intenção de voto sobre quem comparece (inclui indecisos e brancos no denominador). */
  share: number;
  /** Votos válidos. */
  valid: number;
  /** Rejeição média. */
  rejection: number;
}

export type ImpactSource =
  | 'action'
  | 'card'
  | 'ad'
  | 'debate'
  | 'interview'
  | 'event'
  | 'opponents'
  | 'decay'
  | 'airtime'
  | 'time';

/** Carta da reunião semanal: uma oportunidade ou dilema com custo e risco. */
export interface WeekCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  /** Probabilidade de dar certo (1 = garantido). */
  chance: number;
  effects: Effect[];
  /** Efeitos se der errado. */
  failure?: Effect[];
  ctx: EventContext;
}

export interface RivalMove {
  candidateId: CandidateId;
  text: string;
}

export interface WeekState {
  /** Semana da campanha (1, 2, ...). */
  index: number;
  startDate: IsoDate;
  /** Pauta da semana: tema em alta que favorece quem dá ênfase a ele. */
  trend: IssueId;
  cards: WeekCard[];
  /** Esperando o jogador escolher (o tempo fica parado). */
  pending: boolean;
  outcome: { cardId: string | null; success: boolean; details: string[] } | null;
  rivalMoves: RivalMove[];
  /** Intenção real de cada candidato no início da semana (para medir a variação). */
  shares: Record<CandidateId, number>;
  /** Variação da intenção do jogador na semana anterior. */
  lastWeekDelta: number | null;
}

export interface ImpactEntry extends ImpactDelta {
  date: IsoDate;
  source: ImpactSource;
  label: string;
  /** Agrupa registros do mesmo dia (ex.: uma propaganda, uma entrevista). */
  key?: string;
}

export interface CampaignState {
  money: number;
  /** Escala monetária da campanha (depende do eleitorado e do cargo). */
  moneyScale: number;
  ledger: LedgerEntry[];
  energy: number;
  staff: StaffMember[];
  /** Militantes ativos. */
  militants: number;
  /** Entusiasmo da base (0..100). */
  enthusiasm: number;
  ads: AdCampaign[];
  /** Bônus temporário de preparação (debates/entrevistas). */
  prepBonus: number;
  totalRaised: number;
  totalSpent: number;
  log: CampaignLogEntry[];
  /** Reunião de campanha da semana (campanha dinâmica). */
  week?: WeekState;
  /** Compromissos automáticos executados a cada dia avançado. */
  agenda?: AgendaState;
  /** Quanto cada fonte moveu a intenção de voto do jogador (mais recente primeiro). */
  impact?: ImpactEntry[];
  /** Arrecadação e gastos do último dia (para o painel financeiro). */
  lastDayIncome: number;
  lastDayExpenses: number;
  moneyHistory: { date: IsoDate; money: number }[];
}

export type PromiseStatus = 'pending' | 'fulfilled' | 'partial' | 'broken';

export type PromiseTarget =
  | { kind: 'law'; categoryId: string; optionIds: string[] }
  | { kind: 'budget'; category: string; minRatio: number }
  | {
      kind: 'indicator';
      indicator: 'unemployment' | 'inflation' | 'growth' | 'income';
      direction: 'down' | 'up';
      amount: number;
    }
  | { kind: 'noLaw'; categoryId: string; forbiddenOptionIds: string[] }
  | { kind: 'billProposed'; categoryId: string };

export interface PlayerPromise {
  id: string;
  proposalId: string;
  issue: IssueId;
  title: string;
  madeOn: IsoDate;
  target: PromiseTarget;
  status: PromiseStatus;
  /** Valor de referência do indicador quando o mandato começou. */
  baseline: number | null;
  evaluatedOn: IsoDate | null;
}
