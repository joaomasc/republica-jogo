import { MAP_MODE_LABELS, MAP_MODES, type GameState, type MapMode } from '@republica/game-engine';

export type MapModeGroup = 'politica' | 'sociedade' | 'economia';

export interface MapModeMeta {
  icon: string;
  short: string;
  group: MapModeGroup;
}

/** Ícones e rótulos curtos dos modos de mapa (modos novos do motor caem no padrão). */
const MODE_META: Record<string, MapModeMeta> = {
  intention: { icon: 'vote', short: 'Intenção de voto', group: 'politica' },
  popularity: { icon: 'star', short: 'Popularidade', group: 'politica' },
  party: { icon: 'flag', short: 'Partidos', group: 'politica' },
  campaign: { icon: 'megaphone', short: 'Campanha', group: 'politica' },
  results: { icon: 'award', short: 'Resultados', group: 'politica' },
  population: { icon: 'users', short: 'População', group: 'sociedade' },
  income: { icon: 'wallet', short: 'Renda', group: 'sociedade' },
  unemployment: { icon: 'user-x', short: 'Desemprego', group: 'sociedade' },
  informality: { icon: 'hand-coins', short: 'Informalidade', group: 'sociedade' },
  economy: { icon: 'chart-line', short: 'Economia', group: 'economia' },
  industrialization: { icon: 'factory', short: 'Industrialização', group: 'economia' },
  construction: { icon: 'construction', short: 'Obras', group: 'economia' },
  resources: { icon: 'pickaxe', short: 'Recursos', group: 'economia' },
};

export const MAP_MODE_GROUPS: { id: MapModeGroup; label: string }[] = [
  { id: 'politica', label: 'Política' },
  { id: 'sociedade', label: 'Sociedade' },
  { id: 'economia', label: 'Economia' },
];

export function modeLabel(mode: string): string {
  return (MAP_MODE_LABELS as Record<string, string>)[mode] ?? MODE_META[mode]?.short ?? mode;
}

export function modeMeta(mode: string): MapModeMeta {
  return MODE_META[mode] ?? { icon: 'map', short: modeLabel(mode), group: 'economia' };
}

/** Modos que fazem sentido agora (sem eleição não há intenção nem campanha). */
export function availableModes(game: GameState): MapMode[] {
  return MAP_MODES.filter((m) => {
    if (m === 'results') return (game.election?.results.length ?? 0) > 0;
    if (m === 'intention' || m === 'campaign') return game.election !== null;
    return true;
  });
}

export function defaultMode(game: GameState): MapMode {
  if (game.phase === 'results' && (game.election?.results.length ?? 0) > 0) return 'results';
  return game.election ? 'intention' : 'popularity';
}

/** Modo efetivo: a escolha do jogador, se ainda disponível; senão o padrão da fase. */
export function effectiveMode(stored: MapMode | null, game: GameState): MapMode {
  if (stored && availableModes(game).includes(stored)) return stored;
  return defaultMode(game);
}
