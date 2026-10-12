import { Badge, Button, Panel } from '@republica/ui';
import { useNavigate } from 'react-router';
import { APP_VERSION, CHANGELOG } from './changelog.data';

const REPO = 'https://github.com/joaomasc/republica-jogo/commit/';

/** Diário de desenvolvimento: o que mudou em cada versão. */
export function DevDiaryPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl">Diário de desenvolvimento</h1>
        <div className="flex items-center gap-2">
          <Badge tone="gold">Versão {APP_VERSION}</Badge>
          <Button size="sm" variant="ghost" onClick={() => navigate('/')}>
            Voltar ao menu
          </Button>
        </div>
      </div>
      <div className="space-y-3" data-testid="dev-diary">
        {CHANGELOG.map((e, i) => (
          <Panel
            key={e.version}
            title={`${e.version} — ${e.title}`}
            icon={i === 0 ? 'sparkles' : 'scroll-text'}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>{e.date.split('-').reverse().join('/')}</span>
              {i === 0 && <Badge tone="good">atual</Badge>}
              {e.commit && (
                <a
                  className="underline hover:text-paper"
                  href={REPO + e.commit}
                  target="_blank"
                  rel="noreferrer"
                >
                  commit {e.commit}
                </a>
              )}
            </div>
            <p className="mb-2 text-sm">{e.summary}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-paper/85">
              {e.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}
