import { Badge, Button, cn, Icon, Modal } from '@republica/ui';
import { useState } from 'react';
import { useGame } from '../../store/gameStore';
import { CATEGORY_INFO } from './categories';

function previewTone(text: string): string {
  if (/-\d|caiu|Desgaste|Perde|Gasto|Adversário fortalecido/.test(text))
    return 'border-bad/40 text-bad';
  if (/\+\d|Imagem limpa|Adversário desgastado/.test(text)) return 'border-good/40 text-good';
  return 'border-ink-500 text-muted';
}

/** Evento pendente: o tempo para até o jogador decidir (estilo Crusader Kings). */
export function EventModal() {
  const event = useGame((s) => s.game?.events.pending[0] ?? null);
  const act = useGame((s) => s.act);
  const [snoozed, setSnoozed] = useState<string | null>(null);
  if (!event || snoozed === event.instanceId) return null;
  const cat = CATEGORY_INFO[event.category];
  return (
    <Modal
      open
      title={event.title}
      icon={cat.icon}
      size="lg"
      onClose={() => setSnoozed(event.instanceId)}
    >
      <div className="space-y-4" data-testid="event-modal">
        <div className="flex items-center gap-2">
          <Badge tone={cat.tone}>{cat.label}</Badge>
          {event.context.unitName && <Badge>{event.context.unitName}</Badge>}
          {event.context.opponentName && <Badge tone="warn">{event.context.opponentName}</Badge>}
        </div>
        <p className="text-base leading-relaxed text-paper/90">{event.description}</p>
        <div className="space-y-2">
          {event.options.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={!o.available}
              onClick={() =>
                act({ type: 'event/resolve', instanceId: event.instanceId, optionId: o.id })
              }
              className="group w-full rounded-2xl border-[3px] border-ink-500 bg-ink-900 p-3 text-left transition hover:-translate-y-0.5 hover:border-gold-400 disabled:opacity-40"
              data-testid="event-option"
            >
              <div className="flex items-center gap-2 font-display text-base font-semibold">
                <Icon name="flag" size={15} className="text-gold-400" />
                {o.label}
              </div>
              {o.description && <div className="mt-0.5 text-sm text-muted">{o.description}</div>}
              {!o.available && o.reason && <div className="mt-1 text-xs text-bad">{o.reason}</div>}
              {o.preview.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {o.preview.map((p, i) => (
                    <span
                      key={`${p}-${i}`}
                      className={cn(
                        'rounded-md border px-1.5 py-0.5 text-[11px] font-bold',
                        previewTone(p),
                      )}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => setSnoozed(event.instanceId)}>
            Decidir depois (o tempo fica parado)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
