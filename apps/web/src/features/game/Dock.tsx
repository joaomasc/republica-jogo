import { pendingDecisions } from '@republica/game-engine';
import { cn, Icon, Tooltip } from '@republica/ui';
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router';
import { useGameState } from '../../store/gameStore';
import { DOCK, DOCK_DENSE, LAYOUT, planDock, useViewportHeight } from './layout';
import {
  isNavItemVisible,
  MAP_ITEM,
  NAV_GROUPS,
  primaryGroupId,
  scopedItem,
  type NavGroup,
  type NavItem,
} from './navigation';

type Badge = { n: number; tone: 'bad' | 'gold' };

const BADGE_TONE = { bad: 'bg-bad text-ink-950', gold: 'bg-gold-500 text-ink-950' };

function badgeText(item: NavItem, n: number): string {
  return `${n} ${item.path === 'eventos' ? 'evento(s) aguardando decisão' : 'decisão(ões) pendente(s)'}`;
}

function CountBadge({ badge, className }: { badge: Badge; className?: string }) {
  return (
    <span
      className={cn(
        'min-w-4 rounded-full px-1 text-center text-[10px] font-bold leading-4',
        BADGE_TONE[badge.tone],
        className,
      )}
    >
      {badge.n}
    </span>
  );
}

function DockLink({
  item,
  group,
  badge,
  dense = false,
}: {
  item: NavItem;
  group?: string;
  badge?: Badge;
  dense?: boolean;
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
          {badge ? <div className="text-paper/85">{badgeText(item, badge.n)}</div> : null}
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
            'relative flex items-center justify-center rounded-[5px] transition',
            dense ? 'h-[34px] w-[34px]' : 'h-[38px] w-[38px]',
            isActive
              ? 'dock-item-active text-gold-300'
              : 'text-paper/70 hover:bg-ink-700/80 hover:text-paper',
          )
        }
      >
        <Icon name={item.icon} size={18} />
        {badge ? (
          <CountBadge badge={badge} className="absolute -right-1 -top-1 ring-2 ring-ink-900" />
        ) : null}
      </NavLink>
    </Tooltip>
  );
}

/**
 * Grupo recolhido (telas baixas): um botão com o ícone do grupo que abre a lista dos painéis,
 * com nome por extenso, ao lado do dock.
 */
