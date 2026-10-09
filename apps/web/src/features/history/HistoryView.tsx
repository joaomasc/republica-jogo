import { formatDateLong, OFFICES, type HistoryKind } from '@republica/game-engine';
import { Badge, cn, EmptyState, Icon, Panel, Segmented } from '@republica/ui';
import { useState } from 'react';
import { pct } from '../../lib/format';
import { useGameState } from '../../store/gameStore';

const KIND: Record<HistoryKind, { label: string; icon: string }> = {
  scandal: { label: 'Escândalo', icon: 'flame' },
  victory: { label: 'Vitória', icon: 'award' },
  defeat: { label: 'Derrota', icon: 'user-x' },
  reform: { label: 'Reforma', icon: 'scale' },
  speech: { label: 'Discurso', icon: 'megaphone' },
  promise: { label: 'Promessa', icon: 'file-text' },
  crisis: { label: 'Crise', icon: 'flame' },
  alliance: { label: 'Aliança', icon: 'handshake' },
  rupture: { label: 'Rompimento', icon: 'user-x' },
  party_switch: { label: 'Troca de partido', icon: 'flag' },
  party_founded: { label: 'Fundação de partido', icon: 'sparkles' },
  debate: { label: 'Debate', icon: 'mic-vocal' },
  event: { label: 'Acontecimento', icon: 'newspaper' },
  office: { label: 'Mandato', icon: 'landmark' },
  career: { label: 'Carreira', icon: 'rocket' },
};

/** Memória política: o jogo lembra o que você fez (e adversários e jornalistas também). */
export function HistoryView() {
  const game = useGameState();
  const [filter, setFilter] = useState<'all' | 'major' | 'bad'>('all');
  const entries = game.history.filter((h) =>
    filter === 'major' ? h.importance >= 2 : filter === 'bad' ? h.sentiment < 0 : true,
  );
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Panel
        title="Linha do tempo"
        icon="scroll"
        actions={
          <Segmented
            options={[
              { id: 'all', label: 'Tudo' },
              { id: 'major', label: 'Marcantes' },
              { id: 'bad', label: 'Negativos' },
            ]}
            value={filter}
            onChange={setFilter}
          />
        }
      >
        {entries.length === 0 ? (
          <EmptyState icon="scroll" title="Nada registrado ainda" />
        ) : (
          <ol className="relative space-y-3 border-l-2 border-ink-600 pl-5">
            {entries.map((h) => (
              <li key={h.id} className="relative">
                <span
                  className={cn(
                    'absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink-950',
                    h.sentiment > 0
                      ? 'bg-good text-ink-950'
                      : h.sentiment < 0
                        ? 'bg-bad text-white'
                        : 'bg-ink-500 text-paper',
                  )}
                >
                  <Icon name={KIND[h.kind].icon} size={12} />
                </span>
                <div className="text-[11px] text-muted">
                  {formatDateLong(h.date)} · {KIND[h.kind].label}
                </div>
                <div
                  className={cn(
                    'font-semibold',
                    h.importance === 3 ? 'font-display text-lg' : 'text-sm',
                  )}
                >
                  {h.title}
                </div>
                {h.description && <div className="text-xs text-muted">{h.description}</div>}
              </li>
            ))}
          </ol>
        )}
      </Panel>
      <div className="space-y-3">
        <Panel title="Eleições disputadas" icon="vote">
          {game.career.elections.length === 0 ? (
            <p className="text-sm text-muted">Sua primeira eleição está em andamento.</p>
          ) : (
            <ul className="space-y-1.5">
              {game.career.elections.map((e, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-ink-900 px-2.5 py-1.5 text-sm"
                >
                  <span>
                    {e.year} · {OFFICES[e.officeId].name} · {e.jurisdictionLabel}
                  </span>
                  <Badge tone={e.won ? 'good' : 'bad'}>
                    {e.won ? 'Venceu' : 'Perdeu'} · {pct(e.pct)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Cargos ocupados" icon="landmark">
          {game.career.offices.length === 0 ? (
            <p className="text-sm text-muted">Nenhum ainda.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {game.career.offices.map((o, i) => (
                <li key={i} className="rounded-lg bg-ink-900 px-2.5 py-1.5">
                  <span className="font-bold">{OFFICES[o.officeId].name}</span> ·{' '}
                  {o.jurisdictionLabel} · {o.start.slice(0, 4)}–
                  {o.end ? o.end.slice(0, 4) : 'atual'}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
