import type { CandidateId, IsoDate, PartyId } from '../core/types';
import type { OfficeLevel } from '../election/offices';
import type { BudgetCategory } from '../economy/types';
import type { EconomyModifiers } from '../economy/industry/types';
import type { IdeologyVector } from '../ideology/axes';
import type { IssueId } from '../ideology/issues';
import type { CaucusId } from '../legislature/types';
import type { InterestGroupId } from '../politics/types';
import type { PopTypeId } from '../population/popTypes';

export interface LawEconomyEffects {
  growth?: number;
  inflation?: number;
  unemployment?: number;
  investment?: number;
  confidence?: number;
  /** Variação percentual da arrecadação (0.05 = +5%). */
  revenue?: number;
}

/** Ramos das leis, como as abas do Victoria 3. */
export type LawBranch = 'estado' | 'economia' | 'sociedade';

/**
 * Instrumento legislativo mínimo para mudar a lei:
 * - `pl`: lei ordinária (maioria simples dos presentes);
 * - `plp`: lei complementar (maioria absoluta);
 * - `pec`: emenda constitucional (3/5 em dois turnos em cada casa).
 */
export type LegalInstrument = 'pl' | 'plp' | 'pec';

/** Etiquetas ideológicas usadas para nomear o regime do país e por bots/IA. */
export type LawTag =
  | 'liberal'
  | 'social_democratic'
  | 'developmentalist'
  | 'socialist'
  | 'communist'
  | 'authoritarian'
  | 'democratic'
  | 'conservative'
  | 'progressive'
  | 'green'
  | 'nationalist';

/** Efeitos institucionais especiais executados pelo motor quando a lei entra em vigor. */
export type LawSpecial = 'presidential' | 'semi_presidential' | 'parliamentary' | 'one_party';

export interface LawOptionDefinition {
  id: string;
  name: string;
  description: string;
  /** Posição desta opção nos eixos ideológicos relevantes. */
  ideology: Partial<IdeologyVector>;
  /**
   * Efeitos macro LEGADOS (modelo agregado). Para leis federais, prefira `modifiers`
   * (motor industrial); use `economy` só para `confidence` e `inflation` monetária.
   */
  economy: LawEconomyEffects;
  /** Variação relativa do gasto de referência (0.1 = +10%). */
  budget: Partial<Record<BudgetCategory, number>>;
  /** Efeito na satisfação dos Pops (pontos). */
  pops: Partial<Record<PopTypeId, number>>;
  /** Efeito na aprovação dos grupos de interesse (pontos). */
  groups: Partial<Record<InterestGroupId, number>>;
  /** Melhora percebida em temas (pontos de satisfação para quem prioriza o tema). */
  issues: Partial<Record<IssueId, number>>;
  /** Exige que alguma destas opções esteja em vigor. */
  requires?: string[];
  politicalCost: number;
  implementationMonths: number;
  /** Efeitos no motor industrial (mercado, propriedade, trabalho, tributos, comércio...). */
  modifiers?: EconomyModifiers;
  /** Apoio (+) ou rejeição (−) das bancadas temáticas, em pontos (-10..10). */
  caucuses?: Partial<Record<CaucusId, number>>;
  tags?: LawTag[];
  /** Após aprovada no Congresso, só entra em vigor se aprovada em plebiscito nacional. */
  plebiscite?: boolean;
  /** Choque de legitimidade ao entrar em vigor (pontos, pode ser negativo). */
  legitimacyShock?: number;
  /** Mudança institucional especial (regime de governo). */
  special?: LawSpecial;
}

export interface LawCategoryDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  branch: LawBranch;
  /** Esferas que podem legislar sobre o tema. */
  levels: OfficeLevel[];
  /** Exige maioria qualificada (3/5). Deve ser `true` exatamente quando `instrument === 'pec'`. */
  constitutional: boolean;
  /** Instrumento mínimo exigido (na esfera federal). */
  instrument: LegalInstrument;
  /** O Executivo federal pode alterar por Medida Provisória (efeito imediato, Congresso confirma). */
  allowsMP?: boolean;
  defaultOptionId: string;
  options: LawOptionDefinition[];
}

/**
 * Situação de uma proposição:
 * - `committee`: nas comissões da casa atual (relator analisando);
 * - `floor`: pronta para o plenário (aguarda pauta/votação);
 * - `sanction`: aprovada no Congresso, aguarda sanção ou veto do Executivo;
 * - `veto`: vetada, aguardando sessão do Congresso que pode derrubar o veto;
 * - `plebiscite`: aprovada, aguardando plebiscito nacional;
 * - `passed`: virou lei (vai para implementação);
 * - `rejected` / `withdrawn` / `expired` (MP que caducou).
 */
export type BillStatus =
  | 'committee'
  | 'floor'
  | 'sanction'
  | 'veto'
  | 'plebiscite'
  | 'passed'
  | 'rejected'
  | 'withdrawn'
  | 'expired';

export type BillInstrument = LegalInstrument | 'mp';

export interface BillVote {
  chamber: string;
  yes: number;
  no: number;
  abstain: number;
  required: number;
  passed: boolean;
  byParty: Record<PartyId, { yes: number; no: number }>;
  /** Id da casa, turno e tipo da votação (ausentes em saves antigos). */
  chamberId?: string;
  round?: number;
  kind?: 'floor' | 'veto' | 'impeachment' | 'confidence';
  date?: IsoDate;
  /** Votos por bancada temática. */
  byCaucus?: Partial<Record<CaucusId, { yes: number; no: number }>>;
}

