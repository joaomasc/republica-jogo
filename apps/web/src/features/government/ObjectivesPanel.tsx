import { objectiveProgress, objectiveTitle } from '@republica/game-engine';
import { Badge, Button, cn, Icon, Panel } from '@republica/ui';
import { useState } from 'react';
import { useGame, useGameState } from '../../store/gameStore';

/** Objetivos do mandato: escolher até 3 no começo e acompanhar o andamento. */
export function ObjectivesPanel() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const [picked, setPicked] = useState<string[]>([]);
  const gov = game.government;
  const obj = gov?.objectives;
  if (!gov || !obj) return null;
  const canChoose = obj.chosen.length === 0 && gov.monthsInOffice <= 6;

  if (canChoose) {
    const toggle = (id: string) =>
      setPicked((p) =>
        p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id],
      );
    return (
      <Panel title="Objetivos do mandato" icon="milestone">
        <p className="mb-2 text-xs text-muted">
          Escolha até 3. Cada objetivo cumprido ao fim do mandato rende reputação e credibilidade.
        </p>
        <div className="grid grid-cols-1 gap-1.5 @2xl:grid-cols-2" data-testid="objectives-offer">
          {obj.offered.map((id) => {
            const on = picked.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className={cn(
                  'flex items-center gap-2 rounded-xl border-2 bg-ink-900 px-2.5 py-2 text-left text-sm',
                  on ? 'border-gold-400' : 'border-ink-600 hover:border-ink-400',
                )}
                data-testid={`objective-${id}`}
              >
                <Icon
                  name={on ? 'circle-check' : 'circle'}
                  size={16}
                  className={on ? 'text-gold-400' : 'text-muted'}
                />
                {objectiveTitle(id)}
              </button>
            );
          })}
        </div>
        <Button
          className="mt-2"
          disabled={picked.length === 0}
          onClick={() => act({ type: 'gov/objectives', ids: picked })}
          data-testid="objectives-confirm"
        >
          Assumir {picked.length || ''} compromisso{picked.length === 1 ? '' : 's'}
        </Button>
      </Panel>
    );
  }

  const progress = objectiveProgress(game);
  if (progress.length === 0) return null;
  return (
    <Panel title="Objetivos do mandato" icon="milestone">
      <ul className="space-y-1.5" data-testid="objectives-progress">
        {progress.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between gap-2 rounded-lg bg-ink-900 px-2.5 py-1.5 text-sm"
          >
            <span className="min-w-0 truncate">{o.title}</span>
            <Badge tone={o.done ? 'good' : 'neutral'}>
              {o.done ? 'cumprido hoje' : 'ainda não'}
            </Badge>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
