import { cn, Icon, Tooltip } from '@republica/ui';
import { Fragment } from 'react';
import { useGameState } from '../../store/gameStore';
import { useUi } from '../../store/uiStore';
import { availableModes, effectiveMode, MAP_MODE_GROUPS, modeLabel, modeMeta } from './mapModes';

/** Faixa de modos de mapa (ícones agrupados), ao lado dos controles de tempo. */
export function MapModeSelector({ className }: { className?: string }) {
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
