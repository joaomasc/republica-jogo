import { GameConstants } from '../config/constants';
import { addDays, diffDays } from '../core/date';
import { withRng, type Rng } from '../core/rng';
import type { ActionResult } from '../core/types';
import { fillTemplate, publishNews } from '../media/news';
import { pushAlert } from '../media/alerts';
import { getDifficulty, getPlayer, getPlayerParty, nextId } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { STATE_IDS, type StateId } from '../core/types';
import { CITIES } from '../map/cities';
import { STATES } from '../map/states';
import { sphereOf } from './conditions';
import { nemesisInRace } from '../world/rivals';
import { ANNUAL_EVENTS } from './seasons';
import { applyEffects, describeEffect } from './effects';
import { EVENT_DEFINITIONS, getEventDefinition } from './events.data';
import type { EventContext, EventDefinition, PendingEvent } from './types';

const E = GameConstants.events;

/** Adversários que podem aparecer no evento (paródias ficam fora de acusações). */
function opponentPool(state: GameState, def: EventDefinition): string[] {
  if (def.nemesis) {
    const nem = nemesisInRace(state);
    return nem ? [nem] : [];
  }
  const ids = (state.election?.candidateIds ?? []).filter((id) => id !== state.playerId);
  return def.accusesOpponent ? ids.filter((id) => !state.candidates[id]?.parodyKey) : ids;
}

/**
 * Onde o evento acontece para este jogador: cidade e UF do contexto, ou `null` se a esfera ou o
 * território não combinam. O presidente vê eventos regionais de qualquer UF da lista.
 */
function territoryOf(
  state: GameState,
  def: EventDefinition,
): { cityId: string | null; stateIds: StateId[] } | null {
  const sphere = sphereOf(state);
  if (def.scope && (!sphere || !def.scope.includes(sphere.level))) return null;
  const restricted = def.states || def.regions || def.cities;
  if (!sphere) return restricted ? null : { cityId: null, stateIds: [] };
  if (def.cities) {
    if (sphere.level === 'municipal')
      return sphere.cityId && def.cities.includes(sphere.cityId)
        ? { cityId: sphere.cityId, stateIds: sphere.stateId ? [sphere.stateId] : [] }
        : null;
    if (sphere.level === 'estadual' && sphere.stateId) {
      const city = def.cities.find((id) => CITIES[id]?.stateId === sphere.stateId);
      return city ? { cityId: city, stateIds: [sphere.stateId] } : null;
    }
    return null;
  }
  const allowed = STATE_IDS.filter(
    (id) =>
      (!def.states || def.states.includes(id)) &&
      (!def.regions || def.regions.includes(STATES[id].region)),
  );
  if (sphere.level === 'federal' || !sphere.stateId)
    return restricted
      ? allowed.length > 0
        ? { cityId: null, stateIds: allowed }
        : null
      : { cityId: null, stateIds: [] };
  if (!allowed.includes(sphere.stateId)) return null;
  return { cityId: sphere.cityId, stateIds: [sphere.stateId] };
}

function isEligible(state: GameState, def: EventDefinition): boolean {
  if (def.chainOnly) return false;
  if (!territoryOf(state, def)) return false;
  if (!def.phases.includes(state.phase)) return false;
  if (def.months && !def.months.includes(Number(state.date.slice(5, 7)))) return false;
  if (def.once && (state.events.firedCount[def.id] ?? 0) > 0) return false;
  const last = state.events.lastFired[def.id];
  const annual = !!def.months || ANNUAL_EVENTS.has(def.id) || state.phase === 'campaign';
  const cooldown = Math.max(
    def.cooldownDays ?? E.defaultCooldownDays,
    annual ? 0 : E.minRepeatDaysOffice,
  );
  if (last && diffDays(last, state.date) < cooldown) return false;
  if (def.context?.includes('unit') && !state.election) return false;
  if (def.context?.includes('opponent') && opponentPool(state, def).length === 0) return false;
  return def.condition ? def.condition(state) : true;
}

/** Eventos que podem sair agora (filtros de fase, esfera, território, recarga e condição). */
export function eligibleEventIds(state: GameState): string[] {
  return EVENT_DEFINITIONS.filter((d) => isEligible(state, d)).map((d) => d.id);
}