function DockGroupMenu({
  group,
  items,
  badges,
  dense,
}: {
  group: NavGroup;
  items: NavItem[];
  badges: Record<string, Badge>;
  dense: boolean;
}) {
  const location = useLocation();
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  // A lista vale para a rota em que foi aberta: ao navegar, fecha sozinha.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === location.pathname;
  const setOpen = (value: boolean) => setOpenAt(value ? location.pathname : null);
  const [top, setTop] = useState(0);
  const active = items.some((i) => location.pathname.startsWith(`/jogo/${i.path}`));
  const total = items.reduce((sum, i) => sum + (badges[i.path]?.n ?? 0), 0);
  const tone = items.some((i) => (badges[i.path]?.n ?? 0) > 0 && badges[i.path]?.tone === 'bad')
    ? 'bad'
    : 'gold';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menu.current?.contains(target) && !button.current?.contains(target)) setOpenAt(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setOpenAt(null);
      button.current?.focus();
    };
    const close = () => setOpenAt(null);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  // Alinha a lista ao botão sem passar da borda de baixo da janela.
  useLayoutEffect(() => {
    if (!open || !button.current || !menu.current) return;
    const rect = button.current.getBoundingClientRect();
    const height = menu.current.offsetHeight;
    setTop(Math.max(LAYOUT.topBar + 4, Math.min(rect.top - 6, window.innerHeight - height - 8)));
  }, [open]);

  return (
    <>
      <Tooltip
        side="right"
        className="w-full justify-center"
        content={
          open ? null : (
            <div>
              <div className="font-display text-[13px] font-semibold tracking-[0.04em] text-gold-300">
                {group.title}
              </div>
              <div className="text-paper/85">{items.map((i) => i.label).join(' · ')}</div>
            </div>
          )
        }
      >
        <button
          ref={button}
          type="button"
          onClick={() => setOpen(!open)}
          aria-label={group.title}
          aria-haspopup="menu"
          aria-expanded={open}
          data-testid={`nav-group-${group.id}`}
          className={cn(
            'relative flex items-center justify-center rounded-[5px] transition',
            dense ? 'h-[34px] w-[34px]' : 'h-[38px] w-[38px]',
            active || open
              ? 'dock-item-active text-gold-300'
              : 'text-paper/70 hover:bg-ink-700/80 hover:text-paper',
          )}
        >
          <Icon name={group.icon} size={18} />
          {/* Canto dobrado: indica que o botão abre uma lista. */}
          <span
            className="absolute bottom-[3px] right-[3px] h-0 w-0 border-b-[5px] border-l-[5px] border-b-gold-400/80 border-l-transparent"
            aria-hidden
          />
          {total > 0 && (
            <CountBadge
              badge={{ n: total, tone }}
              className="absolute -right-1 -top-1 ring-2 ring-ink-900"
            />
          )}
        </button>
      </Tooltip>
      {open &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            aria-label={group.title}
            className="hud-surface fixed z-[90] w-60 rounded-[6px] p-1.5 animate-fade-in"
            style={{ left: LAYOUT.dock + 6, top }}
          >
            <div className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              {group.title}
            </div>
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => {
                const badge = badges[item.path];
                return (
                  <li key={item.path}>
                    <NavLink
                      to={`/jogo/${item.path}`}
                      role="menuitem"
                      data-testid={`nav-${item.path}`}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 rounded-[4px] px-2 py-1.5 text-[13px] transition',
                          isActive
                            ? 'dock-item-active text-gold-300'
                            : 'text-paper/85 hover:bg-ink-700/80 hover:text-paper',
                        )
                      }
                    >
                      <Icon name={item.icon} size={16} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {badge && badge.n > 0 && <CountBadge badge={badge} />}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Dock vertical de ícones (substitui a navegação lateral): cada item abre um painel sobre o mapa.
 * Em telas baixas, grupos inteiros viram um botão com lista para nada ficar escondido.
 */
export function Dock() {
  const game = useGameState();
  const height = useViewportHeight();
  const pendingEvents = game.events.pending.length;
  const decisions = pendingDecisions(game).length;
  const badges: Record<string, Badge> = {};
  if (pendingEvents > 0) badges.eventos = { n: pendingEvents, tone: 'bad' };
  if (decisions > 0) badges.congresso = { n: decisions, tone: 'gold' };
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => isNavItemVisible(i, game)).map((i) => scopedItem(i, game)),
  })).filter((g) => g.items.length > 0);
  const sizes = groups.map((g) => ({ id: g.id, size: g.items.length }));
  const available = height - LAYOUT.topBar;
  // Primeiro tenta caber com o tamanho normal; se não der, adensa antes de recolher grupos.
  const dense = planDock(sizes, available, primaryGroupId(game.phase), DOCK).size > 0;
  const collapsed = planDock(
    sizes,
    available,
    primaryGroupId(game.phase),
    dense ? DOCK_DENSE : DOCK,
  );

  return (
    <nav
      className={cn(
        'hud-bar absolute bottom-0 left-0 top-14 z-30 flex w-[58px] flex-col items-center overflow-y-auto overflow-x-hidden [scrollbar-width:none]',
        dense ? 'py-1.5' : 'py-2',
      )}
      style={{
        boxShadow:
          'inset -1px 0 0 rgb(199 160 71 / 0.5), 1px 0 0 #03080b, 8px 0 24px -10px rgb(0 0 0 / 0.75)',
      }}
      aria-label="Navegação do jogo"
    >
      <DockLink item={MAP_ITEM} dense={dense} />
      {groups.map((g) => (
        <Fragment key={g.id}>
          <div
            className={cn('flex w-9 items-center gap-1', dense ? 'my-[3px]' : 'my-1.5')}
            aria-hidden
          >
            <span className="h-px flex-1 bg-gold-500/35" />
            <span className="h-1 w-1 rotate-45 bg-gold-500/70" />
            <span className="h-px flex-1 bg-gold-500/35" />
          </div>
          {collapsed.has(g.id) ? (
            <div className="flex w-full justify-center">
              <DockGroupMenu group={g} items={g.items} badges={badges} dense={dense} />
            </div>
          ) : (
            <ul
              className={cn('flex w-full flex-col items-center', dense ? 'gap-0.5' : 'gap-1')}
              aria-label={g.title}
            >
              {g.items.map((item) => (
                <li key={item.path} className="w-full">
                  <DockLink
                    item={item}
                    group={g.title}
                    dense={dense}
                    {...(badges[item.path] ? { badge: badges[item.path] } : {})}
                  />
                </li>
              ))}
            </ul>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
