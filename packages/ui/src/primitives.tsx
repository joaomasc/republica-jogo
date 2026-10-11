import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Icon } from './icons';

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export type Tone = 'neutral' | 'good' | 'bad' | 'warn' | 'info' | 'gold';

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-paper',
  good: 'text-good',
  bad: 'text-bad',
  warn: 'text-warn',
  info: 'text-info',
  gold: 'text-gold-400',
};

const TONE_BADGE: Record<Tone, string> = {
  neutral: 'bg-ink-700/80 text-paper/90 border-ink-500/80',
  good: 'bg-good/12 text-good border-good/45',
  bad: 'bg-bad/12 text-bad border-bad/45',
  warn: 'bg-warn/12 text-warn border-warn/45',
  info: 'bg-info/12 text-info border-info/45',
  gold: 'bg-gold-500/12 text-gold-300 border-gold-500/55',
};

// ---------------------------------------------------------------------------
// Ornamentos (filetes dourados, medalhões, cantoneiras)
// ---------------------------------------------------------------------------

/** Filete dourado horizontal com losango central — separador clássico de painéis. */
export function Ornament({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-2 items-center', className)} aria-hidden>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-500/55 to-gold-500/70" />
      <div className="mx-1.5 h-1.5 w-1.5 rotate-45 border border-gold-400/80 bg-ink-900" />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-gold-500/55 to-gold-500/70" />
    </div>
  );
}

/** Ícone dentro de um medalhão de latão. */
export function Medallion({
  icon,
  size = 28,
  className,
  tone = 'gold',
}: {
  icon: string;
  size?: number;
  className?: string;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        'medallion inline-flex shrink-0 items-center justify-center rounded-full',
        TONE_TEXT[tone],
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon name={icon} size={Math.round(size * 0.52)} />
    </span>
  );
}

