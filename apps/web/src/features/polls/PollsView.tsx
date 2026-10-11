import {
  formatMoney,
  internalPollCost,
  OTHERS_KEY,
  POP_TYPES,
  REGIONS,
  type Poll,
  type PopTypeId,
  type RegionId,
} from '@republica/game-engine';
import { Badge, Button, EmptyState, Panel, Segmented, StatTile } from '@republica/ui';
import { useMemo, useState } from 'react';
import { candidateColor } from '../../lib/candidates';
import { HBar, LineChartBox } from '../../components/charts';
import { pct } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';

const SEGMENTS: {
  key: keyof NonNullable<Poll['playerSegments']>;
  label: string;
  color: string;
  hint: string;
}[] = [
  {
    key: 'loyal',
    label: 'Fiéis',
    color: '#3ddc97',
    hint: 'Votam em você e se identificam com seu partido',
  },
  {
    key: 'sympathizers',
    label: 'Simpatizantes',
    color: '#7fe8b8',
    hint: 'Votam em você, mas podem mudar',
  },
  {
    key: 'independents',
    label: 'Independentes',
    color: '#5aa9ff',
    hint: 'Votam em outro, sem rejeitar você — conquistáveis',
  },
  { key: 'undecided', label: 'Indecisos', color: '#f2b51e', hint: 'Ainda não escolheram' },
  { key: 'antiCandidate', label: 'Anti-candidato', color: '#ff6b6b', hint: 'Rejeitam você' },
  {
    key: 'abstention',
    label: 'Abstenção/nulo',
    color: '#4a6191',
    hint: 'Não devem votar em ninguém',
  },
];

