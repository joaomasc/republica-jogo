import { needsRunningMate, runningMateOptions } from '@republica/game-engine';
import { Badge, Button, Panel, PartyEmblem } from '@republica/ui';
import { useGame, useGameState } from '../../store/gameStore';

/** Escolha do vice da chapa (eleições majoritárias do Executivo, uma vez por campanha). */
export function RunningMatePanel() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const mate = game.campaign?.runningMate;
  if (mate) {
    const party = game.parties[mate.partyId];
    return (
      <div className="flex items-center gap-2 rounded-xl border-2 border-ink-600 bg-ink-900 px-3 py-2 text-sm">
        {party && <PartyEmblem party={party} size={22} />}
        <span>
          Vice na chapa: <b>{mate.name}</b> ({party?.acronym})
        </span>
      </div>
    );
  }
  if (!needsRunningMate(game)) return null;
  const options = runningMateOptions(game);
  const own = game.candidates[game.playerId]?.partyId;

  return (
    <Panel title="Escolha o seu vice" icon="users">
      <p className="mb-2 text-xs text-muted">
        Vice do seu partido agrada a base. Vice de um partido aliado traz parte dos eleitores dele —
        mas irrita quem queria a vaga, e no governo um vice de outro partido tem agenda própria.
      </p>
      <div className="grid grid-cols-1 gap-2 @2xl:grid-cols-2" data-testid="running-mate">
        {options.map((o) => {
          const party = game.parties[o.partyId];
          if (!party) return null;
          const isOwn = o.partyId === own;
          return (
            <div
              key={o.partyId}
              className="flex items-center gap-2 rounded-xl border-2 border-ink-600 bg-ink-900 p-2"
            >
              <PartyEmblem party={party} size={30} />
              <div className="min-w-0 flex-1">
                <div className="font-bold">{party.acronym}</div>
                <div className="text-xs text-muted">
                  {isOwn
                    ? 'Seu partido · unidade +4'
                    : `Afinidade ${Math.round(o.affinity * 100)}% · popularidade ${Math.round(party.popularity)}`}
                </div>
              </div>
              {isOwn ? <Badge tone="good">base feliz</Badge> : <Badge tone="info">amplia</Badge>}
              <Button
                size="sm"
                onClick={() => act({ type: 'campaign/vice', partyId: o.partyId })}
                data-testid={`vice-${o.partyId}`}
              >
                Escolher
              </Button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
