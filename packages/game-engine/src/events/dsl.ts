/**
 * Linguagem compacta para escrever eventos (pacotes de conteúdo). Um evento vira poucas linhas:
 *
 *   ev({ id: 'lixo_parado', cat: 'crisis', phases: GOV, scope: MUN, title: '...', text: '...',
 *        opts: [['Contrato emergencial', [gasto('administration', 0.04), apr(1)]], ...] })
 *
 * Os efeitos são os mesmos do motor (`Effect`); aqui só há atalhos com nomes curtos.
 */
import type { AttributeId } from '../candidate/attributes';
import { randomName } from '../candidate/names';
import type { PartyId, RegionId, StateId } from '../core/types';
import type { Rng } from '../core/rng';
import type { BudgetCategory } from '../economy/types';
import type { HistoryKind } from '../history/types';
import type { IdeologyVector } from '../ideology/axes';
import type { IssueId } from '../ideology/issues';
import type { InterviewType } from '../media/interactions';
import type { NewsCategory } from '../media/types';
import type { InterestGroupId } from '../politics/types';
import type { PopTypeId } from '../population/popTypes';
import type { GamePhase, GameState } from '../simulation/state';
import type {
  Effect,
  EventCategory,
  EventDefinition,
  EventOptionDefinition,
  EventScope,
  UnitScope,
} from './types';

// ─── Fases e esferas ───────────────────────────────────────────────────────

export const CAMP: GamePhase[] = ['campaign'];
export const GOV: GamePhase[] = ['governing'];
export const LEG: GamePhase[] = ['legislating'];
export const OFFICE: GamePhase[] = ['governing', 'legislating'];
export const ANY: GamePhase[] = ['campaign', 'governing', 'legislating'];
export const CAREER: GamePhase[] = ['career'];

export const MUN: EventScope[] = ['municipal'];
export const EST: EventScope[] = ['estadual'];
export const FED: EventScope[] = ['federal'];
export const SUB: EventScope[] = ['municipal', 'estadual'];
export const UP: EventScope[] = ['estadual', 'federal'];

// ─── Grupos de eleitores (atalhos) ─────────────────────────────────────────

export const P = {
  trab: 'workers',
  oper: 'industrial_workers',
  agri: 'farmers',
  emp: 'business',
  com: 'merchants',
  media: 'middle_class',
  serv: 'civil_servants',
  saude: 'health_workers',
  tec: 'tech_workers',
  est: 'students',
  apos: 'retirees',
  desemp: 'unemployed',
} as const satisfies Record<string, PopTypeId>;

export const POBRES: PopTypeId[] = ['unemployed', 'workers'];
export const JOVENS: PopTypeId[] = ['students', 'tech_workers'];
export const CLASSE_MEDIA: PopTypeId[] = ['middle_class', 'tech_workers'];
export const PAIS: PopTypeId[] = ['workers', 'middle_class'];
export const IDOSOS: PopTypeId[] = ['retirees'];
export const OPERARIOS: PopTypeId[] = ['industrial_workers', 'workers'];
export const CAMPO: PopTypeId[] = ['farmers'];
export const COMERCIO: PopTypeId[] = ['merchants', 'business'];

// ─── Efeitos ───────────────────────────────────────────────────────────────

