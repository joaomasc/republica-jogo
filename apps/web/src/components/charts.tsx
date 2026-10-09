import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const AXIS = { stroke: '#4a6191', fontSize: 11, tickLine: false } as const;
const TOOLTIP_STYLE = {
  background: '#070d1c',
  border: '2px solid #34486f',
  borderRadius: 12,
  fontSize: 12,
  color: '#eef2fb',
} as const;

export interface Series {
  key: string;
  name: string;
  color: string;
  dashed?: boolean;
}

export function LineChartBox({
  data,
  series,
  xKey = 'label',
  height = 240,
  yFormatter,
  domain,
}: {
  data: Record<string, number | string | null>[];
  series: Series[];
  xKey?: string;
  height?: number;
  yFormatter?: (v: number) => string;
  domain?: [number | 'auto', number | 'auto'];
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="#1d2a48" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} {...AXIS} />
          <YAxis
            {...AXIS}
            tickFormatter={yFormatter}
            domain={domain ?? ['auto', 'auto']}
            width={48}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => (yFormatter && typeof v === 'number' ? yFormatter(v) : String(v))}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={3}
              dot={false}
              strokeDasharray={s.dashed ? '6 4' : undefined}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AreaChartBox({
  data,
  dataKey,
  color,
  height = 200,
  xKey = 'label',
  yFormatter,
}: {
  data: Record<string, number | string>[];
  dataKey: string;
  color: string;
  height?: number;
  xKey?: string;
  yFormatter?: (v: number) => string;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1d2a48" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} {...AXIS} />
          <YAxis {...AXIS} tickFormatter={yFormatter} width={56} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => (yFormatter && typeof v === 'number' ? yFormatter(v) : String(v))}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            fill={`url(#grad-${dataKey})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras horizontais simples (sem biblioteca) para rankings. */
export function HBar({
  label,
  value,
  max = 1,
  color,
  right,
  sub,
}: {
  label: ReactNode;
  value: number;
  max?: number;
  color: string;
  right?: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 font-display tabular-nums">{right}</span>
      </div>
      <div className="mt-0.5 h-3 w-full overflow-hidden rounded-full bg-ink-950">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.max(0, Math.min(1, value / (max || 1))) * 100}%`,
            background: color,
          }}
        />
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}
