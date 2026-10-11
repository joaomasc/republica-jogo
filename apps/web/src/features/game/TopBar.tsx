import {
  blockingReason,
  budgetTotals,
  formatDateLong,
  formatMoney,
  OFFICES,
  PARODY_DISCLAIMER,
  topBarMetrics,
  type GameState,
  localScope,
  streetView,
} from '@republica/game-engine';
import { Badge, cn, Icon, Tooltip, type Tone } from '@republica/ui';
import {
  Children,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { NationEmblem } from '../../components/NationEmblem';
import { num, PHASE_LABELS, pct } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';
import { GAME_SPEEDS, useSettings } from '../../store/settingsStore';
import { useUi } from '../../store/uiStore';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'text-paper',
  good: 'text-good',
  bad: 'text-bad',
  warn: 'text-warn',
  info: 'text-info',
  gold: 'text-gold-300',
};

interface ReadingProps {
  icon: string;
  label: string;
  value: string;
  tone?: Tone;
  sub?: ReactNode;
  /** Explicação para a dica. */
  hint: string;
  /** Linhas extras na dica (variação, composição...). */
  details?: ReactNode;
  testId?: string;
  className?: string;
}

/** Leitura da barra superior: ícone + valor, com dica rica. */
function Reading({ icon, label, value, tone = 'neutral', sub, hint, details, testId, className }: ReadingProps) {
  return (
    <Tooltip
      side="bottom"
      className={cn('shrink-0', className)}
      content={
        <div className="min-w-52 space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-[13px] font-semibold tracking-[0.04em] text-gold-300">
              {label}
            </span>
            <span className={cn('text-sm font-semibold tabular-nums', TONE_CLASS[tone])}>{value}</span>
          </div>
          {details && <div className="space-y-0.5 text-paper/85">{details}</div>}
          <div className="border-t border-gold-500/20 pt-1 text-muted">{hint}</div>
        </div>
      }
    >
      <div
        className="flex h-11 items-center gap-1.5 rounded-[4px] px-2 transition hover:bg-white/[0.045]"
        data-testid={testId}
        tabIndex={0}
        aria-label={`${label}: ${value}`}
      >
        <Icon name={icon} size={16} className="shrink-0 text-gold-400" />
        <div className="leading-none">
          <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</div>
          <div className="mt-[3px] flex items-baseline gap-1 whitespace-nowrap">
            <span className={cn('text-[14px] font-semibold tabular-nums', TONE_CLASS[tone])}>
              {value}
            </span>
            {sub}
          </div>
        </div>
      </div>
    </Tooltip>
  );
}

function Divider() {
  return <span className="mx-0.5 h-7 w-px shrink-0 bg-gradient-to-b from-transparent via-gold-500/45 to-transparent" aria-hidden />;
}

function signed(v: number, digits = 1): string {
  if (!Number.isFinite(v)) return '—';
  // O sinal vem do valor arredondado: -0,04 aparece como "±0,0", nunca "−0,0".
  const rounded = Math.round(Math.abs(v) * 10 ** digits) / 10 ** digits;
  return `${rounded === 0 ? '±' : v > 0 ? '+' : '−'}${num(rounded, digits)}`;
}

function DeltaLine({ label, delta, unit, invert }: { label: string; delta: number; unit: string; invert?: boolean }) {
  const good = invert ? delta < 0 : delta > 0;
  const tone = Math.abs(delta) < 0.05 ? 'text-muted' : good ? 'text-good' : 'text-bad';
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className={cn('font-semibold tabular-nums', tone)}>
        {signed(delta)}
        {unit}
      </span>
    </div>
  );
}

