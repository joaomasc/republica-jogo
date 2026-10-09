import {
  DIFFICULTIES,
  ECONOMIC_SITUATIONS,
  OFFICES,
  SCENARIOS,
  STATES,
} from '@republica/game-engine';
import { Badge, Button, Icon } from '@republica/ui';
import { useNavigate } from 'react-router';
import { PageShell } from '../../components/PageShell';

export function ScenariosPage() {
  const navigate = useNavigate();
  return (
    <PageShell
      title="Cenários"
      subtitle="Situações iniciais prontas: campanhas ou mandatos já em curso, com crises e objetivos nacionais. Você ainda cria seu personagem."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SCENARIOS.map((s) => (
          <article
            key={s.id}
            className="card-hover flex flex-col gap-3 rounded-2xl border-[3px] border-ink-600 bg-ink-800 p-4 shadow-cartoon"
            data-testid={`scenario-${s.id}`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-gold-500/50 bg-ink-900 text-gold-400">
                <Icon name={s.icon} size={24} />
              </span>
              <div>
                <h2 className="font-display text-xl font-semibold">{s.name}</h2>
                <p className="text-sm text-gold-400">{s.tagline}</p>
              </div>
            </div>
            <p className="flex-1 text-sm text-muted">{s.description}</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="gold">{OFFICES[s.officeId].name}</Badge>
              {s.startInOffice && <Badge tone="good">Começa no cargo</Badge>}
              <Badge>{STATES[s.stateId].name}</Badge>
              <Badge
                tone={s.difficulty === 'hard' ? 'bad' : s.difficulty === 'easy' ? 'good' : 'info'}
              >
                {DIFFICULTIES[s.difficulty].name}
              </Badge>
              <Badge tone="neutral">Economia: {ECONOMIC_SITUATIONS[s.economy].name}</Badge>
              <Badge>{s.year}</Badge>
            </div>
            <Button variant="primary" onClick={() => navigate(`/novo?cenario=${s.id}`)}>
              Jogar este cenário
            </Button>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
