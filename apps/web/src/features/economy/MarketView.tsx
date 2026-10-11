import { goodDetail, marketRows, type GoodId, type MarketStatus } from '@republica/game-engine';
import { Badge, cn, Icon, Panel } from '@republica/ui';
import { useMemo, useState } from 'react';
import { HBar, LineChartBox } from '../../components/charts';
import { billions, num } from '../../lib/format';
import { useGameState } from '../../store/gameStore';

const STATUS: Record<MarketStatus, { label: string; tone: 'bad' | 'info' | 'good' | 'warn' | 'neutral' }> = {
  escassez: { label: 'Escassez', tone: 'bad' },
  importado: { label: 'Importado', tone: 'info' },
  exportado: { label: 'Exportado', tone: 'good' },
  excedente: { label: 'Excedente', tone: 'warn' },
  equilibrio: { label: 'Equilíbrio', tone: 'neutral' },
};

function PriceChange({ value }: { value: number }) {
  const p = Math.round(value * 1000) / 10;
  if (Math.abs(p) < 0.1) return <span className="text-muted">±0%</span>;
  return <span className={p > 0 ? 'text-bad' : 'text-good'}>{`${p > 0 ? '▲' : '▼'} ${Math.abs(p).toLocaleString('pt-BR')}%`}</span>;
}

/** Mercado nacional (estilo Victoria 3): preço relativo, oferta, demanda e comércio por bem. */
export function MarketView() {
  const game = useGameState();
  const rows = useMemo(() => marketRows(game), [game]);
  const [selected, setSelected] = useState<GoodId | null>(null);
  const [category, setCategory] = useState<string>('all');
  const categories = [...new Map(rows.map((r) => [r.category, r.categoryName])).entries()];
  const shown = rows.filter((r) => category === 'all' || r.category === category);
  const current = selected ?? shown[0]?.id ?? null;
  const detail = current ? goodDetail(game, current) : null;

  return (
    <div className="grid grid-cols-1 gap-3 @6xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <Panel
        title="Mercado nacional"
        icon="store"
        actions={
          <select className="game-select py-1 text-xs" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">Todas as categorias</option>
            {categories.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        }
      >
        <p className="mb-2 text-xs text-muted">
          Preço 1,00 = preço-base. Escassez encarece o bem e trava quem depende dele; excedente derruba o preço e o
          lucro de quem produz. Tarifas e câmbio decidem o que vem de fora.
        </p>
        <div className="max-h-[68vh] overflow-auto pr-1">
          <table className="w-full min-w-[620px] text-sm [&_td]:px-1.5 [&_th]:px-1.5">
            <thead className="sticky top-0 bg-ink-900 text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="py-1.5 text-left">Bem</th>
                <th className="text-right">Preço</th>
                <th className="text-right">6 meses</th>
                <th className="text-right">Oferta</th>
                <th className="text-right">Demanda</th>
                <th className="text-right">Comércio</th>
                <th className="text-right">Situação</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const st = STATUS[r.status];
                const trade = r.exports - r.imports;
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r.id)}
                    className={cn('cursor-pointer border-t border-ink-700/60 hover:bg-ink-700/40', current === r.id && 'bg-gold-500/10')}
                    title={r.reason}
                  >
                    <td className="py-1.5">
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded" style={{ background: `${r.color}33`, color: r.color }}>
                          <Icon name={r.icon} size={14} />
                        </span>
                        {r.name}
                      </span>
                    </td>
                    <td className={cn('text-right tabular-nums', r.price > 1.15 ? 'text-bad' : r.price < 0.85 ? 'text-good' : '')}>{num(r.price, 2)}</td>
                    <td className="text-right text-xs tabular-nums">
                      <PriceChange value={r.change} />
                    </td>
                    <td className="text-right tabular-nums">{num(r.supply, 0)}</td>
                    <td className="text-right tabular-nums">{num(r.demand, 0)}</td>
                    <td className={cn('text-right tabular-nums', trade > 0 ? 'text-good' : trade < 0 ? 'text-info' : 'text-muted')}>
                      {r.tradeable ? `${trade > 0 ? '+' : ''}${num(trade, 0)}` : '—'}
                    </td>
                    <td className="text-right">
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-muted">Oferta, demanda e comércio em R$ bi por ano, a preços-base.</p>
        </div>
      </Panel>

      {detail && (
        <div className="space-y-3">
          <Panel title={detail.row.name} icon={detail.row.icon}>
            <p className="text-sm">{detail.description}</p>
            <p className="mt-2 rounded-lg bg-ink-900 px-2.5 py-1.5 text-sm">{detail.row.reason}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-muted">Preço ao consumidor</div>
                <div className="font-display tabular-nums">
                  R$ {num(detail.row.displayPrice, 2)} <span className="text-xs text-muted">/{detail.row.displayUnit}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Preço mundial (em R$, relativo)</div>
                <div className="font-display tabular-nums">{detail.row.tradeable ? num(detail.row.worldPrice, 2) : 'Não comerciável'}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Tarifa de importação</div>
                <div className="font-display tabular-nums">{Math.round(detail.row.tariff * 100)}%</div>
              </div>
              <div>
                <div className="text-xs text-muted">Importa / exporta</div>
                <div className="font-display tabular-nums">
                  {billions(detail.row.imports)} / {billions(detail.row.exports)}
                </div>
              </div>
            </div>
          </Panel>
          <Panel title="Histórico de preço" icon="chart-line">
            <LineChartBox
              height={180}
              data={detail.history.map((h) => ({ label: h.date.slice(2, 7).split('-').reverse().join('/'), preco: Math.round(h.price * 100) / 100 }))}
              series={[{ key: 'preco', name: 'Preço relativo', color: detail.row.color }]}
            />
          </Panel>
          <div className="grid gap-3 @lg:grid-cols-2 @3xl:grid-cols-1 @4xl:grid-cols-3">
            <Panel title="Quem consome" icon="users">
              <div className="space-y-1.5">
                {detail.demandBreakdown.map((d) => (
                  <HBar key={d.label} label={d.label} value={d.value} max={Math.max(1e-9, detail.row.demand)} color="#5aa9ff" right={billions(d.value)} />
                ))}
              </div>
            </Panel>
            <Panel title="Quem depende dele (insumo)" icon="share-2">
              {detail.users.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma indústria usa este bem como insumo: ele vai direto para as famílias e o governo.</p>
              ) : (
                <>
                  <p className="mb-1.5 text-[11px] text-muted">
                    Se {detail.row.name.toLowerCase()} encarecer ou faltar, estes edifícios têm custo maior e produzem menos — e o efeito se
                    espalha para os bens que eles fabricam.
                  </p>
                  <div className="space-y-1.5">
                    {detail.users.map((u) => (
                      <HBar
                        key={u.buildingId}
                        label={u.buildingName}
                        sub={u.sectorName}
                        value={u.amount}
                        max={Math.max(1e-9, detail.users[0]?.amount ?? 1)}
                        color="#f2b51e"
                        right={billions(u.amount)}
                      />
                    ))}
                  </div>
                </>
              )}
            </Panel>
            <Panel title="Quem produz" icon="factory">
              {detail.producers.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma produção nacional: o país depende de importação.</p>
              ) : (
                <div className="space-y-1.5">
                  {detail.producers.map((p) => (
                    <HBar
                      key={`${p.stateId}-${p.buildingId}`}
                      label={p.stateName}
                      sub={p.buildingName}
                      value={p.output}
                      max={Math.max(1e-9, detail.producers[0]?.output ?? 1)}
                      color="#3ddc97"
                      right={billions(p.output)}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
