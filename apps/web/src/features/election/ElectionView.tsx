import {
  diffDays,
  formatDateLong,
  formatDateShort,
  formatNumber,
  latestPoll,
  mapLayer,
  OFFICES,
  OTHERS_KEY,
  POP_TYPES,
  rankByPoll,
  STATES,
  type ElectionResult,
  type GameState,
  type PopTypeId,
} from '@republica/game-engine';
import {
  Avatar,
  Badge,
  BrazilMap,
  Button,
  cn,
  EmptyState,
  Icon,
  Panel,
  PartyEmblem,
  StatTile,
  ZoneMap,
} from '@republica/ui';
import { useEffect, useMemo, useState } from 'react';
import { candidateColor } from '../../lib/candidates';
import { HBar } from '../../components/charts';
import { pct } from '../../lib/format';
import { layerFills } from '../../lib/mapColors';
import { useGame, useGameState } from '../../store/gameStore';

function ResultMap({ game }: { game: GameState }) {
  const layer = useMemo(() => mapLayer(game, 'results'), [game]);
  const fills = useMemo(() => layerFills(layer), [layer]);
  const units = game.election?.units ?? [];
  const tooltip = (id: string) => (
    <div>
      <div className="font-bold">{units.find((u) => u.id === id)?.name}</div>
      <div className="text-muted">{layer.cells[id]?.label}</div>
    </div>
  );
  if (units[0]?.kind === 'zone') {
    const stateId = units[0].stateId;
    return (
      <ZoneMap
        kind={units.some((u) => u.zone?.type === 'center') ? 'city' : 'state'}
        stateId={stateId}
        capitalCoords={STATES[stateId].capitalCoords}
        zones={units.map((u) => ({
          id: u.id,
          name: u.name,
          type: u.zone?.type ?? 'sector',
          ...(u.zone?.direction ? { direction: u.zone.direction } : {}),
        }))}
        fills={fills}
        renderTooltip={tooltip}
      />
    );
  }
  return <BrazilMap fills={fills} renderTooltip={tooltip} />;
}

