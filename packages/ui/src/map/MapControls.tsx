import { Maximize2, Minus, Plus } from 'lucide-react';

export type MapControlsPosition = 'top-right' | 'top-left' | 'bottom-left' | 'bottom-right' | 'none';

const POSITION: Record<Exclude<MapControlsPosition, 'none'>, string> = {
  'top-right': 'right-3 top-3',
  'top-left': 'left-3 top-3',
  'bottom-left': 'bottom-3 left-3',
  'bottom-right': 'bottom-3 right-3',
};

export function MapControls({
  onZoomIn,
  onZoomOut,
  onReset,
  position = 'top-right',
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  position?: MapControlsPosition;
}) {
  if (position === 'none') return null;
  const btn =
    'flex h-8 w-8 items-center justify-center text-paper/90 transition hover:bg-ink-600/80 hover:text-gold-300';
  return (
    <div
      className={`cartouche absolute z-10 flex flex-col divide-y divide-gold-500/25 overflow-hidden rounded-[5px] ${POSITION[position]}`}
    >
      <button type="button" className={btn} onClick={onZoomIn} aria-label="Aproximar">
        <Plus size={16} />
      </button>
      <button type="button" className={btn} onClick={onZoomOut} aria-label="Afastar">
        <Minus size={16} />
      </button>
      <button type="button" className={btn} onClick={onReset} aria-label="Enquadrar">
        <Maximize2 size={14} />
      </button>
    </div>
  );
}
