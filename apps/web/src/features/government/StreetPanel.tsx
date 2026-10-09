import { streetView, type StreetResponse } from '@republica/game-engine';
import { Badge, Button, cn, Icon, Panel, Tooltip } from '@republica/ui';
import { useGame, useGameState } from '../../store/gameStore';

const STAGE_TONE = ['text-good', 'text-paper', 'text-warn', 'text-warn', 'text-bad', 'text-bad', 'text-bad'];
const STAGE_BG = ['bg-good', 'bg-ink-400', 'bg-warn', 'bg-warn', 'bg-bad', 'bg-bad', 'bg-bad'];

/** Clima nas ruas: degrau atual, causas, pauta, respostas e risco de afastamento. */
export function StreetPanel() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const v = streetView(game);
  if (!v.active) return null;
  return (
    <Panel
      title={`Clima nas ruas — ${v.where}`}
      icon="flame"
      actions={<Badge tone={v.stage >= 4 ? 'bad' : v.stage >= 2 ? 'warn' : 'good'}>{v.stageName}</Badge>}
    >
      <div className="space-y-3" data-testid="street-panel">
        <ol className="grid grid-cols-7 gap-1">
          {v.stages.map((name, i) => (
            <li key={name} className="text-center">
              <div className={cn('mx-auto h-2 rounded-full', i <= v.stage ? STAGE_BG[i] : 'bg-ink-800')} />
              <div className={cn('mt-1 text-[10px] leading-tight', i === v.stage ? `${STAGE_TONE[i]} font-semibold` : 'text-muted')}>{name}</div>
            </li>
          ))}
        </ol>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="label mb-1">
              Temperatura {v.heat}/100 <span className="font-normal normal-case text-muted">(tendência: {v.target})</span>
            </div>
            <ul className="space-y-0.5 text-xs">
              {v.factors.map((f) => (
                <li key={f.label} className="flex justify-between gap-2">
                  <span>{f.label}</span>
                  <span className={f.value > 0 ? 'text-bad' : 'text-good'}>
                    {f.value > 0 ? '+' : ''}
                    {f.value.toLocaleString('pt-BR')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="label mb-1">Pauta dos manifestantes</div>
            {v.demands.length === 0 ? (
              <p className="text-xs text-muted">Ninguém nas ruas por enquanto.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {v.demands.map((d) => (
                  <span key={d} className="rounded border border-bad/40 bg-bad/10 px-1.5 py-0.5 text-xs text-bad">
                    {d}
                  </span>
                ))}
              </div>
            )}
            {v.removal && (
              <div className="mt-2 rounded-lg border border-bad/50 bg-bad/10 p-2 text-xs">
                <b>Processo de cassação</b> — votação em {v.removal.date.split('-').reverse().join('/')}: hoje ~{v.removal.yes} votos pela
                cassação, precisa de {v.removal.required} de {v.removal.total}. Acalme as ruas e segure a base.
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="label mb-1">Responder</div>
          <div className="flex flex-wrap gap-1.5">
            {v.responses.map((r) => (
              <Tooltip key={r.id} content={<div className="max-w-xs text-xs">{r.description}{r.reason ? <div className="mt-1 text-bad">{r.reason}</div> : null}</div>}>
                <span>
                  <Button
                    size="sm"
                    variant={r.id === 'repress' || r.id === 'emergency' ? 'danger' : 'secondary'}
                    disabled={!r.available}
                    onClick={() => act({ type: 'street/respond', response: r.id as StreetResponse })}
                    data-testid={`street-${r.id}`}
                    icon={<Icon name={r.id === 'repress' ? 'shield' : r.id === 'concede' ? 'hand-coins' : r.id === 'negotiate' ? 'handshake' : r.id === 'emergency' ? 'triangle-alert' : 'mic-vocal'} size={13} />}
                  >
                    {r.name}
                  </Button>
                </span>
              </Tooltip>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted">
            O jeito duradouro de acalmar as ruas é resolver as causas: emprego (obras), inflação, serviços e promessas. As
            respostas acima só ganham tempo.
          </p>
        </div>
      </div>
    </Panel>
  );
}
