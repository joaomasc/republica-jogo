import { economySummary, STATE_LIST } from '@republica/game-engine';
import { Panel, StatTile } from '@republica/ui';
import { HBar, LineChartBox } from '../../components/charts';
import { num } from '../../lib/format';
import { useGameState } from '../../store/gameStore';
import { EconomyDashboard } from '../economy/EconomyDashboard';
import { HowItConnects } from '../economy/HowItConnects';

export function EconomyView() {
  const game = useGameState();
  const e = game.economy;
  const data = e.history.map((h) => ({
    label: h.date.slice(2, 7).split('-').reverse().join('/'),
    crescimento: h.growth,
    inflacao: h.inflation,
    desemprego: h.unemployment,
    juros: h.interestRate,
    divida: h.debt,
    confianca: h.confidence,
  }));
  const states = STATE_LIST.map((s) => ({ s, u: game.regions[s.id]?.unemployment ?? 0 })).sort(
    (a, b) => b.u - a.u,
  );
  const baseline = e.termBaseline;

  return (
    <div className="space-y-3">
      <HowItConnects />
      <p className="text-sm text-muted">
        Modelo econômico SIMPLIFICADO para fins de jogo: as relações entre leis, orçamento e
        indicadores são do modelo, não previsões sobre a economia real.
      </p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        <StatTile
          label="Crescimento"
          icon="trending-up"
          value={`${num(e.growth)}%`}
          tone={e.growth >= 2 ? 'good' : e.growth < 0 ? 'bad' : 'neutral'}
        />
        <StatTile
          label="Inflação"
          icon="receipt"
          value={`${num(e.inflation)}%`}
          tone={e.inflation > 6 ? 'bad' : 'neutral'}
        />
        <StatTile
          label="Desemprego"
          icon="users"
          value={`${num(e.unemployment)}%`}
          tone={e.unemployment > 10 ? 'bad' : 'neutral'}
        />
        <StatTile
          label="Renda média"
          icon="piggy-bank"
          value={`R$ ${Math.round(e.income).toLocaleString('pt-BR')}`}
        />
        <StatTile label="Juros" icon="landmark" value={`${num(e.interestRate)}%`} />
        <StatTile label="Dívida" icon="scale" value={`${num(e.debt, 0)}%`} sub="do PIB" />
        <StatTile
          label="Resultado fiscal"
          icon="file-text"
          value={`${num(e.deficit)}%`}
          tone={e.deficit < -1 ? 'bad' : 'neutral'}
          sub="do PIB"
        />
        <StatTile label="Confiança" icon="star" value={Math.round(e.confidence)} />
      </div>
      {baseline && (
        <Panel title="Desde o início do mandato" icon="calendar-check">
          <div className="text-sm">
            Crescimento {num(baseline.growth)}% → {num(e.growth)}% · Inflação{' '}
            {num(baseline.inflation)}% → {num(e.inflation)}% · Desemprego{' '}
            {num(baseline.unemployment)}% → {num(e.unemployment)}%
          </div>
          <div className="text-xs text-muted">{economySummary(e)}</div>
        </Panel>
      )}
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Crescimento, inflação e desemprego" icon="trending-up">
          <LineChartBox
            data={data}
            series={[
              { key: 'crescimento', name: 'PIB %', color: '#3ddc97' },
              { key: 'inflacao', name: 'Inflação %', color: '#ff6b6b' },
              { key: 'desemprego', name: 'Desemprego %', color: '#f2b51e' },
            ]}
            yFormatter={(v) => `${v}`}
          />
        </Panel>
        <Panel title="Juros, dívida e confiança" icon="landmark">
          <LineChartBox
            data={data}
            series={[
              { key: 'juros', name: 'Juros %', color: '#5aa9ff' },
              { key: 'divida', name: 'Dívida % PIB', color: '#c084fc' },
              { key: 'confianca', name: 'Confiança', color: '#22d3ee', dashed: true },
            ]}
          />
        </Panel>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Choques ativos" icon="flame">
          {e.shocks.length === 0 ? (
            <p className="text-sm text-muted">Nenhum choque externo no momento.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {e.shocks.map((s) => (
                <li key={s.id} className="rounded-lg bg-ink-900 px-2.5 py-1.5">
                  <span className="font-bold">{s.label}</span> — {s.monthsLeft} mês(es) · PIB{' '}
                  {s.growth > 0 ? '+' : ''}
                  {s.growth} · inflação {s.inflation > 0 ? '+' : ''}
                  {s.inflation}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Desemprego por estado" icon="map">
          <div className="grid max-h-72 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {states.map(({ s, u }) => (
              <HBar
                key={s.id}
                label={s.name}
                value={u}
                max={20}
                color={u > 10 ? '#ff6b6b' : u > 6 ? '#f2b51e' : '#3ddc97'}
                right={`${num(u)}%`}
              />
            ))}
          </div>
        </Panel>
      </div>
      <EconomyDashboard />
    </div>
  );
}
