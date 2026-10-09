import { LAW_CATEGORIES, loadGame, type SaveSlotInfo } from '@republica/game-engine';
import { BrazilMap, cn, Icon } from '@republica/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Logo } from '../../components/Logo';
import { localSaves } from '../../services/storage';
import { useGame } from '../../store/gameStore';
import { DEFAULT_PARTY_COLORS } from './menuArt';

interface MenuEntry {
  id: string;
  label: string;
  icon: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}

export function MainMenu() {
  const navigate = useNavigate();
  const load = useGame((s) => s.load);
  const current = useGame((s) => s.game);
  const [latest, setLatest] = useState<SaveSlotInfo | null>(null);

  useEffect(() => {
    localSaves
      .list()
      .then((l) => setLatest(l[0] ?? null))
      .catch(() => setLatest(null));
  }, []);

  const fills = useMemo(() => DEFAULT_PARTY_COLORS, []);

  const continueGame = async () => {
    if (current) {
      navigate('/jogo');
      return;
    }
    if (!latest) return;
    const state = await loadGame(localSaves, latest.slotId);
    if (state) {
      load(state, latest.slotId === 'autosave' ? null : latest.slotId);
      navigate('/jogo');
    }
  };

  const entries: MenuEntry[] = [
    {
      id: 'novo',
      label: 'Novo jogo',
      icon: 'flag',
      description: 'Crie seu candidato e comece a carreira',
      onClick: () => navigate('/novo'),
      primary: true,
    },
    {
      id: 'parodia',
      label: 'Modo paródia',
      icon: 'party-popper',
      description: 'Sátira: dispute com caricaturas de políticos e partidos',
      onClick: () => navigate('/novo', { state: { mode: 'career', world: 'parody' } }),
    },
    {
      id: 'continuar',
      label: 'Continuar',
      icon: 'rocket',
      description: current
        ? 'Voltar à partida em andamento'
        : latest
          ? `${latest.summary.playerName} · ${latest.summary.officeName} · ${latest.summary.dateLabel}`
          : 'Nenhum jogo salvo',
      onClick: () => void continueGame(),
      disabled: !current && !latest,
    },
    {
      id: 'carregar',
      label: 'Carregar jogo',
      icon: 'file-stack',
      description: 'Escolha um save',
      onClick: () => navigate('/carregar'),
    },
    {
      id: 'sandbox',
      label: 'Sandbox',
      icon: 'flask-conical',
      description: 'Configure tudo: ano, dinheiro, economia, população',
      onClick: () => navigate('/sandbox'),
    },
    {
      id: 'cenarios',
      label: 'Cenários',
      icon: 'scroll',
      description: 'Situações prontas com desafios próprios',
      onClick: () => navigate('/cenarios'),
    },
    {
      id: 'manual',
      label: 'Manual',
      icon: 'book-marked',
      description: 'Como cada sistema funciona e como explorá-lo',
      onClick: () => navigate('/manual'),
    },
    {
      id: 'config',
      label: 'Configurações',
      icon: 'clipboard-list',
      description: 'Salvamento, IA, animações',
      onClick: () => navigate('/config'),
    },
  ];

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-end opacity-35 [mask-image:linear-gradient(to_left,black_30%,transparent_85%)]">
        <div className="h-[115%] w-[70%] max-w-[900px] translate-x-[8%]">
          <BrazilMap fills={fills} showLabels={false} />
        </div>
      </div>
      <div className="relative z-10 grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-5">
          <Logo size="xl" />
          <p className="max-w-lg text-lg text-muted">
            Simulador político e eleitoral. Monte sua candidatura, conquiste eleitores, sobreviva a
            crises e governe — cada partida conta uma história diferente.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            <span className="rounded-full border-2 border-ink-600 bg-ink-900 px-3 py-1">
              27 estados · 324 grupos de eleitores
            </span>
            <span className="rounded-full border-2 border-ink-600 bg-ink-900 px-3 py-1">
              7 cargos · {LAW_CATEGORIES.length} áreas de leis
            </span>
            <span className="rounded-full border-2 border-ink-600 bg-ink-900 px-3 py-1">
              Partidos e políticos fictícios
            </span>
          </div>
        </div>
        <nav className="grid gap-3" aria-label="Menu principal">
          {entries.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={e.onClick}
              disabled={e.disabled}
              data-testid={`menu-${e.id}`}
              className={cn(
                'group flex items-center gap-4 rounded-2xl border-[3px] px-5 py-3.5 text-left shadow-cartoon transition-all duration-150',
                'hover:-translate-y-1 hover:shadow-cartoon-lg active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-40',
                e.primary
                  ? 'border-gold-300 bg-gold-500 text-ink-950'
                  : 'border-ink-500 bg-ink-800 text-paper hover:border-gold-500/70',
              )}
            >
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2',
                  e.primary
                    ? 'border-ink-950/30 bg-ink-950/10'
                    : 'border-ink-500 bg-ink-900 text-gold-400',
                )}
              >
                <Icon name={e.icon} size={22} />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-xl font-semibold">{e.label}</span>
                <span
                  className={cn(
                    'block truncate text-sm',
                    e.primary ? 'text-ink-900/80' : 'text-muted',
                  )}
                >
                  {e.description}
                </span>
              </span>
            </button>
          ))}
          <div className="pt-1 text-center text-[11px] text-muted">
            Versão 0.1 · Malha territorial: IBGE · Partidos, candidatos e institutos são fictícios
          </div>
        </nav>
      </div>
    </div>
  );
}
