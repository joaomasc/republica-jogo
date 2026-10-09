import { cn } from '@republica/ui';
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';
import { useGame } from '../store/gameStore';

const ICONS = { good: CircleCheck, bad: CircleX, info: Info, warn: TriangleAlert };
const TONES = {
  good: 'border-l-good text-good',
  bad: 'border-l-bad text-bad',
  info: 'border-l-info text-info',
  warn: 'border-l-warn text-warn',
};

/**
 * Notificações. `game`: embaixo, à esquerda do bloco de tempo (a posição vem da variável CSS
 * `--outliner-space` da tela de jogo); `page`: canto inferior direito.
 */
export function Toasts({ placement = 'page' }: { placement?: 'page' | 'game' }) {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismiss);
  return (
    <div
      className={cn(
        'pointer-events-none fixed z-[200] flex w-full max-w-sm flex-col items-end gap-2',
        placement === 'game'
          ? 'bottom-4 right-[calc(var(--outliner-space,0px)+16px)]'
          : 'bottom-4 right-4',
      )}
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={cn(
              'hud-surface pointer-events-auto flex w-full items-start gap-3 rounded-md border-l-[3px] px-3.5 py-2.5 text-left animate-slide-up',
              TONES[t.tone],
            )}
            data-testid="toast"
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-snug text-paper">{t.title}</div>
              {t.details && t.details.length > 0 && (
                <div className="mt-0.5 text-xs text-muted">{t.details.slice(0, 4).join(' · ')}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
