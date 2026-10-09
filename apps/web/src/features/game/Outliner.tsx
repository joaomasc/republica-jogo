import {
  DECREES,
  formatDateShort,
  getLawOption,
  isBillActive,
  pendingDecisions,
  type Bill,
  type BillStatus,
  type GameState,
  type PendingLegislativeDecision,
  worksOverview,
} from '@republica/game-engine';
import { Bar, cn, Icon, Tooltip } from '@republica/ui';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useGame, useGameState } from '../../store/gameStore';
import { useUi } from '../../store/uiStore';
import { CATEGORY_INFO } from '../events/categories';
import { RaceOverview } from '../map/RaceOverview';
import { OPEN_WEEK_EVENT } from '../week/WeekModal';
import { alertRoute } from './navigation';

const STAGE_LABEL: Record<BillStatus, string> = {
  committee: 'Comissão',
  floor: 'Plenário',
  sanction: 'Sanção',
  veto: 'Veto',
  plebiscite: 'Plebiscito',
  passed: 'Aprovado',
  rejected: 'Rejeitado',
  withdrawn: 'Retirado',
  expired: 'Caducou',
};

const DECISION_ICON: Record<PendingLegislativeDecision['kind'], string> = {
  vote: 'vote',
  sanction: 'file-signature',
  veto_vote: 'file-x',
  impeachment_vote: 'gavel',
  impeachment_defense: 'shield',
};

const ALERT_TONE = {
  info: 'text-info',
  success: 'text-good',
  warning: 'text-warn',
  danger: 'text-bad',
} as const;

const SENTIMENT = { [-1]: 'border-l-bad', 0: 'border-l-ink-400', 1: 'border-l-good' } as const;

function Section({
  id,
  title,
  icon,
  count,
  countTone = 'neutral',
  action,
  children,
}: {
  id: string;
  title: string;
  icon: string;
  count?: number;
  countTone?: 'neutral' | 'warn' | 'bad';
  action?: ReactNode;
  children: ReactNode;
}) {
  const collapsed = useUi((s) => !!s.collapsed[id]);
  const toggle = useUi((s) => s.toggleSection);
  return (
    <section className="border-b border-gold-500/15 last:border-b-0">
      <div className="flex items-center gap-1 px-2.5 pt-2">
        <button
          type="button"
          onClick={() => toggle(id)}
          aria-expanded={!collapsed}
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-[3px] py-1 text-left"
        >
          <Icon name={icon} size={14} className="shrink-0 text-gold-400" />
          <span className="truncate font-display text-[12.5px] font-semibold tracking-[0.05em] text-paper group-hover:text-gold-300">
            {title}
          </span>
          {count !== undefined && count > 0 && (
            <span
              className={cn(
                'rounded-full px-1.5 text-[10px] font-bold leading-4',
                countTone === 'bad'
                  ? 'bg-bad text-ink-950'
                  : countTone === 'warn'
                    ? 'bg-warn text-ink-950'
                    : 'bg-ink-600 text-paper',
              )}
            >
              {count}
            </span>
          )}
          <Icon
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={14}
            className="ml-auto shrink-0 text-muted group-hover:text-paper"
          />
        </button>
        {action}
      </div>
      {!collapsed && <div className="px-2 pb-2.5 pt-1">{children}</div>}
    </section>
  );
}

function Row({
  icon,
  iconClass,
  title,
  sub,
  right,
  onClick,
  highlight,
  children,
}: {
  icon: string;
  iconClass?: string;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  highlight?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-[4px] border px-2 py-1.5 text-left transition',
        highlight
          ? 'border-warn/50 bg-warn/10 hover:bg-warn/15'
          : 'border-transparent bg-ink-950/40 hover:border-gold-500/35 hover:bg-ink-700/60',
      )}
    >
      <div className="flex items-start gap-2">
        <Icon name={icon} size={14} className={cn('mt-0.5 shrink-0 text-gold-400', iconClass)} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold leading-snug text-paper">{title}</div>
          {sub && <div className="truncate text-[11px] leading-snug text-muted">{sub}</div>}
        </div>
        {right && <div className="shrink-0 text-[10.5px] tabular-nums text-muted">{right}</div>}
      </div>
      {children}
    </button>
  );
}

