import {
  describeEffect,
  ISSUE_DEFINITIONS,
  latestPoll,
  rankByPoll,
  RIVAL_STYLE_INFO,
  type Effect,
  type WeekCard,
} from '@republica/game-engine';
import { Badge, Button, cn, Icon, Modal } from '@republica/ui';
import { useEffect, useState } from 'react';
import { CandidateChip } from '../../components/CandidateChip';
import { pct, pp } from '../../lib/format';
import { useGame } from '../../store/gameStore';

/** Evento global para reabrir a reunião depois de fechada (botão da barra inferior). */
export const OPEN_WEEK_EVENT = 'republica:open-week';

function previews(effects: Effect[] | undefined, moneyScale: number): string[] {
  return (effects ?? []).map((e) => describeEffect(e, moneyScale)).filter((x): x is string => !!x);
}

function tone(text: string): string {
  if (/^-|−| -\d|Rejeição \+|Energia -|Unidade do partido -|Adversário fortalecido/.test(text))
    return 'border-bad/40 text-bad';
  if (/\+\d|Adversário desgastado|Rejeição -/.test(text)) return 'border-good/40 text-good';
  return 'border-ink-500 text-muted';
}

function Card({
  card,
  moneyScale,
  onPick,
}: {
  card: WeekCard;
  moneyScale: number;
  onPick: () => void;
}) {
  const risky = card.chance < 1;
  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex h-full flex-col gap-2 rounded-2xl border-[3px] border-ink-500 bg-ink-900 p-3 text-left transition hover:-translate-y-1 hover:border-gold-400"
      data-testid="week-card"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-500/15">
          <Icon name={card.icon} size={18} className="text-gold-400" />
        </span>
        <Badge tone={risky ? (card.chance < 0.7 ? 'bad' : 'warn') : 'good'}>
          {risky ? `${Math.round(card.chance * 100)}% de dar certo` : 'garantido'}
        </Badge>
      </div>
      <div className="font-display text-base font-semibold leading-tight">{card.title}</div>
      <p className="text-xs leading-relaxed text-muted">{card.description}</p>
      <div className="mt-auto flex flex-wrap gap-1">
        {previews(card.effects, moneyScale).map((p, i) => (
          <span
            key={`${p}-${i}`}
            className={cn('rounded-md border px-1.5 py-0.5 text-[11px] font-bold', tone(p))}
          >
            {p}
          </span>
        ))}
      </div>
      {risky && card.failure && (
        <div className="text-[11px] text-muted">
          <span className="font-bold text-bad">Se der errado:</span>{' '}
          {previews(card.failure, moneyScale).join(' · ')}
        </div>
      )}
    </button>
  );
}

/** Reunião de campanha semanal: o tempo para até o jogador escolher a jogada da semana. */
export function WeekModal() {
  const game = useGame((s) => s.game);
  const act = useGame((s) => s.act);
  const week = game?.campaign?.week;
  const [snoozed, setSnoozed] = useState<number | null>(null);

  useEffect(() => {
    const open = () => setSnoozed(null);
    window.addEventListener(OPEN_WEEK_EVENT, open);
    return () => window.removeEventListener(OPEN_WEEK_EVENT, open);
  }, []);

  if (!game || !week?.pending || game.phase !== 'campaign' || snoozed === week.index) return null;
  // Eventos e entrevistas têm prioridade na tela.
  if (game.events.pending.length > 0 || game.interactions.interview || game.interactions.debate)
    return null;

  const issue = ISSUE_DEFINITIONS[week.trend];
  const myFocus = game.election?.participants[game.playerId]?.issueFocus[week.trend] ?? 0;
  const poll = latestPoll(game);
  const rank = poll ? rankByPoll(poll).indexOf(game.playerId) + 1 : 0;
  const moneyScale = game.campaign?.moneyScale ?? 1;
  const choose = (cardId: string | null) => act({ type: 'week/choose', cardId });

  return (
    <Modal
      open
      size="xl"
      icon="calendar-check"
      title={`Semana ${week.index} — reunião de campanha`}
      onClose={() => setSnoozed(week.index)}
      // Rodapé fixo: em telas baixas o conteúdo rola, mas as saídas continuam à vista.
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button size="sm" variant="ghost" onClick={() => setSnoozed(week.index)}>
            Ver o resto do jogo antes (o tempo fica parado)
          </Button>
          <Button size="sm" onClick={() => choose(null)} data-testid="week-skip">
            Seguir sem jogada especial
          </Button>
        </div>
      }
    >
      <div className="space-y-4" data-testid="week-modal">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border-2 border-ink-600 bg-ink-900 p-3">
            <div className="label">Balanço</div>
            {week.lastWeekDelta !== null ? (
              <div className="mt-1 text-sm">
                Na semana passada sua intenção mudou{' '}
                <b className={week.lastWeekDelta >= 0 ? 'text-good' : 'text-bad'}>
                  {pp(week.lastWeekDelta)}
                </b>{' '}
                <span className="text-muted">(estimativa da equipe)</span>.
              </div>
            ) : (
              <div className="mt-1 text-sm">Primeira semana: hora de definir a estratégia.</div>
            )}
            {poll && (
              <div className="mt-1 text-xs text-muted">
                Última pesquisa: {pct(poll.total.shares[game.playerId] ?? 0)} · {rank}º lugar
              </div>
            )}
          </div>
          <div className="rounded-2xl border-2 border-gold-500/50 bg-gold-500/10 p-3 md:col-span-2">
            <div className="label">Pauta da semana</div>
            <div className="mt-1 flex items-center gap-2 font-display text-lg font-semibold">
              <Icon name={issue.icon} size={20} className="text-gold-400" />
              {issue.name}
            </div>
            <p className="text-xs text-muted">
              Esta semana o eleitor só fala disso. Quem dá ênfase ao tema ganha votos entre quem se
              importa com ele. Sua ênfase hoje:{' '}
              <b className="text-paper">{Math.round(myFocus)}/100</b> — propostas, discursos e
              propaganda no tema aumentam.
            </p>
          </div>
        </div>

        {week.rivalMoves.length > 0 && (
          <div>
            <div className="label mb-1.5">O que os rivais vão fazer</div>
            <div className="grid gap-2 md:grid-cols-3">
              {week.rivalMoves.map((m) => {
                const style = game.election?.participants[m.candidateId]?.style;
                return (
                  <div
                    key={m.candidateId}
                    className="rounded-xl border-2 border-ink-600 bg-ink-900 p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <CandidateChip state={game} candidateId={m.candidateId} size={34} />
                      {style && (
                        <Badge tone="info" className="shrink-0">
                          {RIVAL_STYLE_INFO[style].name}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-paper/90">{m.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="label mb-1.5">Sua jogada da semana (escolha uma)</div>
          <div className="grid gap-3 md:grid-cols-3">
            {week.cards.map((c) => (
              <Card key={c.id} card={c} moneyScale={moneyScale} onPick={() => choose(c.id)} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
