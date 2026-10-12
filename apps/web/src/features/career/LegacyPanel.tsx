import { legacyScore } from '@republica/game-engine';
import { Badge, Panel } from '@republica/ui';
import { useGameState } from '../../store/gameStore';

/** Placar de legado da carreira (0–100): cargos, vitórias, aprovação, promessas, reputação e escândalos. */
export function LegacyPanel() {
  const game = useGameState();
  if (game.career.elections.length === 0) return null;
  const { score, parts } = legacyScore(game);
  const tone = score >= 75 ? 'gold' : score >= 50 ? 'good' : score >= 30 ? 'info' : 'warn';
  return (
    <Panel title="Legado" icon="award">
      <div className="flex flex-wrap items-center gap-3" data-testid="legacy-panel">
        <div className="font-display text-4xl tabular-nums">{score}</div>
        <Badge tone={tone}>
          {score >= 75
            ? 'Nome na história'
            : score >= 50
              ? 'Carreira sólida'
              : score >= 30
                ? 'Em construção'
                : 'Ainda sem marca'}
        </Badge>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {parts.map((p) => (
            <span
              key={p.label}
              className={`rounded-md border px-1.5 py-0.5 font-bold ${p.value >= 0 ? 'border-ink-500 text-paper/85' : 'border-bad/40 text-bad'}`}
            >
              {p.label} {p.value >= 0 ? '+' : ''}
              {p.value}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}
