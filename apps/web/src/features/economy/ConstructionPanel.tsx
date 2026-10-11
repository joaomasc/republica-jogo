import { constructionOptions, constructionQueueView, type StateId } from '@republica/game-engine';
import { Badge, Bar, Button, cn, Icon } from '@republica/ui';
import { useMemo, useState } from 'react';
import { billions, people } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';

/** Lista de edifícios que o governo pode mandar construir num estado. */
export function ConstructionPicker({ stateId, compact = false }: { stateId: StateId; compact?: boolean }) {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const [sector, setSector] = useState('all');
  const options = useMemo(() => constructionOptions(game, stateId), [game, stateId]);
  const sectors = [...new Map(options.map((o) => [o.sector, o.sectorName])).entries()];
  const shown = options
    .filter((o) => sector === 'all' || o.sector === sector)
    .sort((a, b) => Number(!!a.blocked) - Number(!!b.blocked) || b.expectedReturn - a.expectedReturn);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <select className="game-select py-1 text-xs" value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="all">Todos os setores</option>
          {sectors.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-muted">Obras do governo saem do orçamento de investimento.</span>
      </div>
      <div className={cn('grid gap-1.5 overflow-y-auto pr-1', compact ? 'max-h-64' : 'max-h-[52vh] @lg:grid-cols-2')}>
        {shown.map((o) => (
          <div
            key={o.id}
            className={cn('flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-900 px-2 py-1.5', o.blocked && 'opacity-60')}
            title={o.blocked ?? undefined}
          >
            <Icon name={o.icon} size={18} className="shrink-0 text-gold-400" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{o.name}</div>
              <div className="text-[11px] text-muted">
                {billions(o.cost)} · {people(o.jobsPerLevel)} empregos
                {o.sector !== 'public' && ` · retorno ${Math.round(o.expectedReturn * 100)}%/ano`}
                {o.resourceRoom !== null && ` · recurso p/ ${o.resourceRoom} nível(is)`}
              </div>
              {o.blocked && <div className="text-[11px] text-bad">{o.blocked}</div>}
            </div>
            <Button
              size="sm"
              variant="primary"
              disabled={!!o.blocked}
              onClick={() => act({ type: 'industry/build', stateId, buildingId: o.id, levels: 1 })}
            >
              Construir
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Fila de obras (todas ou só as de um estado). */
export function ConstructionQueue({ stateId, limit = 40 }: { stateId?: StateId; limit?: number }) {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const queue = useMemo(() => constructionQueueView(game), [game]).filter((q) => !stateId || q.stateId === stateId);
  if (queue.length === 0) return <p className="text-sm text-muted">Nenhuma obra em andamento.</p>;
  return (
    <ul className="space-y-1.5">
      {queue.slice(0, limit).map((q) => (
        <li key={q.id} className="rounded-lg bg-ink-900 px-2.5 py-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Icon name={q.icon} size={15} className="text-gold-400" />
            <span className="min-w-0 flex-1 truncate">
              {q.buildingName} <span className="text-muted">· {q.stateName}</span>
            </span>
            <Badge tone={q.mine ? 'gold' : 'neutral'}>{q.origin}</Badge>
            <span className="text-xs tabular-nums text-muted">~{q.eta} m</span>
            {q.mine && (
              <button className="text-xs text-bad hover:underline" onClick={() => act({ type: 'industry/cancel', projectId: q.id })}>
                cancelar
              </button>
            )}
          </div>
          <Bar value={q.progress} height={4} />
          <div className="text-[10.5px] text-muted">Dono: {q.owner}</div>
        </li>
      ))}
      {queue.length > limit && <li className="text-xs text-muted">+{queue.length - limit} obra(s) na fila.</li>}
    </ul>
  );
}
