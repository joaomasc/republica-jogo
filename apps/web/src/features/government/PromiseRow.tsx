import { promiseStatusLabel, type promiseOverview } from '@republica/game-engine';
import { Badge } from '@republica/ui';

const TONE = { pending: 'info', fulfilled: 'good', partial: 'warn', broken: 'bad' } as const;

type PromiseView = ReturnType<typeof promiseOverview>[number];

/**
 * Uma promessa com o status ao vivo: cumprida assim que a lei passa (seja quem for o autor);
 * pendente mostra "se o mandato acabasse hoje" e o último fato que mexeu nela.
 */
export function PromiseRow({ p }: { p: PromiseView }) {
  const live = p.status === 'pending' ? p.projected : p.status;
  const tone = TONE[live as keyof typeof TONE] ?? 'info';
  return (
    <li className="rounded-lg bg-ink-900 px-2.5 py-1.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate">{p.title}</span>
        <span className="flex shrink-0 items-center gap-1">
          {p.otherSphere && <Badge tone="neutral">outra esfera</Badge>}
          {p.reverted && <Badge tone="bad">recuo</Badge>}
          <Badge tone={tone}>
            {p.status === 'pending' && live !== 'pending' ? `hoje: ${promiseStatusLabel(live as 'pending').toLowerCase()}` : promiseStatusLabel(live as 'pending')}
          </Badge>
        </span>
      </div>
      {(p.note || p.otherSphere) && (
        <div className="mt-0.5 text-[11px] text-muted">
          {p.note ?? 'Depende de uma lei de outra esfera (ex.: Congresso Nacional). Conta se ela for aprovada.'}
        </div>
      )}
    </li>
  );
}
