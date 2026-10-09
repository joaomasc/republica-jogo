import { NationEmblem } from './NationEmblem';

/** Marca do jogo: emblema de latão + "República" em capitulares clássicas. */
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'xl' }) {
  const emblem = size === 'xl' ? 92 : size === 'md' ? 42 : 32;
  const text =
    size === 'xl'
      ? 'text-6xl md:text-7xl tracking-[0.06em]'
      : size === 'md'
        ? 'text-2xl tracking-[0.08em]'
        : 'text-xl tracking-[0.08em]';
  return (
    <div className="flex items-center gap-3">
      <NationEmblem
        size={emblem}
        className={size === 'xl' ? 'animate-float drop-shadow-[0_10px_18px_rgb(0_0_0/0.6)]' : ''}
      />
      <div className="leading-none">
        <span
          className={`gold-text block font-display font-bold ${text}`}
          style={{ filter: 'drop-shadow(0 2px 0 rgb(3 8 11 / 0.85))' }}
        >
          República
        </span>
        {size === 'xl' && (
          <span className="mt-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.42em] text-gold-400/80">
            <span className="h-px w-8 bg-gold-500/60" />
            Política · Leis · Economia
            <span className="h-px w-8 bg-gold-500/60" />
          </span>
        )}
      </div>
    </div>
  );
}
