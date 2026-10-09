import {
  DEBATE_STRATEGIES,
  ISSUE_DEFINITIONS,
  STRATEGY_TEXT,
  type DebateStrategy,
} from '@republica/game-engine';
import { Avatar, Badge, Bar, Button, cn, Modal } from '@republica/ui';
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../store/gameStore';

const STAGE_LABEL = {
  answer: 'Resposta',
  attack: 'Seu ataque',
  reply: 'Réplica',
  counter: 'Tréplica',
  finished: 'Encerrado',
} as const;

/** Debate: pergunta → resposta → ataque → réplica → tréplica, em várias rodadas. */
export function DebateModal() {
  const session = useGame((s) => s.game?.interactions.debate ?? null);
  const game = useGame((s) => s.game);
  const act = useGame((s) => s.act);
  const [target, setTarget] = useState<string>('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [session?.log.length]);

  if (!session || !game) return null;
  const opponents = session.participants.filter((id) => id !== game.playerId);
  const topic = session.topics[session.currentRound];
  const maxScore = Math.max(1, ...Object.values(session.scores));
  const chosenTarget = target && opponents.includes(target) ? target : opponents[0];

  const move = (strategy: DebateStrategy) =>
    act({
      type: 'debate/move',
      strategy,
      ...(session.stage === 'attack' && chosenTarget ? { targetId: chosenTarget } : {}),
    });

  return (
    <Modal open title={`Debate — ${session.host}`} icon="mic-vocal" size="xl" dismissable={false}>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]" data-testid="debate-modal">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3">
            {session.participants.map((id) => {
              const c = game.candidates[id];
              const party = c ? game.parties[c.partyId] : undefined;
              if (!c) return null;
              return (
                <div
                  key={id}
                  className={cn(
                    'flex w-[calc(50%-0.4rem)] items-center gap-2 rounded-xl border-2 p-2',
                    id === game.playerId
                      ? 'border-gold-400 bg-gold-500/10'
                      : 'border-ink-600 bg-ink-900',
                  )}
                >
                  <Avatar
                    config={c.appearance}
                    size={44}
                    background={party?.color ?? '#273759'}
                    age={c.age}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{c.ballotName}</div>
                    <Bar
                      value={Math.max(0, session.scores[id] ?? 0) / maxScore}
                      height={6}
                      color={party?.color ?? '#f2b51e'}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div
            ref={logRef}
            className="h-64 space-y-1.5 overflow-y-auto rounded-xl border-2 border-ink-700 bg-ink-950 p-3 text-sm"
          >
            {session.log.length === 0 && (
              <p className="text-muted">As câmeras estão ligadas. Boa sorte!</p>
            )}
            {session.log.map((l, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg px-2 py-1',
                  l.speakerId === game.playerId ? 'bg-gold-500/10' : 'bg-ink-800',
                )}
              >
                <span className="mr-1 text-[10px] font-bold uppercase text-muted">
                  R{l.round + 1} · {STAGE_LABEL[l.stage]}
                </span>
                {l.text}
                {l.score !== undefined && (
                  <span
                    className={cn(
                      'ml-1 text-[11px] font-bold',
                      l.score >= 0.6 ? 'text-good' : l.score >= 0.42 ? 'text-warn' : 'text-bad',
                    )}
                  >
                    ({Math.round(l.score * 10)}/10)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {session.stage === 'finished' ? (
            <div className="space-y-3">
              <h3 className="font-display text-2xl">Fim do debate!</h3>
              <ol className="space-y-1.5">
                {Object.entries(session.scores)
                  .sort((a, b) => b[1] - a[1])
                  .map(([id, s], i) => (
                    <li
                      key={id}
                      className="flex items-center justify-between rounded-lg bg-ink-900 px-3 py-1.5"
                    >
                      <span className={cn('font-bold', id === game.playerId && 'text-gold-400')}>
                        {i + 1}º {game.candidates[id]?.ballotName}
                      </span>
                      <span className="tabular-nums text-muted">{s.toFixed(2)}</span>
                    </li>
                  ))}
              </ol>
              <p className="text-sm text-muted">
                O desempenho afeta conhecimento, rejeição e o apoio de cada grupo — confira nas
                próximas pesquisas.
              </p>
              <Button
                variant="primary"
                onClick={() => act({ type: 'debate/close' })}
                data-testid="debate-close"
              >
                Sair do estúdio
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="gold">
                  Rodada {session.currentRound + 1}/{session.totalRounds}
                </Badge>
                <Badge tone="info">{STAGE_LABEL[session.stage]}</Badge>
                {topic && (
                  <Badge>
                    Tema: {topic === 'record' ? 'histórico' : ISSUE_DEFINITIONS[topic].name}
                  </Badge>
                )}
              </div>
              <div className="rounded-2xl border-[3px] border-info/50 bg-info/5 p-4">
                <p className="font-display text-lg leading-snug">{session.prompt}</p>
              </div>
              {session.stage === 'attack' && (
                <div>
                  <div className="label mb-1">Quem você vai questionar?</div>
                  <div className="flex flex-wrap gap-1.5">
                    {opponents.map((id) => (
                      <Button
                        key={id}
                        size="sm"
                        variant={chosenTarget === id ? 'primary' : 'secondary'}
                        onClick={() => setTarget(id)}
                      >
                        {game.candidates[id]?.ballotName}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {DEBATE_STRATEGIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => move(s)}
                    className="rounded-xl border-2 border-ink-500 bg-ink-900 p-2.5 text-left transition hover:-translate-y-0.5 hover:border-gold-400"
                    data-testid={`debate-${s}`}
                  >
                    <div className="font-display font-semibold">{STRATEGY_TEXT[s].name}</div>
                    <div className="text-xs text-muted">{STRATEGY_TEXT[s].description}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
