import {
  buildingRows,
  economyDashboard,
  OWNER_LABELS,
  planView,
  STATE_LIST,
  type OwnerKind,
  type SectorId,
  type StateId,
} from '@republica/game-engine';
import { Badge, Bar, Button, Icon, Panel, StatTile } from '@republica/ui';
import { useMemo, useState } from 'react';
import { num, pct, people } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';
import { ConstructionPicker, ConstructionQueue } from './ConstructionPanel';

const OWNER_COLORS: Record<OwnerKind, string> = {
  private: '#5aa9ff',
  state: '#f2b51e',
  cooperative: '#3ddc97',
  foreign: '#c084fc',
};

/** Barra empilhada de propriedade (privada/estatal/cooperativa/estrangeira). */
export function OwnershipBar({ ownership }: { ownership: Record<OwnerKind, number> }) {
  const parts = (Object.keys(OWNER_COLORS) as OwnerKind[]).filter((k) => ownership[k] > 0.005);
  return (
    <div
      className="flex h-2 w-full overflow-hidden rounded-[2px] bg-ink-950"
      title={parts.map((k) => `${OWNER_LABELS[k]} ${Math.round(ownership[k] * 100)}%`).join(' · ')}
    >
      {parts.map((k) => (
        <span key={k} style={{ width: `${ownership[k] * 100}%`, background: OWNER_COLORS[k] }} />
      ))}
    </div>
  );
}

function PlanEditor() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const plan = useMemo(() => planView(game), [game]);
  const [weights, setWeights] = useState<Partial<Record<SectorId, number>>>(() =>
    Object.fromEntries(plan.sectors.map((s) => [s.sector, Math.round(s.weight * 10)])),
  );
  const isExec = game.government?.branch === 'executive';
  return (
    <Panel
      title="Plano nacional de investimento"
      icon="clipboard-list"
      actions={<Badge tone={plan.followedByLaws ? 'good' : 'warn'}>{plan.followedByLaws ? 'Seguido pelas estatais' : 'Indicativo'}</Badge>}
    >
      <p className="mb-2 text-xs text-muted">
        Diga ao fundo estatal onde investir. Sob desenvolvimentismo, economia planificada ou plano nacional, as
        estatais constroem conforme estes pesos; sem essas leis o plano é só indicativo.
      </p>
      <div className="grid gap-x-4 gap-y-1.5 @sm:grid-cols-2">
        {plan.sectors
          .filter((s) => s.plannable)
          .map((s) => (
            <label key={s.sector} className="flex items-center gap-2 text-sm">
              <span className="w-40 truncate">{s.label}</span>
              <input
                type="range"
                min={0}
                max={10}
                value={weights[s.sector] ?? 0}
                disabled={!isExec}
                onChange={(e) => setWeights({ ...weights, [s.sector]: Number(e.target.value) })}
                className="flex-1 accent-[var(--color-gold-500)]"
              />
              <span className="w-6 text-right tabular-nums">{weights[s.sector] ?? 0}</span>
            </label>
          ))}
      </div>
      {isExec && (
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="primary" onClick={() => act({ type: 'industry/plan', weights })}>
            Aplicar plano
          </Button>
          {plan.defined && (
            <Button size="sm" variant="ghost" onClick={() => act({ type: 'industry/plan', weights: null })}>
              Abolir plano
            </Button>
          )}
        </div>
      )}
    </Panel>
  );
}

