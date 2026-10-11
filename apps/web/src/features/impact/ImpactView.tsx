import {
  CAMPAIGN_ACTIONS,
  CHANNELS,
  formatMoney,
  IMPACT_SOURCE_LABEL,
  type ImpactEntry,
  type ImpactSource,
} from '@republica/game-engine';
import { Badge, Button, cn, EmptyState, Icon, Panel, Segmented, StatTile } from '@republica/ui';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { LineChartBox } from '../../components/charts';
import { pp } from '../../lib/format';
import { useGameState } from '../../store/gameStore';

type Metric = 'share' | 'valid' | 'rejection';

const METRIC_LABEL: Record<Metric, string> = {
  share: 'Intenção',
  valid: 'Válidos',
  rejection: 'Rejeição',
};

const SOURCE_ICON: Record<ImpactSource, string> = {
  action: 'megaphone',
  card: 'calendar-check',
  ad: 'tv',
  debate: 'mic-vocal',
  interview: 'mic',
  event: 'newspaper',
  opponents: 'user-x',
  decay: 'trending-up',
  airtime: 'radio',
  time: 'calendar-check',
};

const SOURCES = Object.keys(SOURCE_ICON) as ImpactSource[];
/** Fontes que dependem de decisões do jogador. */
const PLAYER_SOURCES = new Set<ImpactSource>(['action', 'card', 'ad', 'debate', 'interview']);

const GROUPS: { key: string; name: string; color: string; sources: ImpactSource[] }[] = [
  {
    key: 'mine',
    name: 'Suas iniciativas',
    color: '#f2b51e',
    sources: ['action', 'card', 'ad', 'debate', 'interview'],
  },
  { key: 'opp', name: 'Adversários', color: '#ff6b6b', sources: ['opponents'] },
  { key: 'events', name: 'Eventos', color: '#fb923c', sources: ['event'] },
  {
    key: 'env',
    name: 'Tempo, desgaste e horário gratuito',
    color: '#8a9bc4',
    sources: ['decay', 'time', 'airtime'],
  },
];

function shortDate(iso: string): string {
  return iso.split('-').reverse().slice(0, 2).join('/');
}

/** Barra divergente: verde para a direita, vermelha para a esquerda. */
function DivergingBar({
  value,
  max,
  invert = false,
}: {
  value: number;
  max: number;
  invert?: boolean;
}) {
  const w = Math.min(1, Math.abs(value) / (max || 1)) * 50;
  const good = invert ? value < 0 : value > 0;
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-ink-950">
      <div className="absolute inset-y-0 left-1/2 w-px bg-ink-500" />
      <div
        className="absolute inset-y-0 rounded-full"
        style={{
          width: `${w}%`,
          left: value >= 0 ? '50%' : `${50 - w}%`,
          background: good ? 'var(--color-good)' : 'var(--color-bad)',
        }}
      />
    </div>
  );
}

function DeltaText({ value, metric }: { value: number; metric: Metric }) {
  const good = metric === 'rejection' ? value < 0 : value > 0;
  const zero = Math.abs(value) < 5e-5;
  return (
    <span
      className={cn(
        'font-bold tabular-nums',
        zero ? 'text-muted' : good ? 'text-good' : 'text-bad',
      )}
    >
      {pp(value)}
    </span>
  );
}

interface EfficiencyRow {
  id: string;
  name: string;
  kind: 'Ação' | 'Propaganda';
  uses: number;
  total: number;
  cost: number;
}

