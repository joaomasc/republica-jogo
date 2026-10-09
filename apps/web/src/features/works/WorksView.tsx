import {
  playerWorksScope,
  STATE_LIST,
  workOptions,
  worksJobsIn,
  worksOverview,
  type StateId,
  type WorkSize,
  type WorkView,
} from '@republica/game-engine';
import { Badge, Bar, Button, cn, EmptyState, Icon, Panel, StatTile } from '@republica/ui';
import { useState } from 'react';
import { billions, people } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';

const STATUS: Record<WorkView['status'], { label: string; tone: 'info' | 'bad' | 'good' }> = {
  running: { label: 'Em obra', tone: 'info' },
  stalled: { label: 'Paralisada', tone: 'bad' },
  done: { label: 'Inaugurada', tone: 'good' },
};

function WorkRow({ w, onCancel }: { w: WorkView; onCancel?: () => void }) {
  return (
    <li className="rounded-lg bg-ink-900 px-2.5 py-1.5">
      <div className="flex items-center gap-2 text-sm">
        <Icon name={w.icon} size={15} className="text-gold-400" />
        <span className="min-w-0 flex-1 truncate">
          <b>{w.name}</b> <span className="text-muted">· {w.size} · {w.stateName}</span>
        </span>
        <Badge tone={STATUS[w.status].tone}>{STATUS[w.status].label}</Badge>
      </div>
      <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted">
        <span>{w.sponsor}</span>
        <span>{billions(w.cost)}</span>
        {w.status !== 'done' ? (
          <>
            <span className="text-good">{people(w.tempJobs)} empregos na obra</span>
            <span>faltam {w.monthsLeft} mês(es)</span>
          </>
        ) : (
          <span className="text-good">{people(w.permanentJobs)} empregos permanentes</span>
        )}
      </div>
      {w.status !== 'done' && <Bar value={w.progress} height={4} className="mt-1" />}
      {onCancel && (
        <button className="mt-1 text-[11px] text-bad hover:underline" onClick={onCancel}>
          cancelar obra
        </button>
      )}
    </li>
  );
}

function Catalog() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const scope = playerWorksScope(game);
  const options = workOptions(game);
  const [size, setSize] = useState<WorkSize>('medium');
  const [where, setWhere] = useState<StateId>('BA');
  if (!scope) return null;
  return (
    <Panel
      title="Iniciar obra"
      icon="hard-hat"
      actions={
        <div className="flex items-center gap-1.5">
          {scope.level === 'federal' && (
            <select className="game-select py-1 text-xs" value={where} onChange={(e) => setWhere(e.target.value as StateId)}>
              {STATE_LIST.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          {(['small', 'medium', 'large'] as WorkSize[]).map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={cn('rounded px-2 py-0.5 text-xs', size === s ? 'bg-gold-500 text-ink-950' : 'bg-ink-900 text-muted')}
            >
              {s === 'small' ? 'Pequena' : s === 'medium' ? 'Média' : 'Grande'}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid max-h-[46vh] gap-1.5 overflow-y-auto pr-1 md:grid-cols-2">
        {options.map((o) => {
          const sz = o.sizes.find((x) => x.size === size)!;
          return (
            <div key={o.typeId} className={cn('rounded-lg border border-ink-600 bg-ink-900 p-2', o.blocked && 'opacity-60')}>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Icon name={o.icon} size={15} className="text-gold-400" />
                {o.name}
              </div>
              <p className="text-[11px] text-muted">{o.description}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 text-[11px]">
                <span>{billions(sz.cost)}</span>
                <span>{sz.months} meses</span>
                <span className="text-good">{people(sz.tempJobs)} empregos na obra</span>
                <span className="text-good">{people(sz.permanentJobs)} permanentes</span>
                {o.attractsInvestment > 0 && <span className="text-info">atrai empresas privadas</span>}
              </div>
              {o.blocked ? (
                <div className="mt-1 text-[11px] text-bad">{o.blocked}</div>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  className="mt-1.5"
                  data-testid={`work-start-${o.typeId}`}
                  onClick={() => act({ type: 'works/start', typeId: o.typeId, size, ...(scope.level === 'federal' ? { stateId: where } : {}) })}
                >
                  Iniciar
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/** Obras públicas: as suas, as da sua cidade/estado e as do país, separadas. */
export function WorksView() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const o = worksOverview(game);
  const scope = playerWorksScope(game);
  const [tab, setTab] = useState<'mine' | 'local' | 'national' | 'done'>(scope ? 'mine' : 'local');
  const stateId = (game.government?.jurisdiction.stateId as StateId | undefined) ?? null;
  const jobs = stateId ? worksJobsIn(game, stateId) : null;
  const tabs = [
    ...(scope ? [{ id: 'mine' as const, label: `Minhas obras (${o.mine.length})` }] : []),
    ...(stateId ? [{ id: 'local' as const, label: `Em ${o.scopeLabel} (${o.local.length})` }] : []),
    { id: 'national' as const, label: `Brasil (${o.national.length})` },
    { id: 'done' as const, label: 'Inauguradas' },
  ];
  const list = tab === 'mine' ? o.mine : tab === 'local' ? o.local : tab === 'national' ? o.national : o.done;
  if (!game.government && o.national.length === 0) return <EmptyState icon="hard-hat" title="Sem obras" text="Obras públicas aparecem quando há governos tocando projetos." />;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Suas obras em andamento" icon="hard-hat" value={o.mine.length} />
        <StatTile
          label="Investimento em obras"
          icon="piggy-bank"
          value={billions(o.annualCommitment)}
          sub={o.maxCommitment > 0 ? `por ano · limite ${billions(o.maxCommitment)}` : 'por ano'}
        />
        <StatTile label="Empregos nas suas obras" icon="users" value={people(jobs?.temp ?? 0)} sub="diretos, agora" tone="good" />
        <StatTile label="Empregos permanentes" icon="briefcase" value={people(jobs?.permanent ?? 0)} sub="deixados por obras suas" tone="good" />
      </div>
      <p className="text-xs text-muted">
        Cada obra emprega gente enquanto anda (e gera empregos indiretos no comércio e serviços), deixa empregos permanentes,
        melhora o serviço público da sua esfera e rende inauguração. Obras sem verba param: cuide do saldo do orçamento.
      </p>
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Panel
          title="Obras"
          icon="construction"
          actions={
            <div className="flex flex-wrap gap-1 text-xs">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? 'text-gold-300' : 'text-muted hover:text-paper'}>
                  {t.label}
                </button>
              ))}
            </div>
          }
        >
          {list.length === 0 ? (
            <p className="text-sm text-muted">{tab === 'mine' ? 'Você ainda não iniciou nenhuma obra.' : 'Nenhuma obra aqui.'}</p>
          ) : (
            <ul className="max-h-[56vh] space-y-1.5 overflow-y-auto pr-1">
              {list.slice(0, 60).map((w) => (
                <WorkRow key={w.id} w={w} {...(tab === 'mine' ? { onCancel: () => act({ type: 'works/cancel', workId: w.id }) } : {})} />
              ))}
            </ul>
          )}
        </Panel>
        {scope ? <Catalog /> : <Panel title="Iniciar obra" icon="hard-hat"><p className="text-sm text-muted">Só o chefe do Executivo (prefeito, governador ou presidente) inicia obras públicas.</p></Panel>}
      </div>
    </div>
  );
}
