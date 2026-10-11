import { federalOption, getLawOption, marketRows, tradeOverview } from '@republica/game-engine';
import { Panel, StatTile } from '@republica/ui';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { HBar, LineChartBox } from '../../components/charts';
import { billions, num } from '../../lib/format';
import { useGameState } from '../../store/gameStore';

/** Comércio exterior: pauta, câmbio e tarifas. */
export function TradeView() {
  const game = useGameState();
  const navigate = useNavigate();
  const t = useMemo(() => tradeOverview(game), [game]);
  const rows = useMemo(() => marketRows(game), [game]);
  const totalExp = t.exports.reduce((a, x) => a + x.value, 0);
  const totalImp = t.imports.reduce((a, x) => a + x.value, 0);
  const tradeLaw = federalOption(game, 'trade');
  const lawName = tradeLaw ? (getLawOption('trade', tradeLaw)?.name ?? tradeLaw) : '—';
  const tariffs = rows.filter((r) => r.tradeable).sort((a, b) => b.tariff - a.tariff);
  const fx = t.exchangeHistory.map((h) => ({ label: h.date.slice(2, 7).split('-').reverse().join('/'), cambio: Math.round(h.value * 100) / 100 }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 @lg:grid-cols-5">
        <StatTile label="Exportações" icon="ship" value={billions(totalExp)} sub="por ano" tone="good" />
        <StatTile label="Importações" icon="container" value={billions(totalImp)} sub="por ano" />
        <StatTile label="Saldo" icon="scale" value={billions(t.balance)} tone={t.balance >= 0 ? 'good' : 'bad'} />
        <StatTile
          label="Câmbio"
          icon="arrow-left-right"
          value={`R$ ${num(t.exchangeRate, 2)}`}
          sub={`tendência: R$ ${num(t.exchangeTarget, 2)}`}
          tone={t.exchangeTarget > t.exchangeRate * 1.02 ? 'warn' : 'neutral'}
        />
        <StatTile label="Política comercial" icon="landmark" value={<span className="text-base">{lawName}</span>} />
      </div>

      <div className="grid gap-3 @3xl:grid-cols-2">
        <Panel title="Pauta de exportação" icon="ship">
          {t.exports.length === 0 ? (
            <p className="text-sm text-muted">O país não exporta nada.</p>
          ) : (
            <div className="space-y-1.5">
              {t.exports.slice(0, 12).map((x) => (
                <HBar key={x.id} label={x.name} value={x.value} max={Math.max(1e-9, t.exports[0]?.value ?? 1)} color="#3ddc97" right={`${billions(x.value)} · ${Math.round((x.value / Math.max(1e-9, totalExp)) * 100)}%`} />
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Pauta de importação" icon="container">
          {t.imports.length === 0 ? (
            <p className="text-sm text-muted">O país não importa nada.</p>
          ) : (
            <div className="space-y-1.5">
              {t.imports.slice(0, 12).map((x) => (
                <HBar key={x.id} label={x.name} value={x.value} max={Math.max(1e-9, t.imports[0]?.value ?? 1)} color="#5aa9ff" right={`${billions(x.value)} · ${Math.round((x.value / Math.max(1e-9, totalImp)) * 100)}%`} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-3 @3xl:grid-cols-2">
        <Panel title="Câmbio (R$ por dólar)" icon="arrow-left-right">
          {fx.length > 1 ? (
            <LineChartBox data={fx} series={[{ key: 'cambio', name: 'R$/US$', color: '#f2b51e' }]} height={200} />
          ) : (
            <p className="text-sm text-muted">O histórico aparece com o passar dos meses.</p>
          )}
          <p className="mt-1 text-xs text-muted">
            Saldo comercial positivo valoriza o real; déficit e juros baixos o desvalorizam. Real fraco protege a
            indústria, mas encarece importados e pressiona a inflação.
          </p>
        </Panel>
        <Panel
          title="Tarifas de importação"
          icon="badge-percent"
          actions={
            <button className="text-xs text-gold-300 hover:underline" onClick={() => navigate('/jogo/leis')}>
              mudar política comercial →
            </button>
          }
        >
          <div className="grid max-h-72 gap-1.5 overflow-y-auto pr-1 @sm:grid-cols-2">
            {tariffs.map((r) => (
              <HBar key={r.id} label={r.name} value={r.tariff} max={0.6} color={r.tariff > 0.3 ? '#ff6b6b' : r.tariff > 0.15 ? '#f2b51e' : '#3ddc97'} right={`${Math.round(r.tariff * 100)}%`} />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">Tarifas vêm da lei de comércio e de decretos de tarifa do Executivo.</p>
        </Panel>
      </div>
    </div>
  );
}