function billTitle(bill: Bill): string {
  const option = getLawOption(bill.categoryId, bill.optionId);
  return option ? `${bill.number} · ${option.name}` : bill.number;
}

function billStage(game: GameState, bill: Bill): string {
  const step = bill.path?.[bill.stepIndex];
  const chamber = step ? game.congress.chambers.find((c) => c.id === step.chamberId) : undefined;
  const stage = STAGE_LABEL[bill.status];
  const round = step && step.rounds > 1 ? ` · ${bill.round}º turno` : '';
  return chamber && (bill.status === 'committee' || bill.status === 'floor')
    ? `${stage} · ${chamber.name}${round}`
    : stage;
}

/** Itens do outliner que pedem decisão do jogador (eventos, reunião, debate, Legislativo). */
function useDecisionItems(game: GameState) {
  const navigate = useNavigate();
  const items: {
    key: string;
    icon: string;
    title: string;
    sub: string;
    right?: string;
    onClick: () => void;
    highlight: boolean;
  }[] = [];
  for (const ev of game.events.pending)
    items.push({
      key: `ev-${ev.instanceId}`,
      icon: CATEGORY_INFO[ev.category]?.icon ?? 'flame',
      title: ev.title,
      sub: 'Evento aguardando decisão',
      onClick: () => navigate('/jogo/eventos'),
      highlight: true,
    });
  if (game.phase === 'campaign' && game.campaign?.week?.pending)
    items.push({
      key: 'week',
      icon: 'calendar-check',
      title: `Reunião da semana ${game.campaign.week.index}`,
      sub: 'Escolha a jogada da semana',
      onClick: () => window.dispatchEvent(new Event(OPEN_WEEK_EVENT)),
      highlight: true,
    });
  const debate = game.election?.debates.find(
    (d) => d.status === 'scheduled' && d.date === game.date,
  );
  if (debate && game.phase === 'campaign')
    items.push({
      key: 'debate',
      icon: 'mic-vocal',
      title: `Debate hoje: ${debate.host}`,
      sub: 'Participe ou recuse',
      onClick: () => navigate('/jogo/eleicao'),
      highlight: true,
    });
  for (const [i, d] of pendingDecisions(game).entries())
    items.push({
      key: `leg-${d.billId ?? 'x'}-${d.kind}-${i}`,
      icon: DECISION_ICON[d.kind] ?? 'gavel',
      title: d.title,
      sub: d.description,
      right: formatDateShort(d.deadline),
      onClick: () => navigate('/jogo/congresso'),
      highlight: d.blocking,
    });
  return items;
}

