import { cn, Icon, Tooltip } from '@republica/ui';
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameState } from '../../store/gameStore';
import { useUi } from '../../store/uiStore';
import { availableModes, effectiveMode, MAP_MODE_GROUPS, modeLabel, modeMeta } from './mapModes';

/**
 * Versão compacta (telas pequenas): um botão com o modo atual que abre a lista de modos,
 * com nome por extenso, acima dele.
 */
function CompactMapModes({ className }: { className?: string }) {
  const game = useGameState();
  const stored = useUi((s) => s.mapMode);
  const setMapMode = useUi((s) => s.setMapMode);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ right: 0, bottom: 0 });
  const modes = availableModes(game);
  const active = effectiveMode(stored, game);
  const groups = MAP_MODE_GROUPS.map((g) => ({
    ...g,
    modes: modes.filter((m) => modeMeta(m).group === g.id),
  })).filter((g) => g.modes.length > 0);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const close = () => setOpen(false);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const rect = button.current.getBoundingClientRect();
    setPos({ right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.top + 6 });
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Modo do mapa: ${modeLabel(active)}`}
        data-testid="map-modes-menu"
        className={cn(
          'flex min-w-0 items-center gap-1.5 rounded-[4px] border px-2 py-1 text-[11px] transition',
          open
            ? 'border-gold-400/70 bg-ink-700 text-gold-300'
            : 'border-gold-500/25 text-paper/85 hover:border-gold-500/50 hover:text-paper',
          className,
        )}
      >
        <Icon name="layers" size={13} className="shrink-0 text-gold-500" />
        <Icon name={modeMeta(active).icon} size={13} className="shrink-0" />
        <span className="min-w-0 truncate">{modeLabel(active)}</span>
        <Icon name="chevron-up" size={12} className="shrink-0 text-muted" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            aria-label="Modo do mapa"
            className="hud-surface fixed z-[90] max-h-[70vh] w-64 overflow-y-auto rounded-[6px] p-1.5 animate-fade-in"
            style={pos}
          >
            {groups.map((g, gi) => (
              <div key={g.id} className={gi > 0 ? 'mt-1 border-t border-gold-500/20 pt-1' : ''}>
                <div className="px-2 pb-0.5 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {g.label}
                </div>
                {g.modes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="menuitemradio"
                    aria-checked={m === active}
                    onClick={() => {
                      setMapMode(m);
                      setOpen(false);
                    }}
                    data-testid={`map-mode-${m}`}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-[4px] px-2 py-1.5 text-left text-[13px] transition',
                      m === active
                        ? 'dock-item-active text-gold-300'
                        : 'text-paper/85 hover:bg-ink-700/80 hover:text-paper',
                    )}
                  >
                    <Icon name={modeMeta(m).icon} size={15} className="shrink-0" />
                    {modeLabel(m)}
                  </button>
                ))}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Faixa de modos de mapa (ícones agrupados), ao lado dos controles de tempo. */
export function MapModeSelector({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  if (compact) return <CompactMapModes {...(className ? { className } : {})} />;
  return <MapModeStrip {...(className ? { className } : {})} />;
}

function MapModeStrip({ className }: { className?: string }) {
  const game = useGameState();
  const stored = useUi((s) => s.mapMode);
  const setMapMode = useUi((s) => s.setMapMode);
  const modes = availableModes(game);
  const active = effectiveMode(stored, game);
  const groups = MAP_MODE_GROUPS.map((g) => ({
    ...g,
    modes: modes.filter((m) => modeMeta(m).group === g.id),
  })).filter((g) => g.modes.length > 0);

  return (
    <div
      className={cn('hud-surface flex items-center gap-1 rounded-[6px] px-1.5 py-1', className)}
      role="radiogroup"
      aria-label="Modo do mapa"
    >
      <Icon name="layers" size={14} className="mx-0.5 shrink-0 text-gold-500" />
      {groups.map((g, gi) => (
        <Fragment key={g.id}>
          {gi > 0 && <span className="mx-0.5 h-5 w-px shrink-0 bg-gold-500/30" aria-hidden />}
          {g.modes.map((m) => {
            const meta = modeMeta(m);
            const isActive = m === active;
            return (
              <Tooltip
                key={m}
                content={
                  <span>
                    <span className="block font-display text-[12px] text-gold-300">
                      {modeLabel(m)}
                    </span>
                    <span className="text-muted">Modo de mapa · {g.label}</span>
                  </span>
                }
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  aria-label={`Mapa: ${modeLabel(m)}`}
                  onClick={() => setMapMode(m)}
                  data-testid={`map-mode-${m}`}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-[4px] transition',
                    isActive
                      ? 'dock-item-active text-gold-300'
                      : 'text-paper/75 hover:bg-ink-600/70 hover:text-paper',
                  )}
                >
                  <Icon name={meta.icon} size={15} />
                </button>
              </Tooltip>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
