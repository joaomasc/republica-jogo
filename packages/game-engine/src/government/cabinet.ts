/**
 * GABINETE MENSAL — o ritmo do mandato no Executivo.
 *
 * Todo início de mês: balanço do governo, uma PAUTA do mês (tema em alta), o que a OPOSIÇÃO vai
 * fazer e 3 CARTAS de decisão (uma ligada à pauta). O tempo para até a escolha, como na reunião
 * semanal da campanha.
 */
import { GameConstants } from '../config/constants';
import { diffDays } from '../core/date';
import { withRng, type Rng } from '../core/rng';
import type { ActionResult } from '../core/types';
import { applyEffects } from '../events/effects';
import type { EventContext } from '../events/types';
import { ISSUE_DEFINITIONS, ISSUES, type IssueId } from '../ideology/issues';
import { mainOpposition } from '../legislature/context';
import { publishNews } from '../media/news';
import { getPlayer, getPlayerParty } from '../simulation/access';
import type { GameState } from '../simulation/state';
import {
  CABINET_CARDS,
  ISSUE_BUDGET,
  type CabinetCardDef,
  type CabinetSituation,
} from './cabinetCards.data';
import { monthlyTransfers } from './federative';
import type { CabinetCard, CabinetMeeting } from './types';

const C = GameConstants.cabinet;

/** Tema do mês: pesa o que os eleitores governados consideram prioritário. */
function pickTrend(state: GameState, rng: Rng, previous: IssueId | null): IssueId {
  const gov = state.government!;
  const weight: Partial<Record<IssueId, number>> = {};
  for (const pop of Object.values(state.population.pops)) {
    if (gov.jurisdiction.level !== 'federal' && pop.stateId !== gov.jurisdiction.stateId) continue;
    for (const issue of ISSUES)
      weight[issue] = (weight[issue] ?? 0) + pop.priorities[issue] * pop.size;
  }
  const pool = ISSUES.filter((i) => i !== previous);
  return rng.weightedPick(pool, (i) => (weight[i] ?? 1) * rng.range(0.4, 1.6)) ?? pool[0]!;
}

function situation(state: GameState, trend: IssueId): CabinetSituation {
  const gov = state.government!;
  const player = getPlayer(state);
  const budget = gov.budget;
  const revenue = budget ? budget.revenueTaxes + budget.revenueOther : 1;
  const spending = budget ? Object.values(budget.spending).reduce((a, x) => a + x, 0) : 0;
  return {
    level: gov.jurisdiction.level as CabinetSituation['level'],
    monthsInOffice: gov.monthsInOffice,
    monthsLeft: Math.max(0, Math.round(diffDays(state.date, gov.endDate) / 30)),
    approval: gov.approval,
    balanceRatio: budget ? budget.balance / Math.max(1, revenue) : 0,
    deficit: !!budget && spending > revenue * 1.02,
    growth: state.economy.growth,
    unemployment: state.economy.unemployment,
    inflation: state.economy.inflation,
    scandal: player.scandal,
    credibility: player.attributes.credibility,
    unity: getPlayerParty(state).unity,
    wear: gov.wear ?? 0,
    capital: gov.politicalCapital,
    striking: state.nation.strikes.length > 0,
    unrest: state.nation.unrest,
    trend,
  };
}

/** Carta fixa da pauta: investir na área do tema em alta. */
function trendCard(trend: IssueId): CabinetCardDef {
  const name = ISSUE_DEFINITIONS[trend].name.toLowerCase();
  return {
    key: `pauta_${trend}`,
    title: `Responder à pauta: ${name}`,
    description: `O assunto do mês é ${name}. Um anúncio forte na área ocupa o noticiário.`,
    icon: 'megaphone',
    chance: 1,
    weight: () => 1,
    effects: [
      { type: 'budgetSpend', category: ISSUE_BUDGET[trend], share: 0.03 },
      { type: 'approval', delta: 1 },
      { type: 'wear', delta: -0.8 },
    ],
  };
}

/** O que a oposição vai fazer no mês (texto e efeito leve imediato). */
function oppositionMove(state: GameState, rng: Rng, s: CabinetSituation): string {
  const oppId = mainOpposition(state, state.congress.coalition);
  const name = oppId ? (state.parties[oppId]?.acronym ?? 'A oposição') : 'A oposição';
  const ctx: EventContext = {};
  if (s.scandal >= 12 && rng.chance(0.6)) {
    applyEffects(state, [{ type: 'politicalCapital', delta: -2 }], ctx);
    return `${name} coleta assinaturas para investigar o governo.`;
  }
  if (s.approval < 40 && rng.chance(0.6)) {
    applyEffects(state, [{ type: 'unrest', delta: 1 }], ctx);
    return `${name} convoca protestos contra o governo nas ruas.`;
  }
  if (s.capital < 35 && rng.chance(0.5)) {
    applyEffects(state, [{ type: 'politicalCapital', delta: -2 }], ctx);
    return `${name} promete obstruir as votações do governo.`;
  }
  return rng.pick([
    `${name} vai atacar o governo na pauta de ${ISSUE_DEFINITIONS[s.trend].name.toLowerCase()}.`,
    `${name} prepara um pacote alternativo para mostrar serviço.`,
    `${name} aposta no desgaste e evita grandes embates neste mês.`,
  ]);
}