function buildContext(
  state: GameState,
  def: EventDefinition,
  rng: Rng,
  base?: EventContext,
): EventContext {
  const player = getPlayer(state);
  const ctx: EventContext = {
    ...base,
    playerName: player.ballotName,
    playerParty: getPlayerParty(state).acronym,
  };
  // Lugar do evento: a cidade/UF do jogador ou, para o presidente, uma UF da lista do evento.
  if (!ctx.stateName || !ctx.cityName) {
    const where = territoryOf(state, def);
    const sphere = sphereOf(state);
    const stateId = where?.stateIds.length ? rng.pick(where.stateIds) : (sphere?.stateId ?? null);
    const cityId = where?.cityId ?? sphere?.cityId ?? null;
    if (stateId && !ctx.stateName) ctx.stateName = STATES[stateId].name;
    if (cityId && !ctx.cityName) ctx.cityName = CITIES[cityId]?.name;
    if (!ctx.cityName && stateId) ctx.cityName = STATES[stateId].capital;
    if (!ctx.stateName) ctx.stateName = 'Brasil';
    if (!ctx.cityName) ctx.cityName = 'Brasília';
  }
  // Variáveis do evento/arco: sorteadas uma vez e mantidas nas continuações.
  if (def.vars) {
    const extra = { ...ctx.extra };
    for (const [key, make] of Object.entries(def.vars)) extra[key] ??= make(rng, state);
    ctx.extra = extra;
  }
  const election = state.election;
  for (const need of def.context ?? []) {
    if (need === 'unit' && election && !ctx.unitId) {
      const unit = rng.weightedPick(election.units, (u) => u.voters) ?? rng.pick(election.units);
      ctx.unitId = unit.id;
      ctx.unitName = unit.name;
    }
    if (need === 'opponent' && election && !ctx.opponentId) {
      const others = opponentPool(state, def);
      if (others.length > 0) {
        const id = rng.pick(others);
        ctx.opponentId = id;
        ctx.opponentName = state.candidates[id]?.ballotName ?? 'adversário';
      }
    }
    if (need === 'party' && !ctx.partyId) {
      const parties = Object.values(state.parties).filter((p) => p.id !== player.partyId);
      if (parties.length > 0) {
        const p = rng.weightedPick(parties, (x) => x.influence) ?? rng.pick(parties);
        ctx.partyId = p.id;
        ctx.partyName = p.name;
      }
    }
    if (need === 'group' && !ctx.groupId) {
      const groups = Object.values(state.interestGroups);
      if (groups.length > 0) {
        const g = rng.pick(groups);
        ctx.groupId = g.id;
        ctx.groupName = g.name;
      }
    }
  }
  return ctx;
}

/** Dispara um evento. Eventos de opção única são resolvidos na hora (viram notícia/alerta). */
export function fireEvent(
  state: GameState,
  def: EventDefinition,
  baseContext?: EventContext,
): PendingEvent | null {
  const ctx = withRng(state, (rng) => buildContext(state, def, rng, baseContext));
  const { extra, ...plain } = ctx;
  const vars = { ...(plain as Record<string, string | undefined>), ...extra };
  const title = fillTemplate(def.title, vars);
  const description = fillTemplate(def.description, vars);
  state.events.lastFired[def.id] = state.date;
  state.events.firedCount[def.id] = (state.events.firedCount[def.id] ?? 0) + 1;
  state.events.lastCategory = { ...state.events.lastCategory, [def.category]: state.date };
  const instanceId = nextId(state, 'evt');

  const firstOption = def.options[0];
  if (def.options.length === 1 && firstOption) {
    applyEffects(state, firstOption.effects, ctx);
    state.events.log.unshift({
      instanceId,
      eventId: def.id,
      date: state.date,
      title,
      choiceLabel: null,
    });
    publishNews(state, {
      headline: title,
      body: description,
      category: def.category === 'economy' ? 'economy' : 'event',
      sentiment: def.negative ? -1 : 1,
    });
    pushAlert(state, {
      kind: `event_${def.id}`,
      severity: def.negative ? 'warning' : 'success',
      title,
      message: description,
      link: 'events',
    });
    return null;
  }

  const moneyScale = state.campaign?.moneyScale ?? 1;
  const pending: PendingEvent = {
    instanceId,
    eventId: def.id,
    category: def.category,
    firedOn: state.date,
    expiresOn: addDays(state.date, def.durationDays ?? E.expireDays),
    title,
    description,
    context: ctx,
    options: def.options.map((o) => {
      const available = o.requirement ? o.requirement(state) : true;
      return {
        id: o.id,
        label: fillTemplate(o.label, vars),
        description: o.description ? fillTemplate(o.description, vars) : '',
        available,
        ...(available ? {} : { reason: o.requirementText ?? 'Requisito não atendido' }),
        preview: o.effects
          .map((e) => describeEffect(e, moneyScale))
          .filter((x): x is string => x !== null),
      };
    }),
  };
  state.events.pending.push(pending);
  return pending;
}

