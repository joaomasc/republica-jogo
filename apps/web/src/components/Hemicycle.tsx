import { useMemo } from 'react';

export interface HemicycleGroup {
  id: string;
  color: string;
  seats: number;
  highlight?: boolean;
}

/** Hemiciclo (assentos em semicírculo) — composição do Legislativo. */
export function Hemicycle({
  groups,
  total,
  size = 340,
}: {
  groups: HemicycleGroup[];
  total: number;
  size?: number;
}) {
  const dots = useMemo(() => {
    const rows = Math.max(3, Math.round(Math.sqrt(total / 3.2)));
    const r0 = 0.38;
    const r1 = 0.95;
    const radii = Array.from(
      { length: rows },
      (_, i) => r0 + ((r1 - r0) * i) / Math.max(1, rows - 1),
    );
    const sumR = radii.reduce((a, b) => a + b, 0);
    const perRow = radii.map((r) => Math.max(1, Math.round((total * r) / sumR)));
    let diff = total - perRow.reduce((a, b) => a + b, 0);
    for (let i = rows - 1; diff !== 0; i = (i - 1 + rows) % rows) {
      perRow[i] = (perRow[i] ?? 0) + Math.sign(diff);
      diff -= Math.sign(diff);
    }
    const pts: { x: number; y: number; angle: number }[] = [];
    radii.forEach((r, i) => {
      const n = perRow[i] ?? 0;
      for (let k = 0; k < n; k++) {
        const angle = Math.PI - (n === 1 ? Math.PI / 2 : (Math.PI * k) / (n - 1));
        pts.push({
          x: 0.5 + (Math.cos(angle) * r) / 2,
          y: 0.52 - (Math.sin(angle) * r) / 2,
          angle,
        });
      }
    });
    pts.sort((a, b) => b.angle - a.angle);
    const colors: string[] = [];
    const highlight: boolean[] = [];
    for (const g of groups)
      for (let i = 0; i < g.seats; i++) {
        colors.push(g.color);
        highlight.push(!!g.highlight);
      }
    const dotR = Math.min(0.03, 0.42 / Math.sqrt(total) / 1.1);
    return pts.map((p, i) => ({
      ...p,
      color: colors[i] ?? '#34486f',
      hl: highlight[i] ?? false,
      r: dotR,
    }));
  }, [groups, total]);

  return (
    <svg
      viewBox="0 0 1 0.56"
      width={size}
      className="max-w-full"
      role="img"
      aria-label="Composição do Legislativo"
    >
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill={d.color}
          stroke={d.hl ? '#f6cd52' : '#070d1c'}
          strokeWidth={d.hl ? d.r * 0.35 : d.r * 0.2}
        />
      ))}
    </svg>
  );
}
