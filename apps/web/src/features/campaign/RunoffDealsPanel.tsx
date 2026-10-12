import { dealChance, type RunoffDeal, type RunoffOffer } from '@republica/game-engine';
import { Badge, Button, Panel } from '@republica/ui';
import { CandidateChip } from '../../components/CandidateChip';
import { TutorialTip } from '../../components/TutorialTip';
import { pct } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';

const STATUS: Record<
  RunoffDeal['status'],
  { label: string; tone: 'good' | 'bad' | 'info' | 'warn' }
> = {
  open: { label: 'Em negociação', tone: 'info' },
  player: { label: 'Apoia você', tone: 'good' },
  rival: { label: 'Apoia o rival', tone: 'bad' },
  neutral: { label: 'Neutro', tone: 'warn' },
};

const OFFER_TEXT: Record<RunoffOffer, { label: string; cost: string }> = {
  cargo: { label: 'Oferecer cargo', cost: 'Unidade do partido −4' },
  pauta: { label: 'Incorporar a pauta', cost: 'Sua imagem se move na direção dele' },
};

/** 2º turno: negociar o apoio dos candidatos eliminados (uma tentativa por candidato). */
export function RunoffDealsPanel() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const election = game.election;
  const deals = election?.runoffDeals;
  if (!election || election.round !== 2 || !deals || deals.length === 0) return null;
  const offer = (candidateId: string, o: RunoffOffer) =>
    act({ type: 'election/deal', candidateId, offer: o });

  return (
    <Panel title="Apoios no 2º turno" icon="handshake">
      <TutorialTip id="runoff" title="Segundo turno: hora de negociar">
        Os derrotados levam eleitores para quem apoiar. Ofereça o que cada um pede (cargo ou pauta)
        — mas cargo irrita o seu partido, e pauta muda a sua imagem.
      </TutorialTip>
      <p className="mb-2 mt-2 text-xs text-muted">
        Quem ficou pelo caminho tem eleitores e preço. Cada apoio leva parte dos eleitores ligados
        ao partido dele. Você tem <b>uma tentativa</b> por candidato — e o rival também está
        negociando.
      </p>
      <div className="grid grid-cols-1 gap-2 @3xl:grid-cols-2">
        {deals.map((d) => {
          const st = STATUS[d.status];
          return (
            <div
              key={d.candidateId}
              className="rounded-xl border-2 border-ink-600 bg-ink-900 p-2.5"
              data-testid="runoff-deal"
            >
              <div className="flex items-center justify-between gap-2">
                <CandidateChip state={game} candidateId={d.candidateId} size={34} />
                <Badge tone={st.tone} className="shrink-0">
                  {st.label}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted">
                1º turno: <b className="text-paper">{pct(d.share)}</b> · afinidade com você{' '}
                {Math.round(d.affinityPlayer * 100)} × rival {Math.round(d.affinityRival * 100)} ·
                pede {d.asks === 'cargo' ? 'um cargo' : 'compromisso com a pauta dele'}
              </div>
              {d.status === 'open' && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(['cargo', 'pauta'] as const).map((o) => (
                    <Button
                      key={o}
                      size="sm"
                      variant={o === d.asks ? 'primary' : 'secondary'}
                      onClick={() => offer(d.candidateId, o)}
                      title={OFFER_TEXT[o].cost}
                      data-testid={`runoff-offer-${o}`}
                    >
                      {OFFER_TEXT[o].label} ({Math.round(dealChance(d, o) * 100)}%)
                    </Button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
