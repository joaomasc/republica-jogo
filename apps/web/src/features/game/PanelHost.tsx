import { Corners, Icon, Medallion, Tooltip } from '@republica/ui';
import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useUi } from '../../store/uiStore';
import type { NavItem } from './navigation';

/**
 * Painel grande aberto sobre o lado esquerdo do mapa (estilo Victoria 3): título ornamentado,
 * expandir, fechar (volta a /jogo) e rolagem própria.
 */
export function PanelHost({
  meta,
  title,
  style,
  children,
}: {
  meta: NavItem;
  /** Título (padrão: rótulo da rota). */
  title?: ReactNode;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const panelWide = useUi((s) => s.panelWide);
  const togglePanelWide = useUi((s) => s.togglePanelWide);
  const canExpand = meta.width !== 'narrow' && meta.width !== 'wide';

  // Esc fecha o painel (quando não há janela modal aberta por cima).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select')) return;
      navigate('/jogo');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <section
      className="panel-host absolute z-20 flex flex-col rounded-[6px] transition-[width] duration-300 animate-slide-in-left"
      style={style}
      aria-label={typeof title === 'string' ? title : meta.label}
    >
      <Corners size={12} />
      <header className="panel-host-header relative flex shrink-0 items-center gap-3 rounded-t-[6px] px-3.5 py-2.5">
        <Medallion icon={meta.icon} size={34} />
        <h1 className="min-w-0 flex-1 truncate font-display text-[19px] font-bold tracking-[0.06em] text-paper [text-shadow:0_2px_8px_rgb(0_0_0/0.6)]">
          {title ?? meta.label}
        </h1>
        {canExpand && (
          <Tooltip side="bottom" content={panelWide ? 'Largura normal' : 'Expandir painel'}>
            <button
              type="button"
              onClick={togglePanelWide}
              aria-label={panelWide ? 'Largura normal' : 'Expandir painel'}
              aria-pressed={panelWide}
              className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-gold-500/30 text-paper/80 transition hover:border-gold-400/70 hover:bg-ink-600 hover:text-gold-300"
            >
              <Icon name={panelWide ? 'minimize-2' : 'maximize-2'} size={15} />
            </button>
          </Tooltip>
        )}
        <Tooltip side="bottom" content="Fechar (Esc)">
          <button
            type="button"
            onClick={() => navigate('/jogo')}
            aria-label="Fechar painel"
            data-testid="panel-close"
            className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-gold-500/30 text-paper/80 transition hover:border-bad/70 hover:bg-bad/20 hover:text-paper"
          >
            <Icon name="x" size={17} />
          </button>
        </Tooltip>
      </header>
      <div
        key={location.pathname}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
        id="game-main"
      >
        {children}
      </div>
    </section>
  );
}