export function PollsView() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const election = game.election;
  const [view, setView] = useState<'valid' | 'total'>('valid');
  const polls = useMemo(
    () => (election?.polls ?? []).filter((p) => p.round === election?.round),
    [election],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!election) return <EmptyState icon="bar-chart-3" title="Nenhuma eleição em andamento" />;
  const poll = polls.find((p) => p.id === selectedId) ?? polls[polls.length - 1];
  if (!poll)
    return (
      <EmptyState
        icon="bar-chart-3"
        title="Ainda não há pesquisas"
        text="Pesquisas públicas saem semanalmente. Você também pode encomendar uma interna."
      />
    );

  const ids = election.candidateIds;
  const decided =
    Object.entries(poll.total.shares)
      .filter(([id]) => id !== OTHERS_KEY)
      .reduce((a, [, v]) => a + v, 0) || 1;
  const share = (p: Poll, id: string) =>
    view === 'valid'
      ? (p.total.shares[id] ?? 0) /
        (Object.entries(p.total.shares)
          .filter(([k]) => k !== OTHERS_KEY)
          .reduce((a, [, v]) => a + v, 0) || 1)
      : (p.total.shares[id] ?? 0);
  const ranked = [...ids].sort((a, b) => (poll.total.shares[b] ?? 0) - (poll.total.shares[a] ?? 0));
  const publicPolls = polls.filter((p) => p.kind === 'public');
  const chartData = publicPolls.map((p) => {
    const row: Record<string, number | string> = {
      label: p.date.slice(5).split('-').reverse().join('/'),
    };
    for (const id of ranked.slice(0, 6)) row[id] = Math.round(share(p, id) * 1000) / 10;
    return row;
  });
  const maxShare = Math.max(...ranked.map((id) => share(poll, id)), 0.01);
  const cost = internalPollCost(game);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="game-select"
          value={poll.id}
          onChange={(e) => setSelectedId(e.target.value)}
          data-testid="poll-select"
        >
          {[...polls].reverse().map((p) => (
            <option key={p.id} value={p.id}>
              {p.date.split('-').reverse().join('/')} · {p.pollster}{' '}
              {p.kind === 'internal' ? '(interna)' : ''}
            </option>
          ))}
        </select>
        <Segmented
          options={[
            { id: 'valid', label: 'Votos válidos' },
            { id: 'total', label: 'Estimulada (total)' },
          ]}
          value={view}
          onChange={setView}
        />
        <Button
          variant="primary"
          className="ml-auto"
          onClick={() => act({ type: 'campaign/poll' })}
          disabled={game.phase !== 'campaign'}
          data-testid="btn-internal-poll"
        >
          Encomendar pesquisa interna · {formatMoney(cost)}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 @lg:grid-cols-4">
        <StatTile label="Você" icon="vote" value={pct(share(poll, game.playerId))} tone="gold" />
        <StatTile label="Indecisos" icon="users" value={pct(poll.total.undecided)} />
        <StatTile label="Brancos/nulos" icon="file-text" value={pct(poll.total.blankNull)} />
        <StatTile
          label="Margem de erro"
          icon="scale"
          value={`±${(poll.marginOfError * 100).toFixed(1)} p.p.`}
          sub={`${poll.sampleSize.toLocaleString('pt-BR')} entrevistas`}
        />
      </div>

      <div className="grid gap-3 @3xl:grid-cols-2">
        <Panel title={`Intenção de voto — ${poll.pollster}`} icon="bar-chart-3">
          <div className="space-y-2.5" data-testid="poll-results">
            {ranked.map((id) => (
              <HBar
                key={id}
                label={
                  <span className={id === game.playerId ? 'font-bold text-gold-400' : ''}>
                    {game.candidates[id]?.ballotName}{' '}
                    <span className="text-xs text-muted">
                      ({game.parties[game.candidates[id]?.partyId ?? '']?.acronym})
                    </span>
                  </span>
                }
                value={share(poll, id)}
                max={maxShare * 1.1}
                color={candidateColor(game, id)}
                right={pct(share(poll, id))}
                sub={`Rejeição ${pct(poll.rejection[id] ?? 0, 0)} · Conhecido por ${pct(poll.knowledge[id] ?? 0, 0)}`}
              />
            ))}
            {poll.total.shares[OTHERS_KEY] !== undefined && (
              <HBar
                label="Demais candidatos"
                value={
                  view === 'valid'
                    ? (poll.total.shares[OTHERS_KEY] ?? 0) / decided
                    : (poll.total.shares[OTHERS_KEY] ?? 0)
                }
                max={1}
                color="#4a6191"
                right={pct(
                  view === 'valid'
                    ? (poll.total.shares[OTHERS_KEY] ?? 0) / decided
                    : (poll.total.shares[OTHERS_KEY] ?? 0),
                )}
              />
            )}
          </div>
          <p className="mt-3 text-[11px] text-muted">
            Pesquisas têm erro amostral e viés de instituto. O resultado na urna pode ser diferente.
          </p>
        </Panel>
        <Panel title="Evolução" icon="trending-up">
          {chartData.length >= 2 ? (
            <LineChartBox
              data={chartData}
              series={ranked.slice(0, 6).map((id) => ({
                key: id,
                name: game.candidates[id]?.ballotName.split(' ')[0] ?? id,
                color: candidateColor(game, id),
                dashed: id !== game.playerId,
              }))}
              yFormatter={(v) => `${v}%`}
              height={300}
            />
          ) : (
            <EmptyState
              icon="trending-up"
              title="Poucas pesquisas"
              text="A evolução aparece a partir da segunda pesquisa pública."
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-3 @3xl:grid-cols-3">
        {poll.runoffScenarios && poll.runoffScenarios.length > 0 && (
          <Panel title="Cenários de 2º turno" icon="vote">
            <div className="space-y-3">
              {poll.runoffScenarios.map((s) => (
                <div key={`${s.a}-${s.b}`} className="rounded-xl bg-ink-900 p-2.5">
                  <div className="mb-1 flex justify-between text-sm font-bold">
                    <span style={{ color: candidateColor(game, s.a) }}>
                      {game.candidates[s.a]?.ballotName}
                    </span>
                    <span style={{ color: candidateColor(game, s.b) }}>
                      {game.candidates[s.b]?.ballotName}
                    </span>
                  </div>
                  <div className="flex h-4 overflow-hidden rounded-full">
                    <div
                      style={{ width: `${s.aShare * 100}%`, background: candidateColor(game, s.a) }}
                    />
                    <div
                      style={{ width: `${s.bShare * 100}%`, background: candidateColor(game, s.b) }}
                    />
                  </div>
                  <div className="mt-0.5 flex justify-between text-xs tabular-nums">
                    <span>{pct(s.aShare)}</span>
                    <span>{pct(s.bShare)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}
        {poll.byRegion && (
          <Panel title="Por região" icon="map">
            <div className="space-y-2">
              {Object.entries(poll.byRegion).map(([key, set]) => {
                const d =
                  Object.entries(set.shares)
                    .filter(([id]) => id !== OTHERS_KEY)
                    .reduce((a, [, v]) => a + v, 0) || 1;
                const leader = Object.entries(set.shares)
                  .filter(([id]) => id !== OTHERS_KEY)
                  .sort((a, b) => b[1] - a[1])[0];
                const name =
                  REGIONS[key as RegionId]?.name ??
                  election.units.find((u) => u.id === key)?.name ??
                  key;
                return (
                  <HBar
                    key={key}
                    label={name}
                    value={(set.shares[game.playerId] ?? 0) / d}
                    max={0.6}
                    color="#f2b51e"
                    right={pct((set.shares[game.playerId] ?? 0) / d)}
                    sub={
                      leader
                        ? `Lidera: ${game.candidates[leader[0]]?.ballotName} (${pct(leader[1] / d)})`
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </Panel>
        )}
        {poll.byPopType && (
          <Panel
            title="Por grupo social"
            icon="users"
            actions={
              poll.kind === 'public' ? (
                <Badge>amostra pública</Badge>
              ) : (
                <Badge tone="gold">interna</Badge>
              )
            }
          >
            <div className="space-y-2">
              {(
                Object.entries(poll.byPopType) as [
                  PopTypeId,
                  NonNullable<Poll['byPopType']>[PopTypeId],
                ][]
              ).map(([t, set]) => {
                if (!set) return null;
                const d =
                  Object.entries(set.shares)
                    .filter(([id]) => id !== OTHERS_KEY)
                    .reduce((a, [, v]) => a + v, 0) || 1;
                return (
                  <HBar
                    key={t}
                    label={POP_TYPES[t].plural}
                    value={(set.shares[game.playerId] ?? 0) / d}
                    max={0.6}
                    color={POP_TYPES[t].color}
                    right={pct((set.shares[game.playerId] ?? 0) / d)}
                    sub={`Indecisos ${pct(set.undecided, 0)}`}
                  />
                );
              })}
            </div>
          </Panel>
        )}
      </div>

      {poll.playerSegments && (
        <Panel title="Segmentos do eleitorado em relação a você (pesquisa interna)" icon="users">
          <div className="flex h-8 overflow-hidden rounded-xl border-2 border-ink-950">
            {SEGMENTS.map((s) => (
              <div
                key={s.key}
                title={`${s.label}: ${pct(poll.playerSegments?.[s.key] ?? 0)}`}
                style={{
                  width: `${(poll.playerSegments?.[s.key] ?? 0) * 100}%`,
                  background: s.color,
                }}
              />
            ))}
          </div>
          <div className="mt-3 grid gap-2 @sm:grid-cols-3 @2xl:grid-cols-6">
            {SEGMENTS.map((s) => (
              <div key={s.key} className="rounded-lg bg-ink-900 p-2" title={s.hint}>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </div>
                <div className="font-display text-lg">{pct(poll.playerSegments?.[s.key] ?? 0)}</div>
                <div className="text-[10px] text-muted">{s.hint}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
