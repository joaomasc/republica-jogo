import { pendingDecisions } from '@republica/game-engine';
import { cn, Icon, Tooltip } from '@republica/ui';
import { Fragment } from 'react';
import { NavLink } from 'react-router';
import { useGameState } from '../../store/gameStore';
import { isNavItemVisible, MAP_ITEM, NAV_GROUPS, type NavItem } from './navigation';

function DockLink({
  item,
  group,
  badge,
  badgeTone = 'bad',
}: {
  item: NavItem;
  group?: string;
  badge?: number;
  badgeTone?: 'bad' | 'gold';
}) {
  const to = item.path ? `/jogo/${item.path}` : '/jogo';
  return (
    <Tooltip
      side="right"
      className="w-full justify-center"
      content={
        <div>
          {group && (
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              {group}
            </div>
          )}
          <div className="font-display text-[13px] font-semibold tracking-[0.04em] text-gold-300">
            {item.label}
          </div>
          {badge ? (
            <div className="text-paper/85">
              {badge} {item.path === 'eventos' ? 'evento(s) aguardando decisão' : 'decisão(ões) pendente(s)'}
            </div>
          ) : null}
        </div>
      }
    >
      <NavLink
        to={to}
        end={item.path === ''}
        aria-label={item.label}
        data-testid={`nav-${item.path || 'jogo'}`}
        className={({ isActive }) =>
          cn(
            'relative flex h-[38px] w-[38px] items-center justify-center rounded-[5px] transition',
            isActive
              ? 'dock-item-active text-gold-300'
              : 'text-paper/70 hover:bg-ink-700/80 hover:text-paper',
          )
        }
      >
        <Icon name={item.icon} size={18} />
        {badge ? (
          <span
            className={cn(
              'absolute -right-1 -top-1 min-w-4 rounded-full px-1 text-center text-[10px] font-bold leading-4 ring-2 ring-ink-900',
              badgeTone === 'bad' ? 'bg-bad text-ink-950' : 'bg-gold-500 text-ink-950',
            )}
          >
            {badge}
          </span>
        ) : null}
      </NavLink>
    </Tooltip>
  );
}

/** Dock vertical de ícones (substitui a navegação lateral): cada item abre um painel sobre o mapa. */
export function Dock() {
  const game = useGameState();
  const pendingEvents = game.events.pending.length;
  const decisions = pendingDecisions(game).length;
  const badges: Record<string, { n: number; tone: 'bad' | 'gold' }> = {
    eventos: { n: pendingEvents, tone: 'bad' },
    congresso: { n: decisions, tone: 'gold' },
  };
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => isNavItemVisible(i, game)),
  })).filter((g) => g.items.length > 0);

  return (
    <nav
      className="hud-bar absolute bottom-0 left-0 top-14 z-30 flex w-[58px] flex-col items-center overflow-y-auto overflow-x-hidden py-2 [scrollbar-width:none]"
      style={{
        boxShadow:
          'inset -1px 0 0 rgb(199 160 71 / 0.5), 1px 0 0 #03080b, 8px 0 24px -10px rgb(0 0 0 / 0.75)',
      }}
      aria-label="Navegação do jogo"
    >
      <DockLink item={MAP_ITEM} />
      {groups.map((g) => (
        <Fragment key={g.id}>
          <div className="my-1.5 flex w-9 items-center gap-1" aria-hidden>
            <span className="h-px flex-1 bg-gold-500/35" />
            <span className="h-1 w-1 rotate-45 bg-gold-500/70" />
            <span className="h-px flex-1 bg-gold-500/35" />
          </div>
          <ul className="flex w-full flex-col items-center gap-1" aria-label={g.title}>
            {g.items.map((item) => {
              const b = badges[item.path];
              return (
                <li key={item.path} className="w-full">
                  <DockLink
                    item={item}
                    group={g.title}
                    {...(b && b.n > 0 ? { badge: b.n, badgeTone: b.tone } : {})}
                  />
                </li>
              );
            })}
          </ul>
        </Fragment>
      ))}
    </nav>
  );
}
