import { earn, spend } from '../campaign/finance';
import {
  addKnowledge,
  addPopMomentum,
  addPresence,
  addRegionalMomentum,
} from '../campaign/statusOps';
import { ATTRIBUTES } from '../candidate/attributes';
import { addDays } from '../core/date';
import { clamp, clamp100, formatMoney } from '../core/math';
import { withRng } from '../core/rng';
import type { CandidateId, StateId, UnitId } from '../core/types';
import type { BuildingId, OwnerKind } from '../economy/industry/types';
import { latestPoll, rankByPoll } from '../election/polls';
import { BUILDINGS } from '../economy/industry/buildings.data';
import { BUDGET_CATEGORIES } from '../economy/types';
import { addHistory } from '../history/history';
import { shiftGroupRadicalism } from '../nation/groups';
import { shiftIdeology } from '../ideology/ideology';
import { ISSUE_DEFINITIONS } from '../ideology/issues';
import { startInterview } from '../media/interview';
import { fillTemplate, publishNews } from '../media/news';
import { shiftUnity } from '../parties/parties';
import { POP_TYPE_IDS, POP_TYPES } from '../population/popTypes';
import { getPlayer, getPlayerStatus, nextId } from '../simulation/access';
import type { GameState } from '../simulation/state';
import type { Effect, EventContext, UnitScope } from './types';

/** Limites de segurança dos efeitos de evento sobre o mercado (preço mundial e câmbio relativos). */
const MARKET_BOUNDS = {
  worldPrice: { min: 0.2, max: 5 },
  exchangeRate: { min: 0.3, max: 5 },
} as const;

const BUDGET_NAMES: Record<string, string> = {
  health: 'Saúde',
  education: 'Educação',
  security: 'Segurança',
  infrastructure: 'Infraestrutura',
  pensions: 'Previdência',
  administration: 'Administração',
  social: 'Programas sociais',
};

function scopeUnits(state: GameState, scope: UnitScope | undefined, ctx: EventContext): UnitId[] {
  const election = state.election;
  if (!election) return [];
  switch (scope ?? 'all') {
    case 'all':
      return election.units.map((u) => u.id);
    case 'context':
      return ctx.unitId ? [ctx.unitId] : [];
    case 'home': {
      const home = getPlayer(state).homeStateId;
      const units = election.units.filter((u) => u.stateId === home);
      return (
        units.length > 0 && units.length < election.units.length
          ? units
          : election.units.slice(0, 1)
      ).map((u) => u.id);
    }
    case 'random':
      return [withRng(state, (rng) => rng.pick(election.units)).id];
  }
}

function resolveOpponent(
  state: GameState,
  target: 'context' | 'leader' | 'random',
  ctx: EventContext,
): CandidateId | null {
  const election = state.election;
  if (!election) return null;
  const others = election.candidateIds.filter((id) => id !== state.playerId);
  if (others.length === 0) return null;
  if (target === 'context' && ctx.opponentId) return ctx.opponentId;
  if (target === 'leader') {
    const poll = latestPoll(state);
    const ranked = poll ? rankByPoll(poll).filter((id) => id !== state.playerId) : others;
    return ranked[0] ?? others[0] ?? null;
  }
  return withRng(state, (rng) => rng.pick(others));
}

/** Soma níveis a um edifício; cria o edifício (método padrão) quando ainda não existe. */
function applyBuildingLevels(
  state: GameState,
  stateId: StateId,
  buildingId: BuildingId,
  delta: number,
  owner: OwnerKind,
): void {
  const buildings = state.industry.buildings[stateId];
  if (!buildings) return;
  const existing = buildings[buildingId];
  if (existing) {
    if (delta > 0 && existing.level > 0) {
      // Os novos níveis pertencem ao dono do evento: a propriedade é a média ponderada por níveis.
      const total = existing.level + delta;
      for (const kind of Object.keys(existing.ownership) as OwnerKind[])
        existing.ownership[kind] =
          (existing.ownership[kind] * existing.level + (kind === owner ? delta : 0)) / total;
    }
    if (existing.level <= 0 && delta > 0) {
      // Edifício que tinha fechado: os novos níveis são só do dono do evento.
      for (const kind of Object.keys(existing.ownership) as OwnerKind[])
        existing.ownership[kind] = kind === owner ? 1 : 0;
    }
    existing.level = Math.max(0, existing.level + delta);
    return;
  }
  if (delta <= 0) return;
  const definition = BUILDINGS[buildingId];
  const ownership = { private: 0, state: 0, cooperative: 0, foreign: 0 };
  ownership[owner] = 1;
  buildings[buildingId] = {
    level: delta,
    methodId: definition.methods[0]?.id ?? '',
    ownership,
    staffing: 1,
    wageFactor: 1,
    productivity: 1,
    revenue: 0,
    inputCost: 0,
    wageBill: 0,
    profit: 0,
    avgMargin: 0,
    subsidy: 0,
    lossMonths: 0,
  };
}

