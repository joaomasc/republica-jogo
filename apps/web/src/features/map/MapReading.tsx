import { cn, Icon } from '@republica/ui';
import { rankOf, useActiveLayer } from './useActiveLayer';

/**
 * "Neste mapa": a leitura da região no modo ativo do mapa, com a posição entre as demais e o
 * lugar dela na escala de cores. Liga o painel da região ao que o jogador está vendo no mapa.
 */
export function MapReading({ unitId }: { unitId: string }) {
  const active = useActiveLayer();
  const { layer, scale } = active;
  const cell = layer.cells[unitId];
  if (!cell) return null;
  const categorical = layer.scale === 'categorical';
  const rank = rankOf(layer.cells, unitId, categorical);
  const position = scale.position[unitId];
  const paint = scale.paint[unitId];
  return (
    <div className="stat-tile px-3 py-2" data-testid="map-reading">
      <div className="flex items-center gap-2">
        <Icon name={active.icon} size={14} className="shrink-0 text-gold-400" />
        <span className="label min-w-0 flex-1 truncate">
          Neste mapa · {active.focus ? layer.title : active.label}
        </span>
        {rank && !categorical && (
          <span className="shrink-0 text-[11px] tabular-nums text-muted">
            {rank.rank}º de {rank.total}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        {cell.short && (
          <span
            className={cn(
              'font-display text-[20px] font-bold tabular-nums',
              categorical ? '' : 'text-paper',
            )}
            style={categorical && paint ? { color: paint.fill } : undefined}
          >
            {cell.short}
          </span>
        )}
        <span className="min-w-0 text-[12px] leading-snug text-paper/85">{cell.label}</span>
      </div>
      {!categorical && position !== undefined && (
        <div
          className="relative mt-1.5 h-1.5 rounded-[2px] ring-1 ring-black/50"
          style={{ background: scale.gradient }}
        >
          <span
            className="absolute -top-[3px] h-3 w-[3px] -translate-x-1/2 rounded-[1px] bg-paper shadow-[0_0_0_1px_rgb(0_0_0/0.7)]"
            style={{ left: `${(position * 100).toFixed(1)}%` }}
          />
        </div>
      )}
    </div>
  );
}