/** Cantoneiras douradas nos quatro cantos de uma moldura (o pai precisa ser `relative`). */
export function Corners({ className, size = 10 }: { className?: string; size?: number }) {
  const base = 'pointer-events-none absolute border-gold-400/80';
  const s: CSSProperties = { width: size, height: size };
  return (
    <span className={className} aria-hidden>
      <span className={cn(base, '-left-px -top-px border-l-[2px] border-t-[2px]')} style={s} />
      <span className={cn(base, '-right-px -top-px border-r-[2px] border-t-[2px]')} style={s} />
      <span className={cn(base, '-bottom-px -left-px border-b-[2px] border-l-[2px]')} style={s} />
      <span className={cn(base, '-bottom-px -right-px border-b-[2px] border-r-[2px]')} style={s} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------

export function Panel({
  title,
  icon,
  actions,
  children,
  className,
  bodyClassName,
  tone = 'default',
}: {
  title?: ReactNode;
  icon?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** `parchment` = destaque em pergaminho (textos de leitura, citações, resumos). */
  tone?: 'default' | 'parchment';
}) {
  const parchment = tone === 'parchment';
  return (
    <section className={cn(parchment ? 'parchment-panel' : 'ornate-panel', className)}>
      {(title || actions) && (
        <header
          className={cn(
            'relative flex items-center justify-between gap-2 px-3.5 pb-2 pt-2.5',
            parchment ? 'text-parchment-ink' : 'ornate-panel-header',
          )}
        >
          <h2
            className={cn(
              'flex min-w-0 items-center gap-2 font-display text-[15px] font-semibold leading-tight tracking-[0.04em]',
              parchment ? 'text-parchment-ink' : 'text-paper',
            )}
          >
            {icon && (
              <Icon
                name={icon}
                size={16}
                className={cn('shrink-0', parchment ? 'text-brass-700' : 'text-gold-400')}
              />
            )}
            <span className="min-w-0">{title}</span>
          </h2>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          {!parchment && (
            <span
              className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/45 to-transparent"
              aria-hidden
            />
          )}
        </header>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Botões
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'btn-brass text-ink-950',
  secondary: 'btn-slate text-paper',
  ghost:
    'border-transparent bg-transparent text-paper/90 hover:border-gold-500/25 hover:bg-ink-700/60 hover:text-gold-300',
  danger: 'btn-danger text-paper',
  success: 'btn-success text-paper',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}) {
  const sizes = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-4 py-[7px] text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2.5',
  };
  return (
    <button
      type="button"
      className={cn(
        'inline-flex select-none items-center justify-center rounded-[4px] border font-semibold tracking-[0.02em] transition-[background,border-color,color,box-shadow,filter] duration-150',
        'active:translate-y-px disabled:pointer-events-none disabled:opacity-40 disabled:saturate-50',
        BUTTON_VARIANTS[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-px text-[10.5px] font-semibold uppercase leading-[1.45] tracking-[0.07em]',
        TONE_BADGE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Barras e indicadores
// ---------------------------------------------------------------------------

export function Bar({
  value,
  color = 'var(--color-gold-500)',
  height = 8,
  className,
  background = 'var(--color-ink-950)',
}: {
  value: number;
  color?: string;
  height?: number;
  className?: string;
  background?: string;
}) {
  // Valor inválido (NaN/Infinity) vira barra vazia em vez de largura "NaN%".
  const pct = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) * 100 : 0;
  return (
    <div
      className={cn('bar-track w-full overflow-hidden rounded-[2px]', className)}
      style={{ height, background }}
    >
      <div
        className="bar-fill h-full rounded-[2px] transition-[width] duration-500"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export function LabeledBar({
  label,
  value,
  display,
  color,
  hint,
}: {
  label: ReactNode;
  value: number;
  display?: ReactNode;
  color?: string;
  hint?: string;
}) {
  return (
    <div title={hint}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold tabular-nums text-paper">
          {display ?? `${Math.round(value * 100)}%`}
        </span>
      </div>
      <Bar value={value} {...(color ? { color } : {})} />
    </div>
  );
}

export function StatTile({
  label,
  value,
  icon,
  tone = 'neutral',
  hint,
  sub,
}: {
  label: string;
  value: ReactNode;
  icon?: string;
  tone?: Tone;
  hint?: string;
  sub?: ReactNode;
}) {
  return (
    <div className="stat-tile px-3 py-2" title={hint}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-muted">
        {icon && <Icon name={icon} size={12} className="text-gold-500" />}
        {label}
      </div>
      <div
        className={cn(
          'mt-0.5 text-[21px] font-semibold leading-tight tabular-nums',
          TONE_TEXT[tone],
        )}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip (renderizado num portal: nunca é cortado por painéis com rolagem)
// ---------------------------------------------------------------------------

type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

interface TooltipAnchor {
  x: number;
  y: number;
  side: TooltipSide;
}

const TOOLTIP_TRANSFORM: Record<TooltipSide, string> = {
  top: 'translate(-50%, -100%)',
  bottom: 'translate(-50%, 0)',
  left: 'translate(-100%, -50%)',
  right: 'translate(0, -50%)',
};

function placeTooltip(r: DOMRect, preferred: TooltipSide): TooltipAnchor {
  const gap = 9;
  const room = 110;
  let side = preferred;
  if (side === 'top' && r.top < room) side = 'bottom';
  else if (side === 'bottom' && window.innerHeight - r.bottom < room) side = 'top';
  else if (side === 'right' && window.innerWidth - r.right < 240) side = 'left';
  else if (side === 'left' && r.left < 240) side = 'right';
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  if (side === 'top') return { x: cx, y: r.top - gap, side };
  if (side === 'bottom') return { x: cx, y: r.bottom + gap, side };
  if (side === 'left') return { x: r.left - gap, y: cy, side };
  return { x: r.right + gap, y: cy, side };
}

/** Mantém o balão dentro da janela (ajuste feito direto no DOM, depois de medir). */
function keepInViewport(el: HTMLDivElement | null) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const pad = 8;
  let dx = 0;
  let dy = 0;
  if (r.left < pad) dx = pad - r.left;
  else if (r.right > window.innerWidth - pad) dx = window.innerWidth - pad - r.right;
  if (r.top < pad) dy = pad - r.top;
  else if (r.bottom > window.innerHeight - pad) dy = window.innerHeight - pad - r.bottom;
  if (dx || dy) el.style.translate = `${dx}px ${dy}px`;
}

export function Tooltip({
  content,
  children,
  className,
  side = 'top',
  delay = 140,
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  /** Lado preferido (inverte sozinho se faltar espaço). */
  side?: TooltipSide;
  /** Atraso para abrir (ms). */
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [anchor, setAnchor] = useState<TooltipAnchor | null>(null);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (el) setAnchor(placeTooltip(el.getBoundingClientRect(), side));
    }, delay);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setAnchor(null);
  };

  useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('pointerdown', close, true);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('pointerdown', close, true);
    };
  }, [anchor]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const hasContent = content !== null && content !== undefined && content !== false && content !== '';
  return (
    <span
      ref={ref}
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {anchor &&
        hasContent &&
        createPortal(
          <div
            ref={keepInViewport}
            role="tooltip"
            className="tooltip-bubble pointer-events-none fixed z-[300] w-max max-w-72 px-3 py-2 text-xs font-medium leading-snug text-paper animate-fade-in"
            style={{ left: anchor.x, top: anchor.y, transform: TOOLTIP_TRANSFORM[anchor.side] }}
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Modal (portal no body: nunca fica preso a painéis, rolagens ou empilhamentos)
// ---------------------------------------------------------------------------

export function Modal({
  open,
  title,
  icon,
  onClose,
  children,
  footer,
  size = 'md',
  dismissable = true,
}: {
  open: boolean;
  title: ReactNode;
  icon?: string;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  dismissable?: boolean;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !dismissable || !onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismissable, onClose]);

  // Mantém o Tab dentro da janela (aria-modal): ao chegar numa ponta, volta à outra.
  useEffect(() => {
    if (!open) return;
    const onTab = (e: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (e.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!first || !last) {
        e.preventDefault();
        dialog.focus();
      } else if (!dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onTab);
    return () => window.removeEventListener('keydown', onTab);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true });
    return () => previous?.focus({ preventScroll: true });
  }, [open]);

  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-[3px] animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          'modal-frame relative flex max-h-[92vh] w-full flex-col outline-none animate-pop-in',
          widths[size],
        )}
      >
        <Corners size={14} />
        <header className="modal-header relative flex items-center justify-between gap-3 px-5 pb-3 pt-3.5">
          <h2
            id={titleId}
            className="flex min-w-0 items-center gap-2.5 font-display text-lg font-semibold tracking-[0.04em] text-paper"
          >
            {icon && <Medallion icon={icon} size={30} />}
            <span className="min-w-0">{title}</span>
          </h2>
          {dismissable && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-[4px] border border-transparent p-1 text-muted transition hover:border-gold-500/40 hover:bg-ink-700 hover:text-paper"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          )}
          <Ornament className="absolute inset-x-4 -bottom-1" />
        </header>
        <div className="@container overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-gold-500/20 bg-ink-900/50 px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Abas, controles segmentados e deslizantes
// ---------------------------------------------------------------------------

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: T; label: string; icon?: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-0.5 rounded-[5px] border border-ink-600/90 bg-ink-950/60 p-0.5',
        className,
      )}
      role="tablist"
    >
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              'relative flex items-center gap-1.5 rounded-[3px] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition',
              active
                ? 'tab-active text-gold-300'
                : 'text-muted hover:bg-ink-700/70 hover:text-paper',
            )}
          >
            {t.icon && (
              <Icon name={t.icon} size={14} className={active ? 'text-gold-400' : undefined} />
            )}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  leftLabel,
  rightLabel,
  label,
  display,
  disabled,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  leftLabel?: string;
  rightLabel?: string;
  label?: ReactNode;
  display?: ReactNode;
  disabled?: boolean;
}) {
  const raw = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const pct = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
  return (
    <label className="block">
      {(label || display !== undefined) && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-semibold text-paper">{label}</span>
          <span className="font-semibold tabular-nums text-gold-300">{display ?? value}</span>
        </div>
      )}
      <input
        type="range"
        className="game-range w-full"
        style={{ '--range-pct': `${pct}%` } as CSSProperties}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {(leftLabel || rightLabel) && (
        <div className="mt-0.5 flex justify-between text-[10px] uppercase tracking-[0.08em] text-muted">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </label>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex flex-wrap gap-0.5 rounded-[5px] border border-ink-600/90 bg-ink-950/60 p-0.5',
        className,
      )}
      role="radiogroup"
    >
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn(
              'rounded-[3px] px-2.5 py-1 text-xs font-semibold transition',
              active ? 'tab-active text-gold-300' : 'text-muted hover:bg-ink-700/70 hover:text-paper',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  icon = 'sparkles',
  title,
  text,
  action,
}: {
  icon?: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-center">
      <Medallion icon={icon} size={56} />
      <h3 className="mt-1 font-display text-lg font-semibold tracking-[0.04em] text-paper">
        {title}
      </h3>
      <Ornament className="w-40" />
      {text && <p className="max-w-sm text-sm leading-relaxed text-muted">{text}</p>}
      {action}
    </div>
  );
}

export function Delta({
  value,
  suffix = '',
  invert = false,
  digits = 1,
}: {
  value: number;
  suffix?: string;
  invert?: boolean;
  digits?: number;
}) {
  const good = invert ? value < 0 : value > 0;
  const tone = Math.abs(value) < 10 ** -digits ? 'text-muted' : good ? 'text-good' : 'text-bad';
  // Evita "-0.0" quando o valor arredonda para zero.
  const text = value.toFixed(digits);
  const zero = Number(text) === 0;
  return (
    <span className={cn('font-semibold tabular-nums', tone)}>
      {value > 0 && !zero ? '+' : ''}
      {zero ? (0).toFixed(digits) : text}
      {suffix}
    </span>
  );
}