function Results({
  game,
  result,
  progress,
}: {
  game: GameState;
  result: ElectionResult;
  progress: number;
}) {
  const election = game.election;
  if (!election) return null;
  const office = OFFICES[election.officeId];
  const ranked = result.ranking;
  const max = Math.max(...ranked.map((id) => result.pct[id] ?? 0), 0.01);
  const p = result.proportional;
  const units = [...election.units].sort((a, b) => b.voters - a.voters);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Panel title={`${result.round}º turno — ${formatDateLong(result.date)}`} icon="vote">
          <div className="mb-2 text-xs text-muted">
            Apuração: {Math.round(progress * 100)}% das urnas
          </div>
          <div className="space-y-3" data-testid="election-results">
            {ranked.slice(0, 10).map((id) => (
              <div key={id} className="flex items-center gap-3">
                <Avatar
                  config={game.candidates[id]!.appearance}
                  size={40}
                  background={candidateColor(game, id)}
                  age={game.candidates[id]!.age}
                />
                <div className="min-w-0 flex-1">
                  <HBar
                    label={
                      <span className={cn(id === game.playerId && 'font-bold text-gold-400')}>
                        {game.candidates[id]?.ballotName}{' '}
                        <span className="text-xs text-muted">
                          {game.parties[game.candidates[id]?.partyId ?? '']?.acronym}
                        </span>
                        {result.winnerId === id && progress >= 1 && (
                          <Badge tone="good" className="ml-1">
                            Eleito(a)
                          </Badge>
                        )}
                        {result.runoff?.includes(id) && progress >= 1 && (
                          <Badge tone="gold" className="ml-1">
                            2º turno
                          </Badge>
                        )}
                      </span>
                    }
                    value={(result.pct[id] ?? 0) * progress}
                    max={max * 1.05}
                    color={candidateColor(game, id)}
                    right={pct((result.pct[id] ?? 0) * Math.min(1, progress * 1.02))}
                    sub={`${formatNumber((result.votes[id] ?? 0) * progress)} votos`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatTile label="Comparecimento" icon="users" value={pct(result.turnoutRate)} />
            <StatTile
              label="Votos válidos"
              icon="badge-check"
              value={formatNumber(result.validVotes)}
            />
            <StatTile
              label="Brancos e nulos"
              icon="file-text"
              value={formatNumber(result.blankNull)}
            />
          </div>
        </Panel>
        <Panel title="Mapa do resultado" icon="map" bodyClassName="p-2">
          <div className="h-[46vh] min-h-[320px]">
            <ResultMap game={game} />
          </div>
        </Panel>
      </div>

      {p && progress >= 1 && (
        <Panel
          title={`Distribuição de cadeiras (${p.seats}) — ${office.legislatureName}`}
          icon="building-2"
        >
          <div className="grid gap-4 @2xl:grid-cols-2">
            <div className="space-y-1.5">
              {Object.entries(p.partySeats)
                .filter(([, s]) => s > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([pid, seats]) => {
                  const party = game.parties[pid];
                  return party ? (
                    <HBar
                      key={pid}
                      label={
                        <span className="flex items-center gap-1.5">
                          <PartyEmblem party={party} size={18} /> {party.acronym}
                        </span>
                      }
                      value={seats}
                      max={p.seats / 2}
                      color={party.color}
                      right={`${seats} cadeiras`}
                      sub={`${formatNumber(p.partyVotes[pid] ?? 0)} votos`}
                    />
                  ) : null;
                })}
            </div>
            <div className="space-y-2">
              <div
                className={cn(
                  'rounded-xl border-2 p-3',
                  p.playerElected ? 'border-good/60 bg-good/10' : 'border-bad/60 bg-bad/10',
                )}
              >
                <div className="font-display text-lg">
                  {p.playerElected ? 'Você foi eleito(a)!' : 'Você não foi eleito(a)'}
                </div>
                <div className="text-sm">
                  {formatNumber(p.playerVotes)} votos · {p.playerRankInParty}º na lista do partido,
                  que fez {p.playerPartySeats} cadeira(s). Linha de corte: {formatNumber(p.cutLine)}{' '}
                  votos.
                </div>
              </div>
              <div className="label">Mais votados</div>
              <ol className="max-h-64 space-y-0.5 overflow-y-auto text-sm">
                {p.topList.map((e, i) => (
                  <li
                    key={`${e.name}-${i}`}
                    className={cn(
                      'flex items-center justify-between rounded px-2 py-0.5',
                      e.candidateId === game.playerId && 'bg-gold-500/15 font-bold',
                    )}
                  >
                    <span>
                      {i + 1}. {e.name}{' '}
                      <span className="text-xs text-muted">
                        ({game.parties[e.partyId]?.acronym})
                      </span>
                    </span>
                    <span className="flex items-center gap-2 tabular-nums">
                      {formatNumber(e.votes)}
                      {e.elected && <Icon name="badge-check" size={13} className="text-good" />}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Panel>
      )}

      {progress >= 1 && (
        <div className="grid gap-3 @3xl:grid-cols-2">
          <Panel title="Resultado por região" icon="map-pin">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-ink-800 text-left text-[11px] uppercase text-muted">
                  <tr>
                    <th className="py-1">Região</th>
                    <th>Vencedor</th>
                    <th className="text-right">Você</th>
                    <th className="text-right">Compar.</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => {
                    const r = result.byUnit[u.id];
                    if (!r) return null;
                    const total = Math.max(
                      1,
                      Object.values(r.votes).reduce((a, b) => a + b, 0),
                    );
                    return (
                      <tr key={u.id} className="border-t border-ink-700">
                        <td className="py-1">{u.name}</td>
                        <td>
                          <span
                            className="mr-1 inline-block h-2.5 w-2.5 rounded-full"
                            style={{
                              background: r.winnerId ? candidateColor(game, r.winnerId) : '#888',
                            }}
                          />
                          {r.winnerId ? game.candidates[r.winnerId]?.ballotName : '—'}
                        </td>
                        <td className="text-right tabular-nums">
                          {pct((r.votes[game.playerId] ?? 0) / total)}
                        </td>
                        <td className="text-right tabular-nums text-muted">
                          {pct(r.turnoutRate, 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Seu voto por grupo social" icon="users">
            <div className="space-y-1.5">
              {(Object.entries(result.byPopType) as [PopTypeId, Record<string, number>][]).map(
                ([t, rec]) => (
                  <HBar
                    key={t}
                    label={POP_TYPES[t].plural}
                    value={rec[game.playerId] ?? 0}
                    max={0.8}
                    color={POP_TYPES[t].color}
                    right={pct(rec[game.playerId] ?? 0)}
                  />
                ),
              )}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

export function ElectionView() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const election = game.election;
  const [progress, setProgress] = useState(1);
  const [counting, setCounting] = useState(false);
  const result = election?.results[election.results.length - 1];
  const results = election?.results ?? [];
  const defaultIdx = Math.max(
    0,
    results.length - 1 - (results.at(-1)?.ranking.includes(game.playerId) ? 0 : 1),
  );
  const [roundIdx, setRoundIdx] = useState<number | null>(null);
  const shown = results[roundIdx ?? defaultIdx] ?? result;

  useEffect(() => {
    if (!counting) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 2600);
      setProgress(t);
      if (t < 1) frame = requestAnimationFrame(tick);
      else setCounting(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [counting]);

  if (!election)
    return (
      <EmptyState
        icon="vote"
        title="Nenhuma eleição em andamento"
        text="Veja suas opções na tela de Carreira."
      />
    );
  const office = OFFICES[election.officeId];
  const debateToday = election.debates.find(
    (d) => d.status === 'scheduled' && d.date === game.date,
  );
  const poll = latestPoll(game);

  const hold = () => {
    const r = act({ type: 'election/hold' }, { quiet: true });
    if (r.ok) {
      setProgress(0);
      setCounting(true);
    }
  };

  const continueLabel = (() => {
    if (!result) return '';
    if (result.runoff?.includes(game.playerId) && election.status === 'campaign')
      return 'Começar campanha do 2º turno';
    if (election.outcome?.won) return 'Tomar posse';
    return 'Seguir carreira';
  })();

  return (
    <div className="space-y-3">
      <Panel>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-gold-400 bg-ink-900 text-gold-400">
            <Icon name={office.icon} size={28} />
          </span>
          <div className="flex-1">
            <div className="font-display text-2xl font-semibold">
              {office.name} — {election.jurisdiction.label}
            </div>
            <div className="text-sm text-muted">
              {election.round}º turno · {formatDateLong(election.date)} ·{' '}
              {formatNumber(election.totalVoters)} eleitores · {office.rules.join(' · ')}
            </div>
          </div>
          {game.phase === 'campaign' && (
            <Badge tone="gold">Faltam {diffDays(game.date, election.date)} dias</Badge>
          )}
        </div>
      </Panel>

      {game.phase === 'campaign' && (
        <div className="grid gap-3 @2xl:grid-cols-2">
          <Panel title="Debates" icon="mic-vocal">
            {election.debates.length === 0 ? (
              <p className="text-sm text-muted">
                Esta eleição não tem debates na TV (disputa proporcional).
              </p>
            ) : (
              <ul className="space-y-2">
                {election.debates.map((d) => (
                  <li
                    key={d.id}
                    className={cn(
                      'flex flex-wrap items-center gap-2 rounded-xl border-2 p-2.5',
                      d.date === game.date && d.status === 'scheduled'
                        ? 'border-gold-400 bg-gold-500/10'
                        : 'border-ink-600 bg-ink-900',
                    )}
                  >
                    <Icon name="tv" size={16} className="text-gold-400" />
                    <span className="font-bold">{d.host}</span>
                    <span className="text-sm text-muted">
                      {formatDateShort(d.date)} · {d.round}º turno
                    </span>
                    <span className="ml-auto">
                      {d.status === 'done' && (
                        <Badge tone={d.winnerId === game.playerId ? 'good' : 'info'}>
                          {d.winnerId === game.playerId
                            ? 'Você venceu'
                            : `Vencedor: ${game.candidates[d.winnerId ?? '']?.ballotName ?? '—'}`}
                        </Badge>
                      )}
                      {d.status === 'declined' && <Badge tone="bad">Você faltou</Badge>}
                      {d.status === 'scheduled' && d.date !== game.date && <Badge>Agendado</Badge>}
                    </span>
                    {d === debateToday && (
                      <div className="flex w-full gap-2">
                        <Button
                          variant="primary"
                          onClick={() => act({ type: 'debate/start', debateId: d.id })}
                          data-testid="debate-start"
                        >
                          Participar do debate
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => act({ type: 'debate/decline', debateId: d.id })}
                          data-testid="debate-decline"
                        >
                          Recusar (cadeira vazia)
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Última pesquisa" icon="bar-chart-3">
            {poll ? (
              <div className="space-y-2">
                {rankByPoll(poll)
                  .slice(0, 6)
                  .map((id) => (
                    <HBar
                      key={id}
                      label={game.candidates[id]?.ballotName}
                      value={poll.total.shares[id] ?? 0}
                      max={0.6}
                      color={candidateColor(game, id)}
                      right={pct(poll.total.shares[id] ?? 0)}
                    />
                  ))}
                {poll.total.shares[OTHERS_KEY] !== undefined && (
                  <p className="text-xs text-muted">
                    Demais candidatos: {pct(poll.total.shares[OTHERS_KEY] ?? 0)}
                  </p>
                )}
                <p className="text-xs text-muted">
                  {poll.pollster} · {formatDateShort(poll.date)} · indecisos{' '}
                  {pct(poll.total.undecided)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">Sem pesquisas.</p>
            )}
          </Panel>
        </div>
      )}

      {game.phase === 'election_day' && (
        <Panel>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="animate-float text-gold-400">
              <Icon name="vote" size={64} />
            </div>
            <h2 className="font-display text-4xl font-semibold">Dia de eleição!</h2>
            <p className="max-w-xl text-muted">
              As urnas estão abertas. Pesquisas são só pesquisas: o resultado depende do
              comparecimento, dos indecisos e do humor do eleitor no dia.
            </p>
            <Button variant="primary" size="lg" onClick={hold} data-testid="hold-election">
              Realizar eleição e apurar votos
            </Button>
          </div>
        </Panel>
      )}

      {game.phase === 'results' && result && (
        <>
          <div
            className={cn(
              'rounded-3xl border-[3px] p-5 text-center shadow-cartoon',
              progress < 1
                ? 'border-ink-500 bg-ink-800'
                : election.outcome?.won
                  ? 'border-good bg-good/15'
                  : result.runoff?.includes(game.playerId)
                    ? 'border-gold-400 bg-gold-500/15'
                    : 'border-bad bg-bad/10',
            )}
            data-testid="election-banner"
          >
            <div className="font-display text-3xl font-semibold">
              {progress < 1
                ? 'Apurando…'
                : election.outcome?.won
                  ? 'VITÓRIA!'
                  : result.runoff?.includes(game.playerId) && election.status === 'campaign'
                    ? 'Vamos ao 2º turno!'
                    : 'Derrota'}
            </div>
            {progress >= 1 && (
              <div className="mt-1 text-muted">
                {election.outcome?.won
                  ? `${game.candidates[game.playerId]?.ballotName} é o(a) novo(a) ${office.name.toLowerCase()}.`
                  : result.runoff
                    ? `${game.candidates[result.runoff[0]]?.ballotName} × ${game.candidates[result.runoff[1]]?.ballotName}`
                    : `Venceu: ${game.candidates[result.winnerId ?? '']?.ballotName ?? 'adversário'}.`}
              </div>
            )}
            {progress >= 1 && (
              <Button
                variant="primary"
                size="lg"
                className="mt-4"
                onClick={() => act({ type: 'election/continue' })}
                data-testid="election-continue"
              >
                {continueLabel}
              </Button>
            )}
          </div>
          {results.length > 1 && progress >= 1 && (
            <div className="flex gap-2">
              {results.map((r, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant={(roundIdx ?? defaultIdx) === i ? 'primary' : 'secondary'}
                  onClick={() => setRoundIdx(i)}
                >
                  {r.round}º turno
                </Button>
              ))}
            </div>
          )}
          {shown && <Results game={game} result={shown} progress={progress} />}
        </>
      )}
    </div>
  );
}
