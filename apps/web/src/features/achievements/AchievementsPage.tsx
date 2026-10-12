import { ACHIEVEMENTS, type AchievementCategory } from '@republica/game-engine';
import { Badge, Button, cn, Icon, Panel } from '@republica/ui';
import { useNavigate } from 'react-router';
import { useAchievements } from '../../store/achievementsStore';

const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  campanha: 'Campanha',
  governo: 'Governo',
  carreira: 'Carreira',
  desafio: 'Desafios',
  curiosidade: 'Curiosidades',
  catalogo: 'Catálogo',
};

/** Lista de conquistas do perfil local (desbloqueadas em qualquer partida). */
export function AchievementsPage() {
  const navigate = useNavigate();
  const unlocked = useAchievements((s) => s.unlocked);
  const total = ACHIEVEMENTS.length;
  const done = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;
  const categories = Object.keys(CATEGORY_LABEL) as AchievementCategory[];

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl">Conquistas</h1>
        <div className="flex items-center gap-2">
          <Badge tone="gold">
            {done} de {total}
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => navigate('/')}>
            Voltar ao menu
          </Button>
        </div>
      </div>
      {categories.map((cat) => {
        const list = ACHIEVEMENTS.filter((a) => a.category === cat);
        if (list.length === 0) return null;
        return (
          <Panel key={cat} title={CATEGORY_LABEL[cat]} icon="award">
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
              data-testid={`achievements-${cat}`}
            >
              {list.map((a) => {
                const at = unlocked[a.id];
                return (
                  <div
                    key={a.id}
                    className={cn(
                      'flex items-start gap-2 rounded-xl border-2 p-2 text-sm',
                      at
                        ? 'border-gold-400/70 bg-gold-500/10'
                        : 'border-ink-600 bg-ink-900 opacity-70',
                    )}
                  >
                    <Icon
                      name={at ? a.icon : 'lock'}
                      size={18}
                      className={cn('mt-0.5 shrink-0', at ? 'text-gold-400' : 'text-muted')}
                    />
                    <div className="min-w-0">
                      <div className="font-bold">{a.name}</div>
                      <div className="text-xs text-muted">{a.description}</div>
                      {at && (
                        <div className="text-[11px] text-gold-400">
                          Desbloqueada em {at.split('-').reverse().join('/')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