/** Aplica uma lista de efeitos ao rascunho do estado e devolve descrições para a interface. */
export function applyEffects(
  state: GameState,
  effects: readonly Effect[],
  ctx: EventContext,
): string[] {
  const out: string[] = [];
  const player = getPlayer(state);
  const status = getPlayerStatus(state);
  const campaign = state.campaign;
  const gov = state.government;
  const vars = { ...ctx } as Record<string, string | undefined>;

  for (const e of effects) {
    switch (e.type) {
      case 'money': {
        if (!campaign) break;
        const amount = Math.round(e.amount * campaign.moneyScale);
        if (amount >= 0) earn(state, amount, 'other', 'Evento');
        else spend(state, Math.min(-amount, campaign.money), 'other', 'Evento');
        out.push(`${amount >= 0 ? '+' : '-'}${formatMoney(Math.abs(amount))}`);
        break;
      }
      case 'attribute':
        player.attributes[e.attribute] = clamp100(player.attributes[e.attribute] + e.delta);
        out.push(`${ATTRIBUTES[e.attribute].name} ${e.delta > 0 ? '+' : ''}${e.delta}`);
        break;
      case 'fame':
        player.fame = clamp100(player.fame + e.delta);
        break;
      case 'knowledge':
        if (status)
          for (const u of scopeUnits(state, e.scope, ctx)) addKnowledge(status, u, e.delta);
        break;
      case 'presence':
        if (status)
          for (const u of scopeUnits(state, e.scope, ctx)) addPresence(status, u, e.delta);
        break;
      case 'regionalMomentum':
        if (status)
          for (const u of scopeUnits(state, e.scope, ctx)) addRegionalMomentum(status, u, e.delta);
        break;
      case 'popMomentum':
        if (status)
          for (const t of e.popTypes === 'all' ? POP_TYPE_IDS : e.popTypes)
            addPopMomentum(status, t, e.delta);
        break;
      case 'rejection':
        if (status) status.rejectionMod += e.delta;
        break;
      case 'scandal':
        player.scandal = clamp100(player.scandal + e.delta);
        break;
      case 'enthusiasm':
        if (campaign) campaign.enthusiasm = clamp100(campaign.enthusiasm + e.delta);
        break;
      case 'militants':
        if (campaign)
          campaign.militants = Math.max(0, Math.round(campaign.militants * (1 + e.pct / 100)));
        break;
      case 'energy':
        if (campaign) campaign.energy = clamp(campaign.energy + e.delta, 0, 100);
        break;
      case 'prep':
        if (campaign) campaign.prepBonus = clamp(campaign.prepBonus + e.delta, 0, 0.3);
        break;
      case 'opponent': {
        const id = resolveOpponent(state, e.target, ctx);
        const opp = id ? state.election?.participants[id] : undefined;
        if (!opp) break;
        if (e.popMomentum) for (const t of POP_TYPE_IDS) addPopMomentum(opp, t, e.popMomentum);
        if (e.rejection) opp.rejectionMod += e.rejection;
        if (e.knowledge)
          for (const u of Object.keys(opp.knowledge)) addKnowledge(opp, u, e.knowledge);
        break;
      }
      case 'partyUnity': {
        const party = state.parties[player.partyId];
        if (party) shiftUnity(party, e.delta);
        break;
      }
      case 'partyPopularity': {
        const pid = e.partyId === 'context' ? ctx.partyId : (e.partyId ?? player.partyId);
        const party = pid ? state.parties[pid] : undefined;
        if (party) party.popularity = clamp(party.popularity + e.delta, 1, 95);
        break;
      }
      case 'economyShock':
        state.economy.shocks.push({
          id: nextId(state, 'shock'),
          label: e.label,
          monthsLeft: e.months,
          growth: e.growth ?? 0,
          inflation: e.inflation ?? 0,
          unemployment: e.unemployment ?? 0,
          confidence: e.confidence ?? 0,
        });
        break;
      case 'approval':
        if (gov) gov.approval = clamp100(gov.approval + e.delta);
        break;
      case 'politicalCapital':
        if (gov) gov.politicalCapital = clamp(gov.politicalCapital + e.delta, 0, 100);
        break;
      case 'worldPrice':
        for (const good of e.goods) {
          const market = state.market.goods[good];
          if (market) market.worldPrice = clamp(
              market.worldPrice * e.factor,
              MARKET_BOUNDS.worldPrice.min,
              MARKET_BOUNDS.worldPrice.max,
            );
        }
        break;
      case 'buildingLevels':
        applyBuildingLevels(state, e.stateId, e.buildingId, e.delta, e.owner ?? 'private');
        break;
      case 'legitimacy':
        state.nation.legitimacy = clamp100(state.nation.legitimacy + e.delta);
        break;
      case 'unrest':
        state.nation.unrest = clamp100(state.nation.unrest + e.delta);
        break;
      case 'radicalism': {
        const gid = e.groupId === 'context' ? ctx.groupId : e.groupId;
        if (gid) shiftGroupRadicalism(state, gid, e.delta);
        break;
      }
      case 'capitalFlow':
        state.industry.investmentPool = Math.max(0, state.industry.investmentPool * e.privateFactor);
        state.industry.foreignPool = Math.max(0, state.industry.foreignPool * e.foreignFactor);
        break;
      case 'exchangeRate':
        state.market.exchangeRate = clamp(
          state.market.exchangeRate * e.factor,
          MARKET_BOUNDS.exchangeRate.min,
          MARKET_BOUNDS.exchangeRate.max,
        );
        break;
      case 'interestGroup': {
        const gid = e.groupId === 'context' ? ctx.groupId : e.groupId;
        const group = gid ? state.interestGroups[gid] : undefined;
        if (group) group.approval = clamp100(group.approval + e.delta);
        break;
      }
      case 'popSatisfaction':
        for (const pop of Object.values(state.population.pops)) {
          if (e.popTypes === 'all' || e.popTypes.includes(pop.typeId))
            pop.satisfaction = clamp100(pop.satisfaction + e.delta);
        }
        break;
      case 'ideologyShift':
        if (status) status.perceivedIdeology = shiftIdeology(status.perceivedIdeology, e.shift);
        else player.ideology = shiftIdeology(player.ideology, e.shift, 0.5);
        break;
      case 'issueFocus':
        if (status)
          status.issueFocus[e.issue] = clamp((status.issueFocus[e.issue] ?? 0) + e.delta, 0, 100);
        break;
      case 'relation': {
        const ids =
          e.partyId === 'all'
            ? Object.keys(state.parties)
            : e.partyId === 'coalition'
              ? state.congress.coalition
              : e.partyId === 'context'
                ? ctx.partyId
                  ? [ctx.partyId]
                  : []
                : [e.partyId];
        for (const id of ids)
          state.congress.relations[id] = clamp(
            (state.congress.relations[id] ?? 0) + e.delta,
            -100,
            100,
          );
        break;
      }
      case 'budgetSpend': {
        const budget = gov?.budget;
        if (budget && BUDGET_CATEGORIES.includes(e.category))
          budget.balance -= budget.spending[e.category] * e.share;
        break;
      }
      case 'chain': {
        const fire =
          e.chance === undefined || withRng(state, (rng) => rng.chance(e.chance as number));
        if (fire)
          state.events.scheduled.push({
            eventId: e.eventId,
            date: addDays(state.date, e.inDays),
            context: { ...ctx },
          });
        break;
      }
      case 'modifier':
        state.events.modifiers.push({
          id: e.id,
          label: fillTemplate(e.label, vars),
          endsOn: addDays(state.date, e.days),
          daily: e.daily,
          context: { ...ctx },
        });
        break;
      case 'removeStaff':
        if (campaign && campaign.staff.length > 0) campaign.staff.shift();
        break;
      case 'interview':
        if (state.phase === 'campaign' && !state.interactions.interview)
          startInterview(state, e.interviewType);
        break;
      case 'history':
        addHistory(state, {
          kind: e.kind,
          title: fillTemplate(e.title, vars),
          importance: e.importance ?? 1,
          sentiment: e.sentiment ?? 0,
        });
        break;
      case 'news':
        publishNews(state, {
          headline: fillTemplate(e.headline, vars),
          body: e.body ? fillTemplate(e.body, vars) : '',
          category: e.category ?? 'event',
          sentiment: e.sentiment ?? 0,
        });
        break;
    }
  }
  return out;
}