export function ImpactView() {
  const game = useGameState();
  const [metric, setMetric] = useState<Metric>('share');
  const [filter, setFilter] = useState<'all' | 'mine' | 'external'>('all');
  const [days, setDays] = useState(14);
  const campaign = game.campaign;
  const entries = useMemo(() => campaign?.impact ?? [], [campaign]);

  const bySource = useMemo(() => {
    const out = Object.fromEntries(SOURCES.map((s) => [s, 0])) as Record<ImpactSource, number>;
    for (const e of entries) out[e.source] += e[metric];
    return out;
  }, [entries, metric]);

  const chart = useMemo(() => {
    const dates = [...new Set(entries.map((e) => e.date))].sort();
    const acc: Record<string, number> = Object.fromEntries(GROUPS.map((g) => [g.key, 0]));
    acc.total = 0;
    const rows: Record<string, number | string>[] = [];
    for (const date of dates) {
      for (const e of entries) {
        if (e.date !== date) continue;
        const g = GROUPS.find((x) => x.sources.includes(e.source));
        if (g) acc[g.key] = (acc[g.key] ?? 0) + e[metric] * 100;
        acc.total = (acc.total ?? 0) + e[metric] * 100;
      }
      rows.push({ label: shortDate(date), ...acc });
    }
    return rows;
  }, [entries, metric]);

  const efficiency = useMemo<EfficiencyRow[]>(() => {
    if (!campaign) return [];
    const rows = new Map<string, EfficiencyRow>();
    for (const l of campaign.log) {
      if (!l.impact) continue;
      const row = rows.get(l.actionId) ?? {
        id: l.actionId,
        name: CAMPAIGN_ACTIONS.find((a) => a.id === l.actionId)?.name ?? l.label,
        kind: 'Ação' as const,
        uses: 0,
        total: 0,
        cost: 0,
      };
      row.uses += 1;
      row.total += l.impact[metric];
      row.cost += l.cost;
      rows.set(l.actionId, row);
    }
    for (const ad of campaign.ads) {
      const total = entries
        .filter((e) => e.key === `ad:${ad.id}`)
        .reduce((a, e) => a + e[metric], 0);
      const id = `ad-${ad.channel}-${ad.tone}`;
      const row = rows.get(id) ?? {
        id,
        name: `${CHANNELS[ad.channel].name} (${ad.tone === 'positive' ? 'propositiva' : ad.tone === 'contrast' ? 'comparativa' : 'ataque'})`,
        kind: 'Propaganda' as const,
        uses: 0,
        total: 0,
        cost: 0,
      };
      row.uses += 1;
      row.total += total;
      row.cost += ad.totalCost;
      rows.set(id, row);
    }
    const sign = metric === 'rejection' ? 1 : -1;
    return [...rows.values()].sort((a, b) => sign * (a.total - b.total));
  }, [campaign, entries, metric]);

  const timeline = useMemo(() => {
    const filtered = entries.filter((e) =>
      filter === 'all'
        ? true
        : filter === 'mine'
          ? PLAYER_SOURCES.has(e.source)
          : !PLAYER_SOURCES.has(e.source),
    );
    const byDate = new Map<string, ImpactEntry[]>();
    for (const e of filtered) {
      const list = byDate.get(e.date) ?? [];
      list.push(e);
      byDate.set(e.date, list);
    }
    return [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [entries, filter]);

  if (!campaign || !game.election)
    return (
      <EmptyState
        icon="activity"
        title="Sem campanha em andamento"
        text="O medidor de impacto funciona durante as campanhas."
      />
    );

  const total = SOURCES.reduce((a, s) => a + bySource[s], 0);
  const mine = SOURCES.filter((s) => PLAYER_SOURCES.has(s)).reduce((a, s) => a + bySource[s], 0);
  const external = total - mine;
  const maxAbs = Math.max(1e-4, ...SOURCES.map((s) => Math.abs(bySource[s])));
  const best = efficiency[0];
  const inv = metric === 'rejection';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold">Medidor de impacto</h1>
          <p className="text-sm text-muted">
            Quanto cada coisa mexeu na sua intenção de voto, medido pela sua equipe no modelo de
            voto (sem margem de erro de pesquisa).{' '}
            <Link to="/jogo/manual#impacto" className="text-gold-400 underline">
              Como ler
            </Link>
          </p>
        </div>
        <Segmented
          options={(Object.keys(METRIC_LABEL) as Metric[]).map((m) => ({
            id: m,
            label: METRIC_LABEL[m],
          }))}
          value={metric}
          onChange={setMetric}
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon="activity"
          title="Nada medido ainda"
          text="Faça uma ação de campanha, coloque propaganda no ar ou avance um dia: cada mudança aparece aqui."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 @lg:grid-cols-4">
            <StatTile
              label="Variação total"
              icon="activity"
              value={<DeltaText value={total} metric={metric} />}
              hint="Soma de tudo o que foi medido nesta campanha"
            />
            <StatTile
              label="Suas iniciativas"
              icon="megaphone"
              value={<DeltaText value={mine} metric={metric} />}
              sub="ações, propaganda, debates, entrevistas"
            />
            <StatTile
              label="Fatores externos"
              icon="user-x"
              value={<DeltaText value={external} metric={metric} />}
              sub="adversários, eventos, tempo, desgaste"
            />
            <StatTile
              label={inv ? 'Menos rejeição' : 'Melhor iniciativa'}
              icon="star"
              value={best ? <span className="text-base">{best.name}</span> : '—'}
              sub={best ? <DeltaText value={best.total} metric={metric} /> : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <Panel title="Por fonte" icon="bar-chart-3">
              <ul className="space-y-2.5">
                {SOURCES.map((s) => (
                  <li key={s}>
                    <div className="mb-0.5 flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5">
                        <Icon name={SOURCE_ICON[s]} size={14} className="text-gold-400" />
                        {IMPACT_SOURCE_LABEL[s]}
                        {PLAYER_SOURCES.has(s) && <Badge tone="gold">você</Badge>}
                      </span>
                      <DeltaText value={bySource[s]} metric={metric} />
                    </div>
                    <DivergingBar value={bySource[s]} max={maxAbs} invert={inv} />
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Efeito acumulado ao longo da campanha (p.p.)" icon="trending-up">
              <LineChartBox
                data={chart}
                height={280}
                yFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`}
                series={[
                  ...GROUPS.map((g) => ({ key: g.key, name: g.name, color: g.color })),
                  { key: 'total', name: 'Total', color: '#eef2fb', dashed: true },
                ]}
              />
            </Panel>
          </div>

          <Panel title="Custo-benefício das suas iniciativas" icon="piggy-bank">
            {efficiency.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma ação ou propaganda medida ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted">
                      <th className="py-1 pr-2">Iniciativa</th>
                      <th className="py-1 pr-2 text-right">Usos</th>
                      <th className="py-1 pr-2 text-right">Efeito total</th>
                      <th className="py-1 pr-2 text-right">Média por uso</th>
                      <th className="py-1 pr-2 text-right">Gasto</th>
                      <th className="py-1 text-right" title="Efeito para cada R$ 100 mil gastos">
                        Por R$ 100 mil
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {efficiency.map((r) => (
                      <tr key={r.id} className="border-t border-ink-700">
                        <td className="py-1.5 pr-2">
                          <span className="font-bold">{r.name}</span>{' '}
                          <span className="text-[11px] text-muted">{r.kind}</span>
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">{r.uses}</td>
                        <td className="py-1.5 pr-2 text-right">
                          <DeltaText value={r.total} metric={metric} />
                        </td>
                        <td className="py-1.5 pr-2 text-right">
                          <DeltaText value={r.total / r.uses} metric={metric} />
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {r.cost > 0 ? formatMoney(r.cost) : 'grátis'}
                        </td>
                        <td className="py-1.5 text-right">
                          {r.cost > 0 ? (
                            <DeltaText value={(r.total / r.cost) * 100_000} metric={metric} />
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-muted">
                  O efeito de uma ação é o imediato (antes de o tempo passar); a propaganda soma os
                  dias em que esteve no ar. Presença e momentum se desgastam depois — isso aparece
                  em "Desgaste natural".
                </p>
              </div>
            )}
          </Panel>

          <Panel
            title="Linha do tempo"
            icon="calendar-check"
            actions={
              <Segmented
                options={[
                  { id: 'all', label: 'Tudo' },
                  { id: 'mine', label: 'Minhas' },
                  { id: 'external', label: 'Externas' },
                ]}
                value={filter}
                onChange={setFilter}
              />
            }
          >
            <div className="space-y-3">
              {timeline.slice(0, days).map(([date, list]) => {
                const dayTotal = list.reduce((a, e) => a + e[metric], 0);
                return (
                  <div key={date}>
                    <div className="mb-1 flex items-center justify-between border-b border-ink-700 pb-0.5">
                      <span className="font-display text-sm font-semibold">{shortDate(date)}</span>
                      <span className="text-xs">
                        saldo do dia <DeltaText value={dayTotal} metric={metric} />
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {list.map((e, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 rounded-lg bg-ink-900 px-2 py-1 text-xs"
                        >
                          <Icon
                            name={SOURCE_ICON[e.source]}
                            size={14}
                            className="shrink-0"
                            strokeWidth={2.4}
                          />
                          <span className="min-w-0 flex-1 truncate" title={e.label}>
                            {e.label}
                          </span>
                          <span className="hidden text-muted @sm:inline">
                            {IMPACT_SOURCE_LABEL[e.source]}
                          </span>
                          <DeltaText value={e[metric]} metric={metric} />
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {timeline.length > days && (
                <Button size="sm" onClick={() => setDays((d) => d + 14)}>
                  Mostrar dias anteriores
                </Button>
              )}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
