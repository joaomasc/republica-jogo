import {
  groupApprovalTarget,
  interestGroupsOverview,
  ISSUE_DEFINITIONS,
  POP_TYPES,
} from '@republica/game-engine';
import { Badge, Bar, Icon, Panel } from '@republica/ui';
import { useGameState } from '../../store/gameStore';

export function GroupsView() {
  const game = useGameState();
  const views = interestGroupsOverview(game);
  const groups = views.map((v) => game.interestGroups[v.id]!).filter(Boolean);
  const viewOf = Object.fromEntries(views.map((v) => [v.id, v]));
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Grupos de interesse reagem às leis em vigor, ao orçamento e às suas posições. Satisfeitos,
        doam e animam suas bases; insatisfeitos e radicalizados, fazem greves que param setores da
        economia e minam a legitimidade. O peso de cada grupo muda com a economia: industrializar o país
        fortalece sindicatos e industriais.
      </p>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {groups.map((g) => {
          const target = groupApprovalTarget(game, g);
          const v = viewOf[g.id]!;
          return (
            <Panel
              key={g.id}
              title={g.name}
              icon={g.icon}
              actions={
                <span className="flex gap-1">
                  {v.striking && <Badge tone="bad">Em greve</Badge>}
                  <Badge tone={v.radicalism >= 60 ? 'bad' : v.radicalism >= 35 ? 'warn' : 'neutral'}>{v.radicalismLabel}</Badge>
                </span>
              }
            >
              <div className="space-y-2 text-sm">
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Aprovação a você</span>
                    <span className="font-bold">
                      {Math.round(g.approval)}{' '}
                      <span className={target > g.approval ? 'text-good' : 'text-bad'}>
                        {target > g.approval + 1 ? '▲' : target < g.approval - 1 ? '▼' : ''}
                      </span>
                    </span>
                  </div>
                  <Bar
                    value={g.approval / 100}
                    color={
                      g.approval >= 60
                        ? 'var(--color-good)'
                        : g.approval < 35
                          ? 'var(--color-bad)'
                          : 'var(--color-warn)'
                    }
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div title="Peso político: cresce com a riqueza e o tamanho da base (indústria fortalece sindicatos e industriais; agro, os ruralistas)">
                    <div className="label">Peso político</div>
                    <div className="font-bold">
                      {Math.round(v.clout * 100)}%{' '}
                      <span className={v.cloutVsBase >= 1 ? 'text-good' : 'text-bad'}>
                        {v.cloutVsBase >= 1.05 ? '▲' : v.cloutVsBase <= 0.95 ? '▼' : ''}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="label">Poder</div>
                    <Bar value={g.power / 100} height={5} />
                  </div>
                  <div>
                    <div className="label">Tamanho</div>
                    <div className="font-bold">{Math.round(g.size * 100)}%</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {g.priorities.map((i) => (
                    <Badge key={i}>
                      <Icon name={ISSUE_DEFINITIONS[i].icon} size={10} />{' '}
                      {ISSUE_DEFINITIONS[i].name}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs">
                  <div className="label mb-0.5">Quer</div>
                  {v.preferredLaws.map((l) => (
                    <div key={l.categoryId} className="flex items-center gap-1" title={l.inForce ? 'Em vigor' : `Hoje: ${l.currentOptionName}`}>
                      {l.inForce ? <Icon name="badge-check" size={12} className="text-good" /> : <Icon name="flag" size={12} className="text-muted" />}
                      {l.optionName}
                      <span className="text-muted">({l.categoryName})</span>
                    </div>
                  ))}
                </div>
                {v.caucuses.length > 0 && (
                  <div className="text-[11px]">
                    <span className="text-muted">Bancadas aliadas:</span> {v.caucuses.map((c) => c.shortName).join(', ')}
                  </div>
                )}
                <div className="text-[11px] text-muted">
                  Representa: {g.relatedPopTypes.map((t) => POP_TYPES[t].plural).join(', ')} ·{' '}
                  {g.leaderName}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
