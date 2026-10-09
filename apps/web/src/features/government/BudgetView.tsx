import {
  BUDGET_CATEGORIES,
  BUDGET_INFO,
  budgetTotals,
  GameConstants,
  ISSUE_DEFINITIONS,
  serviceQuality,
} from '@republica/game-engine';
import { Badge, EmptyState, Icon, Panel, Slider, StatTile } from '@republica/ui';
import { billions } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';

export function BudgetView() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const budget = game.government?.budget;
  if (!budget || game.government?.branch !== 'executive')
    return <EmptyState icon="receipt" title="Orçamento é atribuição do Executivo" />;
  const t = budgetTotals(budget);
  const max = GameConstants.budget.maxAdjustment;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <StatTile
          label="Receita anual"
          icon="trending-up"
          value={billions(t.revenue)}
          tone="good"
          sub={`Impostos ${billions(budget.revenueTaxes)}`}
        />
        <StatTile label="Despesa anual" icon="receipt" value={billions(t.spending)} />
        <StatTile
          label="Resultado anual"
          icon="scale"
          value={billions(t.balance)}
          tone={t.balance < 0 ? 'bad' : 'good'}
          sub={t.balance < 0 ? 'Déficit: gera dívida e inflação' : 'Superávit'}
        />
        <StatTile
          label="Caixa acumulado"
          icon="piggy-bank"
          value={billions(budget.balance)}
          tone={budget.balance < 0 ? 'bad' : 'neutral'}
        />
        <StatTile
          label="Emendas liberadas"
          icon="handshake"
          value={billions(budget.amendmentsSpent)}
        />
      </div>
      <Panel title="Alocação de despesas" icon="receipt">
        <p className="mb-3 text-sm text-muted">
          Cada área pode variar ±{Math.round(max * 100)}% da referência. Mais verba melhora o
          serviço para quem prioriza aquele tema; cortes economizam mas desagradam. Sua Gestão e a
          competência dos ministros afetam a eficiência.
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          {BUDGET_CATEGORIES.map((c) => {
            const info = BUDGET_INFO[c];
            const value = budget.spending[c];
            const base = budget.baseline[c];
            const quality = serviceQuality(game, c);
            return (
              <div key={c} className="rounded-xl border-2 border-ink-700 bg-ink-900 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Icon name={info.icon} size={16} className="text-gold-400" />
                  <span className="font-display font-semibold">{info.name}</span>
                  <Badge
                    tone={quality >= 1.08 ? 'good' : quality <= 0.92 ? 'bad' : 'neutral'}
                    className="ml-auto"
                  >
                    Serviço {Math.round(quality * 100)}%
                  </Badge>
                </div>
                <Slider
                  value={Math.round((value / base) * 100)}
                  min={Math.round((1 - max) * 100)}
                  max={Math.round((1 + max) * 100)}
                  onChange={(v) =>
                    act({ type: 'gov/budget', category: c, amount: (base * v) / 100 })
                  }
                  display={`${billions(value)} (${Math.round((value / base) * 100)}%)`}
                  leftLabel="Corte"
                  rightLabel="Expansão"
                />
                <div className="mt-1 text-[11px] text-muted">
                  Importa para quem prioriza:{' '}
                  {info.issues.map((i) => ISSUE_DEFINITIONS[i].name).join(', ')}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