export interface BillChamberStep {
  chamberId: string;
  /** Turnos de votação nesta casa (PEC = 2). */
  rounds: number;
}

export interface RelatorInfo {
  name: string;
  partyId: PartyId;
  /** Parecer: pendente, favorável, favorável com emendas (concessão) ou contrário. */
  report: 'pending' | 'favorable' | 'amended' | 'unfavorable';
  /** Casa da comissão em que o relator atua. */
  chamberId?: string;
  /** O jogador (parlamentar) é o relator: ele escolhe o parecer. */
  isPlayer?: boolean;
  /** Inclinação obtida em negociação (logit a favor de parecer favorável). */
  lean?: number;
}

export interface BillEvent {
  date: IsoDate;
  text: string;
  tone?: 'info' | 'good' | 'bad';
}

export interface Bill {
  id: string;
  /** Numeração oficial, ex.: "PL 1.234/2027", "PEC 12/2027", "MPV 1.100/2027". */
  number: string;
  categoryId: string;
  optionId: string;
  instrument: BillInstrument;
  authorId: CandidateId | 'government' | 'npc';
  authorLabel: string;
  authorPartyId: PartyId | null;
  proposedOn: IsoDate;
  /** Data da próxima votação prevista (compatibilidade; espelha `nextDate` quando há votação marcada). */
  voteDate: IsoDate;
  status: BillStatus;
  /** Caminho pelas casas e posição atual. */
  path: BillChamberStep[];
  stepIndex: number;
  round: number;
  /** Data da próxima etapa automática (fim da comissão, votação, prazo de sanção...). */
  nextDate: IsoDate;
  /** Pautado pelo presidente da casa atual. */
  scheduled: boolean;
  /** Urgência (regime de tramitação acelerado). */
  urgency: boolean;
  relator: RelatorInfo | null;
  concessions: number;
  /** Bônus de apoio por partido obtido em negociação (logit). */
  partyBonus: Record<PartyId, number>;
  /** Bônus de apoio por bancada obtido em negociação (logit). */
  caucusBonus: Partial<Record<CaucusId, number>>;
  publicCampaign: boolean;
  votes: BillVote[];
  /** Voto do jogador (quando legislador) na votação corrente. */
  playerVote: 'yes' | 'no' | 'abstain' | null;
  /** Votos do jogador por votação (chave `${chamberId}:${round}` ou `veto`). */
  playerVotes?: Record<string, 'yes' | 'no' | 'abstain'>;
  /** MP: vigência máxima; e a opção que volta a valer se ela cair. */
  mpExpires?: IsoDate;
  previousOptionId?: string;
  vetoed?: boolean;
  /** PEC de parlamentar: assinaturas coletadas (precisa de 1/3 da casa). */
  signatures?: number;
  timeline: BillEvent[];
  /** Origem: Executivo, parlamentar ou bancada temática (ausente em saves antigos). */
  authorRole?: 'executive' | 'legislator' | 'caucus';
  /** Bancada autora (pauta de bancada). */
  caucusId?: CaucusId;
  /** Engavetado pelo presidente da casa (destrava com urgência ou negociação de pauta). */
  shelved?: boolean;
  /** Pauta negociada com o presidente da casa: votação em poucos dias ao chegar ao plenário. */
  agendaDeal?: boolean;
  /** Chegada ao plenário da casa atual. */
  floorSince?: IsoDate;
  /** Urgência urgentíssima: as votações restantes ocorreram no mesmo dia. */
  rushed?: boolean;
  /** Decisão de sanção/veto (quem decidiu; sanção tácita quando o prazo venceu). */
  sanctionDecision?: {
    date: IsoDate;
    decision: 'sanction' | 'veto';
    by: 'player' | 'npc' | 'auto' | 'tacit';
  };
  /** Resultado do plebiscito: fração de "sim" nos votos válidos e comparecimento. */
  plebiscite?: { date: IsoDate; yesShare: number; turnout: number; approved: boolean };
  /** Data em que a tramitação terminou (lei, rejeição, arquivamento, caducidade). */
  closedOn?: IsoDate;
  /** Manobras regimentais usadas (pelo jogador ou pela oposição NPC). */
  maneuvers?: { id: string; by: 'player' | 'npc'; success: boolean; date: IsoDate; chamberId: string; partyId?: PartyId }[];
}

export interface ImplementingLaw {
  categoryId: string;
  optionId: string;
  monthsLeft: number;
  /** Fator de efeito (concessões reduzem). */
  strength: number;
}

export interface LawsState {
  /** Esfera a que estas leis pertencem ('federal', 'estadual:SP', 'municipal:SP'). */
  jurisdictionKey: string;
  /** Opção vigente por categoria. */
  enacted: Record<string, string>;
  /** Força efetiva da opção vigente (1 = plena). */
  strength: Record<string, number>;
  bills: Bill[];
  implementing: ImplementingLaw[];
}

/** Proposição ainda em tramitação (qualquer etapa antes de virar lei ou ser arquivada). */
export function isBillActive(bill: Pick<Bill, 'status'>): boolean {
  return (
    bill.status === 'committee' ||
    bill.status === 'floor' ||
    bill.status === 'sanction' ||
    bill.status === 'veto' ||
    bill.status === 'plebiscite'
  );
}
