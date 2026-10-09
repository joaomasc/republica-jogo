import {
  careerOptions,
  formatDateLong,
  ISSUE_DEFINITIONS,
  ISSUES,
  OFFICES,
  PARTY_SYMBOLS,
  partyCompatibility,
  STATE_LIST,
  type IssueId,
  type PartySymbol,
  type StateId,
  candidatePlatform,
} from '@republica/game-engine';
import {
  Avatar,
  Badge,
  Button,
  cn,
  Icon,
  Modal,
  Panel,
  PartyEmblem,
  StatTile,
} from '@republica/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { pct } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';

const COLORS = [
  '#d62839',
  '#f77f00',
  '#fcbf49',
  '#2a9d8f',
  '#06d6a0',
  '#118ab2',
  '#3a0ca3',
  '#7209b7',
  '#f72585',
  '#6d597a',
];

function FoundPartyModal({ onClose }: { onClose: () => void }) {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const player = game.candidates[game.playerId];
  const [name, setName] = useState('');
  const [acronym, setAcronym] = useState('');
  const [color, setColor] = useState('#06d6a0');
  const [symbol, setSymbol] = useState<PartySymbol>('star');
  const [priorities, setPriorities] = useState<IssueId[]>([]);
  if (!player) return null;
  const submit = () => {
    const r = act({
      type: 'career/foundParty',
      input: {
        name,
        acronym,
        color,
        symbol,
        ideology: player.ideology,
        priorities,
        priorityPopTypes: [],
        leaderName: player.ballotName,
        lawPositions: candidatePlatform(game, player.id),
      },
    });
    if (r.ok) onClose();
  };
  return (
    <Modal
      open
      title="Fundar partido"
      icon="sparkles"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={submit}>
            Fundar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_7rem] gap-2">
          <input
            className="game-input"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="game-input uppercase"
            placeholder="Sigla"
            value={acronym}
            onChange={(e) => setAcronym(e.target.value.toUpperCase())}
            maxLength={8}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => setColor(c)}
              className={cn(
                'h-7 w-7 rounded-lg border-[3px]',
                color === c ? 'border-gold-400' : 'border-ink-950',
              )}
              style={{ background: c }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PARTY_SYMBOLS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSymbol(s)}
              className={cn(
                'rounded-lg border-2 p-1',
                symbol === s ? 'border-gold-400' : 'border-ink-600',
              )}
            >
              <Icon name={s} size={18} />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {ISSUES.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() =>
                setPriorities((p) =>
                  p.includes(i) ? p.filter((x) => x !== i) : p.length >= 3 ? p : [...p, i],
                )
              }
              className={cn(
                'rounded-lg border-2 px-2 py-0.5 text-xs font-bold',
                priorities.includes(i)
                  ? 'border-gold-400 bg-gold-500 text-ink-950'
                  : 'border-ink-600 text-muted',
              )}
            >
              {ISSUE_DEFINITIONS[i].name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <PartyEmblem party={{ color, symbol, acronym: acronym || '???' }} size={40} showAcronym />
          <span className="text-sm text-muted">
            O novo partido herda suas posições. Começa pequeno, com pouca estrutura.
          </span>
        </div>
      </div>
    </Modal>
  );
}

