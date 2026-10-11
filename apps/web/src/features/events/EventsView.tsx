import { formatDateShort, type NewsCategory } from '@republica/game-engine';
import { Badge, Button, cn, EmptyState, Icon, Panel, Segmented } from '@republica/ui';
import { useState } from 'react';
import { useGame, useGameState } from '../../store/gameStore';
import { CATEGORY_INFO } from './categories';

const NEWS_LABEL: Record<NewsCategory, string> = {
  campaign: 'Campanha',
  poll: 'Pesquisa',
  debate: 'Debate',
  scandal: 'Escândalo',
  economy: 'Economia',
  party: 'Partidos',
  government: 'Governo',
  congress: 'Legislativo',
  event: 'Acontecimento',
  election: 'Eleição',
  opponent: 'Adversários',
  interview: 'Entrevista',
};

export function EventsView() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const [filter, setFilter] = useState<'all' | 'mine' | 'bad'>('all');
  const news = game.media.news.filter((n) =>
    filter === 'mine' ? n.sentiment === 1 : filter === 'bad' ? n.sentiment === -1 : true,
  );

  return (
    <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-3">
        <Panel title="Eventos pendentes" icon="flame">
          {game.events.pending.length === 0 ? (
            <p className="text-sm text-muted">Nada exigindo decisão agora.</p>
          ) : (
            game.events.pending.map((e) => (
              <div
                key={e.instanceId}
                className="space-y-2 rounded-xl border-2 border-warn/50 bg-warn/5 p-3"
              >
                <div className="flex items-center gap-2">
                  <Badge tone={CATEGORY_INFO[e.category].tone}>
                    {CATEGORY_INFO[e.category].label}
                  </Badge>
                  <span className="font-display font-semibold">{e.title}</span>
                </div>
                <p className="text-sm text-muted">{e.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {e.options.map((o) => (
                    <Button
                      key={o.id}
                      size="sm"
                      disabled={!o.available}
                      onClick={() =>
                        act({ type: 'event/resolve', instanceId: e.instanceId, optionId: o.id })
                      }
                    >
                      {o.label}
                    </Button>
                  ))}
                </div>
              </div>
            ))
          )}
        </Panel>
        <Panel title="Histórico de eventos" icon="scroll">
          {game.events.log.length === 0 ? (
            <EmptyState icon="scroll" title="Sem eventos ainda" />
          ) : (
            <ul className="space-y-1.5 text-sm">
              {game.events.log.slice(0, 25).map((l) => (
                <li key={l.instanceId} className="rounded-lg bg-ink-900 px-2.5 py-1.5">
                  <div className="text-[11px] text-muted">{formatDateShort(l.date)}</div>
                  <div className="font-bold">{l.title}</div>
                  {l.choiceLabel && (
                    <div className="text-xs text-gold-400">Decisão: {l.choiceLabel}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Efeitos em andamento" icon="calendar-check">
          {game.events.modifiers.length === 0 ? (
            <p className="text-sm text-muted">Nenhum.</p>
          ) : (
            game.events.modifiers.map((m) => (
              <div key={m.id} className="text-sm">
                {m.label} — até {formatDateShort(m.endsOn)}
              </div>
            ))
          )}
          {game.economy.shocks.length > 0 && (
            <div className="mt-2 space-y-1">
              {game.economy.shocks.map((s) => (
                <div key={s.id} className="text-sm">
                  <Icon name="trending-up" size={13} className="mr-1 inline text-gold-400" />
                  {s.label} — {s.monthsLeft} mês(es)
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
      <Panel
        title="Notícias"
        icon="newspaper"
        actions={
          <Segmented
            options={[
              { id: 'all', label: 'Todas' },
              { id: 'mine', label: 'Boas' },
              { id: 'bad', label: 'Ruins' },
            ]}
            value={filter}
            onChange={setFilter}
          />
        }
      >
        <ul className="space-y-2">
          {news.map((n) => (
            <li
              key={n.id}
              className={cn(
                'rounded-xl border-l-4 bg-ink-900 p-3',
                n.sentiment === 1
                  ? 'border-l-good'
                  : n.sentiment === -1
                    ? 'border-l-bad'
                    : 'border-l-ink-500',
              )}
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                <span className="font-bold uppercase">{n.outlet}</span>· {formatDateShort(n.date)}
                <Badge>{NEWS_LABEL[n.category]}</Badge>
                {n.importance === 3 && <Badge tone="gold">Destaque</Badge>}
              </div>
              <div
                className={cn(
                  'mt-0.5 font-display font-semibold leading-snug',
                  n.importance === 3 ? 'text-lg' : 'text-base',
                )}
              >
                {n.headline}
              </div>
              {n.body && <p className="mt-1 text-sm text-muted">{n.body}</p>}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