/** Descrição legível de um efeito (prévia nas opções de evento). */
export function describeEffect(e: Effect, moneyScale: number): string | null {
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  switch (e.type) {
    case 'money':
      return `${e.amount >= 0 ? '+' : '-'}${formatMoney(Math.abs(e.amount * moneyScale))}`;
    case 'attribute':
      return `${ATTRIBUTES[e.attribute].name} ${sign(e.delta)}`;
    case 'fame':
      return `Fama ${sign(e.delta)}`;
    case 'knowledge':
      return `Conhecimento ${sign(e.delta)}`;
    case 'presence':
      return `Presença regional ${sign(e.delta)}`;
    case 'regionalMomentum':
      return `Apoio regional ${sign(e.delta)}`;
    case 'popMomentum':
      return e.popTypes === 'all'
        ? `Apoio geral ${sign(e.delta)}`
        : `Apoio: ${e.popTypes.map((t) => POP_TYPES[t].plural).join(', ')} ${sign(e.delta)}`;
    case 'rejection':
      return `Rejeição ${sign(e.delta)}`;
    case 'scandal':
      return e.delta > 0 ? 'Desgaste de imagem' : 'Imagem limpa';
    case 'enthusiasm':
      return `Entusiasmo da base ${sign(e.delta)}`;
    case 'militants':
      return `Militância ${sign(e.pct)}%`;
    case 'energy':
      return `Energia ${sign(e.delta)}`;
    case 'prep':
      return 'Preparação para debates';
    case 'opponent':
      return e.rejection && e.rejection > 0 ? 'Adversário desgastado' : 'Adversário fortalecido';
    case 'partyUnity':
      return `Unidade do partido ${sign(e.delta)}`;
    case 'partyPopularity':
      return `Popularidade do partido ${sign(e.delta)}`;
    case 'economyShock':
      return `Economia: ${e.label}`;
    case 'worldPrice':
      return `Preço mundial: ${e.label} (${e.factor >= 1 ? '+' : '-'}${Math.round(Math.abs(e.factor - 1) * 100)}%)`;
    case 'buildingLevels':
      return `${BUILDINGS[e.buildingId].name} em ${e.stateId}: ${sign(e.delta)} ${Math.abs(e.delta) === 1 ? 'nível' : 'níveis'}`;
    case 'legitimacy':
      return `Legitimidade ${sign(e.delta)}`;
    case 'unrest':
      return `Inquietação social ${sign(e.delta)}`;
    case 'radicalism':
      return `Radicalismo do grupo ${sign(e.delta)}`;
    case 'capitalFlow':
      return e.privateFactor < 1 || e.foreignFactor < 1
        ? 'Fuga de capitais: fundos de investimento encolhem'
        : 'Entrada de capitais: fundos de investimento crescem';
    case 'exchangeRate':
      return e.factor > 1 ? 'Real se desvaloriza' : 'Real se valoriza';
    case 'approval':
      return `Aprovação ${sign(e.delta)}`;
    case 'politicalCapital':
      return `Capital político ${sign(e.delta)}`;
    case 'interestGroup':
      return `Grupo de interesse ${sign(e.delta)}`;
    case 'popSatisfaction':
      return e.popTypes === 'all'
        ? `Satisfação geral ${sign(e.delta)}`
        : `Satisfação: ${e.popTypes.map((t) => POP_TYPES[t].plural).join(', ')} ${sign(e.delta)}`;
    case 'ideologyShift':
      return 'Muda sua posição percebida';
    case 'issueFocus':
      return `Ênfase em ${ISSUE_DEFINITIONS[e.issue].name}`;
    case 'relation':
      return `Relação com partidos ${sign(e.delta)}`;
    case 'budgetSpend':
      return `Gasto extra: ${BUDGET_NAMES[e.category] ?? e.category}`;
    case 'chain':
      return 'Pode ter desdobramentos';
    case 'removeStaff':
      return 'Perde um membro da equipe';
    case 'interview':
      return 'Abre uma entrevista';
    case 'modifier':
      return `Efeito por ${e.days} dias`;
    default:
      return null;
  }
}
