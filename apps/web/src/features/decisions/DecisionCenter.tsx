import { billDetail, impeachmentView, pendingDecisions } from '@republica/game-engine';
import { Badge, Button, Modal } from '@republica/ui';
import { useNavigate } from 'react-router';
import { useGame, useGameState } from '../../store/gameStore';
import { PartySupport, ProjectionBars } from '../government/BillParts';
import { ManeuversPanel } from '../government/ManeuversPanel';

/**
 * Centro de decisões: janelas obrigatórias de votação (plenário, veto, impeachment).
 * Só aparece quando o tempo está travado por uma decisão legislativa e nenhum evento está aberto.
 */
export function DecisionCenter() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const navigate = useNavigate();
  if (game.events.pending.length > 0) return null;
  const decision = pendingDecisions(game).find((d) => d.blocking);
  if (!decision) return null;

  if (decision.kind === 'impeachment_vote') {
    const imp = impeachmentView(game);
    return (
      <Modal
        open
        title={decision.title}
        icon="gavel"
        dismissable={false}
        size="md"
        footer={
          <div className="flex w-full flex-wrap gap-2">
            <Button variant="danger" onClick={() => act({ type: 'leg/impeachment', op: 'vote', vote: 'yes' })}>
              Votar SIM (afastar)
            </Button>
            <Button variant="success" onClick={() => act({ type: 'leg/impeachment', op: 'vote', vote: 'no' })}>
              Votar NÃO
            </Button>
            <Button variant="ghost" onClick={() => act({ type: 'leg/impeachment', op: 'vote', vote: 'abstain' })}>
              Abster-se
            </Button>
          </div>
        }
      >
        <p className="text-sm">{decision.description}</p>
        {imp && (
          <p className="mt-2 text-sm text-muted">
            {imp.stage}: cerca de {imp.expectedYes} votos pelo afastamento; são necessários {imp.required} de {imp.total}.
          </p>
        )}
      </Modal>
    );
  }

  const detail = decision.billId ? billDetail(game, decision.billId) : null;
  if (!detail || !decision.billId) return null;
  const billId = decision.billId;
  const veto = decision.kind === 'veto_vote';
  return (
    <Modal
      open
      title={decision.title}
      icon="vote"
      dismissable={false}
      size="lg"
      // Os votos ficam no rodapé fixo: projetos longos rolam sem esconder a decisão.
      footer={
        <div className="flex w-full flex-wrap gap-2">
          <Button variant="success" onClick={() => act({ type: 'leg/vote', billId, vote: 'yes' })}>
            {veto ? 'Derrubar o veto' : 'Votar SIM'}
          </Button>
          <Button variant="danger" onClick={() => act({ type: 'leg/vote', billId, vote: 'no' })}>
            {veto ? 'Manter o veto' : 'Votar NÃO'}
          </Button>
          <Button variant="ghost" onClick={() => act({ type: 'leg/vote', billId, vote: 'abstain' })}>
            Abster-se
          </Button>
          <Button variant="ghost" className="ml-auto" onClick={() => navigate('/jogo/congresso')}>
            Ver no Congresso
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-semibold">{detail.summary.title}</span>
            <Badge tone="gold">{detail.summary.instrumentLabel}</Badge>
            {detail.summary.mine && <Badge tone="good">Sua proposta</Badge>}
          </div>
          <div className="text-xs text-muted">
            {detail.summary.categoryName} · autor: {detail.summary.author} · {detail.summary.stage}
          </div>
          <p className="mt-1 text-sm">{detail.description}</p>
        </div>
        {detail.relator && (
          <p className="text-sm">
            Relator: <b>{detail.relator.name}</b> ({detail.relator.party}) — parecer {detail.relator.report.toLowerCase()}.
          </p>
        )}
        {veto ? (
          <p className="rounded-lg bg-ink-900 px-2.5 py-1.5 text-sm">
            O Executivo vetou o projeto. Votar <b>SIM</b> é derrubar o veto (o projeto vira lei); <b>NÃO</b> é manter o veto.
          </p>
        ) : (
          <>
            <ProjectionBars projection={detail.projection} />
            <PartySupport game={game} projection={detail.projection} />
          </>
        )}
        <p className="text-xs text-muted">
          Votar contra a orientação do seu partido reduz a relação com a liderança; votar contra a base do governo afeta a
          sua relação com o Executivo. Bancadas lembram de como você votou.
        </p>
        {!veto && !detail.summary.mine && (
          <details className="rounded-lg border border-ink-600 bg-ink-950/40 p-2">
            <summary className="cursor-pointer text-sm font-semibold text-gold-300">Discorda? Manobras antes de votar</summary>
            <div className="mt-2">
              <ManeuversPanel billId={billId} only={['obstruct', 'postpone', 'amend', 'highlight', 'lobby_against']} compact />
            </div>
          </details>
        )}
      </div>
    </Modal>
  );
}
