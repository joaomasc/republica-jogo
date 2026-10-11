import { maneuverOptions, type ManeuverId } from '@republica/game-engine';
import { Button, cn, Icon, Tooltip } from '@republica/ui';
import { useState } from 'react';
import { useGame, useGameState } from '../../store/gameStore';

/**
 * Manobras regimentais contra uma proposição: obstruir, pedir vista, tirar de pauta, emendar,
 * destacar, articular votos contra ou engavetar. `only` restringe a lista (ex.: no dia da votação).
 */
export function ManeuversPanel({ billId, only, compact = false }: { billId: string; only?: ManeuverId[]; compact?: boolean }) {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const all = maneuverOptions(game, billId);
  const list = only ? all.filter((m) => only.includes(m.id)) : all;
  const parties = Object.entries(game.congress.chambers[0]?.seats ?? {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const [party, setParty] = useState(parties[0]?.[0] ?? '');
  if (list.length === 0) return null;
  return (
    <div className={cn('grid gap-1.5', compact ? '@sm:grid-cols-2' : '@lg:grid-cols-2')}>
      {list.map((m) => (
        <div key={m.id} className={cn('rounded-lg border border-ink-600 bg-ink-900 p-2', !m.available && 'opacity-55')}>
          <div className="flex items-center gap-1.5">
            <Icon name={m.icon} size={14} className="text-gold-400" />
            <Tooltip content={<div className="max-w-xs text-xs">{m.description}</div>}>
              <span className="cursor-help text-[13px] font-semibold underline decoration-dotted underline-offset-2">{m.name}</span>
            </Tooltip>
            <span className="ml-auto text-[11px] text-muted">
              {m.chance !== null ? `${Math.round(m.chance * 100)}% · ` : ''}
              {m.cost} capital
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted">{m.effect}</div>
          {m.reason ? (
            <div className="mt-1 text-[11px] text-bad">{m.reason}</div>
          ) : (
            <div className="mt-1.5 flex items-center gap-1.5">
              {m.id === 'lobby_against' && (
                <select className="game-select py-0.5 text-xs" value={party} onChange={(e) => setParty(e.target.value)}>
                  {parties.map(([pid, seats]) => (
                    <option key={pid} value={pid}>
                      {game.parties[pid]?.acronym} ({seats})
                    </option>
                  ))}
                </select>
              )}
              <Button
                size="sm"
                variant="danger"
                data-testid={`maneuver-${m.id}`}
                onClick={() => act({ type: 'leg/maneuver', billId, maneuver: m.id, ...(m.id === 'lobby_against' ? { partyId: party } : {}) })}
              >
                Executar
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
