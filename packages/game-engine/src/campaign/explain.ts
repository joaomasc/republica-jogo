/**
 * "POR QUE MUDOU?" — explicação da intenção de voto a partir do medidor de impacto.
 *
 * Toda variação diária da intenção real passa por uma etapa nomeada do medidor (ação, carta,
 * propaganda, cada adversário, cada evento, pauta da semana, desgaste, indecisos, economia).
 * Aqui isso vira leitura para o jogador: as principais causas da semana e, à parte, o que a
 * pesquisa mostra × o que mudou de fato (a diferença é erro amostral e viés de instituto).
 */
import { addDays } from '../core/date';
import type { CandidateId, IsoDate } from '../core/types';
import { latestPoll } from '../election/polls';
import type { Poll } from '../election/types';
import type { GameState } from '../simulation/state';
import type { ImpactSource } from './types';

/** Grandes grupos de causa (para a barra de resumo). */
export type CauseGroup = 'mine' | 'opponents' | 'events' | 'week' | 'structural';

export const CAUSE_GROUP_LABEL: Record<CauseGroup, string> = {
  mine: 'Suas iniciativas',
  opponents: 'Adversários',
  events: 'Eventos',
  week: 'Pauta da semana',
  structural: 'Tempo, desgaste e economia',
};

export const SOURCE_GROUP: Record<ImpactSource, CauseGroup> = {
  action: 'mine',
  card: 'mine',
  ad: 'mine',
  debate: 'mine',
  interview: 'mine',
  event: 'events',
  opponents: 'opponents',
  week: 'week',
  decay: 'structural',
  airtime: 'structural',
  time: 'structural',
  economy: 'structural',
};

export interface CauseLine {
  label: string;
  source: ImpactSource;
  group: CauseGroup;
  /** Variação da intenção de voto (fração; 0,01 = 1 p.p.). */
  share: number;
  rejection: number;
}

export interface PollReading {
  pollster: string;
  date: IsoDate;
  share: number;
  margin: number;
  samplingMargin: number;
  houseMargin: number;
}

export interface IntentionExplanation {
  days: number;
  from: IsoDate;
  to: IsoDate;
  /** Variação real (modelo, sem erro de pesquisa) no período. */
  real: number;
  realRejection: number;
  /** As principais causas (maior efeito absoluto primeiro). */
  top: CauseLine[];
  /** Soma por grupo. */
  groups: Record<CauseGroup, number>;
  /** O que a pesquisa mostra × o que mudou de fato entre as duas últimas pesquisas públicas. */
  poll: {
    latest: PollReading;
    previous: PollReading | null;
    /** Variação mostrada pela pesquisa. */
    shown: number | null;
    /** Variação real entre as datas das duas pesquisas (null em saves antigos). */
    real: number | null;
    /** Diferença: erro amostral + viés de instituto. */
    noise: number | null;
  } | null;
}

function reading(state: GameState, poll: Poll): PollReading {
  return {
    pollster: poll.pollster,
    date: poll.date,
    share: poll.total.shares[state.playerId] ?? 0,
    margin: poll.marginOfError,
    samplingMargin: poll.samplingMargin ?? poll.marginOfError,
    houseMargin: poll.houseMargin ?? 0,
  };
}

/** Agrupa as linhas por rótulo (a mesma causa em vários dias vira uma linha só). */
function merge(lines: CauseLine[]): CauseLine[] {
  const map = new Map<string, CauseLine>();
  for (const l of lines) {
    const key = `${l.source}|${l.label}`;
    const cur = map.get(key);
    if (cur) {
      cur.share += l.share;
      cur.rejection += l.rejection;
    } else map.set(key, { ...l });
  }
  return [...map.values()];
}

function emptyGroups(): Record<CauseGroup, number> {
  return { mine: 0, opponents: 0, events: 0, week: 0, structural: 0 };
}

/** Explica a intenção de voto do jogador nos últimos `days` dias. */
export function explainIntention(
  state: GameState,
  days = 7,
  limit = 3,
): IntentionExplanation | null {
  const campaign = state.campaign;
  const election = state.election;
  if (!campaign || !election || !election.candidateIds.includes(state.playerId)) return null;
  const from = addDays(state.date, -days);
  const lines: CauseLine[] = [];
  const groups = emptyGroups();
  let real = 0;
  let realRejection = 0;
  for (const e of campaign.impact ?? []) {
    if (e.date < from) break;
    const group = SOURCE_GROUP[e.source];
    lines.push({ label: e.label, source: e.source, group, share: e.share, rejection: e.rejection });
    groups[group] += e.share;
    real += e.share;
    realRejection += e.rejection;
  }
  const top = merge(lines)
    .filter((l) => Math.abs(l.share) >= 1e-4)
    .sort((a, b) => Math.abs(b.share) - Math.abs(a.share))
    .slice(0, limit);

  const publics = election.polls.filter((p) => p.kind === 'public' && p.round === election.round);
  const latest = publics.at(-1) ?? latestPoll(state);
  const previous = publics.length >= 2 ? publics[publics.length - 2]! : null;
  let poll: IntentionExplanation['poll'] = null;
  if (latest) {
    const l = reading(state, latest);
    const p = previous ? reading(state, previous) : null;
    const shown = p ? l.share - p.share : null;
    const realBetween =
      previous && latest.realMark !== undefined && previous.realMark !== undefined
        ? latest.realMark - previous.realMark
        : null;
    poll = {
      latest: l,
      previous: p,
      shown,
      real: realBetween,
      noise: shown !== null && realBetween !== null ? shown - realBetween : null,
    };
  }
  return { days, from, to: state.date, real, realRejection, top, groups, poll };
}

export interface RivalExplanation {
  candidateId: CandidateId;
  real: number;
  top: { label: string; share: number }[];
}

/** Por que um adversário subiu ou caiu nos últimos `days` dias (o que ele fez × o que fizeram com ele). */
export function explainRival(
  state: GameState,
  candidateId: CandidateId,
  days = 7,
  limit = 3,
): RivalExplanation | null {
  const log = state.campaign?.rivalImpact;
  if (!log) return null;
  const from = addDays(state.date, -days);
  const map = new Map<string, number>();
  let real = 0;
  for (const e of log) {
    if (e.date < from) break;
    if (e.candidateId !== candidateId) continue;
    map.set(e.label, (map.get(e.label) ?? 0) + e.share);
    real += e.share;
  }
  const top = [...map.entries()]
    .map(([label, share]) => ({ label, share }))
    .filter((x) => Math.abs(x.share) >= 1e-4)
    .sort((a, b) => Math.abs(b.share) - Math.abs(a.share))
    .slice(0, limit);
  return { candidateId, real, top };
}