/**
 * Anti-repetição: cada vez que o evento já saiu pesa menos (os inéditos saem antes, como num
 * baralho) e a mesma categoria tem recarga curta (nada de dois escândalos seguidos).
 */
function freshness(state: GameState, def: EventDefinition): number {
  const times = Math.min(E.repeatCap, state.events.firedCount[def.id] ?? 0);
  const repeat = 1 / (1 + E.repeatPenalty * times);
  const last = state.events.lastCategory?.[def.category];
  const cooldown =
    state.phase === 'campaign' ? E.categoryCooldownCampaign : E.categoryCooldownGovernment;
  const category = last && diffDays(last, state.date) < cooldown ? E.categoryPenalty : 1;
  return repeat * category;
}

/** Sorteio diário/mensal de eventos (gatilho + probabilidade + peso). */
export function rollEvent(state: GameState, chance: number): PendingEvent | null {
  if (state.events.pending.length >= E.maxPending) return null;
  const diff = getDifficulty(state);
  return withRng(state, (rng) => {
    if (!rng.chance(chance * diff.eventRate)) return null;
    const eligible = EVENT_DEFINITIONS.filter((d) => isEligible(state, d));
    const def = rng.weightedPick(
      eligible,
      (d) =>
        d.weight *
        (d.weightModifier?.(state) ?? 1) *
        (d.negative ? diff.negativeEventBias : 1) *
        freshness(state, d),
    );
    return def ? fireEvent(state, def) : null;
  });
}

/** Eventos encadeados agendados para hoje (ou antes). */
export function processScheduledEvents(state: GameState): void {
  const due = state.events.scheduled.filter((s) => s.date <= state.date);
  state.events.scheduled = state.events.scheduled.filter((s) => s.date > state.date);
  for (const item of due) {
    const def = getEventDefinition(item.eventId);
    if (def && def.phases.includes(state.phase)) fireEvent(state, def, item.context);
  }
}

/** Modificadores com duração: aplicam efeitos diários até expirar. */
export function processModifiers(state: GameState): void {
  const still = [];
  for (const mod of state.events.modifiers) {
    if (state.date > mod.endsOn) continue;
    applyEffects(state, mod.daily, mod.context);
    still.push(mod);
  }
  state.events.modifiers = still;
}

export function resolveEvent(state: GameState, instanceId: string, optionId: string): ActionResult {
  const idx = state.events.pending.findIndex((p) => p.instanceId === instanceId);
  const pending = state.events.pending[idx];
  if (!pending) return { ok: false, message: 'Evento não encontrado.' };
  const def = getEventDefinition(pending.eventId);
  const option = def?.options.find((o) => o.id === optionId);
  const view = pending.options.find((o) => o.id === optionId);
  if (!def || !option || !view) return { ok: false, message: 'Opção inválida.' };
  if (!view.available) return { ok: false, message: view.reason ?? 'Opção indisponível.' };
  state.events.pending.splice(idx, 1);
  state.events.choices = { ...state.events.choices, [def.id]: optionId };
  const details = applyEffects(state, option.effects, pending.context);
  state.events.log.unshift({
    instanceId,
    eventId: def.id,
    date: state.date,
    title: pending.title,
    choiceLabel: view.label,
  });
  if (state.events.log.length > 100) state.events.log.length = 100;
  if (def.category !== 'opportunity' || def.negative) {
    publishNews(state, {
      headline: pending.title,
      body: `${pending.description} Decisão: ${view.label}.`,
      category:
        def.category === 'scandal' ? 'scandal' : def.category === 'economy' ? 'economy' : 'event',
      sentiment: def.negative ? -1 : 0,
    });
  }
  return { ok: true, message: view.label, details: details.length ? details : view.preview };
}
