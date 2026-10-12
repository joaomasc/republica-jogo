import { nemesisOf, OFFICES, rivalryScore } from '@republica/game-engine';
import { Avatar, Badge, Panel } from '@republica/ui';
import { useGameState } from '../../store/gameStore';

/** Rivais recorrentes: quem você já enfrentou, o placar entre vocês e onde cada um está agora. */
export function RivalsPanel() {
  const game = useGameState();
  const rivals = Object.values(game.rivals ?? {})
    .filter((r) => r.memory.confrontations > 0)
    .sort((a, b) => rivalryScore(b) - rivalryScore(a))
    .slice(0, 8);
  if (rivals.length === 0) return null;
  const nemesis = nemesisOf(game);
  const year = Number(game.date.slice(0, 4));

  return (
    <Panel title="Rivais" icon="swords">
      <ul className="space-y-2" data-testid="rivals-panel">
        {rivals.map((r) => {
          const c = r.candidate;
          const party = game.parties[c.partyId];
          const m = r.memory;
          return (
            <li key={r.id} className="flex items-center gap-2.5 rounded-xl bg-ink-900 p-2">
              <Avatar
                config={c.appearance}
                size={40}
                background={party?.color ?? '#2c3d63'}
                age={c.age + Math.max(0, year - r.lastYear)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-bold">{c.ballotName}</span>
                  <span className="text-xs text-muted">{party?.acronym}</span>
                  {nemesis?.id === r.id && <Badge tone="bad">nêmesis</Badge>}
                  {m.allied > 0 && <Badge tone="good">já foi aliado</Badge>}
                </div>
                <div className="text-xs text-muted">
                  {m.confrontations} confronto(s) · você venceu {m.lostToPlayer}, perdeu{' '}
                  {m.beatPlayer}
                  {m.attacks > 0 && ` · mirou em você ${m.attacks} semana(s)`}
                </div>
                <div className="text-[11px] text-paper/80">
                  {r.office
                    ? `${OFFICES[r.office.officeId].name} (${r.office.label}) até ${r.office.until}`
                    : 'Sem mandato no momento'}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
