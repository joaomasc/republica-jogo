import {
  availablePortfolios,
  coalitionSeats,
  formatDateShort,
  partyCompatibility,
} from '@republica/game-engine';
import { Badge, Button, EmptyState, Panel, PartyEmblem } from '@republica/ui';
import { useState } from 'react';
import { Hemicycle } from '../../components/Hemicycle';
import { useGame, useGameState } from '../../store/gameStore';

/** Plenário, partidos e negociação de base. */
export function PartiesTab() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const gov = game.government;
  const [portfolio, setPortfolio] = useState('');
  if (!gov) return <EmptyState icon="building-2" title="Sem mandato" />;
  const player = game.candidates[game.playerId];
  const ports = availablePortfolios(game);
  const chosen = ports.includes(portfolio) ? portfolio : (ports[0] ?? '');
  const seats = coalitionSeats(game);
  const parties = Object.values(game.parties)
    .map((p) => ({
      p,
      seats: game.congress.chambers.reduce((a, c) => a + (c.seats[p.id] ?? 0), 0),
    }))
    .sort((a, b) => b.seats - a.seats);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-2">
        {game.congress.chambers.map((c) => {
          const ordered = Object.entries(c.seats)
            .filter(([, s]) => s > 0)
            .sort(
              (a, b) =>
                Number(game.congress.coalition.includes(b[0])) -
                  Number(game.congress.coalition.includes(a[0])) || b[1] - a[1],
            );
          return (
            <Panel key={c.id} title={`${c.name} (${c.totalSeats})`} icon="building-2">
              <div className="flex flex-col items-center">
                <Hemicycle
                  total={c.totalSeats}
                  groups={ordered.map(([pid, s]) => ({
                    id: pid,
                    seats: s,
                    color: game.parties[pid]?.color ?? '#888',
                    highlight: game.congress.coalition.includes(pid),
                  }))}
                />
                <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
                  {ordered.map(([pid, s]) => {
                    const party = game.parties[pid];
                    return party ? (
                      <span key={pid} className="flex items-center gap-1">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: party.color }}
                        />
                        {party.acronym} {s}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
      <Panel
        title="Partidos e negociação"
        icon="handshake"
        actions={
          <Badge tone={seats.coalition > seats.total / 2 ? 'good' : 'warn'}>
            Base: {seats.coalition}/{seats.total} cadeiras
          </Badge>
        }
      >
        {gov.branch === 'executive' && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-ink-900 p-2.5 text-sm">
            <span>Pasta a oferecer:</span>
            <select
              className="game-select py-1 text-xs"
              value={chosen}
              onChange={(e) => setPortfolio(e.target.value)}
            >
              {ports.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">
              {ports.length} pasta(s) livre(s). Partidos com pasta entram na base; aliados distantes
              incomodam seu partido.
            </span>
          </div>
        )}
        <div className="grid gap-2 lg:grid-cols-2">
          {parties.map(({ p, seats: s }) => {
            const rel = game.congress.relations[p.id] ?? 0;
            const inCoalition = game.congress.coalition.includes(p.id);
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border-2 border-ink-600 bg-ink-900 p-2.5"
              >
                <PartyEmblem party={p} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold">{p.acronym}</span>
                    <span className="text-xs text-muted">{s} cadeiras</span>
                    {inCoalition && <Badge tone="good">Base</Badge>}
                    {p.id === player?.partyId && <Badge tone="gold">Seu partido</Badge>}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="relative h-2 flex-1 rounded-full bg-ink-950">
                      <span className="absolute left-1/2 top-0 h-2 w-px bg-ink-400" />
                      <span
                        className="absolute top-0 h-2 rounded-full"
                        style={{
                          left: rel >= 0 ? '50%' : `${50 + rel / 2}%`,
                          width: `${Math.abs(rel) / 2}%`,
                          background: rel >= 0 ? 'var(--color-good)' : 'var(--color-bad)',
                        }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs tabular-nums">{Math.round(rel)}</span>
                  </div>
                  <div className="text-[11px] text-muted">
                    Afinidade ideológica com você:{' '}
                    {player ? partyCompatibility(player.ideology, p) : 0}%
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    onClick={() => act({ type: 'gov/meet', partyId: p.id })}
                    title="Custa capital político"
                  >
                    Reunião
                  </Button>
                  {gov.branch === 'executive' && chosen && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        act({ type: 'gov/portfolio', partyId: p.id, portfolio: chosen })
                      }
                    >
                      Oferecer {chosen}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title="Registro de negociações" icon="scroll">
        {game.congress.log.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma negociação ainda.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {game.congress.log.slice(0, 15).map((l, i) => (
              <li key={i}>
                <span className="text-muted">{formatDateShort(l.date)}</span> — {l.description}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
