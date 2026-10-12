/**
 * "POR QUE PERDI?" (bloco 13) — relatório pós-eleição.
 *
 * Junta o medidor de impacto (o que moveu os votos válidos durante a campanha) com uma
 * comparação estrutural com o vencedor (ou o 2º colocado, se o jogador venceu).
 */
import { formatPct } from '../core/math';
import type { GameState } from '../simulation/state';
import { IMPACT_SOURCE_LABEL } from './impact';
import type { ImpactSource } from './types';

export interface PostMortemFactor {
  label: string;
  /** Variação em votos válidos (fração; 0,01 = 1 p.p.). */
  delta: number;
}

export interface PostMortem {
  won: boolean;
  pct: number;
  /** Com quem o jogador é comparado (vencedor ou 2º colocado). */
  versusName: string | null;
  bySource: { source: ImpactSource; label: string; delta: number }[];
  best: PostMortemFactor[];
  worst: PostMortemFactor[];
  /** Diagnósticos em texto ("Conhecimento médio de 41% contra 77% do vencedor"). */
  notes: string[];
}

function avg(values: number[]): number {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function electionPostMortem(state: GameState): PostMortem | null {
  const election = state.election;
  const result = election?.results.find((r) => r.round === 1);
  const last = election?.results[election.results.length - 1];
  if (!election || !result || !last) return null;
  const me = state.playerId;
  const won = election.outcome?.won ?? last.winnerId === me;
  const pct = (election.outcome?.pct ?? result.pct[me]) || 0;
  const impact = state.campaign?.impact ?? [];

  const sourceTotals = new Map<ImpactSource, number>();
  const labelTotals = new Map<string, number>();
  for (const e of impact) {
    sourceTotals.set(e.source, (sourceTotals.get(e.source) ?? 0) + e.valid);
    labelTotals.set(e.label, (labelTotals.get(e.label) ?? 0) + e.valid);
  }
  const bySource = [...sourceTotals.entries()]
    .map(([source, delta]) => ({ source, label: IMPACT_SOURCE_LABEL[source], delta }))
    .sort((a, b) => b.delta - a.delta);
  const labels = [...labelTotals.entries()].map(([label, delta]) => ({ label, delta }));
  const best = labels
    .filter((x) => x.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);
  const worst = labels
    .filter((x) => x.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 5);

  // Comparação estrutural com o vencedor (ou com o 2º colocado, se venceu).
  const ranking = result.ranking;
  const versus = won ? ranking.find((id) => id !== me) : (last.winnerId ?? ranking[0]);
  const notes: string[] = [];
  const mine = election.participants[me];
  const theirs = versus ? election.participants[versus] : undefined;
  const versusName = versus ? (state.candidates[versus]?.ballotName ?? null) : null;
  if (mine && theirs && versusName) {
    const who = won ? `do 2º colocado (${versusName})` : `de ${versusName}`;
    const k1 = avg(Object.values(mine.knowledge));
    const k2 = avg(Object.values(theirs.knowledge));
    if (Math.abs(k1 - k2) >= 8)
      notes.push(`Conhecimento médio de ${Math.round(k1)}% contra ${Math.round(k2)}% ${who}.`);
    const p1 = avg(Object.values(mine.presence));
    const p2 = avg(Object.values(theirs.presence));
    if (Math.abs(p1 - p2) >= 8)
      notes.push(`Presença nas regiões de ${Math.round(p1)} contra ${Math.round(p2)} ${who}.`);
    const r1 = mine.rejectionMod;
    const r2 = theirs.rejectionMod;
    if (Math.abs(r1 - r2) >= 2)
      notes.push(
        r1 > r2
          ? `Sua rejeição terminou ${Math.round(r1 - r2)} pontos acima ${who}.`
          : `Sua rejeição terminou ${Math.round(r2 - r1)} pontos abaixo ${who}.`,
      );
  }
  // Onde a eleição foi decidida: regiões com a maior diferença de votos.
  if (versus && versusName) {
    const gaps = Object.entries(result.byUnit)
      .map(([unitId, u]) => ({
        name: election.units.find((x) => x.id === unitId)?.name ?? unitId,
        gap: ((u.votes[me] ?? 0) - (u.votes[versus] ?? 0)) / Math.max(1, u.validVotes),
      }))
      .sort((a, b) => a.gap - b.gap);
    const weakest = gaps[0];
    const strongest = gaps[gaps.length - 1];
    if (weakest && weakest.gap < 0)
      notes.push(
        `Pior região: ${weakest.name} (${formatPct(-weakest.gap)} atrás de ${versusName}).`,
      );
    if (strongest && strongest.gap > 0)
      notes.push(`Melhor região: ${strongest.name} (${formatPct(strongest.gap)} à frente).`);
  }
  if (state.campaign) {
    const spent = state.campaign.totalSpent;
    const raised = state.campaign.totalRaised;
    if (raised > 0 && spent / raised < 0.6)
      notes.push(
        'Você terminou a campanha com dinheiro parado em caixa: recurso não gasto não vira voto.',
      );
  }
  return { won, pct, versusName, bySource, best, worst, notes };
}
