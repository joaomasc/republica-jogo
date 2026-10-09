import { interviewAverage, INTERVIEW_TYPE_INFO } from '@republica/game-engine';
import { Badge, Bar, Button, cn, Icon, Modal } from '@republica/ui';
import { useEffect, useRef, useState } from 'react';
import {
  ANSWER_STYLE_LABELS,
  classifyFreeAnswer,
  rewriteInterviewQuestion,
} from '../../services/ai';
import { useGame } from '../../store/gameStore';

/** Entrevista: perguntas geradas pelo sistema (texto opcionalmente reescrito por IA), respostas com consequências do motor. */
export function InterviewModal() {
  const session = useGame((s) => s.game?.interactions.interview ?? null);
  const act = useGame((s) => s.act);
  const toast = useGame((s) => s.toast);
  const [free, setFree] = useState('');
  const [busy, setBusy] = useState(false);
  const rewritten = useRef(new Set<string>());

  const question = session && !session.finished ? session.questions[session.index] : undefined;

  useEffect(() => {
    if (!session || !question || rewritten.current.has(question.id)) return;
    rewritten.current.add(question.id);
    const game = useGame.getState().game;
    if (!game) return;
    rewriteInterviewQuestion(game, session, question)
      .then((text) => {
        if (text && text !== question.text)
          useGame
            .getState()
            .act({ type: 'interview/rewrite', questionId: question.id, text }, { quiet: true });
      })
      .catch(() => undefined);
  }, [session, question]);

  if (!session) return null;
  const info = INTERVIEW_TYPE_INFO[session.type];

  const answerFree = async () => {
    const game = useGame.getState().game;
    if (!game || !question || free.trim().length < 3) return;
    setBusy(true);
    try {
      const c = await classifyFreeAnswer(game, question.text, free.trim());
      toast({
        tone: 'info',
        title: `Sua resposta foi lida como: ${ANSWER_STYLE_LABELS[c.style]}`,
        details: [`Classificação: ${c.provider}`],
      });
      act({ type: 'interview/freeAnswer', style: c.style, summary: c.summary });
      setFree('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open title={`${session.outlet}`} icon={info.icon} size="lg" dismissable={false}>
      <div className="space-y-4" data-testid="interview-modal">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Badge tone="info">{info.name}</Badge>
          Entrevistador(a): <span className="font-bold text-paper">{session.host}</span>
          {!session.finished && (
            <span className="ml-auto font-display text-paper">
              Pergunta {session.index + 1}/{session.questions.length}
            </span>
          )}
        </div>
        {question ? (
          <>
            <div
              className={cn(
                'rounded-2xl border-[3px] p-4',
                question.hostile ? 'border-bad/60 bg-bad/5' : 'border-info/50 bg-info/5',
              )}
            >
              <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
                <Icon name="mic" size={14} /> {question.topic}{' '}
                {question.hostile && <Badge tone="bad">Pergunta difícil</Badge>}
              </div>
              <p className="font-display text-lg leading-snug">“{question.text}”</p>
            </div>
            <div className="grid gap-2">
              {question.answers.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => act({ type: 'interview/answer', answerId: a.id })}
                  className="rounded-xl border-2 border-ink-500 bg-ink-900 p-3 text-left transition hover:border-gold-400"
                  data-testid="interview-answer"
                >
                  <Badge
                    tone={
                      a.style === 'evasive'
                        ? 'warn'
                        : a.style === 'attack'
                          ? 'bad'
                          : a.style === 'promise'
                            ? 'gold'
                            : 'info'
                    }
                  >
                    {ANSWER_STYLE_LABELS[a.style]}
                  </Badge>
                  <div className="mt-1 text-sm">{a.text}</div>
                  {a.proposalId && (
                    <div className="mt-1 text-[11px] text-gold-400">Vira promessa de campanha</div>
                  )}
                </button>
              ))}
            </div>
            <div className="rounded-xl border-2 border-dashed border-ink-500 p-3">
              <div className="label mb-1">Ou responda com suas palavras</div>
              <textarea
                className="game-input min-h-20"
                value={free}
                onChange={(e) => setFree(e.target.value)}
                placeholder="Escreva sua resposta… (o sistema classifica o tom; o motor calcula a repercussão)"
                maxLength={600}
              />
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => void answerFree()}
                  disabled={busy || free.trim().length < 3}
                >
                  {busy ? 'Analisando…' : 'Responder'}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <h3 className="font-display text-xl">Entrevista encerrada</h3>
            <div className="space-y-2">
              {session.results.map((r, i) => (
                <div
                  key={r.questionId}
                  className="flex items-center gap-3 rounded-xl bg-ink-900 px-3 py-2"
                >
                  <span className="w-28 text-sm text-muted">Pergunta {i + 1}</span>
                  <Bar
                    value={r.score}
                    color={
                      r.score >= 0.6
                        ? 'var(--color-good)'
                        : r.score >= 0.42
                          ? 'var(--color-warn)'
                          : 'var(--color-bad)'
                    }
                  />
                  <span className="w-40 text-right text-sm font-bold">{r.summary}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted">
              Nota média: {(interviewAverage(session) * 10).toFixed(1)}/10. A repercussão já entrou
              nas notícias e no humor dos eleitores.
            </p>
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => act({ type: 'interview/close' })}
                data-testid="interview-close"
              >
                Encerrar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
