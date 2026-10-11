import {
  ATTRIBUTE_IDS,
  ATTRIBUTES,
  candidatePlatform,
  PLATFORM_FLIP_COST,
  platformFlips,
  derivedAttributes,
  getBackground,
  OFFICES,
  promiseOverview,
  STATES,
} from '@republica/game-engine';
import {
  Avatar,
  Badge,
  Bar,
  Button,
  Modal,
  Icon,
  IdeologyBars,
  Panel,
  PartyEmblem,
  StatTile,
} from '@republica/ui';
import { formatNumber } from '../../lib/format';
import { useState } from 'react';
import { useGame, useGameState } from '../../store/gameStore';
import { PlatformChips, PlatformPicker } from '../platform/PlatformPicker';
import { PromiseRow } from '../government/PromiseRow';

/** Bandeiras do jogador, com edição (trocar ou abandonar custa credibilidade). */
function PlatformPanel() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const player = game.candidates[game.playerId];
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  if (!player) return null;
  const current = candidatePlatform(game, player.id);
  const own = !!player.platform && Object.keys(player.platform).length > 0;
  const flips = draft ? platformFlips(current, draft) : 0;
  return (
    <Panel
      title="Bandeiras"
      icon="scroll-text"
      actions={
        <Button size="sm" onClick={() => setDraft({ ...current })} data-testid="platform-edit">
          Editar
        </Button>
      }
    >
      {!own && Object.keys(current).length > 0 && <p className="mb-1.5 text-xs text-muted">Você segue as bandeiras do partido.</p>}
      <PlatformChips platform={current} />
      <p className="mt-2 text-xs text-muted">
        Eleitores e grupos reagem ao que você defende. No governo, propor uma bandeira sua dá credibilidade; propor o contrário é
        incoerência.
      </p>
      <Modal
        open={!!draft}
        title="Suas bandeiras"
        icon="scroll-text"
        size="xl"
        onClose={() => setDraft(null)}
        footer={
          <>
            <span className="mr-auto text-xs text-muted">
              {flips > 0 ? `Mudar ${flips} bandeira(s) custa ${flips * PLATFORM_FLIP_COST} de credibilidade.` : 'Acrescentar bandeiras não custa nada.'}
            </span>
            <Button onClick={() => setDraft(null)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => {
                if (draft && act({ type: 'career/platform', platform: draft }).ok) setDraft(null);
              }}
            >
              Confirmar
            </Button>
          </>
        }
      >
        {draft && <PlatformPicker value={draft} onChange={setDraft} ideology={player.ideology} />}
      </Modal>
    </Panel>
  );
}


export function CandidateView() {
  const game = useGameState();
  const player = game.candidates[game.playerId];
  if (!player) return null;
  const party = game.parties[player.partyId];
  const derived = derivedAttributes(game);
  const status = game.election?.participants[game.playerId];
  const promises = promiseOverview(game);
  const office = player.currentOffice ? OFFICES[player.currentOffice] : null;

  return (
    <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-3">
        <Panel>
          <div className="flex flex-col items-center gap-2 text-center">
            <Avatar
              config={player.appearance}
              size={210}
              background={party?.color ?? '#273759'}
              {...(party ? { partyColor: party.color } : {})}
              age={player.age}
            />
            <div className="font-display text-2xl font-semibold">{player.ballotName}</div>
            <div className="text-sm text-muted">
              {getBackground(player.backgroundId).name} · {player.age} anos ·{' '}
              {STATES[player.homeStateId].name}
            </div>
            {party && <PartyEmblem party={party} size={30} showAcronym />}
            {office && <Badge tone="gold">{office.name}</Badge>}
          </div>
        </Panel>
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label="Rejeição"
            icon="user-x"
            value={`${derived.rejection.toFixed(0)}%`}
            tone={derived.rejection > 35 ? 'bad' : 'neutral'}
            hint="Da pesquisa mais recente"
          />
          <StatTile
            label="Conhecimento"
            icon="globe"
            value={`${derived.publicKnowledge.toFixed(0)}%`}
          />
          <StatTile label="Confiança" icon="badge-check" value={derived.trust.toFixed(0)} />
          <StatTile label="Polarização" icon="flame" value={derived.polarization.toFixed(0)} />
          <StatTile
            label="Base militante"
            icon="users"
            value={formatNumber(derived.militantBase)}
          />
          <StatTile
            label="Escândalos"
            icon="scale"
            value={player.scandal.toFixed(0)}
            tone={player.scandal > 20 ? 'bad' : 'neutral'}
          />
        </div>
      </div>
      <div className="space-y-3">
        <Panel title="Atributos" icon="award">
          <div className="grid gap-x-6 gap-y-2 @lg:grid-cols-2">
            {ATTRIBUTE_IDS.map((id) => (
              <div key={id} title={ATTRIBUTES[id].description}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Icon name={ATTRIBUTES[id].icon} size={14} className="text-gold-400" />
                    {ATTRIBUTES[id].name}
                  </span>
                  <span className="font-display tabular-nums">
                    {Math.round(player.attributes[id])}
                  </span>
                </div>
                <Bar value={player.attributes[id] / 100} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Posições" icon="compass">
          <IdeologyBars
            markers={[
              { vector: player.ideology, color: '#f2b51e', label: 'Suas convicções' },
              ...(status
                ? [
                    {
                      vector: status.perceivedIdeology,
                      color: '#5aa9ff',
                      label: 'Como o eleitor te vê',
                    },
                  ]
                : []),
              ...(party
                ? [{ vector: party.ideology, color: party.color, label: party.acronym }]
                : []),
            ]}
          />
        </Panel>
        <PlatformPanel />
        <Panel title={`Promessas (${promises.length})`} icon="file-text">
          {promises.length === 0 ? (
            <p className="text-sm text-muted">
              Você ainda não prometeu nada. Propostas viram promessas — e promessas são cobradas.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {promises.map((p) => (
                <PromiseRow key={p.id} p={p} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
