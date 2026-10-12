import { OCCUPATION_IDS, OCCUPATIONS } from '@republica/game-engine';
import { Button, cn, Icon, Panel } from '@republica/ui';
import { TutorialTip } from '../../components/TutorialTip';
import { useGame, useGameState } from '../../store/gameStore';

function signed(v: number): string {
  return `${v >= 0 ? '+' : ''}${(v * 12).toFixed(1)}/ano`;
}

/** Entressafra: o que fazer até a próxima eleição (ocupação e avanço em blocos de 6 meses). */
export function OccupationPanel() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const current = game.career.occupation ?? null;
  const pending = game.events.pending.length > 0;

  return (
    <Panel title="Enquanto isso…" icon="briefcase">
      <TutorialTip id="occupation" title="Entre uma eleição e outra">
        Escolha uma ocupação: cada uma mexe todo mês na sua fama, credibilidade e reputação, e traz
        acontecimentos próprios. Avance em blocos de 6 meses — ou lance a próxima candidatura.
      </TutorialTip>
      <div className="mt-2 grid grid-cols-1 gap-2 @2xl:grid-cols-2" data-testid="occupations">
        {OCCUPATION_IDS.map((id) => {
          const o = OCCUPATIONS[id];
          const selected = current === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => act({ type: 'career/occupation', occupationId: id })}
              className={cn(
                'flex items-start gap-2 rounded-xl border-2 bg-ink-900 p-2 text-left text-sm transition',
                selected ? 'border-gold-400' : 'border-ink-600 hover:border-ink-400',
              )}
              data-testid={`occupation-${id}`}
            >
              <Icon name={o.icon} size={18} className="mt-0.5 shrink-0 text-gold-400" />
              <span className="min-w-0">
                <span className="block font-bold">{o.name}</span>
                <span className="block text-xs text-muted">{o.description}</span>
                <span className="block text-[11px] text-paper/80">
                  Fama {signed(o.monthly.fame)} · Credibilidade {signed(o.monthly.credibility)} ·
                  Reputação {signed(o.monthly.reputation)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          onClick={() => act({ type: 'career/advance' })}
          disabled={pending}
          data-testid="career-advance"
        >
          Avançar 6 meses
        </Button>
        {pending && <span className="text-xs text-warn">Decida o acontecimento pendente.</span>}
      </div>
    </Panel>
  );
}
