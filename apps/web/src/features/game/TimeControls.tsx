import {
  blockingReason,
  diffDays,
  formatDateShort,
  pendingDecisions,
  type GameState,
} from '@republica/game-engine';
import { Button, cn, Icon, Tooltip } from '@republica/ui';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGame, useGameState } from '../../store/gameStore';
import { GAME_SPEEDS, speedIntervalMs, useSettings, type GameSpeed } from '../../store/settingsStore';
import { useUi } from '../../store/uiStore';
import { MapModeSelector } from '../map/MapModeSelector';
import { OPEN_WEEK_EVENT } from '../week/WeekModal';

function timeFlows(game: GameState): boolean {
  return game.phase === 'campaign' || game.phase === 'governing' || game.phase === 'legislating';
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el?.isContentEditable || !!el?.closest('input, textarea, select, [contenteditable]');
}

/**
 * Relógio do jogo: avanço automático (1 tick = 1 dia) e atalhos de teclado. Para sozinho quando
 * o motor interrompe (evento, debate, eleição, fim de mandato, decisão legislativa).
 */
function useGameClock(): void {
  const playing = useUi((s) => s.playing);
  const setPlaying = useUi((s) => s.setPlaying);
  const speed = useSettings((s) => s.gameSpeed);
  const baseMs = useSettings((s) => s.autoPlaySpeedMs);
  const update = useSettings((s) => s.update);
  const intervalMs = speedIntervalMs(baseMs, speed);

  useEffect(() => {
    if (!playing) return;
    let id: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    // Encadeia timeouts (em vez de setInterval): um dia lento nunca empilha dias atrasados.
    const step = () => {
      if (cancelled) return;
      const current = useGame.getState().game;
      if (!current || !timeFlows(current) || blockingReason(current)) {
        setPlaying(false);
        return;
      }
      const r = useGame.getState().act({ type: 'time/advance', step: 'day' }, { quiet: true });
      const after = useGame.getState().game;
      if (!r.ok || !after || blockingReason(after) !== null || !timeFlows(after)) {
        setPlaying(false);
        return;
      }
      id = setTimeout(step, intervalMs);
    };
    id = setTimeout(step, intervalMs);
    return () => {
      cancelled = true;
      if (id !== undefined) clearTimeout(id);
    };
  }, [playing, intervalMs, setPlaying]);

  // Pausa ao sair da tela de jogo.
  useEffect(() => () => setPlaying(false), [setPlaying]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const game = useGame.getState().game;
      if (!game) return;
      const faster = (delta: number) => {
        const next = Math.min(5, Math.max(1, speed + delta)) as GameSpeed;
        update({ gameSpeed: next });
      };
      if (e.key === ' ' || e.code === 'Space') {
        if (e.repeat) return;
        // Com um botão em foco o Espaço já o aciona; não duplicar.
        if ((e.target as HTMLElement | null)?.closest('button, a, [role="radio"]')) return;
        e.preventDefault();
        if (timeFlows(game) && (useUi.getState().playing || !blockingReason(game)))
          useUi.getState().togglePlaying();
      } else if (/^[1-5]$/.test(e.key)) {
        update({ gameSpeed: Number(e.key) as GameSpeed });
      } else if (e.key === '+' || e.key === '=') faster(1);
      else if (e.key === '-' || e.key === '_') faster(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [speed, update]);
}

/** Progresso da campanha (com marcos de debates e pesquisas) ou do mandato. */
function Timeline({ game }: { game: GameState }) {
  if (game.election && (game.phase === 'campaign' || game.phase === 'election_day')) {
    const start = game.election.roundStartDate;
    const total = Math.max(1, diffDays(start, game.election.date));
    const done = Math.min(total, Math.max(0, diffDays(start, game.date)));
    const markers = [
      ...game.election.debates
        .filter((d) => d.round === game.election?.round)
        .map((d) => ({
          date: d.date,
          debate: true,
          label: `Debate · ${d.host}`,
          done: d.status !== 'scheduled',
        })),
      ...game.election.polls
        .filter((p) => p.kind === 'public' && p.round === game.election?.round)
        .map((p) => ({ date: p.date, debate: false, label: `Pesquisa ${p.pollster}`, done: true })),
    ];
    return (
      <div className="flex items-center gap-2" aria-label="Progresso da campanha">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Campanha
        </span>
        <div className="relative h-5 flex-1">
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-[2px] border border-gold-500/35 bg-ink-950">
            <div
              className="h-full rounded-[1px] bg-gradient-to-r from-gold-600 to-gold-400"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
          {markers.map((m, i) => {
            const pos = (Math.max(0, diffDays(start, m.date)) / total) * 100;
            return (
              <span
                key={`${m.date}-${i}`}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${Math.min(100, pos)}%` }}
              >
                <Tooltip content={`${m.label} · ${formatDateShort(m.date)}`}>
                  <span
                    className={cn(
                      'block border border-ink-950',
                      m.debate
                        ? cn('h-3 w-3 rotate-45 bg-info', m.done && 'opacity-50')
                        : 'h-2 w-2 rounded-full bg-ink-300',
                    )}
                  />
                </Tooltip>
              </span>
            );
          })}
        </div>
        <Tooltip content={`Eleição · ${formatDateShort(game.election.date)}`}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gold-300/70 bg-gold-500 text-ink-950">
            <Icon name="vote" size={11} />
          </span>
        </Tooltip>
      </div>
    );
  }
  if (game.government) {
    const total = Math.max(1, diffDays(game.government.startDate, game.government.endDate));
    const done = Math.min(total, Math.max(0, diffDays(game.government.startDate, game.date)));
    return (
      <div className="flex items-center gap-2" aria-label="Progresso do mandato">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          Mandato
        </span>
        <div className="h-2 flex-1 rounded-[2px] border border-gold-500/35 bg-ink-950">
          <div
            className="h-full rounded-[1px] bg-gradient-to-r from-info to-good"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-[10.5px] tabular-nums text-muted">
          até {formatDateShort(game.government.endDate)}
        </span>
      </div>
    );
  }
  return null;
}

interface Cta {
  label: string;
  icon: string;
  onClick: () => void;
}

/** O que está bloqueando (ou pedindo) a atenção do jogador agora. */
function useCta(game: GameState): Cta | null {
  const navigate = useNavigate();
  const debateToday = game.election?.debates.find(
    (d) => d.status === 'scheduled' && d.date === game.date,
  );
  const decisions = pendingDecisions(game);
  const blockingDecision = decisions.find((d) => d.blocking);
  if (game.events.pending.length > 0)
    return { label: 'Decidir evento', icon: 'flame', onClick: () => navigate('/jogo/eventos') };
  if (game.phase === 'campaign' && game.campaign?.week?.pending)
    return {
      label: `Reunião da semana ${game.campaign.week.index}`,
      icon: 'calendar-check',
      onClick: () => window.dispatchEvent(new Event(OPEN_WEEK_EVENT)),
    };
  if (debateToday && game.phase === 'campaign')
    return {
      label: `Debate hoje: ${debateToday.host}`,
      icon: 'mic-vocal',
      onClick: () => navigate('/jogo/eleicao'),
    };
  if (game.phase === 'election_day')
    return { label: 'Ir para a votação', icon: 'vote', onClick: () => navigate('/jogo/eleicao') };
  if (game.phase === 'results')
    return { label: 'Ver resultado', icon: 'award', onClick: () => navigate('/jogo/eleicao') };
  if (game.phase === 'career')
    return {
      label: 'Próximo passo da carreira',
      icon: 'award',
      onClick: () => navigate('/jogo/carreira'),
    };
  if (blockingDecision)
    return {
      label: 'Decisão legislativa',
      icon: 'gavel',
      onClick: () => navigate('/jogo/congresso'),
    };
  return null;
}

/** Controles de tempo, CTA do bloqueio atual, progresso e modos de mapa (canto inferior direito). */
/** Bloco de tempo. `compact`: telas pequenas — barras mais finas e modos de mapa num menu. */
export function TimeControls({ compact = false }: { compact?: boolean }) {
  useGameClock();
  const game = useGameState();
  const act = useGame((s) => s.act);
  const navigate = useNavigate();
  const playing = useUi((s) => s.playing);
  const togglePlaying = useUi((s) => s.togglePlaying);
  const speed = useSettings((s) => s.gameSpeed);
  const update = useSettings((s) => s.update);
  const blocked = blockingReason(game);
  const flows = timeFlows(game);
  const cta = useCta(game);
  const stepDisabled = !flows || !!blocked;

  return (
    <div className="pointer-events-auto flex flex-col gap-2" data-testid="time-controls">
      {cta ? (
        <Button
          variant="primary"
          size="md"
          icon={<Icon name={cta.icon} size={16} />}
          onClick={cta.onClick}
          className="animate-pulse-soft w-full"
          data-testid="cta"
        >
          {cta.label}
        </Button>
      ) : (
        blocked &&
        !playing && (
          <div className="hud-surface rounded-[5px] px-3 py-1.5 text-xs text-warn">{blocked}</div>
        )
      )}

      <div className="hud-surface space-y-2 rounded-[6px] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Tooltip content={playing ? 'Pausar (Espaço)' : 'Avançar o tempo (Espaço)'}>
            <button
              type="button"
              onClick={togglePlaying}
              disabled={!flows || (!!blocked && !playing)}
              aria-label={playing ? 'Pausar' : 'Avançar o tempo'}
              aria-pressed={playing}
              data-testid="time-play"
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-40',
                playing
                  ? 'border-gold-300/80 bg-gold-500 text-ink-950'
                  : 'border-gold-500/55 bg-ink-800 text-gold-300 hover:bg-ink-600',
              )}
            >
              <Icon name={playing ? 'pause' : 'play'} size={16} />
            </button>
          </Tooltip>
          <div className="flex items-end gap-1" role="radiogroup" aria-label="Velocidade do tempo">
            {GAME_SPEEDS.map((s) => (
              <Tooltip key={s} content={`Velocidade ${s} (tecla ${s})`}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={speed === s}
                  aria-label={`Velocidade ${s}`}
                  onClick={() => update({ gameSpeed: s })}
                  data-testid={`speed-${s}`}
                  className={cn(
                    'flex h-8 items-end justify-center rounded-[2px] pb-1 transition hover:bg-ink-700',
                    compact ? 'w-[14px]' : 'w-[18px]',
                  )}
                >
                  <span
                    className={cn(
                      'block w-[8px] rounded-[1px] transition',
                      s <= speed ? (playing ? 'bg-gold-300' : 'bg-gold-500') : 'bg-ink-500/70',
                    )}
                    style={{ height: 6 + s * 3.5 }}
                  />
                </button>
              </Tooltip>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1" role="group" aria-label="Avançar o tempo">
            <Button
              size="sm"
              disabled={stepDisabled}
              onClick={() => act({ type: 'time/advance', step: 'day' })}
              data-testid="time-day"
              title="Avançar 1 dia"
            >
              1 dia
            </Button>
            <Button
              size="sm"
              disabled={stepDisabled}
              onClick={() => act({ type: 'time/advance', step: 'week' })}
              data-testid="time-week"
              title="Avançar 1 semana"
            >
              1 sem
            </Button>
            <Button
              size="sm"
              disabled={stepDisabled}
              onClick={() => act({ type: 'time/advance', step: 'month' })}
              data-testid="time-month"
              title="Avançar 1 mês"
            >
              1 mês
            </Button>
          </div>
        </div>
        <Timeline game={game} />
        {(game.phase === 'campaign' || compact) && (
          <div className="flex items-center gap-1.5">
            {game.phase === 'campaign' && (
              <button
                type="button"
                onClick={() => navigate('/jogo/agenda')}
                data-testid="agenda-status"
                title="Agenda automática: o que a equipe faz sozinha a cada dia"
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-1.5 rounded-[4px] border px-2 py-1 text-left text-[11px] transition',
                  game.campaign?.agenda?.enabled
                    ? 'border-good/50 bg-good/10 text-good hover:bg-good/15'
                    : 'border-gold-500/20 text-muted hover:border-gold-500/40 hover:text-paper',
                )}
              >
                <Icon name="calendar-check" size={13} className="shrink-0" />
                <span className="truncate">
                  {game.campaign?.agenda?.enabled
                    ? compact
                      ? 'Agenda ativa'
                      : 'Agenda automática ativa'
                    : compact
                      ? 'Agenda desligada'
                      : 'Agenda automática desligada'}
                </span>
              </button>
            )}
            {compact && (
              <MapModeSelector compact className={game.phase === 'campaign' ? 'max-w-[55%]' : 'flex-1'} />
            )}
          </div>
        )}
      </div>

      {!compact && <MapModeSelector className="flex-wrap" />}
    </div>
  );
}
