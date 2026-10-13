import { explainApproval, type GameState } from '@republica/game-engine';
import { cn, Panel } from '@republica/ui';
import { num } from '../../lib/format';

function tone(v: number): string {
  return Math.abs(v) < 0.05 ? 'text-muted' : v > 0 ? 'text-good' : 'text-bad';
}

function signed(v: number): string {
  const r = Math.round(Math.abs(v) * 10) / 10;
  return `${r === 0 ? '±' : v > 0 ? '+' : '−'}${num(r)}`;
}

/** Linhas de causa (dica da barra superior e painel). */
function Causes({ game, compact }: { game: GameState; compact?: boolean }) {
  const why = explainApproval(game, 1, compact ? 3 : 5);
  if (!why) return null;
  if (why.top.length === 0)
    return <div className="text-muted">Nada mexeu na aprovação no último mês.</div>;
  return (
    <ul className={cn('space-y-0.5', compact ? 'text-[11px]' : 'text-xs')}>
      {why.top.map((c) => (
        <li key={`${c.kind}|${c.label}`} className="flex items-start justify-between gap-3">
          <span className="min-w-0">{c.label}</span>
          <span className={cn('shrink-0 font-semibold tabular-nums', tone(c.delta))}>
            {signed(c.delta)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Versão curta para a dica da barra superior. */
export function WhyApprovalCompact({ game }: { game: GameState }) {
  const why = explainApproval(game);
  if (!why) return null;
  return (
    <div className="space-y-1" data-testid="why-approval-compact">
      <div className="flex justify-between gap-3">
        <span className="font-semibold text-paper">Por que mudou? (último mês)</span>
        <span className={cn('font-semibold tabular-nums', tone(why.real))}>{signed(why.real)}</span>
      </div>
      <Causes game={game} compact />
      {why.target && (
        <div className="border-t border-gold-500/15 pt-1 text-[11px] text-muted">
          Tendência: a aprovação anda 30% por mês rumo a {Math.round(why.target.target)}%.
        </div>
      )}
    </div>
  );
}

/** Painel do Gabinete: causas do último mês e a composição do alvo. */
export function WhyApprovalPanel({ game }: { game: GameState }) {
  const why = explainApproval(game, 1, 5);
  if (!why) return null;
  return (
    <Panel title="Por que a aprovação mudou?" icon="circle-help">
      <div className="space-y-3 text-xs" data-testid="why-approval">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm">Variação no último mês</span>
          <span className={cn('text-lg font-semibold tabular-nums', tone(why.real))}>
            {signed(why.real)} pts
          </span>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Principais causas
          </div>
          <Causes game={game} />
        </div>
        {why.target && (
          <div className="rounded-[4px] bg-ink-950/45 p-2">
            <div className="mb-1 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-muted">
              <span>Para onde a aprovação está indo</span>
              <span className="tabular-nums text-paper">{Math.round(why.target.target)}%</span>
            </div>
            <ul className="space-y-1">
              {why.target.parts.map((p, i) => (
                <li key={p.label}>
                  <div className="flex justify-between gap-3">
                    <span>{p.label}</span>
                    <span className="font-semibold tabular-nums">
                      {i === 0 ? `${num(p.value)}` : signed(p.value)}
                    </span>
                  </div>
                  {p.parts && p.parts.length > 0 && (
                    <ul className="ml-3 mt-0.5 space-y-0.5 text-[11px] text-muted">
                      {p.parts.map((x) => (
                        <li key={x.label} className="flex justify-between gap-3">
                          <span>{x.label}</span>
                          <span className={cn('tabular-nums', tone(x.value))}>
                            {signed(x.value)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[10.5px] text-muted">
              Todo mês a aprovação anda 30% da distância até esse alvo. A satisfação da população
              caminha para a soma de desemprego, inflação, serviços, leis e padrão de vida.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}