export function CareerView() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const exit = useGame((s) => s.exit);
  const navigate = useNavigate();
  const player = game.candidates[game.playerId];
  const [stateId, setStateId] = useState<StateId>(player?.homeStateId ?? 'SP');
  const [founding, setFounding] = useState(false);
  const [confirmRetire, setConfirmRetire] = useState(false);
  if (!player) return null;
  const party = game.parties[player.partyId];
  const evaluation = game.career.lastEvaluation;

  if (game.phase === 'retired') {
    const wins = game.career.elections.filter((e) => e.won).length;
    return (
      <Panel>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Avatar
            config={player.appearance}
            size={180}
            background={party?.color ?? '#273759'}
            age={player.age}
          />
          <h2 className="font-display text-3xl">Fim de uma trajetória</h2>
          <p className="max-w-xl text-muted">
            {player.ballotName} encerra a vida pública aos {player.age} anos, com {wins} vitória(s)
            em {game.career.elections.length} eleição(ões) e {game.career.offices.length}{' '}
            mandato(s). Reputação final: {Math.round(game.career.reputation)}.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/jogo/historia')}>Ver memória política</Button>
            <Button
              variant="primary"
              onClick={() => {
                exit();
                navigate('/');
              }}
            >
              Menu principal
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  const options = careerOptions(game);
  const inCareerPhase = game.phase === 'career';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Idade" icon="calendar-check" value={player.age} />
        <StatTile label="Reputação" icon="star" value={Math.round(game.career.reputation)} />
        <StatTile label="Conhecimento público" icon="globe" value={Math.round(player.fame)} />
        <StatTile label="Hoje" icon="calendar-check" value={formatDateLong(game.date)} />
      </div>
      {evaluation && (
        <Panel title="Avaliação do último mandato" icon="clipboard-check">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <StatTile
              label="Aprovação final"
              icon="badge-check"
              value={`${Math.round(evaluation.approval)}%`}
              tone={evaluation.approval >= 50 ? 'good' : 'bad'}
            />
            <StatTile
              label="Promessas cumpridas"
              icon="file-text"
              value={`${evaluation.promisesFulfilled}/${evaluation.promisesTotal}`}
            />
            <StatTile label="Parciais" icon="file-text" value={evaluation.promisesPartial} />
            <StatTile
              label="Taxa de cumprimento"
              icon="scale"
              value={pct(evaluation.fulfillmentRate, 0)}
            />
            <StatTile
              label="Reputação"
              icon="star"
              value={`${evaluation.reputationDelta > 0 ? '+' : ''}${evaluation.reputationDelta}`}
              tone={evaluation.reputationDelta >= 0 ? 'good' : 'bad'}
            />
          </div>
          <p className="mt-2 text-sm text-muted">
            Economia ao fim do mandato: {evaluation.economySummary}.
          </p>
        </Panel>
      )}
      {!inCareerPhase ? (
        <Panel title="Carreira" icon="award">
          <p className="text-sm text-muted">
            As decisões de carreira ficam disponíveis após uma eleição perdida ou ao fim de um
            mandato.
          </p>
        </Panel>
      ) : (
        <>
          <Panel
            title="Próxima candidatura"
            icon="vote"
            actions={
              <select
                className="game-select py-1 text-xs"
                value={stateId}
                onChange={(e) => setStateId(e.target.value as StateId)}
              >
                {STATE_LIST.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            }
          >
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {options.map((o) => {
                const office = OFFICES[o.officeId];
                return (
                  <div
                    key={o.officeId}
                    className={cn(
                      'flex flex-col gap-1.5 rounded-xl border-2 p-3',
                      o.eligible
                        ? 'border-ink-600 bg-ink-900'
                        : 'border-ink-700 bg-ink-900/50 opacity-60',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon name={office.icon} size={18} className="text-gold-400" />
                      <span className="font-display font-semibold">{office.name}</span>
                    </div>
                    <div className="text-xs text-muted">
                      Eleição em {o.year} · campanha a partir de{' '}
                      {o.campaignStart.split('-').reverse().join('/')}
                    </div>
                    {o.reelection && o.eligible && <Badge tone="gold">Reeleição</Badge>}
                    {o.reason && <div className="text-xs text-bad">{o.reason}</div>}
                    <Button
                      size="sm"
                      variant="primary"
                      className="mt-auto"
                      disabled={!o.eligible}
                      onClick={() => act({ type: 'career/run', officeId: o.officeId, stateId })}
                      data-testid={`run-${o.officeId}`}
                    >
                      Concorrer {office.unitsKind === 'states' ? '' : `(${stateId})`}
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">
              O tempo avança até o início da campanha. Fora do cargo, você perde visibilidade com os
              anos.
            </p>
          </Panel>
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="Partido" icon="flag">
              <div className="mb-2 text-sm">
                Atual:{' '}
                {party && (
                  <PartyEmblem party={party} size={22} showAcronym className="align-middle" />
                )}{' '}
                — trocar de partido custa credibilidade.
              </div>
              <div className="grid max-h-60 gap-1.5 overflow-y-auto pr-1">
                {Object.values(game.parties)
                  .filter((p) => p.id !== player.partyId)
                  .sort(
                    (a, b) =>
                      partyCompatibility(player.ideology, b) -
                      partyCompatibility(player.ideology, a),
                  )
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 rounded-lg bg-ink-900 px-2 py-1.5"
                    >
                      <PartyEmblem party={p} size={24} />
                      <span className="flex-1 text-sm">
                        {p.acronym}{' '}
                        <span className="text-xs text-muted">
                          afinidade {partyCompatibility(player.ideology, p)}%
                        </span>
                      </span>
                      <Button
                        size="sm"
                        onClick={() => act({ type: 'career/switchParty', partyId: p.id })}
                      >
                        Filiar-se
                      </Button>
                    </div>
                  ))}
              </div>
              <Button
                className="mt-2"
                icon={<Icon name="sparkles" size={14} />}
                onClick={() => setFounding(true)}
              >
                Fundar um partido
              </Button>
            </Panel>
            <Panel title="Outras decisões" icon="compass">
              <div className="space-y-2">
                <Button className="w-full" onClick={() => act({ type: 'career/break' })}>
                  Tirar um ano longe da política
                </Button>
                {confirmRetire ? (
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      className="flex-1"
                      onClick={() => act({ type: 'career/retire' })}
                    >
                      Confirmar aposentadoria
                    </Button>
                    <Button onClick={() => setConfirmRetire(false)}>Cancelar</Button>
                  </div>
                ) : (
                  <Button variant="ghost" className="w-full" onClick={() => setConfirmRetire(true)}>
                    Abandonar a carreira política
                  </Button>
                )}
              </div>
            </Panel>
          </div>
        </>
      )}
      {founding && <FoundPartyModal onClose={() => setFounding(false)} />}
    </div>
  );
}
