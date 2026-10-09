import { economyDashboard } from '@republica/game-engine';
import { LabeledBar, Panel, StatTile } from '@republica/ui';
import { useMemo } from 'react';
import { HBar, LineChartBox } from '../../components/charts';
import { billions, num, pct, people } from '../../lib/format';
import { useGameState } from '../../store/gameStore';

const SECTOR_COLORS = ['#3ddc97', '#5aa9ff', '#f2b51e', '#c084fc', '#22d3ee', '#ff6b6b', '#fb923c', '#a3e635', '#e879f9'];

/** Painel da economia real: setores, comércio, investimento, impostos e tecnologia. */
export function EconomyDashboard() {
  const game = useGameState();
  const d = useMemo(() => economyDashboard(game), [game]);
  const history = d.history.map((h) => ({
    label: h.date.slice(2, 7).split('-').reverse().join('/'),
    industria: Math.round(h.manufacturing * 1000) / 10,
    desemprego: h.unemployment,
    exportacoes: Math.round(h.exports),
    importacoes: Math.round(h.imports),
  }));
  const totalTax = d.taxes.reduce((a, t) => a + t.value, 0);
  const maxTax = Math.max(1e-9, ...d.taxes.map((t) => t.value));
  const usage = d.constructionCapacity > 0 ? d.constructionUsed / d.constructionCapacity : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        <StatTile label="PIB" icon="landmark" value={billions(d.gdp)} sub="por ano" />
        <StatTile
          label="Indústria de transformação"
          icon="factory"
          value={pct(d.manufacturingShare)}
          sub="do valor adicionado"
          tone={d.manufacturingShare >= 0.15 ? 'good' : d.manufacturingShare < 0.1 ? 'bad' : 'neutral'}
        />
        <StatTile label="Câmbio" icon="arrow-left-right" value={`R$ ${num(d.exchangeRate, 2)}`} sub="por dólar" />
        <StatTile
          label="Balança comercial"
          icon="ship"
          value={billions(d.tradeBalance)}
          tone={d.tradeBalance >= 0 ? 'good' : 'bad'}
        />
        <StatTile label="Nível tecnológico" icon="flask-conical" value={num(d.techLevel, 2)} sub={`${Math.round(d.techProgress * 100)}% rumo ao próximo`} />
        <StatTile
          label="Construção"
          icon="hard-hat"
          value={`${Math.round(usage * 100)}%`}
          sub={`${num(d.constructionUsed, 0)} de ${num(d.constructionCapacity, 0)} pontos/mês`}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Valor adicionado por setor" icon="chart-pie">
          <div className="space-y-1.5">
            {d.sectors.map((s, i) => (
              <HBar
                key={s.id}
                label={s.name}
                value={s.share}
                max={Math.max(0.01, d.sectors[0]?.share ?? 1)}
                color={SECTOR_COLORS[i % SECTOR_COLORS.length] ?? '#888'}
                right={`${pct(s.share)} · ${billions(s.valueAdded)}`}
                sub={`${people(s.employment)} empregos`}
              />
            ))}
          </div>
        </Panel>
        <Panel title="Industrialização e emprego" icon="factory">
          <LineChartBox
            data={history}
            series={[
              { key: 'industria', name: 'Indústria % do VA', color: '#f2b51e' },
              { key: 'desemprego', name: 'Desemprego %', color: '#ff6b6b', dashed: true },
            ]}
          />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Exportações e importações" icon="ship" className="xl:col-span-2">
          <LineChartBox
            data={history}
            series={[
              { key: 'exportacoes', name: 'Exportações (R$ bi)', color: '#3ddc97' },
              { key: 'importacoes', name: 'Importações (R$ bi)', color: '#5aa9ff' },
            ]}
          />
        </Panel>
        <Panel title="Fundos de investimento" icon="piggy-bank">
          <p className="mb-2 text-xs text-muted">
            Dinheiro que empresários, estrangeiros e o Estado têm para abrir fábricas e expandir. Leis e
            decretos mudam quem investe e onde.
          </p>
          <div className="space-y-2">
            <LabeledBar label="Privado nacional" value={d.pools.private / Math.max(1, d.pools.private + d.pools.foreign + d.pools.state)} display={billions(d.pools.private)} color="#3ddc97" />
            <LabeledBar label="Capital estrangeiro" value={d.pools.foreign / Math.max(1, d.pools.private + d.pools.foreign + d.pools.state)} display={billions(d.pools.foreign)} color="#5aa9ff" />
            <LabeledBar label="Estatal (plano)" value={d.pools.state / Math.max(1, d.pools.private + d.pools.foreign + d.pools.state)} display={billions(d.pools.state)} color="#f2b51e" />
          </div>
        </Panel>
      </div>

      <Panel title={`Arrecadação federal estimada · ${billions(totalTax)} por ano`} icon="receipt">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {d.taxes.map((t) => (
            <HBar key={t.label} label={t.label} value={t.value} max={maxTax} color="#c084fc" right={billions(t.value)} />
          ))}
        </div>
      </Panel>
    </div>
  );
}