function drawCards(rng: Rng, s: CabinetSituation, index: number): CabinetCard[] {
  const pool = CABINET_CARDS.map((def) => ({ def, w: def.weight(s) })).filter((x) => x.w > 0);
  const chosen: CabinetCardDef[] = [trendCard(s.trend)];
  while (chosen.length < C.cards && pool.length > 0) {
    const pick = rng.weightedPick(pool, (x) => x.w);
    if (!pick) break;
    pool.splice(pool.indexOf(pick), 1);
    chosen.push(pick.def);
  }
  return chosen.map((def, i) => ({
    id: `g${index}c${i}`,
    key: def.key,
    title: def.title,
    description: def.description,
    icon: def.icon,
    chance: def.chance,
    effects: def.effects,
    ...(def.failure ? { failure: def.failure } : {}),
  }));
}

/** Abre a reunião do mês (chamada no tick mensal do governo executivo). */
export function startCabinet(state: GameState, rng: Rng): void {
  const gov = state.government;
  if (!state.settings.cabinet || !gov || gov.branch !== 'executive') return;
  if (state.phase !== 'governing') return;
  if (diffDays(state.date, gov.endDate) < 15) return;
  const prev = gov.cabinet ?? null;
  if (prev?.date === state.date) return;
  const trend = pickTrend(state, rng, prev?.trend ?? null);
  const s = situation(state, trend);
  const history = gov.approvalHistory;
  const before = history.length >= 2 ? history[history.length - 2]!.value : gov.approval;
  const meeting: CabinetMeeting = {
    date: state.date,
    index: gov.monthsInOffice,
    trend,
    opposition: oppositionMove(state, rng, s),
    briefing: {
      approval: Math.round(gov.approval * 10) / 10,
      approvalDelta: Math.round((gov.approval - before) * 10) / 10,
      balance: gov.budget?.balance ?? 0,
      wear: Math.round((gov.wear ?? 0) * 10) / 10,
      worksActive: ((state.industry.works ?? []) as { player: boolean; status: string }[]).filter(
        (w) => w.player && w.status !== 'done',
      ).length,
      monthsLeft: s.monthsLeft,
      transfers: Math.round(monthlyTransfers(state) * 1000) / 1000,
    },
    cards: drawCards(rng, s, gov.monthsInOffice),
    pending: true,
    outcome: null,
  };
  gov.cabinet = meeting;
  publishNews(state, {
    headline: `${ISSUE_DEFINITIONS[trend].name} é o tema do mês no governo`,
    category: 'government',
    importance: 1,
  });
}

/** O jogador escolhe uma carta (ou nenhuma) e o mês segue. */
export function chooseCabinetCard(state: GameState, cardId: string | null): ActionResult {
  const gov = state.government;
  const meeting = gov?.cabinet;
  if (!gov || !meeting?.pending)
    return { ok: false, message: 'Não há reunião de gabinete em aberto.' };
  if (cardId === null) {
    meeting.pending = false;
    meeting.outcome = { cardId: null, success: true, details: [] };
    return { ok: true, message: 'Mês sem decisão especial.' };
  }
  const card = meeting.cards.find((c) => c.id === cardId);
  if (!card) return { ok: false, message: 'Carta inválida.' };
  const success = withRng(state, (rng) => rng.chance(card.chance));
  const player = getPlayer(state);
  const ctx: EventContext = {
    playerName: player.ballotName,
    playerParty: getPlayerParty(state).acronym,
  };
  const details = applyEffects(
    state,
    success ? card.effects : (card.failure ?? card.effects),
    ctx,
    `Gabinete: ${card.title}`,
  );
  meeting.pending = false;
  meeting.outcome = { cardId, success, details };
  if (success) gov.decisions = [...(gov.decisions ?? []), card.key];
  return {
    ok: true,
    message: success ? `${card.title}: decisão tomada.` : `${card.title}: não saiu como planejado.`,
    details,
  };
}

/** Motivo de bloqueio do tempo (ou null). */
export function cabinetBlockingReason(state: GameState): string | null {
  return state.phase === 'governing' && state.government?.cabinet?.pending
    ? 'Reunião de gabinete: escolha a decisão do mês.'
    : null;
}
