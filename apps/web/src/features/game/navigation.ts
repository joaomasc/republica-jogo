import { localScope, type GamePhase, type GameState, type OfficeLevel } from '@republica/game-engine';

/** Largura do painel aberto sobre o mapa. */
export type PanelWidth = 'narrow' | 'normal' | 'wide';

export interface NavItem {
  /** Segmento da rota dentro de /jogo ('' = só o mapa). */
  path: string;
  label: string;
  icon: string;
  phases?: GamePhase[];
  executiveOnly?: boolean;
  width?: PanelWidth;
  /** Só aparece para quem governa nestas esferas (fora do mandato, aparece sempre). */
  levels?: OfficeLevel[];
}

export interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

const CAMPAIGN: GamePhase[] = ['campaign', 'election_day', 'results'];
const OFFICE: GamePhase[] = ['governing', 'legislating'];

export const MAP_ITEM: NavItem = { path: '', label: 'Mapa', icon: 'map' };

/** Dock vertical (estilo Victoria 3): grupos de painéis que abrem sobre o mapa. */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'mandato',
    title: 'Mandato',
    items: [
      { path: 'governo', label: 'Gabinete', icon: 'landmark', phases: OFFICE },
      { path: 'leis', label: 'Leis', icon: 'scale', phases: OFFICE },
      { path: 'congresso', label: 'Congresso', icon: 'building-2', phases: OFFICE },
      {
        path: 'decretos',
        label: 'Decretos',
        icon: 'stamp',
        phases: ['governing'],
        executiveOnly: true,
        levels: ['federal'],
      },
      {
        path: 'orcamento',
        label: 'Orçamento',
        icon: 'receipt',
        phases: ['governing'],
        executiveOnly: true,
      },
    ],
  },
  {
    id: 'economia',
    title: 'Economia',
    items: [
      { path: 'economia', label: 'Economia', icon: 'chart-line' },
      { path: 'mercado', label: 'Mercado nacional', icon: 'store', width: 'wide', levels: ['estadual', 'federal'] },
      { path: 'obras', label: 'Obras públicas', icon: 'hard-hat', width: 'wide' },
      { path: 'industria', label: 'Indústria', icon: 'factory', width: 'wide', levels: ['estadual', 'federal'] },
      { path: 'comercio', label: 'Comércio exterior', icon: 'ship', width: 'wide', levels: ['federal'] },
    ],
  },
  {
    id: 'sociedade',
    title: 'Sociedade',
    items: [
      { path: 'eleitores', label: 'População e eleitores', icon: 'users' },
      { path: 'grupos', label: 'Grupos de interesse', icon: 'handshake' },
    ],
  },
  {
    id: 'campanha',
    title: 'Campanha',
    items: [
      { path: 'campanha', label: 'Campanha', icon: 'megaphone', phases: CAMPAIGN },
      { path: 'agenda', label: 'Agenda', icon: 'calendar-check', phases: ['campaign'] },
      { path: 'propaganda', label: 'Propaganda', icon: 'tv', phases: CAMPAIGN },
      { path: 'financas', label: 'Finanças', icon: 'piggy-bank', phases: CAMPAIGN },
      { path: 'pesquisas', label: 'Pesquisas', icon: 'bar-chart-3', phases: CAMPAIGN, width: 'wide' },
      { path: 'impacto', label: 'Impacto', icon: 'activity', phases: CAMPAIGN, width: 'wide' },
      { path: 'eleicao', label: 'Eleição', icon: 'vote', phases: CAMPAIGN, width: 'wide' },
    ],
  },
  {
    id: 'politico',
    title: 'Político',
    items: [
      { path: 'candidato', label: 'Candidato', icon: 'smile' },
      { path: 'partido', label: 'Partido', icon: 'flag' },
      { path: 'eventos', label: 'Eventos e notícias', icon: 'newspaper' },
      { path: 'nacao', label: 'Nação e regime', icon: 'shield' },
      { path: 'historia', label: 'Memória política', icon: 'scroll' },
      { path: 'carreira', label: 'Carreira', icon: 'award' },
    ],
  },
  {
    id: 'ajuda',
    title: 'Ajuda',
    items: [{ path: 'manual', label: 'Manual', icon: 'book-marked', width: 'wide' }],
  },
];

/** Rotas de painel que não aparecem no dock. */
const EXTRA_ROUTES: NavItem[] = [
  { path: 'regiao', label: 'Região', icon: 'map-pin', width: 'narrow' },
];

export function isNavItemVisible(item: NavItem, game: GameState): boolean {
  const level = game.government?.jurisdiction?.level;
  return (
    (!item.phases || item.phases.includes(game.phase)) &&
    (!item.executiveOnly || game.government?.branch === 'executive') &&
    (!item.levels || !level || item.levels.includes(level))
  );
}

/** Rótulos que dependem do cargo: o prefeito vê "Economia de Salvador", o governador "da Bahia". */
export function scopedItem(item: NavItem, game: GameState): NavItem {
  const scope = localScope(game);
  if (scope.kind === 'country') return item;
  if (item.path === 'economia') return { ...item, label: `Economia ${scope.ofName}` };
  if (item.path === 'obras') return { ...item, label: `Obras ${scope.ofName}` };
  if (item.path === 'nacao') return { ...item, label: 'Brasil (contexto nacional)' };
  return item;
}

/** Metadados do painel para o primeiro segmento da rota (`/jogo/<segmento>`). */
export function routeMeta(segment: string): NavItem {
  for (const g of NAV_GROUPS) {
    const found = g.items.find((i) => i.path === segment);
    if (found) return found;
  }
  return (
    EXTRA_ROUTES.find((i) => i.path === segment) ?? { path: segment, label: '', icon: 'scroll' }
  );
}

/** Primeiro segmento depois de /jogo (ou `null` no índice = só o mapa). */
export function panelSegment(pathname: string): string | null {
  const rest = pathname.replace(/^\/jogo\/?/, '');
  const segment = rest.split('/')[0] ?? '';
  return segment === '' ? null : segment;
}

/** Contrato motor ↔ interface (DESIGN_NACAO 9.1): `Alert.link` → rota em /jogo. */
const ALERT_ROUTES: Record<string, string> = {
  map: '',
  polls: 'pesquisas',
  finance: 'financas',
  party: 'partido',
  events: 'eventos',
  debate: 'eleicao',
  government: 'governo',
  budget: 'orcamento',
  laws: 'leis',
  congress: 'congresso',
  economy: 'economia',
  market: 'mercado',
  industry: 'industria',
  trade: 'comercio',
  decrees: 'decretos',
  nation: 'nacao',
};

export function alertRoute(link: string | undefined): string | null {
  if (link === undefined) return null;
  const route = ALERT_ROUTES[link];
  if (route === undefined) return null;
  return route ? `/jogo/${route}` : '/jogo';
}