/** Outliner à direita (estilo Victoria 3): decisões, tramitação, obras, decretos, alertas e notícias. */
export function Outliner({ forceCollapsed = false }: { forceCollapsed?: boolean }) {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const navigate = useNavigate();
  const open = useUi((s) => s.outlinerOpen) && !forceCollapsed;
  const setOpen = useUi((s) => s.setOutlinerOpen);

  const decisions = useDecisionItems(game);
  const bills = [
    ...game.laws.bills.filter(isBillActive).map((b) => ({ bill: b, federal: false })),
    ...(game.nation?.federalLaws && game.nation.federalLaws !== game.laws
      ? game.nation.federalLaws.bills.filter(isBillActive).map((b) => ({ bill: b, federal: true }))
      : []),
  ].sort((a, b) => a.bill.nextDate.localeCompare(b.bill.nextDate));
  const worksOv = worksOverview(game);
  const works = [...worksOv.mine, ...worksOv.local];
  const decrees = game.executive?.decrees ?? [];
  const unread = game.alerts.filter((a) => !a.read);
  const inRace =
    !!game.election &&
    (game.phase === 'campaign' || game.phase === 'election_day' || game.phase === 'results');

  if (!open) {
    const pins = [
      { icon: 'bell', n: decisions.length, tone: 'bg-warn text-ink-950', label: 'Decisões' },
      { icon: 'scroll-text', n: bills.length, tone: 'bg-ink-500 text-paper', label: 'Projetos' },
      { icon: 'construction', n: works.length, tone: 'bg-ink-500 text-paper', label: 'Obras' },
      { icon: 'triangle-alert', n: unread.length, tone: 'bg-bad text-ink-950', label: 'Alertas' },
    ];
    return (
      <aside
        className="hud-surface pointer-events-auto flex w-10 flex-col items-center gap-1.5 rounded-[6px] py-2"
        aria-label="Outliner (recolhido)"
      >
        <Tooltip side="left" content={forceCollapsed ? 'Janela estreita: amplie para ver o outliner' : 'Abrir outliner'}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={forceCollapsed}
            aria-label="Abrir outliner"
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-gold-300 transition hover:bg-ink-600 disabled:opacity-40"
          >
            <Icon name="panel-right-open" size={16} />
          </button>
        </Tooltip>
        {pins.map((p) => (
          <Tooltip key={p.icon} side="left" content={`${p.label}: ${p.n}`}>
            <span className="relative flex h-7 w-7 items-center justify-center text-paper/70">
              <Icon name={p.icon} size={15} />
              {p.n > 0 && (
                <span
                  className={cn(
                    'absolute -right-1 -top-1 min-w-4 rounded-full px-1 text-center text-[9px] font-bold leading-4',
                    p.tone,
                  )}
                >
                  {p.n}
                </span>
              )}
            </span>
          </Tooltip>
        ))}
      </aside>
    );
  }

  return (
    <aside
      className="hud-surface pointer-events-auto flex min-h-0 w-[304px] flex-col rounded-[6px]"
      aria-label="Outliner"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-gold-500/30 px-3 py-2">
        <Icon name="layers" size={15} className="text-gold-400" />
        <h2 className="flex-1 font-display text-[13.5px] font-bold tracking-[0.08em] text-gold-300">
          Panorama
        </h2>
        <Tooltip side="left" content="Recolher outliner">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Recolher outliner"
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-paper/70 transition hover:bg-ink-600 hover:text-paper"
          >
            <Icon name="panel-right-close" size={16} />
          </button>
        </Tooltip>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {decisions.length > 0 && (
          <Section id="decisions" title="Decisões pendentes" icon="bell" count={decisions.length} countTone="warn">
            <div className="space-y-1">
              {decisions.map((d) => (
                <Row
                  key={d.key}
                  icon={d.icon}
                  iconClass={d.highlight ? 'text-warn' : undefined}
                  title={d.title}
                  sub={d.sub}
                  right={d.right}
                  onClick={d.onClick}
                  highlight={d.highlight}
                />
              ))}
            </div>
          </Section>
        )}

        {inRace && (
          <Section id="race" title="Disputa" icon="vote">
            <RaceOverview limit={5} />
          </Section>
        )}

        {bills.length > 0 && (
          <Section id="bills" title="Projetos em tramitação" icon="scroll-text" count={bills.length}>
            <div className="space-y-1">
              {bills.slice(0, 6).map(({ bill, federal }) => (
                <Row
                  key={`${federal ? 'f' : 'l'}-${bill.id}`}
                  icon={bill.instrument === 'pec' ? 'landmark' : bill.instrument === 'mp' ? 'stamp' : 'scroll-text'}
                  title={billTitle(bill)}
                  sub={`${federal ? 'Federal · ' : ''}${billStage(game, bill)}`}
                  right={formatDateShort(bill.nextDate)}
                  onClick={() => navigate('/jogo/leis')}
                />
              ))}
              {bills.length > 6 && (
                <div className="px-2 text-[11px] text-muted">e mais {bills.length - 6} proposição(ões)…</div>
              )}
            </div>
          </Section>
        )}

        {works.length > 0 && (
          <Section id="works" title="Obras" icon="construction" count={works.length}>
            <div className="space-y-1">
              {works.slice(0, 5).map((w) => (
                <Row
                  key={w.id}
                  icon={w.icon}
                  iconClass={w.player ? 'text-gold-400' : undefined}
                  title={w.name}
                  sub={`${w.player ? 'Sua obra' : w.sponsor} · ${w.stateName}`}
                  right={w.status === 'stalled' ? 'parada' : `${Math.round(w.progress * 100)}%`}
                  onClick={() => navigate('/jogo/obras')}
                >
                  <Bar value={w.progress} height={4} className="mt-1" />
                </Row>
              ))}
              {works.length > 5 && (
                <div className="px-2 text-[11px] text-muted">e mais {works.length - 5} obra(s)…</div>
              )}
            </div>
          </Section>
        )}

        {decrees.length > 0 && (
          <Section id="decrees" title="Decretos ativos" icon="stamp" count={decrees.length}>
            <div className="space-y-1">
              {decrees.slice(0, 6).map((d) => (
                <Row
                  key={d.id}
                  icon={DECREES[d.kind]?.icon ?? 'stamp'}
                  iconClass={d.suspended ? 'text-bad' : undefined}
                  title={d.label}
                  sub={
                    d.suspended
                      ? 'Suspenso pelo STF'
                      : d.expiresOn
                        ? `Vigente até ${formatDateShort(d.expiresOn)}`
                        : 'Vigente até ser revogado'
                  }
                  onClick={() => navigate('/jogo/decretos')}
                />
              ))}
            </div>
          </Section>
        )}

        <Section
          id="alerts"
          title="Alertas"
          icon="triangle-alert"
          count={unread.length}
          countTone="bad"
          action={
            unread.length > 0 ? (
              <button
                type="button"
                className="shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10.5px] text-muted transition hover:bg-ink-600 hover:text-paper"
                onClick={() => act({ type: 'alerts/read' })}
              >
                marcar lidos
              </button>
            ) : undefined
          }
        >
          <ul className="space-y-1" data-testid="alerts">
            {game.alerts.slice(0, 6).map((a) => {
              const route = alertRoute(a.link);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => route && navigate(route)}
                    className={cn(
                      'w-full rounded-[4px] border bg-ink-950/40 px-2 py-1.5 text-left transition hover:bg-ink-700/60',
                      a.read ? 'border-transparent' : 'border-gold-500/35',
                    )}
                  >
                    <div className={cn('text-[12px] font-semibold leading-snug', ALERT_TONE[a.severity])}>
                      {a.title}
                    </div>
                    <div className="text-[11px] leading-snug text-muted">{a.message}</div>
                  </button>
                </li>
              );
            })}
            {game.alerts.length === 0 && <li className="px-1 text-xs text-muted">Nenhum alerta.</li>}
          </ul>
        </Section>

        <Section id="news" title="Notícias" icon="newspaper">
          <ul className="space-y-1.5" data-testid="news-feed">
            {game.media.news.slice(0, 12).map((n) => (
              <li
                key={n.id}
                className={cn('rounded-[4px] border-l-[3px] bg-ink-950/40 px-2.5 py-1.5', SENTIMENT[n.sentiment])}
              >
                <div className="text-[10px] uppercase tracking-[0.08em] text-muted">
                  {n.outlet} · {formatDateShort(n.date)}
                </div>
                <div className="font-serif text-[13px] font-semibold leading-snug text-paper">
                  {n.headline}
                </div>
              </li>
            ))}
            {game.media.news.length === 0 && <li className="px-1 text-xs text-muted">Sem notícias.</li>}
          </ul>
        </Section>
      </div>
    </aside>
  );
}
