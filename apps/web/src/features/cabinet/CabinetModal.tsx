import { federativeLinks, ISSUE_DEFINITIONS, type Alignment } from '@republica/game-engine';
import { Badge, Button, Icon, Modal } from '@republica/ui';
import { useEffect, useState } from 'react';
import { TutorialTip } from '../../components/TutorialTip';
import { billions, num, pct } from '../../lib/format';
import { useGame } from '../../store/gameStore';
import { DecisionCard } from '../week/WeekModal';

const ALIGNMENT: Record<Alignment, { label: string; tone: 'good' | 'info' | 'neutral' | 'bad' }> = {
  mesmo_partido: { label: 'mesmo partido', tone: 'good' },
  aliado: { label: 'aliado', tone: 'info' },
  neutro: { label: 'neutro', tone: 'neutral' },
  adversario: { label: 'adversário', tone: 'bad' },
};

/** Evento global para reabrir a reunião de gabinete depois de fechada. */
export const OPEN_CABINET_EVENT = 'republica:open-cabinet';

/** Reunião mensal de gabinete: o tempo para até o jogador escolher a decisão do mês. */
export function CabinetModal() {
  const game = useGame((s) => s.game);
  const act = useGame((s) => s.act);
  const meeting = game?.government?.cabinet;
  const [snoozed, setSnoozed] = useState<string | null>(null);

  useEffect(() => {
    const open = () => setSnoozed(null);
    window.addEventListener(OPEN_CABINET_EVENT, open);
    return () => window.removeEventListener(OPEN_CABINET_EVENT, open);
  }, []);

  if (!game || !meeting?.pending || game.phase !== 'governing' || snoozed === meeting.date)
    return null;
  // Eventos aparecem antes.
  if (game.events.pending.length > 0) return null;

  const issue = ISSUE_DEFINITIONS[meeting.trend];
  const b = meeting.briefing;
  const choose = (cardId: string | null) => act({ type: 'gov/cabinet', cardId });

  return (
    <Modal
      open
      size="xl"
      icon="landmark"
      title={`Mês ${meeting.index} de mandato — reunião de gabinete`}
      onClose={() => setSnoozed(meeting.date)}
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button size="sm" variant="ghost" onClick={() => setSnoozed(meeting.date)}>
            Ver o resto do jogo antes (o tempo fica parado)
          </Button>
          <Button size="sm" onClick={() => choose(null)} data-testid="cabinet-skip">
            Seguir sem decisão especial
          </Button>
        </div>
      }
    >
      <div className="space-y-4" data-testid="cabinet-modal">
        <TutorialTip id="cabinet" title="O gabinete mensal">
          Governar desgasta: depois da lua de mel, a aprovação cai um pouco todo mês. Aqui você
          reage — responder à pauta, inaugurar obras e renovar a equipe reduzem o desgaste.
        </TutorialTip>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border-2 border-ink-600 bg-ink-900 p-3">
            <div className="label">Balanço do mês</div>
            <div className="mt-1 text-sm">
              Aprovação <b>{pct(b.approval / 100, 0)}</b>{' '}
              <span className={b.approvalDelta >= 0 ? 'text-good' : 'text-bad'}>
                ({b.approvalDelta >= 0 ? '+' : ''}
                {num(b.approvalDelta)} no mês)
              </span>
            </div>
            <div className="mt-1 text-xs text-muted">
              Caixa do mandato: {billions(b.balance)} · obras em andamento: {b.worksActive}
            </div>
            {federativeLinks(game).length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                {federativeLinks(game).map((l) => (
                  <span key={l.role} className="flex items-center gap-1">
                    {l.role === 'governador' ? 'Governador' : 'Presidente'} (
                    {game.parties[l.partyId]?.acronym ?? l.partyId}):
                    <Badge tone={ALIGNMENT[l.alignment].tone}>{ALIGNMENT[l.alignment].label}</Badge>
                  </span>
                ))}
                {b.transfers !== undefined && (
                  <span>
                    · repasses {b.transfers >= 0 ? '+' : ''}
                    {billions(b.transfers)}/mês
                  </span>
                )}
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              Desgaste do governo:
              <Badge tone={b.wear >= 12 ? 'bad' : b.wear >= 5 ? 'warn' : 'good'}>
                −{num(b.wear)} pts
              </Badge>
              <span>· faltam {b.monthsLeft} meses</span>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-gold-500/50 bg-gold-500/10 p-3 md:col-span-2">
            <div className="label">Pauta do mês</div>
            <div className="mt-1 flex items-center gap-2 font-display text-lg font-semibold">
              <Icon name={issue.icon} size={20} className="text-gold-400" />
              {issue.name}
            </div>
            <p className="text-xs text-muted">
              É o assunto que domina o noticiário. Responder à pauta rende aprovação e renova o
              governo; inaugurações e trocas na equipe também reduzem o desgaste.
            </p>
            <p className="mt-2 text-xs text-paper/90">
              <b className="text-bad">Oposição:</b> {meeting.opposition}
            </p>
          </div>
        </div>

        <div>
          <div className="label mb-1.5">Decisão do mês (escolha uma)</div>
          <div className="grid gap-3 md:grid-cols-3">
            {meeting.cards.map((c) => (
              <DecisionCard
                key={c.id}
                card={c}
                moneyScale={1}
                onPick={() => choose(c.id)}
                testId="cabinet-card"
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
