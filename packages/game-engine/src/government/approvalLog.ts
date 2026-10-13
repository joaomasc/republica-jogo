/**
 * REGISTRO DA APROVAÇÃO — toda mudança na aprovação do mandato fica com causa listada.
 *
 * - O tick mensal decompõe a tendência (30% da distância até o alvo) em parcelas nomeadas:
 *   satisfação da população, lua de mel, desgaste, escândalos e déficit.
 * - Processos do mês (ministros, Congresso, ruas, greves, obras, eventos) e as decisões do
 *   jogador são medidos antes/depois e viram linhas com o fato que os causou.
 */
import { addMonths } from '../core/date';
import type { GameState } from '../simulation/state';
import type { ApprovalCauseKind, ApprovalImpactEntry, ApprovalTarget } from './types';

const LIMIT = 400;
const EPSILON = 0.005;

export const APPROVAL_CAUSE_LABEL: Record<ApprovalCauseKind, string> = {
  satisfaction: 'Satisfação da população',
  honeymoon: 'Lua de mel',
  wear: 'Desgaste',
  scandal: 'Escândalos',
  deficit: 'Déficit',
  record: 'Trabalho legislativo',
  decision: 'Suas decisões',
  event: 'Eventos',
  street: 'Ruas e protestos',
  congress: 'Congresso',
  works: 'Obras',
  cabinet: 'Gabinete',
  other: 'Outros',
};

/** Registra uma variação de aprovação com a causa (soma no registro do mesmo dia e rótulo). */
export function recordApproval(
  state: GameState,
  kind: ApprovalCauseKind,
  label: string,
  delta: number,
): void {
  const gov = state.government;
  if (!gov || Math.abs(delta) < EPSILON) return;
  gov.approvalCum = (gov.approvalCum ?? 0) + delta;
  const log = (gov.approvalImpact ??= []);
  const same = log.find((e) => e.date === state.date && e.label === label && e.kind === kind);
  if (same) same.delta += delta;
  else log.unshift({ date: state.date, kind, label, delta });
  if (log.length > LIMIT) log.length = LIMIT;
}

/**
 * Roda `fn` e registra o quanto a aprovação mudou. Sem rótulo fixo, usa a primeira manchete
 * publicada durante `fn` (o fato que explica a mudança), com o prefixo dado.
 */
export function measureApproval(
  state: GameState,
  kind: ApprovalCauseKind,
  label: string | { prefix: string },
  fn: () => void,
): void {
  const gov = state.government;
  const before = gov?.approval;
  const newsBefore = state.media.news[0]?.id;
  fn();
  const after = state.government;
  if (before === undefined || !after || after !== gov) return;
  const delta = after.approval - before;
  if (Math.abs(delta) < EPSILON) return;
  let text: string;
  if (typeof label === 'string') text = label;
  else {
    const fresh: string[] = [];
    for (const n of state.media.news) {
      if (n.id === newsBefore) break;
      fresh.push(n.headline);
    }
    text = fresh.length > 0 ? `${label.prefix}: ${fresh[fresh.length - 1]}` : label.prefix;
  }
  recordApproval(state, kind, text, delta);
}

export interface ApprovalExplanation {
  months: number;
  /** Variação registrada no período (pontos). */
  real: number;
  top: ApprovalImpactEntry[];
  byKind: Partial<Record<ApprovalCauseKind, number>>;
  target: ApprovalTarget | null;
}

/** "Por que a aprovação mudou?" nos últimos `months` meses (o tick mensal cai no dia 1º). */
export function explainApproval(
  state: GameState,
  months = 1,
  limit = 3,
): ApprovalExplanation | null {
  const gov = state.government;
  if (!gov) return null;
  const from = addMonths(state.date, -months);
  const merged = new Map<string, ApprovalImpactEntry>();
  const byKind: Partial<Record<ApprovalCauseKind, number>> = {};
  let real = 0;
  for (const e of gov.approvalImpact ?? []) {
    if (e.date <= from) break;
    real += e.delta;
    byKind[e.kind] = (byKind[e.kind] ?? 0) + e.delta;
    const key = `${e.kind}|${e.label}`;
    const cur = merged.get(key);
    if (cur) cur.delta += e.delta;
    else merged.set(key, { ...e });
  }
  const top = [...merged.values()]
    .filter((e) => Math.abs(e.delta) >= 0.05)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, limit);
  return { months, real, top, byKind, target: gov.approvalTarget ?? null };
}
