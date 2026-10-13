import {
  CAMPAIGN_ACTIONS,
  constructionQueueView,
  STATES,
  worksOverview,
  type GameState,
  type StateId,
} from '@republica/game-engine';
import { STATE_GEOMETRY, type AtlasPin } from '@republica/ui';
import { isZoneMap } from './mapModes';

function describe(title: string, names: string[]): string {
  const shown = names.slice(0, 4).join(' · ');
  return `${title}: ${shown}${names.length > 4 ? ` · +${names.length - 4}` : ''}`;
}

type Badge = Omit<AtlasPin, 'x' | 'y' | 'offset' | 'kind'>;

/**
 * Marcadores de dados sobre o mapa, todos do estado real do jogo, por estado:
 * - campanha: compromissos fixos da agenda e propaganda regional no ar;
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

  const campaign = game.campaign;
  if (campaign) {
    const agenda = new Map<string, string[]>();
    if (campaign.agenda?.enabled)
      for (const item of campaign.agenda.items) {
        if (!item.enabled || item.unit === 'auto' || item.kind !== 'action') continue;
        const action = CAMPAIGN_ACTIONS.find((a) => a.id === item.actionId);
        const every = item.every === 1 ? 'todo dia' : `a cada ${item.every} dias`;
        agenda.set(item.unit, [
          ...(agenda.get(item.unit) ?? []),
          `${action?.name ?? 'Compromisso'} (${every})`,
        ]);
      }
    for (const [stateId, names] of agenda)
      add(stateId, {
        id: `agenda-${stateId}`,
        icon: 'calendar-check',
        tone: 'good',
        count: names.length,
        regionId: stateId,
        title: describe(`Sua agenda em ${name(stateId)}`, names),
      });
    const ads = new Map<string, string[]>();
    for (const ad of campaign.ads) {
      if (!ad.active || ad.endDate < game.date) continue;
      const until = `até ${ad.endDate.split('-').reverse().join('/')}`;
      for (const unit of ad.unitIds) ads.set(unit, [...(ads.get(unit) ?? []), until]);
    }
    for (const [stateId, names] of ads)
      add(stateId, {
        id: `ads-${stateId}`,
        icon: 'tv',
        tone: 'info',
        count: names.length,
        regionId: stateId,
        title: describe(`Sua propaganda regional no ar em ${name(stateId)}`, names),
      });
  }

  const works = new Map<string, string[]>();
  for (const w of worksOverview(game).mine)
    works.set(w.stateId, [...(works.get(w.stateId) ?? []), w.name]);
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
