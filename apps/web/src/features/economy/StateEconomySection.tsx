import { stateEconomy, type StateId } from '@republica/game-engine';
import { Bar, Icon } from '@republica/ui';
import { useMemo, useState } from 'react';
import { billions, num, pct, people } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';
import { ConstructionPicker, ConstructionQueue } from './ConstructionPanel';
import { OwnershipBar } from './IndustryView';

/** Seção econômica do estado no painel da região: edifícios, métodos, recursos e obras. */
export function StateEconomySection({ stateId }: { stateId: string }) {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const sid = stateId as StateId;
  const view = useMemo(() => stateEconomy(game, sid), [game, sid]);
  const [tab, setTab] = useState<'edificios' | 'construir' | 'obras'>('edificios');
  const gov = game.government;
  const canBuild =
    !!gov && gov.branch === 'executive' && (gov.jurisdiction.level === 'federal' || gov.jurisdiction.stateId === sid);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section aria-label="Economia do estado" data-testid={`state-economy-${stateId}`} className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <div className="rounded bg-ink-900 px-2 py-1">
          <div className="text-muted">Peso na indústria do país</div>
          <div className="font-display text-sm tabular-nums">{pct(view.share)}</div>
        </div>
        <div className="rounded bg-ink-900 px-2 py-1">
          <div className="text-muted">Salário formal médio</div>
          <div className="font-display text-sm tabular-nums">R$ {Math.round(view.avgWage).toLocaleString('pt-BR')}</div>
        </div>
        <div className="rounded bg-ink-900 px-2 py-1">
          <div className="text-muted">Força de trabalho</div>
          <div className="font-display text-sm tabular-nums">{people(view.laborForce)}</div>
        </div>
        <div className="rounded bg-ink-900 px-2 py-1">
          <div className="text-muted">Informalidade</div>
          <div className="font-display text-sm tabular-nums">{pct(view.informal, 0)}</div>
        </div>
      </div>

      {view.resources.length > 0 && (
        <div className="space-y-1">
          {view.resources.map((r) => (
            <div key={r.id} className="text-xs">
              <div className="flex justify-between">
                <span className="text-muted">{r.name}</span>
                <span className="tabular-nums">
                  {num(r.used, 0)}/{num(r.potential, 0)} níveis
                </span>
              </div>
              <Bar value={r.potential > 0 ? r.used / r.potential : 0} height={4} color="#3ddc97" />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 text-xs">
        {(
          [
            ['edificios', `Edifícios (${view.buildings.length})`],
            ...(canBuild ? [['construir', 'Construir']] : []),
            ['obras', `Obras (${view.queue.length})`],
          ] as [typeof tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded px-2 py-1 ${tab === id ? 'bg-gold-500/20 text-gold-300' : 'text-muted hover:text-paper'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'edificios' && (
        <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {view.buildings.map((b) => (
            <li key={b.id} className="rounded-lg bg-ink-900 px-2 py-1.5">
              <button className="flex w-full items-center gap-2 text-left text-sm" onClick={() => setOpen(open === b.id ? null : b.id)}>
                <Icon name={b.icon} size={15} className="text-gold-400" />
                <span className="min-w-0 flex-1 truncate">
                  {b.name} <span className="text-muted">nv {num(b.level, 0)}</span>
                </span>
                <span className="text-[11px] tabular-nums text-muted">{people(b.jobs)}</span>
                <span className={`w-10 text-right text-[11px] tabular-nums ${b.margin < 0 ? 'text-bad' : 'text-good'}`}>{Math.round(b.margin * 100)}%</span>
              </button>
              <OwnershipBar ownership={b.ownership} />
              {open === b.id && (
                <div className="mt-1.5 space-y-1 text-[11.5px]">
                  <div>
                    <span className="text-muted">Produz:</span> {b.outputs.map((o) => `${o.name} ${billions(o.amount)}`).join(', ') || '—'}
                  </div>
                  <div>
                    <span className="text-muted">Consome:</span> {b.inputs.map((o) => `${o.name} ${billions(o.amount)}`).join(', ') || '—'}
                  </div>
                  <div>
                    <span className="text-muted">Ocupação</span> {Math.round(b.staffing * 100)}% · <span className="text-muted">produtividade</span>{' '}
                    {num(b.productivity, 2)} · <span className="text-muted">lucro</span> {billions(b.profit)}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-muted">Método:</span>
                    {b.canChangeMethod ? (
                      <select
                        className="game-select py-0.5 text-[11px]"
                        value={b.methodId}
                        onChange={(e) => act({ type: 'industry/method', stateId: sid, buildingId: b.id, methodId: e.target.value })}
                      >
                        {b.methods.map((m) => (
                          <option key={m.id} value={m.id} disabled={!m.available} title={m.reason ?? m.description}>
                            {m.name}
                            {m.reason ? ' (bloqueado)' : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span title="Os donos escolhem o método; o governo só decide em estatais ou na economia planificada.">{b.methodName}</span>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {tab === 'construir' && canBuild && <ConstructionPicker stateId={sid} compact />}
      {tab === 'obras' && <ConstructionQueue stateId={sid} />}
    </section>
  );
}
