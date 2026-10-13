import {
  CAUSE_GROUP_LABEL,
  explainIntention,
  explainRival,
  type CauseGroup,
  type GameState,
  type IntentionExplanation,
} from '@republica/game-engine';
import { cn, Icon, Panel } from '@republica/ui';
import { Link } from 'react-router';
import { pct, pp } from '../../lib/format';

const GROUP_COLOR: Record<CauseGroup, string> = {
  mine: '#f2b51e',
  opponents: '#ff6b6b',
  events: '#fb923c',
  week: '#a78bfa',
  structural: '#8a9bc4',
};

function tone(v: number): string {
  return Math.abs(v) < 0.0005 ? 'text-muted' : v > 0 ? 'text-good' : 'text-bad';
}

function shortDate(iso: string): string {
  return iso.split('-').reverse().slice(0, 2).join('/');
}

function CauseRows({ why, compact }: { why: IntentionExplanation; compact?: boolean }) {
  if (why.top.length === 0)
    return (
      <div className="text-muted">Nada mexeu na sua intenção nos últimos {why.days} dias.</div>
    );
  return (
    <ul className={cn('space-y-0.5', compact ? 'text-[11px]' : 'text-xs')}>
      {why.top.map((c) => (
        <li key={`${c.source}|${c.label}`} className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-start gap-1.5">
            <span
              className="mt-[5px] size-1.5 shrink-0 rounded-full"
              style={{ background: GROUP_COLOR[c.group] }}
              aria-hidden
            />
            <span className="min-w-0">{c.label}</span>
          </span>
          <span className={cn('shrink-0 font-semibold tabular-nums', tone(c.share))}>
            {pp(c.share)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "A pesquisa mostra X; de fato mudou Y; a diferença é erro de pesquisa." */
function PollVsReal({ why, compact }: { why: IntentionExplanation; compact?: boolean }) {
  const poll = why.poll;
  if (!poll) return null;
  const { latest, previous } = poll;
  return (
    <div className={cn('space-y-0.5', compact ? 'text-[11px]' : 'text-xs')} data-testid="why-poll">
      <div className="flex justify-between gap-3">
        <span>
          Pesquisa {latest.pollster} ({shortDate(latest.date)})
        </span>
        <span className="font-semibold tabular-nums">
          {pct(latest.share)} ±{(latest.margin * 100).toFixed(1)}
        </span>
      </div>
      {previous && poll.shown !== null && (
        <>
          <div className="flex justify-between gap-3">
            <span>Mudança mostrada (vs. {previous.pollster})</span>
            <span className={cn('font-semibold tabular-nums', tone(poll.shown))}>
              {pp(poll.shown, 1)}
            </span>
          </div>
          {poll.real !== null && poll.noise !== null && (
            <>
              <div className="flex justify-between gap-3">
                <span>Mudou de fato no período</span>
                <span className={cn('font-semibold tabular-nums', tone(poll.real))}>
                  {pp(poll.real, 1)}
                </span>
              </div>
              <div className="flex justify-between gap-3 text-muted">
                <span>Erro de pesquisa (amostra e instituto)</span>
                <span className="tabular-nums">{pp(poll.noise, 1)}</span>
              </div>
            </>
          )}
        </>
      )}
      <div className="text-[10.5px] text-muted">
        Margem ±{(latest.margin * 100).toFixed(1)} p.p.: amostra ±
        {(latest.samplingMargin * 100).toFixed(1)}
        {latest.houseMargin > 0
          ? ` e viés de instituto ±${(latest.houseMargin * 100).toFixed(1)}`
          : ''}
        .
      </div>
    </div>
  );
}

/** Versão curta (tooltip da barra superior). */
export function WhyIntentionCompact({ game }: { game: GameState }) {
  const why = explainIntention(game);
  if (!why) return null;
  return (
    <div className="space-y-1.5" data-testid="why-intention-compact">
      <div className="flex justify-between gap-3">
        <span className="font-semibold text-paper">Por que mudou? (7 dias)</span>
        <span className={cn('font-semibold tabular-nums', tone(why.real))}>{pp(why.real, 1)}</span>
      </div>
      <CauseRows why={why} compact />
      <div className="border-t border-gold-500/15 pt-1">
        <PollVsReal why={why} compact />
      </div>
    </div>
  );
}

/** Painel completo: resumo por grupo, as 3 principais causas e pesquisa × real. */
export function WhyIntentionPanel({ game, days = 7 }: { game: GameState; days?: number }) {
  const why = explainIntention(game, days);
  if (!why) return null;
  const groups = (Object.keys(why.groups) as CauseGroup[]).filter(
    (g) => Math.abs(why.groups[g]) >= 0.0005,
  );
  return (
    <Panel title="Por que mudou?" icon="circle-help">
      <div className="space-y-3" data-testid="why-intention">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm">Sua intenção real nos últimos {days} dias</span>
          <span className={cn('text-lg font-semibold tabular-nums', tone(why.real))}>
            {pp(why.real, 1)}
          </span>
        </div>
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
            {groups.map((g) => (
              <span key={g} className="flex items-center gap-1">
                <span
                  className="size-2 rounded-full"
                  style={{ background: GROUP_COLOR[g] }}
                  aria-hidden
                />
                {CAUSE_GROUP_LABEL[g]}{' '}
                <span className={cn('font-semibold tabular-nums', tone(why.groups[g]))}>
                  {pp(why.groups[g], 1)}
                </span>
              </span>
            ))}
          </div>
        )}
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Principais causas
          </div>
          <CauseRows why={why} />
        </div>
        <div className="rounded-[4px] bg-ink-950/45 p-2">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            O que a pesquisa mostra × o que mudou de fato
          </div>
          <PollVsReal why={why} />
        </div>
        <Link
          to="/jogo/impacto"
          className="inline-flex items-center gap-1 text-xs text-gold-400 hover:underline"
        >
          <Icon name="activity" size={12} /> Ver tudo no medidor de impacto
        </Link>
      </div>
    </Panel>
  );
}

/** Uma linha: quanto o candidato variou de fato em 7 dias e a principal causa. */
export function WhyLine({ game, candidateId }: { game: GameState; candidateId: string }) {
  const mine = candidateId === game.playerId;
  const why = mine ? explainIntention(game, 7, 1) : explainRival(game, candidateId, 7, 1);
  if (!why) return null;
  const top = why.top[0];
  if (!top || Math.abs(why.real) < 0.0005) return null;
  return (
    <div
      className="mt-0.5 flex justify-between gap-2 text-[10.5px] leading-snug text-muted"
      data-testid="why-line"
    >
      <span className="min-w-0 truncate" title={top.label}>
        7 dias: {top.label}
      </span>
      <span className={cn('shrink-0 font-semibold tabular-nums', tone(why.real))}>
        {pp(why.real, 1)}
      </span>
    </div>
  );
}