export const apr = (delta: number): Effect => ({ type: 'approval', delta });
export const con = (delta: number, scope?: UnitScope): Effect => ({
  type: 'knowledge',
  delta,
  ...(scope ? { scope } : {}),
});
export const rej = (delta: number): Effect => ({ type: 'rejection', delta });
export const attr = (attribute: AttributeId, delta: number): Effect => ({
  type: 'attribute',
  attribute,
  delta,
});
export const cred = (delta: number): Effect => attr('credibility', delta);
export const fame = (delta: number): Effect => ({ type: 'fame', delta });
export const esc = (delta: number): Effect => ({ type: 'scandal', delta });
/** Dinheiro da campanha (valor de referência; o motor escala pelo porte da eleição). */
export const cash = (amount: number): Effect => ({ type: 'money', amount });
export const ene = (delta: number): Effect => ({ type: 'energy', delta });
export const ent = (delta: number): Effect => ({ type: 'enthusiasm', delta });
export const mil = (pct: number): Effect => ({ type: 'militants', pct });
export const prep = (delta: number): Effect => ({ type: 'prep', delta });
export const mom = (popTypes: PopTypeId[] | 'all', delta: number): Effect => ({
  type: 'popMomentum',
  popTypes,
  delta,
});
export const pres = (delta: number, scope: UnitScope = 'context'): Effect => ({
  type: 'presence',
  delta,
  scope,
});
export const regm = (delta: number, scope: UnitScope = 'context'): Effect => ({
  type: 'regionalMomentum',
  delta,
  scope,
});
export const foco = (issue: IssueId, delta: number): Effect => ({
  type: 'issueFocus',
  issue,
  delta,
});
export const sat = (popTypes: PopTypeId[] | 'all', delta: number): Effect => ({
  type: 'popSatisfaction',
  popTypes,
  delta,
});
export const gi = (groupId: InterestGroupId | 'context', delta: number): Effect => ({
  type: 'interestGroup',
  groupId,
  delta,
});
export const cap = (delta: number): Effect => ({ type: 'politicalCapital', delta });
export const uni = (delta: number): Effect => ({ type: 'partyUnity', delta });
export const partyPop = (delta: number): Effect => ({ type: 'partyPopularity', delta });
export const rel = (partyId: PartyId | 'context' | 'coalition' | 'all', delta: number): Effect => ({
  type: 'relation',
  partyId,
  delta,
});
export const legit = (delta: number): Effect => ({ type: 'legitimacy', delta });
export const unrest = (delta: number): Effect => ({ type: 'unrest', delta });
export const radical = (groupId: InterestGroupId | 'context', delta: number): Effect => ({
  type: 'radicalism',
  groupId,
  delta,
});
/** Gasto extra no governo: fração do orçamento anual da área. */
export const gasto = (category: BudgetCategory, share: number): Effect => ({
  type: 'budgetSpend',
  category,
  share,
});
export const ideo = (shift: Partial<IdeologyVector>): Effect => ({ type: 'ideologyShift', shift });
export const shock = (
  label: string,
  months: number,
  fx: { growth?: number; inflation?: number; unemployment?: number; confidence?: number },
): Effect => ({ type: 'economyShock', label, months, ...fx });
export const opp = (
  target: 'context' | 'leader' | 'random',
  fx: { popMomentum?: number; rejection?: number; knowledge?: number },
): Effect => ({ type: 'opponent', target, ...fx });
export const chain = (
  eventId: string,
  inDays: number,
  chance?: number,
  vars?: Record<string, string>,
): Effect => ({
  type: 'chain',
  eventId,
  inDays,
  ...(chance !== undefined ? { chance } : {}),
  ...(vars ? { vars } : {}),
});
/** Caixa 2: dinheiro por fora (valor de referência, escalado como `cash`). */
export const caixa2 = (amount: number): Effect => ({ type: 'undeclaredMoney', amount });
/** Inelegibilidade pela Lei da Ficha Limpa. */
export const inelegivel = (years = 8): Effect => ({ type: 'ineligible', years });
/** Perda do mandato. */
export const cassar = (reason: string): Effect => ({ type: 'removeFromOffice', reason });
/** Reputação da carreira. */
export const rep = (delta: number): Effect => ({ type: 'reputation', delta });
/** Renovação do governo: reduz o desgaste acumulado (use valores positivos). */
export const renova = (amount: number): Effect => ({ type: 'wear', delta: -amount });
/** Lealdade à liderança do partido (mandato legislativo). */
export const lid = (delta: number): Effect => ({ type: 'partyLoyalty', delta });
export const flag = (id: string, delta = 1): Effect => ({ type: 'flag', id, delta });
export const news = (
  headline: string,
  sentiment: -1 | 0 | 1 = 0,
  category?: NewsCategory,
): Effect => ({
  type: 'news',
  headline,
  sentiment,
  ...(category ? { category } : {}),
});
export const hist = (
  kind: HistoryKind,
  title: string,
  sentiment: -1 | 0 | 1 = 0,
  importance: 1 | 2 | 3 = 2,
): Effect => ({
  type: 'history',
  kind,
  title,
  sentiment,
  importance,
});
export const interview = (interviewType: InterviewType): Effect => ({
  type: 'interview',
  interviewType,
});
export const modifier = (id: string, label: string, days: number, daily: Effect[]): Effect => ({
  type: 'modifier',
  id,
  label,
  days,
  daily,
});

// ─── Variáveis sorteadas (nomes fictícios) ─────────────────────────────────

