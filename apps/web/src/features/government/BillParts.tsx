import type { BillDetail, BillVote, GameState } from '@republica/game-engine';
import { Badge, Bar } from '@republica/ui';

type Projection = BillDetail['projection'];

/** Projeção de votos por casa (esperados × necessários). */
export function ProjectionBars({ projection, compact = false }: { projection: Projection; compact?: boolean }) {
  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      {projection.chambers.map((c) => {
        const ok = c.expectedYes >= c.required;
        return (
          <div key={c.id}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">{c.name}</span>
              <span className={`tabular-nums ${ok ? 'text-good' : 'text-bad'}`}>
                ~{c.expectedYes} a favor · precisa {c.required}
              </span>
            </div>
            <div className="relative">
              <Bar value={c.expectedYes / Math.max(1, c.total)} color={ok ? 'var(--color-good)' : 'var(--color-bad)'} height={compact ? 5 : 8} />
              <span className="absolute top-[-2px] h-[calc(100%+4px)] w-0.5 bg-gold-300" style={{ left: `${(c.required / Math.max(1, c.total)) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Apoio esperado por partido na primeira casa. */
export function PartySupport({ game, projection }: { game: GameState; projection: Projection }) {
  const first = projection.chambers[0];
  if (!first) return null;
  const rows = Object.entries(first.byParty)
    .map(([pid, p]) => ({ party: game.parties[pid], p }))
    .filter((r) => r.party)
    .sort((a, b) => b.p - a.p);
  return (
    <div className="flex flex-wrap gap-1">
      {rows.map(({ party, p }) => (
        <span
          key={party!.id}
          className="flex items-center gap-1 rounded bg-ink-950 px-1.5 py-0.5 text-[11px]"
          title={`${party!.name}: ${Math.round(p * 100)}% dos deputados devem votar a favor`}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: party!.color }} />
          {party!.acronym}
          <span className={p >= 0.5 ? 'text-good' : 'text-bad'}>{Math.round(p * 100)}%</span>
        </span>
      ))}
    </div>
  );
}

/** Placar de uma votação já realizada. */
export function VoteResult({ vote }: { vote: BillVote }) {
  const kind = vote.kind === 'veto' ? 'Sessão do veto' : vote.round && vote.round > 1 ? `${vote.round}º turno` : 'Plenário';
  return (
    <div className="flex items-center gap-2 rounded bg-ink-950 px-2 py-1 text-xs">
      <Badge tone={vote.passed ? 'good' : 'bad'}>{vote.passed ? 'Aprovado' : 'Rejeitado'}</Badge>
      <span className="text-muted">
        {vote.chamber} · {kind}
      </span>
      <span className="ml-auto tabular-nums">
        <span className="text-good">{vote.yes}</span> × <span className="text-bad">{vote.no}</span>
        {vote.abstain > 0 && <span className="text-muted"> · {vote.abstain} abst.</span>}
        <span className="text-muted"> (precisa {vote.required})</span>
      </span>
    </div>
  );
}
