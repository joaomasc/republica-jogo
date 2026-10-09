import type { IsoDate, PartyId } from '../core/types';
import type { IdeologyVector } from '../ideology/axes';
import type { BillVote } from '../laws/types';
import type { InterestGroupId } from '../politics/types';

/**
 * Processo legislativo brasileiro em escala de jogo: proposições (PL, PLP, PEC, MP),
 * comissões com relator, pauta controlada pelos presidentes das casas, votação nominal
 * por partido e por bancada temática, casa revisora, sanção/veto e derrubada de veto,
 * plebiscito, impeachment e moção de desconfiança (no parlamentarismo).
 */

/** Bancadas temáticas (frentes parlamentares suprapartidárias). */
export const CAUCUS_IDS = [
  'ruralista',
  'evangelica',
  'seguranca',
  'sindical',
  'empresarial',
  'ambientalista',
] as const;
export type CaucusId = (typeof CAUCUS_IDS)[number];

export interface CaucusDefinition {
  id: CaucusId;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  description: string;
  /** Eixos que definem quem entra na bancada (só os eixos listados contam). */
  ideology: Partial<IdeologyVector>;
  /** Fração-alvo da casa que integra a bancada (0..1). */
  baseSize: number;
  /** Quanto os membros seguem a bancada contra a orientação do partido (0..1). */
  cohesion: number;
  /** Grupos de interesse que sustentam a bancada (sua força acompanha o peso deles). */
  interestGroups: InterestGroupId[];
  /** Opções de lei que a bancada defende (categoria → opção). */
  preferredLaws: Record<string, string>;
  /** Opções de lei que a bancada combate (categoria → opções). */
  opposedLaws: Record<string, string[]>;
  leaderName: string;
}

export interface CaucusState {
  id: CaucusId;
  /** Membros por casa e partido (cadeiras). */
  members: Record<string, Record<PartyId, number>>;
  /** Relação da bancada com o jogador (-100..100). */
  relation: number;
  /** Força política (0..1, ~0.5 = normal). */
  strength: number;
}

/** Mesa diretora: o presidente da casa controla a pauta. */
export interface ChamberLeadership {
  chamberId: string;
  presidentName: string;
  presidentPartyId: PartyId;
  /** Relação do presidente da casa com o jogador (-100..100). */
  relation: number;
  /** Próxima eleição da mesa (fevereiro dos anos ímpares no Congresso). */
  nextElection: IsoDate;
  /** O jogador preside esta casa. */
  isPlayer: boolean;
  /** Jogador parlamentar inscrito como candidato na próxima eleição da mesa. */
  playerCandidate?: boolean;
  /** Partido aliado apoiado pelo Executivo jogador na próxima eleição da mesa. */
  backedPartyId?: PartyId | null;
  /** Data da última eleição da mesa. */
  lastElection?: IsoDate | null;
}

export type ImpeachmentStage = 'request' | 'camara' | 'senado' | 'concluded';

export interface ImpeachmentState {
  id: string;
  /** Quem é alvo: o jogador (Executivo) ou um Executivo NPC (o jogador vota). */
  targetIsPlayer: boolean;
  targetName: string;
  stage: ImpeachmentStage;
  openedOn: IsoDate;
  nextDate: IsoDate;
  reason: string;
  votes: BillVote[];
  /** Bônus/ônus de voto por partido obtido na negociação (logit; + = a favor do impeachment). */
  partyBonus: Record<PartyId, number>;
  playerVote: 'yes' | 'no' | 'abstain' | null;
  outcome: 'removed' | 'acquitted' | 'archived' | null;
  /** Partido do alvo. */
  targetPartyId?: PartyId;
  /** O jogador já apresentou a defesa (a decisão deixa de travar o tempo). */
  defended?: boolean;
  /** Data de encerramento do processo. */
  closedOn?: IsoDate;
}

export interface LegislativeLogEntry {
  date: IsoDate;
  text: string;
  tone: 'info' | 'good' | 'bad';
  billId?: string;
}

export interface LegislatureState {
  leadership: Record<string, ChamberLeadership>;
  caucuses: Record<CaucusId, CaucusState>;
  /** Bancadas das quais o jogador (parlamentar) participa. */
  playerCaucuses: CaucusId[];
  /** Base do governo quando o Executivo é NPC (o jogador legislador pode estar dentro ou fora). */
  governmentCoalition: PartyId[];
  /** Numeração das proposições: chave `${instrumento}:${ano}`. */
  counters: Record<string, number>;
  impeachment: ImpeachmentState | null;
  /** Meses seguidos com base minoritária (parlamentarismo → moção de desconfiança). */
  minorityMonths: number;
  /** Emendas parlamentares individuais do jogador legislador (R$ bi no ano). */
  amendments: { year: number; budget: number; executed: number; blocked: number };
  log: LegislativeLogEntry[];
  /** Fidelidade do jogador legislador ao governo NPC (0..100): orienta a liberação de emendas. */
  governmentLoyalty?: number;
  /** MPs rejeitadas ou caducas (`categoria:opção` → ano): não podem ser reeditadas no mesmo ano. */
  mpBlocked?: Record<string, number>;
  /** Última moção de desconfiança votada (parlamentarismo/semipresidencialismo). */
  lastConfidenceVote?: BillVote | null;
}

/** Decisão pendente do jogador no processo legislativo (para a interface e o bloqueio do tempo). */
export interface PendingLegislativeDecision {
  kind: 'vote' | 'sanction' | 'veto_vote' | 'impeachment_vote' | 'impeachment_defense';
  billId: string | null;
  title: string;
  description: string;
  deadline: IsoDate;
  /** Se verdadeiro, o tempo não avança até o jogador decidir. */
  blocking: boolean;
}