/** Controle compacto de velocidade (pausa + 5 marcas), à direita da data. */
function SpeedIndicator({ game }: { game: GameState }) {
  const playing = useUi((s) => s.playing);
  const togglePlaying = useUi((s) => s.togglePlaying);
  const speed = useSettings((s) => s.gameSpeed);
  const update = useSettings((s) => s.update);
  const timeFlows =
    game.phase === 'campaign' || game.phase === 'governing' || game.phase === 'legislating';
  const blocked = blockingReason(game);
  return (
    <div className="flex items-center gap-1.5">
      <Tooltip side="bottom" content={playing ? 'Pausar (Espaço)' : 'Avançar o tempo (Espaço)'}>
        <button
          type="button"
          onClick={togglePlaying}
          disabled={!timeFlows || (!!blocked && !playing)}
          aria-label={playing ? 'Pausar' : 'Avançar o tempo'}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full border transition disabled:opacity-40',
            playing
              ? 'border-gold-300/80 bg-gold-500 text-ink-950'
              : 'border-gold-500/50 bg-ink-800 text-gold-300 hover:bg-ink-600',
          )}
        >
          <Icon name={playing ? 'pause' : 'play'} size={13} />
        </button>
      </Tooltip>
      <div className="flex items-end gap-[3px]" role="radiogroup" aria-label="Velocidade">
        {GAME_SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={speed === s}
            aria-label={`Velocidade ${s}`}
            title={`Velocidade ${s} (tecla ${s})`}
            onClick={() => update({ gameSpeed: s })}
            className="group flex h-6 items-end px-[1.5px]"
          >
            <span
              className={cn(
                'block w-[5px] rounded-[1px] transition',
                s <= speed
                  ? playing
                    ? 'bg-gold-300'
                    : 'bg-gold-500'
                  : 'bg-ink-500/70 group-hover:bg-ink-400',
              )}
              style={{ height: 6 + s * 3 }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Barra superior estilo Victoria 3: país, leituras da nação, data e velocidade, menu. */
/** Largura reservada para o botão "+N" quando nem tudo cabe. */
const MORE_BUTTON = 48;
const FIT_GAP = 2;

/**
 * Linha de leituras que mostra só o que cabe, na ordem (as primeiras são as mais importantes);
 * o resto vai para um botão "+N" com a lista completa. Nada fica cortado pela metade.
 */
function FitRow({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const row = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const widths = useRef(new Map<string, number>());
  const [visible, setVisible] = useState(items.length);
  /** Posição do botão "+N" quando a lista está aberta (null = fechada). */
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const open = anchor !== null;
  const setOpen = (value: boolean) =>
    setAnchor(value && more.current ? more.current.getBoundingClientRect() : null);
  const keys = items.map((item, i) =>
    isValidElement(item) && item.key !== null ? String(item.key) : String(i),
  );
  const isDivider = (item: ReactNode) => isValidElement(item) && item.type === Divider;

  const measure = useRef(() => {});
  // Mede a cada renderização (valores mudam de largura) e quando a janela muda.
  useLayoutEffect(() => {
    measure.current = () => {
      const el = row.current;
      if (!el) return;
      el.querySelectorAll<HTMLElement>(':scope > [data-fit]').forEach((cell) => {
        if (cell.offsetWidth > 0)
          widths.current.set(cell.dataset.fit ?? '', cell.offsetWidth + FIT_GAP);
      });
      const width = (k: string) => widths.current.get(k) ?? 0;
      const available = el.clientWidth;
      if (keys.reduce((sum, k) => sum + width(k), 0) <= available) {
        setVisible(items.length);
        return;
      }
      let used = MORE_BUTTON;
      let n = 0;
      for (const k of keys) {
        if (used + width(k) > available) break;
        used += width(k);
        n += 1;
      }
      setVisible(n);
    };
    measure.current();
  });
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const observer = new ResizeObserver(() => measure.current());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menu.current?.contains(target) && !more.current?.contains(target)) setOpen(false);
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

  // Um divisor sozinho no fim da parte visível também some.
  let shown = visible;
  while (shown > 0 && isDivider(items[shown - 1])) shown -= 1;
  const hidden = items.slice(visible).filter((item) => !isDivider(item));

  return (
    <div ref={row} className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden px-1">
      {items.map((item, i) => (
        <div key={keys[i]} data-fit={keys[i]} className={cn('shrink-0', i >= shown && 'hidden')}>
          {item}
        </div>
      ))}
      {hidden.length > 0 && (
        <Tooltip side="bottom" content={open ? null : 'Mais indicadores'}>
          <button
            ref={more}
            type="button"
            onClick={() => setOpen(!open)}
            aria-haspopup="true"
            aria-expanded={open}
            data-testid="metrics-more"
            className="flex h-9 shrink-0 items-center gap-0.5 rounded-[4px] border border-gold-500/30 px-2 text-[12px] font-semibold text-gold-300 transition hover:border-gold-400/70 hover:bg-ink-700"
          >
            +{hidden.length}
            <Icon name="chevron-down" size={13} />
          </button>
        </Tooltip>
      )}
      {anchor &&
        createPortal(
          <div
            ref={menu}
            className="hud-surface fixed z-[90] flex flex-col gap-0.5 rounded-[6px] p-1.5 animate-fade-in"
            style={{
              top: anchor.bottom + 6,
              left: Math.max(8, Math.min(anchor.left, window.innerWidth - 248)),
            }}
          >
            {hidden}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function TopBar() {
  const game = useGameState();
  const save = useGame((s) => s.save);
  const toast = useGame((s) => s.toast);
  const exit = useGame((s) => s.exit);
  const navigate = useNavigate();
  const m = topBarMetrics(game);
  const officeId = game.election?.officeId ?? game.government?.officeId;
  const jurisdiction = game.election?.jurisdiction.label ?? game.government?.jurisdiction.label;
  const identity = game.nation?.identity;
  const officialName = identity?.officialName ?? 'República Federativa do Brasil';
  const systemLabel = identity?.systemLabel ?? '';
  const e = game.economy;
  const scope = localScope(game);
  const local = scope.kind !== 'country';
  const street = streetView(game);
  const prev = e.history.length >= 2 ? e.history[e.history.length - 2] : undefined;
  const gov = game.government;
  const budget = gov?.budget ?? null;
  const monthly = budget ? budgetTotals(budget).balance / 12 : null;
  const legitimacy = game.nation?.legitimacy ?? null;

  const quickSave = async () => {
    try {
      await save();
      toast({ tone: 'good', title: 'Jogo salvo!' });
    } catch (err) {
      toast({ tone: 'bad', title: err instanceof Error ? err.message : 'Falha ao salvar' });
    }
  };

  const exportFile = () => {
    const blob = new Blob(
      [
        JSON.stringify({
          format: 'republica-save',
          version: game.meta.version,
          savedAt: new Date().toISOString(),
          state: game,
        }),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `republica-${game.meta.id}-${game.date}.json`;
    a.click();
    // Revoga depois do clique: alguns navegadores ainda leem o blob ao iniciar o download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const iconBtn =
    'flex h-8 w-8 items-center justify-center rounded-[4px] border border-transparent text-paper/80 transition hover:border-gold-500/40 hover:bg-ink-700 hover:text-gold-300';

  return (
    <header className="hud-bar absolute inset-x-0 top-0 z-40 flex h-14 items-center gap-1 pr-2">
      {/* País */}
      <div className="flex h-full shrink-0 items-center gap-2.5 border-r border-gold-500/25 pl-2 pr-3">
        <Tooltip
          side="bottom"
          content={
            <div className="max-w-64">
              <div className="font-display text-[13px] text-gold-300">{officialName}</div>
              {systemLabel && <div className="text-paper/85">{systemLabel}</div>}
              {identity?.description && <div className="mt-1 text-muted">{identity.description}</div>}
              <div className="mt-1 text-muted">Clique para ver só o mapa.</div>
            </div>
          }
        >
          <button
            type="button"
            onClick={() => navigate('/jogo')}
            aria-label="Mapa"
            className="rounded-full transition hover:brightness-110"
          >
            <NationEmblem size={42} {...(identity?.color ? { color: identity.color } : {})} />
          </button>
        </Tooltip>
        <button
          type="button"
          onClick={() => navigate('/jogo/nacao')}
          className="hidden min-w-0 max-w-[290px] text-left leading-tight min-[1360px]:block"
          aria-label={`Nação: ${officialName}`}
        >
          <div className="truncate font-display text-[13px] font-bold tracking-[0.05em] text-gold-300">
            {officialName}
          </div>
          <div className="truncate text-[10.5px] text-muted">{systemLabel}</div>
        </button>
      </div>

      {/* Leituras */}
      <FitRow>
        <Reading
          key="pib"
          icon="landmark"
          label={local ? `PIB ${scope.ofName}` : 'PIB'}
          value={local ? `R$ ${num(scope.gdp, 0)} bi` : `R$ ${num(e.gdp / 1000)} tri`}
          sub={
            <span className={cn('text-[11px] font-semibold tabular-nums', scope.growth >= 0 ? 'text-good' : 'text-bad')}>
              {signed(scope.growth)}%
            </span>
          }
          hint={
            local
              ? `PIB anual ${scope.estimated ? 'estimado ' : ''}${scope.ofName} e crescimento. Brasil: R$ ${num(e.gdp / 1000)} tri.`
              : 'Produto Interno Bruto nominal anual e crescimento real anualizado.'
          }
          details={
            <>
              {local && (
                <div className="flex justify-between gap-3">
                  <span>Brasil</span>
                  <span className="font-semibold tabular-nums">
                    R$ {num(e.gdp / 1000)} tri · {signed(e.growth)}%
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span>Crescimento</span>
                <span className="font-semibold tabular-nums">{signed(e.growth)}% a.a.</span>
              </div>
              {prev && <DeltaLine label="Variação no mês" delta={e.growth - prev.growth} unit=" p.p." />}
              <div className="flex justify-between gap-3">
                <span>Juros (Selic)</span>
                <span className="font-semibold tabular-nums">{num(e.interestRate)}%</span>
              </div>
            </>
          }
        />
        <Reading
          key="inflacao"
          icon="thermometer"
          label="Inflação"
          value={`${num(e.inflation)}%`}
          tone={e.inflation > 6 ? 'bad' : e.inflation > 4.5 ? 'warn' : 'neutral'}
          hint={local ? 'Inflação anual do Brasil (a mesma para todo o país).' : 'Inflação anual (IPCA do modelo).'}
          details={prev && <DeltaLine label="Variação no mês" delta={e.inflation - prev.inflation} unit=" p.p." invert />}
        />
        <Reading
          key="desemprego"
          icon="user-x"
          label={local ? `Desemprego ${scope.ofName}` : 'Desemprego'}
          value={`${num(local ? scope.unemployment : e.unemployment)}%`}
          tone={(local ? scope.unemployment : e.unemployment) > 11 ? 'bad' : (local ? scope.unemployment : e.unemployment) > 8 ? 'warn' : 'neutral'}
          hint={
            local
              ? `Desempregados sobre a força de trabalho ${scope.ofName}${scope.estimated ? ' (estimado a partir do estado; suas obras contam aqui)' : ''}.`
              : 'Desempregados sobre a força de trabalho.'
          }
          details={
            <>
              {local && (
                <>
                  <div className="flex justify-between gap-3">
                    <span>No início do jogo</span>
                    <span className="font-semibold tabular-nums">{num(scope.unemployment0)}%</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Brasil</span>
                    <span className="font-semibold tabular-nums">{num(e.unemployment)}%</span>
                  </div>
                </>
              )}
              {!local && prev && <DeltaLine label="Variação no mês" delta={e.unemployment - prev.unemployment} unit=" p.p." invert />}
            </>
          }
        />
        {street.active && (
          <Reading
            key="ruas"
            icon="flame"
            label="Ruas"
            value={street.stageName}
            tone={street.stage >= 4 ? 'bad' : street.stage >= 2 ? 'warn' : 'neutral'}
            hint={`Clima nas ruas ${local ? scope.ofName : 'do país'}: ${street.heat}/100. Causas e respostas no Gabinete.`}
            details={
              <>
                {street.factors.slice(0, 4).map((f) => (
                  <div key={f.label} className="flex justify-between gap-3">
                    <span>{f.label}</span>
                    <span className="font-semibold tabular-nums">{f.value > 0 ? '+' : ''}{f.value}</span>
                  </div>
                ))}
              </>
            }
          />
        )}
        <Divider key="divisor" />
        {m.money !== null && (
          <Reading
            key="caixa"
            icon={budget ? 'banknote' : 'piggy-bank'}
            label={budget ? 'Tesouro' : 'Caixa'}
            value={formatMoney(m.money)}
            tone={m.money < 0 ? 'bad' : 'neutral'}
            sub={
              monthly !== null ? (
                <span className={cn('text-[11px] font-semibold tabular-nums', monthly >= 0 ? 'text-good' : 'text-bad')}>
                  {signed(monthly)} bi/mês
                </span>
              ) : undefined
            }
            hint={
              budget
                ? 'Saldo acumulado do orçamento no mandato e resultado mensal estimado (receita − gasto planejado).'
                : 'Recursos disponíveis da campanha.'
            }
            details={
              budget ? (
                <>
                  <div className="flex justify-between gap-3">
                    <span>Receita anual</span>
                    <span className="tabular-nums">R$ {num(budgetTotals(budget).revenue)} bi</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Gasto planejado</span>
                    <span className="tabular-nums">R$ {num(budgetTotals(budget).spending)} bi</span>
                  </div>
                </>
              ) : (
                <div>{m.moneyLabel}</div>
              )
            }
            testId="metric-money"
          />
        )}
        {m.intention !== null && (
          <Reading
            key="intencao"
            icon="vote"
            label="Intenção"
            value={`${pct(m.intention)}${m.intentionRank ? ` · ${m.intentionRank}º` : ''}`}
            tone="gold"
            hint="Intenção de voto na pesquisa mais recente (com margem de erro)."
            testId="metric-intention"
          />
        )}
        {m.approval !== null && (
          <Reading
            key="aprovacao"
            icon="badge-check"
            label="Aprovação"
            value={`${m.approval}%`}
            tone={m.approval >= 50 ? 'good' : m.approval >= 35 ? 'warn' : 'bad'}
            hint="Aprovação do seu mandato."
          />
        )}
        {legitimacy !== null && (
          <Reading
            key="legitimidade"
            icon="scale"
            label="Legitimidade"
            value={`${Math.round(legitimacy)}`}
            tone={legitimacy < 35 ? 'bad' : legitimacy < 50 ? 'warn' : 'neutral'}
            hint="Legitimidade do regime e das instituições (0–100). Baixa → greves, crises e impeachment."
          />
        )}
        {gov && (
          <Reading
            key="capital"
            icon="hand-coins"
            label="Capital"
            value={`${Math.round(gov.politicalCapital)}`}
            tone="gold"
            hint="Capital político: moeda das negociações, decretos e reformas."
          />
        )}
        <Reading
          key="estabilidade"
          icon="gauge"
          label={gov ? 'Estabilidade' : 'Unidade'}
          value={`${m.stability}`}
          tone={m.stability < 40 ? 'bad' : 'neutral'}
          hint={gov ? 'Estabilidade política do mandato (0–100).' : 'Coesão interna do seu partido (0–100).'}
        />
        <Reading
          key="popularidade"
          icon="star"
          label="Popularidade"
          value={`${m.popularity}`}
          hint="Popularidade pessoal (0–100)."
        />
      </FitRow>

      {/* Data e velocidade */}
      <div className="flex shrink-0 items-center gap-2">
        {game.settings.world === 'parody' && (
          <Tooltip side="bottom" content={PARODY_DISCLAIMER}>
            <Badge tone="warn">Paródia</Badge>
          </Tooltip>
        )}
        {m.daysToElection !== null && game.phase === 'campaign' && (
          <Badge tone={m.daysToElection <= 7 ? 'bad' : 'gold'}>
            {m.daysToElection === 0 ? 'Eleição hoje!' : `${m.daysToElection} dias`}
          </Badge>
        )}
        <div className="flex items-center gap-2.5 rounded-[5px] border border-gold-500/45 bg-ink-950/70 py-1 pl-3 pr-2 shadow-[inset_0_1px_3px_rgb(0_0_0/0.6)]">
          <div className="text-right leading-tight">
            <div
              className="whitespace-nowrap font-serif text-[14px] font-semibold tracking-[0.01em] text-paper"
              data-testid="game-date"
            >
              {formatDateLong(game.date)}
            </div>
            <div className="max-w-52 truncate text-[10px] text-muted">
              {PHASE_LABELS[game.phase]}
              {officeId ? ` · ${OFFICES[officeId].name}` : ''}
              {jurisdiction ? ` · ${jurisdiction}` : ''}
            </div>
          </div>
          <SpeedIndicator game={game} />
        </div>
      </div>

      {/* Menu */}
      <div className="flex shrink-0 items-center gap-0.5 pl-1">
        <Tooltip side="bottom" content="Salvar o jogo">
          <button
            type="button"
            className={iconBtn}
            onClick={() => void quickSave()}
            data-testid="btn-save"
            aria-label="Salvar"
          >
            <Icon name="save" size={16} />
          </button>
        </Tooltip>
        <Tooltip side="bottom" content="Manual do jogo">
          <button
            type="button"
            className={iconBtn}
            onClick={() => navigate('/jogo/manual')}
            aria-label="Manual do jogo"
          >
            <Icon name="circle-help" size={16} />
          </button>
        </Tooltip>
        <Tooltip side="bottom" content="Exportar save (.json)">
          <button type="button" className={iconBtn} onClick={exportFile} aria-label="Exportar save">
            <Icon name="download" size={16} />
          </button>
        </Tooltip>
        <Tooltip side="bottom" content="Menu principal">
          <button
            type="button"
            className={iconBtn}
            onClick={() => {
              exit();
              navigate('/');
            }}
            aria-label="Menu principal"
          >
            <Icon name="home" size={16} />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
