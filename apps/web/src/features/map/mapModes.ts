import { MAP_MODE_LABELS, MAP_MODES, type GameState, type MapMode } from '@republica/game-engine';

export type MapModeGroup = 'politica' | 'sociedade' | 'economia';

export interface MapModeMeta {
  icon: string;
  short: string;
  group: MapModeGroup;
  /**
   * Sentido "bom" do valor, para o tom dos pulsos de mudança: 1 = subir é bom, -1 = subir é ruim,
   * 0 = neutro (sem pulso colorido: população, ideologia...).
   */
  polarity: 1 | -1 | 0;
}

/** Ícones e rótulos curtos dos modos de mapa (modos novos do motor caem no padrão). */
const MODE_META: Record<string, MapModeMeta> = {
  intention: { icon: 'vote', short: 'Intenção de voto', group: 'politica', polarity: 1 },
  popularity: { icon: 'star', short: 'Popularidade', group: 'politica', polarity: 1 },
  party: { icon: 'flag', short: 'Partidos', group: 'politica', polarity: 1 },
  campaign: { icon: 'megaphone', short: 'Campanha', group: 'politica', polarity: 1 },
  results: { icon: 'award', short: 'Resultados', group: 'politica', polarity: 0 },
  governors: { icon: 'landmark', short: 'Governos estaduais', group: 'politica', polarity: 0 },
  population: { icon: 'users', short: 'População', group: 'sociedade', polarity: 0 },
  income: { icon: 'wallet', short: 'Renda', group: 'sociedade', polarity: 1 },
  unemployment: { icon: 'user-x', short: 'Desemprego', group: 'sociedade', polarity: -1 },
  informality: { icon: 'hand-coins', short: 'Informalidade', group: 'sociedade', polarity: -1 },
  ideology: { icon: 'compass', short: 'Ideologia', group: 'sociedade', polarity: 0 },
  economy: { icon: 'chart-line', short: 'Economia', group: 'economia', polarity: -1 },
  industrialization: { icon: 'factory', short: 'Industrialização', group: 'economia', polarity: 1 },
  construction: { icon: 'construction', short: 'Obras', group: 'economia', polarity: 0 },
  resources: { icon: 'pickaxe', short: 'Recursos', group: 'economia', polarity: 0 },
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
  return MODE_META[mode] ?? { icon: 'map', short: modeLabel(mode), group: 'economia', polarity: 0 };
}

/** O mapa atual é de zonas (eleição de prefeito/governador desenhada por zonas). */
export function isZoneMap(game: GameState): boolean {
  return game.election?.units[0]?.kind === 'zone';
}

/** Modos que fazem sentido agora (sem eleição não há intenção nem campanha). */
export function availableModes(game: GameState): MapMode[] {
  return MAP_MODES.filter((m) => {
    if (m === 'results') return (game.election?.results.length ?? 0) > 0;
    if (m === 'intention' || m === 'campaign') return game.election !== null;
    // Governadores e ideologia são por UF: não fazem sentido no mapa de zonas de uma cidade/estado.
    if (m === 'governors' || m === 'ideology') return !isZoneMap(game);
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

/**
 * Modo que cada painel sugere ao mapa (ARQUITETURA_VISUAL §5): abrir Economia mostra o
 * desemprego por estado; Pesquisas, a intenção de voto... Lista em ordem de preferência — vale o
 * primeiro disponível na situação do jogo.
 */
const SUGGESTED: Record<string, MapMode[]> = {
  governo: ['popularity'],
  grupos: ['popularity'],
  decretos: ['popularity'],
  orcamento: ['income'],
  leis: ['ideology'],
  nacao: ['ideology'],
  congresso: ['party'],
  partido: ['party'],
  economia: ['unemployment'],
  mercado: ['resources'],
  industria: ['industrialization'],
  comercio: ['industrialization'],
  obras: ['construction'],
  eleitores: ['population'],
  campanha: ['campaign'],
  agenda: ['campaign'],
  propaganda: ['intention'],
  pesquisas: ['intention'],
  impacto: ['intention'],
  eleicao: ['results', 'intention'],
  candidato: ['popularity'],
};

export function suggestedMode(segment: string | null, game: GameState): MapMode | null {
  if (!segment) return null;
  const available = availableModes(game);
  return SUGGESTED[segment]?.find((m) => available.includes(m)) ?? null;
}