/** Indústria do país (estilo Victoria 3): edifícios, propriedade, obras e plano. */
export function IndustryView() {
  const game = useGameState();
  const rows = useMemo(() => buildingRows(game), [game]);
  const dash = useMemo(() => economyDashboard(game), [game]);
  const [sector, setSector] = useState('all');
  const [stateId, setStateId] = useState<StateId>(
    (game.government?.jurisdiction.stateId as StateId | undefined) ?? 'SP',
  );
  const isExec = game.government?.branch === 'executive';
  const sectors = [...new Map(rows.map((r) => [r.sector, r.sectorName])).entries()];
  const shown = rows.filter((r) => r.levels > 0 && (sector === 'all' || r.sector === sector)).sort((a, b) => b.employment - a.employment);
  const usage = dash.constructionCapacity > 0 ? dash.constructionUsed / dash.constructionCapacity : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 @lg:grid-cols-4">
        <StatTile label="Indústria de transformação" icon="factory" value={pct(dash.manufacturingShare)} sub="do valor adicionado" />
        <StatTile label="Capacidade de construção" icon="hard-hat" value={`${Math.round(usage * 100)}%`} sub={`${num(dash.constructionCapacity, 0)} pontos/mês`} />
        <StatTile label="Obras na fila" icon="brick-wall" value={game.industry.queue.length} />
        <StatTile label="Tecnologia" icon="flask-conical" value={num(dash.techLevel, 2)} sub={`${Math.round(dash.techProgress * 100)}% rumo ao próximo nível`} />
      </div>

      <div className="grid grid-cols-1 gap-3 @6xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel
          title="Edifícios do país"
          icon="factory"
          actions={
            <select className="game-select py-1 text-xs" value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="all">Todos os setores</option>
              {sectors.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          }
        >
          <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-muted">
            {(Object.keys(OWNER_COLORS) as OwnerKind[]).map((k) => (
              <span key={k} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: OWNER_COLORS[k] }} />
                {OWNER_LABELS[k]}
              </span>
            ))}
          </div>
          <div className="max-h-[60vh] overflow-auto pr-1">
            <table className="w-full min-w-[620px] text-sm [&_td]:px-1.5 [&_th]:px-1.5">
              <thead className="sticky top-0 bg-ink-900 text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-1.5 text-left">Edifício</th>
                  <th className="text-right">Níveis</th>
                  <th className="text-right">Empregos</th>
                  <th className="text-right">Ocupação</th>
                  <th className="text-right">Margem</th>
                  <th className="w-28 pl-3 text-left">Propriedade</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-t border-ink-700/60" title={`Maiores polos: ${r.topStates.map((t) => `${t.stateId} (${num(t.levels, 0)})`).join(', ')}`}>
                    <td className="py-1.5">
                      <span className="flex items-center gap-2">
                        <Icon name={r.icon} size={15} className="text-gold-400" />
                        <span>
                          {r.name}
                          <span className="block text-[10.5px] text-muted">
                            {r.sectorName}
                            {r.underConstruction > 0 && ` · ${r.underConstruction} em obra`}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="text-right tabular-nums">{num(r.levels, 0)}</td>
                    <td className="text-right tabular-nums">{people(r.employment)}</td>
                    <td className="text-right tabular-nums">{Math.round(r.staffing * 100)}%</td>
                    <td className={`text-right tabular-nums ${r.margin < 0 ? 'text-bad' : r.margin > 0.2 ? 'text-good' : ''}`}>
                      {Math.round(r.margin * 100)}%
                    </td>
                    <td className="pl-3">
                      <OwnershipBar ownership={r.ownership} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-3">
          {isExec && (
            <Panel
              title="Mandar construir"
              icon="hard-hat"
              actions={
                <select className="game-select py-1 text-xs" value={stateId} onChange={(e) => setStateId(e.target.value as StateId)}>
                  {STATE_LIST.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              }
            >
              <ConstructionPicker stateId={stateId} compact />
            </Panel>
          )}
          <Panel title="Obras em andamento" icon="brick-wall">
            <div className="mb-2">
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span>Setor de construção usado</span>
                <span>{Math.round(usage * 100)}%</span>
              </div>
              <Bar value={usage} />
            </div>
            <div className="max-h-[40vh] overflow-y-auto pr-1">
              <ConstructionQueue />
            </div>
          </Panel>
        </div>
      </div>
      {isExec && game.government?.jurisdiction.level === 'federal' && <PlanEditor />}
    </div>
  );
}
