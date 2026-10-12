import { electionPostMortem } from '@republica/game-engine';
import { Panel } from '@republica/ui';
import { pp } from '../../lib/format';
import { useGameState } from '../../store/gameStore';

/** "Por que perdi?" / "Por que venci?": o que mais moveu seus votos e onde a eleição se decidiu. */
export function PostMortemPanel() {
  const game = useGameState();
  const pm = electionPostMortem(game);
  if (!pm || game.election?.status !== 'finished') return null;
  const row = (label: string, delta: number) => (
    <li key={label} className="flex items-center justify-between gap-2 text-sm">
      <span className="min-w-0 truncate">{label}</span>
      <b className={delta >= 0 ? 'text-good' : 'text-bad'}>{pp(delta)}</b>
    </li>
  );
  return (
    <Panel title={pm.won ? 'Por que você venceu' : 'Por que você perdeu'} icon="microscope">
      <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-3" data-testid="post-mortem">
        <div>
          <div className="label mb-1">O que mais ajudou</div>
          <ul className="space-y-1">
            {pm.best.length === 0 ? (
              <li className="text-xs text-muted">Nada se destacou.</li>
            ) : (
              pm.best.map((f) => row(f.label, f.delta))
            )}
          </ul>
        </div>
        <div>
          <div className="label mb-1">O que mais atrapalhou</div>
          <ul className="space-y-1">
            {pm.worst.length === 0 ? (
              <li className="text-xs text-muted">Nenhum tropeço relevante.</li>
            ) : (
              pm.worst.map((f) => row(f.label, f.delta))
            )}
          </ul>
        </div>
        <div>
          <div className="label mb-1">Diagnóstico</div>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {pm.notes.length === 0 ? (
              <li className="text-xs text-muted">Disputa equilibrada em todos os quesitos.</li>
            ) : (
              pm.notes.map((n) => <li key={n}>{n}</li>)
            )}
          </ul>
        </div>
      </div>
      {pm.bySource.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          {pm.bySource.map((s) => (
            <span
              key={s.source}
              className={`rounded-md border px-1.5 py-0.5 font-bold ${s.delta >= 0 ? 'border-good/40 text-good' : 'border-bad/40 text-bad'}`}
            >
              {s.label} {pp(s.delta)}
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}