const EMPRESAS = [
  'Construtora Horizonte',
  'Grupo Atlântico',
  'Engenharia Pioneira',
  'Consórcio Vale Verde',
  'TransNorte Logística',
  'Alimentos Serrano',
  'Nova Era Serviços',
  'Grupo Planalto',
  'Metalúrgica Aurora',
  'Saneamento Integral',
  'Coleta Brasil',
  'MedSul Hospitalar',
  'Viação Estrela',
  'Agro Cerrado',
  'Tecnologia Ipê',
];
const BAIRROS = [
  'Jardim das Flores',
  'Vila Esperança',
  'Morro do Cruzeiro',
  'Parque Industrial',
  'Conjunto Primavera',
  'Vila Operária',
  'Bela Vista',
  'Santa Luzia',
  'São Cristóvão',
  'Boa Esperança',
  'Nova Conquista',
  'Jardim Imperial',
  'Vila Nova',
  'Alto da Serra',
  'Beira-Rio',
];
const OBRAS = [
  'o viaduto da avenida principal',
  'o hospital regional',
  'a nova adutora',
  'o corredor de ônibus',
  'a escola técnica',
  'o parque linear',
  'a ponte sobre o rio',
  'o centro de convenções',
  'o novo mercado público',
];
const SETORES = [
  'construção civil',
  'transporte',
  'saúde privada',
  'agronegócio',
  'mineração',
  'tecnologia',
  'varejo',
];

export const V = {
  pessoa: (rng: Rng): string => {
    const n = randomName(rng, rng.chance(0.5) ? 'female' : 'male');
    return `${n.firstName} ${n.lastName}`;
  },
  empresa: (rng: Rng): string => rng.pick(EMPRESAS),
  bairro: (rng: Rng): string => rng.pick(BAIRROS),
  obra: (rng: Rng): string => rng.pick(OBRAS),
  setor: (rng: Rng): string => rng.pick(SETORES),
  /** Nome do vice eleito (ou um nome sorteado em saves antigos). */
  vice: (rng: Rng, state: GameState): string => {
    const name = state.government?.vice?.name;
    if (name) return name;
    const n = randomName(rng, rng.chance(0.5) ? 'female' : 'male');
    return `${n.firstName} ${n.lastName}`;
  },
} satisfies Record<string, (rng: Rng, state: GameState) => string>;

/** Peso dos eventos de vice: maior quando o vice é de outro partido. */
export const viceRisk = (s: GameState): number => {
  const vice = s.government?.vice;
  if (!vice) return 1;
  const own = s.candidates[s.playerId]?.partyId;
  return vice.partyId === own ? 0.4 : 2;
};

// ─── Construtor de eventos ─────────────────────────────────────────────────

export type OptInput = [
  label: string,
  effects: Effect[],
  extra?: { desc?: string; req?: (s: GameState) => boolean; reqText?: string },
];

export interface EvInput {
  id: string;
  cat: EventCategory;
  title: string;
  text: string;
  phases: GamePhase[];
  scope?: EventScope[];
  /** Peso no sorteio (padrão 5). */
  w?: number;
  /** Recarga em dias (padrão: o do motor). */
  cd?: number;
  once?: boolean;
  chainOnly?: boolean;
  neg?: boolean;
  ctx?: Array<'unit' | 'opponent' | 'group' | 'party'>;
  cond?: (s: GameState) => boolean;
  mod?: (s: GameState) => number;
  states?: StateId[];
  regions?: RegionId[];
  cities?: string[];
  vars?: Record<string, (rng: Rng, state: GameState) => string>;
  accuses?: boolean;
  /** Só com o nêmesis na disputa (vira o adversário do contexto). */
  nemesis?: boolean;
  days?: number;
  opts: OptInput[];
}

const OPTION_IDS = ['a', 'b', 'c', 'd', 'e'];

export function ev(i: EvInput): EventDefinition {
  const options: EventOptionDefinition[] = i.opts.map(([label, effects, extra], idx) => ({
    id: OPTION_IDS[idx] ?? `o${idx}`,
    label,
    effects,
    ...(extra?.desc ? { description: extra.desc } : {}),
    ...(extra?.req ? { requirement: extra.req } : {}),
    ...(extra?.reqText ? { requirementText: extra.reqText } : {}),
  }));
  return {
    id: i.id,
    category: i.cat,
    title: i.title,
    description: i.text,
    phases: i.phases,
    weight: i.w ?? 5,
    options,
    ...(i.scope ? { scope: i.scope } : {}),
    ...(i.cd !== undefined ? { cooldownDays: i.cd } : {}),
    ...(i.once ? { once: true } : {}),
    ...(i.chainOnly ? { chainOnly: true } : {}),
    ...(i.neg ? { negative: true } : {}),
    ...(i.ctx ? { context: i.ctx } : {}),
    ...(i.cond ? { condition: i.cond } : {}),
    ...(i.mod ? { weightModifier: i.mod } : {}),
    ...(i.states ? { states: i.states } : {}),
    ...(i.regions ? { regions: i.regions } : {}),
    ...(i.cities ? { cities: i.cities } : {}),
    ...(i.vars ? { vars: i.vars } : {}),
    ...(i.accuses ? { accusesOpponent: true } : {}),
    ...(i.nemesis ? { nemesis: true } : {}),
    ...(i.days !== undefined ? { durationDays: i.days } : {}),
  };
}
