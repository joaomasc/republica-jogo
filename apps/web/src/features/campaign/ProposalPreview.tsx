import {
  getPlayerStatus,
  ideologyAffinity,
  popTypeSummaries,
  shiftIdeology,
  type GameState,
  type ProposalDefinition,
} from '@republica/game-engine';
import { Icon } from '@republica/ui';

/** Mostra quem tende a gostar/desgostar de uma proposta (pela mudança de posição percebida). */
export function ProposalPreview({
  game,
  proposal,
}: {
  game: GameState;
  proposal: ProposalDefinition;
}) {
  const status = getPlayerStatus(game);
  if (!status) return null;
  const after = shiftIdeology(status.perceivedIdeology, proposal.ideologyShift, 0.7);
  const deltas = popTypeSummaries(game)
    .filter((p) => p.voters > 0)
    .map((p) => ({
      name: p.name,
      icon: p.icon,
      delta:
        ideologyAffinity(p.ideology, after) -
        ideologyAffinity(p.ideology, status.perceivedIdeology),
    }))
    .sort((a, b) => b.delta - a.delta);
  const winners = deltas.filter((d) => d.delta > 0.002).slice(0, 3);
  const losers = deltas
    .filter((d) => d.delta < -0.002)
    .slice(-3)
    .reverse();
  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-lg bg-good/10 p-2">
        <div className="mb-1 font-bold text-good">Tende a agradar</div>
        {winners.length ? (
          winners.map((w) => (
            <div key={w.name} className="flex items-center gap-1">
              <Icon name={w.icon} size={11} /> {w.name}
            </div>
          ))
        ) : (
          <span className="text-muted">Ninguém em especial</span>
        )}
      </div>
      <div className="rounded-lg bg-bad/10 p-2">
        <div className="mb-1 font-bold text-bad">Tende a desagradar</div>
        {losers.length ? (
          losers.map((w) => (
            <div key={w.name} className="flex items-center gap-1">
              <Icon name={w.icon} size={11} /> {w.name}
            </div>
          ))
        ) : (
          <span className="text-muted">Ninguém em especial</span>
        )}
      </div>
    </div>
  );
}
