/**
 * GABINETE COM PERSONALIDADES (bloco 10).
 *
 * Secretários e ministros têm lealdade, ambição e um escândalo latente. A lealdade acompanha a
 * aprovação do governo e a relação com o partido do ministro; ministros fracos acumulam escândalo;
 * os ambiciosos e desleais vazam bastidores ou saem para disputar a eleição contra o titular.
 */
import { GameConstants } from '../config/constants';
import { clamp } from '../core/math';
import type { Rng } from '../core/rng';
import { fireEvent } from '../events/events';
import { getEventDefinition } from '../events/events.data';
import { publishNews } from '../media/news';
import type { Minister } from '../politics/types';
import { getPlayer } from '../simulation/access';
import type { GameState } from '../simulation/state';

const M = GameConstants.ministers;

/** Personalidade de um ministro recém-nomeado. */
export function ministerPersonality(
  rng: Rng,
  ownParty: boolean,
): Pick<Minister, 'loyalty' | 'ambition' | 'hiddenScandal'> {
  return {
    loyalty: Math.round(ownParty ? rng.range(60, 88) : rng.range(42, 72)),
    ambition: Math.round(rng.range(10, 90)),
    hiddenScandal: 0,
  };
}

function trigger(state: GameState, eventId: string, m: Minister): void {
  const def = getEventDefinition(eventId);
  if (!def || state.events.pending.length > 0) return;
  fireEvent(state, def, { partyId: m.partyId, extra: { pessoa: m.name, pasta: m.portfolio } });
}

/** Tick mensal do gabinete (chamado pelo governo executivo). */
export function processMinisters(state: GameState, rng: Rng): void {
  const gov = state.government;
  if (!gov || gov.branch !== 'executive' || gov.ministers.length === 0) return;
  const monthsLeft = Math.max(0, (Date.parse(gov.endDate) - Date.parse(state.date)) / (30 * 864e5));
  const ownParty = getPlayer(state).partyId;
  for (const m of [...gov.ministers]) {
    m.loyalty ??= 65;
    m.ambition ??= 50;
    m.hiddenScandal ??= 0;
    const relation = m.partyId === ownParty ? 40 : (state.congress.relations[m.partyId] ?? 0);
    m.loyalty = clamp(
      m.loyalty +
        ((gov.approval - 50) / 50) * M.approvalPull +
        (relation / 100) * M.relationPull -
        (m.ambition / 100) * M.ambitionDrag +
        rng.normal(0, 0.6),
      0,
      100,
    );
    m.hiddenScandal = clamp(
      m.hiddenScandal +
        (Math.max(0, 60 - m.competence) / 100) * M.scandalGrowth +
        rng.range(0, 0.4),
      0,
      100,
    );

    if (m.hiddenScandal >= M.scandalThreshold && rng.chance(M.scandalChance)) {
      m.hiddenScandal = 0;
      trigger(state, 'cab_ministro_escandalo', m);
      continue;
    }
    if (m.loyalty <= M.leakLoyalty && rng.chance(M.leakChance)) {
      trigger(state, 'cab_ministro_vaza', m);
      continue;
    }
    if (
      monthsLeft <= M.resignMonthsLeft &&
      m.ambition >= M.resignAmbition &&
      m.loyalty <= M.resignLoyalty &&
      rng.chance(M.resignChance)
    ) {
      gov.ministers = gov.ministers.filter((x) => x !== m);
      state.congress.relations[m.partyId] = clamp(
        (state.congress.relations[m.partyId] ?? 0) - 8,
        -100,
        100,
      );
      publishNews(state, {
        headline: `${m.name} deixa a pasta de ${m.portfolio.toLowerCase()} para disputar a eleição contra o governo`,
        category: 'government',
        sentiment: -1,
        importance: 2,
      });
    }
  }
}
