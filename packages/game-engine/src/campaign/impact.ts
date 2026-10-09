import { computeIntentions } from '../election/voterModel';
import type { GameState } from '../simulation/state';
import type { ImpactDelta, ImpactSource } from './types';

/** Limite de registros guardados no save. */
const IMPACT_LIMIT = 900;
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
  time: 'Passagem do tempo e outros',
};

/**
 * Situação "real" do jogador no modelo de voto (sem erro de pesquisa).
 * Retorna null fora de campanha ou se o jogador não disputa a eleição em curso.
 */
export function playerStanding(state: GameState): ImpactDelta | null {
  const election = state.election;
  if (!election || !state.campaign || state.phase !== 'campaign') return null;
  const id = state.playerId;
  if (!election.candidateIds.includes(id)) return null;
  const snap = computeIntentions(state, election, { includeSegments: false });
  return {
    share: snap.total.shares[id] ?? 0,
    valid: snap.valid[id] ?? 0,
    rejection: snap.rejection[id] ?? 0,
  };
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

/**
 * Mede uma sequência de etapas: cada `step` roda uma mudança e registra a diferença
 * em relação à medição anterior. `total()` diz quanto foi atribuído até agora.
 */
export class ImpactMeter {
  private last: ImpactDelta | null;
  private readonly start: ImpactDelta | null;
  /** Os registros ficam na data em que a medição começou (o dia que está sendo jogado). */
  private readonly date: string;

  constructor(private readonly state: GameState) {
    this.last = playerStanding(state);
    this.start = this.last;
    this.date = state.date;
  }

  get active(): boolean {
    return this.last !== null;
  }

  step(source: ImpactSource, label: string, fn: () => void, key?: string): ImpactDelta | null {
    fn();
    if (!this.last) return null;
    const now = playerStanding(this.state);
    if (!now) return null;
    const delta = diffStanding(now, this.last);
    this.last = now;
    recordImpact(this.state, source, label, delta, key, this.date);
    return delta;
  }

  /** Atribui à fonte indicada tudo o que mudou desde a última medição (resíduo). */
  settle(source: ImpactSource, label: string, key?: string): ImpactDelta | null {
    return this.step(source, label, () => undefined, key);
  }

  /** Variação acumulada desde a criação do medidor. */
  total(): ImpactDelta | null {
    if (!this.start || !this.last) return null;
    return diffStanding(this.last, this.start);
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
