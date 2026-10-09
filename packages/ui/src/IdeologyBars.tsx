import { AXIS_DEFINITIONS, IDEOLOGY_AXES, type IdeologyVector } from '@republica/game-engine';

export interface IdeologyMarker {
  vector: IdeologyVector;
  color: string;
  label: string;
}

/** Barras dos 9 eixos ideológicos com marcadores (ex.: você × partido × eleitorado). */
export function IdeologyBars({
  markers,
  compact = false,
}: {
  markers: IdeologyMarker[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2.5'}>
      {IDEOLOGY_AXES.map((axis) => {
        const def = AXIS_DEFINITIONS[axis];
        return (
          <div key={axis}>
            {!compact && <div className="mb-0.5 text-[11px] font-bold text-muted">{def.name}</div>}
            <div className="flex items-center gap-2">
              <span className="w-24 shrink-0 truncate text-right text-[10px] uppercase tracking-wide text-muted">
                {def.low}
              </span>
              <div className="relative h-3 flex-1 rounded-full bg-gradient-to-r from-[#3b82f6]/35 via-ink-600 to-[#f97316]/35">
                <div className="absolute left-1/2 top-0 h-full w-px bg-ink-400/60" />
                {markers.map((m, i) => (
                  <span
                    key={m.label}
                    title={`${m.label}: ${Math.round(m.vector[axis])}`}
                    className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-950 shadow"
                    style={{ left: `${m.vector[axis]}%`, background: m.color, zIndex: 10 - i }}
                  />
                ))}
              </div>
              <span className="w-24 shrink-0 truncate text-[10px] uppercase tracking-wide text-muted">
                {def.high}
              </span>
            </div>
          </div>
        );
      })}
      {markers.length > 1 && (
        <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-muted">
          {markers.map((m) => (
            <span key={m.label} className="flex items-center gap-1">
              <span
                className="h-2.5 w-2.5 rounded-full border border-ink-950"
                style={{ background: m.color }}
              />
              {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
