import { constructionQueueView, STATES, worksOverview, type GameState, type StateId } from '@republica/game-engine';
import { STATE_GEOMETRY, type AtlasPin } from '@republica/ui';
import { isZoneMap } from './mapModes';

function describe(title: string, names: string[]): string {
  const shown = names.slice(0, 4).join(' · ');
  return `${title}: ${shown}${names.length > 4 ? ` · +${names.length - 4}` : ''}`;
}

type Badge = Omit<AtlasPin, 'x' | 'y' | 'offset' | 'kind'>;

/**
 * Marcadores de dados sobre o mapa, todos do estado real do jogo, por estado:
 * - suas obras públicas (sempre visíveis);
 * - canteiros industriais — os seus sempre; os do mercado só com o mapa aproximado.
 * Ficam acima da sigla, centralizados, em pixels de tela. Só no mapa nacional (por UF).
 */
export function mapMarkers(game: GameState): AtlasPin[] {
  if (isZoneMap(game)) return [];
  const perState = new Map<string, Badge[]>();
  const add = (stateId: string, badge: Badge) => {
    const list = perState.get(stateId) ?? [];
    list.push(badge);
    perState.set(stateId, list);
  };
  const name = (id: string) => STATES[id as StateId]?.name ?? id;

  const works = new Map<string, string[]>();
  for (const w of worksOverview(game).mine) works.set(w.stateId, [...(works.get(w.stateId) ?? []), w.name]);
  for (const [stateId, names] of works)
    add(stateId, {
      id: `works-${stateId}`,
      icon: 'hard-hat',
      tone: 'gold',
      count: names.length,
      regionId: stateId,
      title: describe(`Suas obras em ${name(stateId)}`, names),
    });

  const mine = new Map<string, string[]>();
  const market = new Map<string, string[]>();
  for (const q of constructionQueueView(game)) {
    const target = q.mine ? mine : market;
    target.set(q.stateId, [...(target.get(q.stateId) ?? []), q.buildingName]);
  }
  for (const [stateId, names] of mine)
    add(stateId, {
      id: `sites-mine-${stateId}`,
      icon: 'construction',
      tone: 'gold',
      count: names.length,
      regionId: stateId,
      title: describe(`Indústrias que você mandou construir em ${name(stateId)}`, names),
    });
  for (const [stateId, names] of market)
    add(stateId, {
      id: `sites-${stateId}`,
      icon: 'construction',
      tone: 'info',
      count: names.length,
      regionId: stateId,
      minLod: 1,
      title: describe(`Canteiros industriais em ${name(stateId)}`, names),
    });

  const pins: AtlasPin[] = [];
  for (const [stateId, list] of perState) {
    const geo = STATE_GEOMETRY[stateId];
    if (!geo) continue;
    list.forEach((b, i) =>
      pins.push({
        ...b,
        kind: 'badge',
        x: geo.centroid[0],
        y: geo.centroid[1],
        offset: [(i - (list.length - 1) / 2) * 24, -25],
      }),
    );
  }
  return pins;
}
