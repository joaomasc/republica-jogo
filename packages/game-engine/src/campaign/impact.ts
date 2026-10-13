import { computeIntentions } from '../election/voterModel';
import type { GameState } from '../simulation/state';
import type { CandidateId } from '../core/types';
import type { ImpactDelta, ImpactSource } from './types';

/** Limite de registros guardados no save. */
const IMPACT_LIMIT = 900;
const RIVAL_IMPACT_LIMIT = 1500;
/** Variações menores que isso (0,001 p.p.) não são registradas. */
const EPSILON = 1e-5;

export const IMPACT_SOURCE_LABEL: Record<ImpactSource, string> = {
  action: 'Ações de campanha',
  card: 'Cartas da semana',
  ad: 'Propaganda paga',
  debate: 'Debates',
  interview: 'Entrevistas',
  event: 'Eventos',
  opponents: 'Adversários',
  decay: 'Desgaste natural',
  airtime: 'Horário eleitoral gratuito',
  time: 'Indecisos decidindo',
  week: 'Pauta da semana',
  economy: 'Economia e humor do eleitor',
};

/** Situação "real" de todos os candidatos no modelo de voto (sem erro de pesquisa). */
export interface RaceStanding {
  player: ImpactDelta;
  /** Intenção de voto de cada adversário. */
  rivals: Record<CandidateId, number>;
}

/**
 * Situação "real" do jogador e dos adversários no modelo de voto (sem erro de pesquisa).
 * Retorna null fora de campanha ou se o jogador não disputa a eleição em curso.
 */
export function raceStanding(state: GameState): RaceStanding | null {
  const election = state.election;
  if (!election || !state.campaign || state.phase !== 'campaign') return null;
  const id = state.playerId;
  if (!election.candidateIds.includes(id)) return null;
  const snap = computeIntentions(state, election, { includeSegments: false });
  const rivals: Record<CandidateId, number> = {};
  for (const c of election.candidateIds) if (c !== id) rivals[c] = snap.total.shares[c] ?? 0;
  return {
    player: {
      share: snap.total.shares[id] ?? 0,
      valid: snap.valid[id] ?? 0,
      rejection: snap.rejection[id] ?? 0,
    },
    rivals,
  };
}

/** Situação "real" do jogador no modelo de voto (sem erro de pesquisa). */
export function playerStanding(state: GameState): ImpactDelta | null {
  return raceStanding(state)?.player ?? null;
}

export function diffStanding(after: ImpactDelta, before: ImpactDelta): ImpactDelta {
  return {
    share: after.share - before.share,
    valid: after.valid - before.valid,
    rejection: after.rejection - before.rejection,
  };
}

function negligible(d: ImpactDelta): boolean {
  return (
    Math.abs(d.share) < EPSILON && Math.abs(d.valid) < EPSILON && Math.abs(d.rejection) < EPSILON
  );
}

/**
 * Registra uma variação. Com `key`, soma ao registro do mesmo dia e mesma chave
 * (ex.: as três respostas de uma entrevista viram uma linha só).
 */
export function recordImpact(
  state: GameState,
  source: ImpactSource,
  label: string,
  delta: ImpactDelta,
  key?: string,
  date: string = state.date,
): void {
  const campaign = state.campaign;
  if (!campaign || negligible(delta)) return;
  campaign.impactCum = (campaign.impactCum ?? 0) + delta.share;
  const log = (campaign.impact ??= []);
  if (key) {
    const same = log.find((e) => e.key === key && e.date === date);
    if (same) {
      same.share += delta.share;
      same.valid += delta.valid;
      same.rejection += delta.rejection;
      return;
    }
  }
  log.unshift({ date, source, label, ...delta, ...(key ? { key } : {}) });
  if (log.length > IMPACT_LIMIT) log.length = IMPACT_LIMIT;
}

/** Registra a variação de cada adversário (soma no registro do mesmo dia, fonte e rótulo). */
export function recordRivalImpact(
  state: GameState,
  source: ImpactSource,
  label: string,
  deltas: Record<CandidateId, number>,
  date: string = state.date,
): void {
  const campaign = state.campaign;
  if (!campaign) return;
  const log = (campaign.rivalImpact ??= []);
  for (const [candidateId, share] of Object.entries(deltas)) {
    if (Math.abs(share) < EPSILON) continue;
    const same = log.find(
      (e) =>
        e.date === date &&
        e.candidateId === candidateId &&
        e.label === label &&
        e.source === source,
    );
    if (same) same.share += share;
    else log.unshift({ date, candidateId, source, label, share });
  }
  if (log.length > RIVAL_IMPACT_LIMIT) log.length = RIVAL_IMPACT_LIMIT;
}

/**
 * Mede uma sequência de etapas: cada `step` roda uma mudança e registra a diferença
 * em relação à medição anterior — do jogador e de cada adversário. `total()` diz quanto foi
 * atribuído até agora.
 */
export class ImpactMeter {
  private last: RaceStanding | null;
  private readonly start: RaceStanding | null;
  /** Os registros ficam na data em que a medição começou (o dia que está sendo jogado). */
  private readonly date: string;

  constructor(private readonly state: GameState) {
    this.last = raceStanding(state);
    this.start = this.last;
    this.date = state.date;
  }

  get active(): boolean {
    return this.last !== null;
  }

  /**
   * Roda `fn` e registra o que mudou. O rótulo pode ser calculado depois da mudança
   * (função) — útil quando só se sabe o que aconteceu depois (ex.: qual evento saiu).
   */
  step(
    source: ImpactSource,
    label: string | (() => string),
    fn: () => void,
    key?: string,
  ): ImpactDelta | null {
    fn();
    if (!this.last) return null;
    const now = raceStanding(this.state);
    if (!now) return null;
    const delta = diffStanding(now.player, this.last.player);
    const rivals: Record<CandidateId, number> = {};
    for (const [id, v] of Object.entries(now.rivals)) rivals[id] = v - (this.last.rivals[id] ?? v);
    this.last = now;
    const text = typeof label === 'function' ? label() : label;
    recordImpact(this.state, source, text, delta, key, this.date);
    recordRivalImpact(this.state, source, text, rivals, this.date);
    return delta;
  }

  /** Atribui à fonte indicada tudo o que mudou desde a última medição (resíduo). */
  settle(source: ImpactSource, label: string, key?: string): ImpactDelta | null {
    return this.step(source, label, () => undefined, key);
  }

  /** Variação acumulada desde a criação do medidor. */
  total(): ImpactDelta | null {
    if (!this.start || !this.last) return null;
    return diffStanding(this.last.player, this.start.player);
  }
}

/** Texto curto para a interface: "Intenção +0,42 p.p. · Rejeição −0,10 p.p.". */
export function describeImpact(delta: ImpactDelta): string {
  const pp = (v: number) => {
    const n = v * 100;
    const s = Math.abs(n).toFixed(2).replace('.', ',');
    return `${n > 0.0049 ? '+' : n < -0.0049 ? '−' : '±'}${s} p.p.`;
  };
  return `Intenção de voto ${pp(delta.share)} · Rejeição ${pp(delta.rejection)}`;
}
