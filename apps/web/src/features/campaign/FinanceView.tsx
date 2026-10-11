import {
  estimateDailyIncome,
  formatMoney,
  incomeByCategory,
  spendingByCategory,
  staffDailyCost,
  type LedgerCategory,
} from '@republica/game-engine';
import { EmptyState, Panel, StatTile } from '@republica/ui';
import { AreaChartBox, HBar } from '../../components/charts';
import { getSnapshot } from '@republica/game-engine';
import { useGameState } from '../../store/gameStore';

const CATEGORY_LABEL: Record<LedgerCategory, string> = {
  party_fund: 'Fundo partidário',
  donations: 'Doações',
  fundraising: 'Eventos de arrecadação',
  interest_group: 'Grupos de interesse',
  staff: 'Equipe',
  ads: 'Propaganda',
  travel: 'Viagens',
  events: 'Eventos e comícios',
  polls: 'Pesquisas',
  fines: 'Multas',
  other: 'Outros',
};
const COLORS = [
  '#f2b51e',
  '#5aa9ff',
  '#3ddc97',
  '#ff6b6b',
  '#c084fc',
  '#fb923c',
  '#22d3ee',
  '#a3e635',
  '#f472b6',
  '#94a3c4',
  '#facc15',
];

export function FinanceView() {
  const game = useGameState();
  const campaign = game.campaign;
  if (!campaign) return <EmptyState icon="piggy-bank" title="Sem campanha em andamento" />;
  const share = getSnapshot(game)?.total.shares[game.playerId] ?? 0;
  const income = estimateDailyIncome(game, share);
  const payroll = staffDailyCost(campaign.staff, campaign.moneyScale);
  const adsDaily = campaign.ads.filter((a) => a.active).reduce((a, x) => a + x.dailyCost, 0);
  const dailyIn = income.party + income.donors + income.militants;
  const spending = Object.entries(spendingByCategory(campaign)).sort((a, b) => b[1] - a[1]) as [
    LedgerCategory,
    number,
  ][];
  const incomes = Object.entries(incomeByCategory(campaign)).sort((a, b) => b[1] - a[1]) as [
    LedgerCategory,
    number,
  ][];
  const maxSpend = Math.max(1, ...spending.map(([, v]) => v));
  const maxIncome = Math.max(1, ...incomes.map(([, v]) => v));
  const history = campaign.moneyHistory.map((h) => ({
    label: h.date.slice(5).split('-').reverse().join('/'),
    caixa: Math.round(h.money),
  }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-5">
        <StatTile label="Caixa" icon="piggy-bank" value={formatMoney(campaign.money)} />
        <StatTile
          label="Arrecadação/dia"
          icon="trending-up"
          value={formatMoney(dailyIn)}
          tone="good"
          sub={`Partido ${formatMoney(income.party)} · Doações ${formatMoney(income.donors + income.militants)}`}
        />
        <StatTile
          label="Folha/dia"
          icon="users"
          value={formatMoney(payroll)}
          tone={payroll > dailyIn ? 'bad' : 'neutral'}
        />
        <StatTile
          label="Total arrecadado"
          icon="receipt"
          value={formatMoney(campaign.totalRaised)}
        />
        <StatTile
          label="Total gasto"
          icon="receipt"
          value={formatMoney(campaign.totalSpent)}
          sub={adsDaily > 0 ? `Propaganda paga até ${formatMoney(adsDaily)}/dia` : undefined}
        />
      </div>
      <Panel title="Caixa ao longo da campanha" icon="trending-up">
        <AreaChartBox
          data={history}
          dataKey="caixa"
          color="#f2b51e"
          yFormatter={(v) => formatMoney(v)}
        />
      </Panel>
      <div className="grid gap-3 @2xl:grid-cols-2">
        <Panel title="Para onde foi o dinheiro" icon="receipt">
          <div className="space-y-2">
            {spending.length === 0 && <p className="text-sm text-muted">Nenhum gasto ainda.</p>}
            {spending.map(([cat, v], i) => (
              <HBar
                key={cat}
                label={CATEGORY_LABEL[cat]}
                value={v}
                max={maxSpend}
                color={COLORS[i % COLORS.length] ?? '#f2b51e'}
                right={formatMoney(v)}
              />
            ))}
          </div>
        </Panel>
        <Panel title="De onde veio" icon="piggy-bank">
          <div className="space-y-2">
            {incomes.map(([cat, v], i) => (
              <HBar
                key={cat}
                label={CATEGORY_LABEL[cat]}
                value={v}
                max={maxIncome}
                color={COLORS[(i + 2) % COLORS.length] ?? '#3ddc97'}
                right={formatMoney(v)}
              />
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Livro-caixa" icon="file-text">
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-ink-800 text-left text-[11px] uppercase text-muted">
              <tr>
                <th className="py-1">Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {campaign.ledger.slice(0, 60).map((l, i) => (
                <tr key={i} className="border-t border-ink-700">
                  <td className="py-1 text-muted">
                    {l.date.split('-').reverse().slice(0, 2).join('/')}
                  </td>
                  <td>{l.description}</td>
                  <td className="text-muted">{CATEGORY_LABEL[l.category]}</td>
                  <td
                    className={`text-right tabular-nums ${l.amount < 0 ? 'text-bad' : 'text-good'}`}
                  >
                    {formatMoney(l.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
