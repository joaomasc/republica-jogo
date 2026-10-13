import { GameConstants } from '../config/constants';
import { processStreetMonth, setRemovalHandler } from '../nation/revolt';
import { addMonths, firstSundayOfOctober, makeDate, addDays, yearOf } from '../core/date';
import { approach, clamp, clamp100, round, sum } from '../core/math';
import { hashSeed, Rng, withRng } from '../core/rng';
import { startCabinet } from './cabinet';
import { monthlyTransfers } from './federative';
import { processMinisters } from './ministers';
import { objectiveProgress, offerObjectives } from './objectives';
import type { PartyId } from '../core/types';
import { executeBudgetMonthly, initBudget } from '../economy/budget';
import { economySummary, snapshot, updateEconomy } from '../economy/economy';
import { OFFICES, type Jurisdiction } from '../election/offices';
import { rollEvent } from '../events/events';
import { addHistory } from '../history/history';
import { nationalMonthlyTick } from '../simulation/nationalTick';
import { switchLawJurisdiction } from '../laws/federal';
import { aggregateLawEffects, jurisdictionKey, processLawsMonthly } from '../laws/laws';
import { initLegislature, processLegislatureMonth } from '../legislature/legislature';
import { setMayorParty } from '../map/cities';
import { pushAlert } from '../media/alerts';
import { publishNews } from '../media/news';
import { driftPartiesInState } from '../parties/drift';
import { driftRelations, initCongress, coalitionSeats } from '../politics/congress';
import { updateInterestGroups } from '../politics/interestGroups';
import {
  SATISFACTION_PART_LABEL,
  satisfactionParts,
  updatePopulationMonthly,
  type SatisfactionParts,
} from '../population/satisfaction';
import { getPlayer, getPlayerParty, requireElection } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { finalizePromises, setPromiseBaselines } from './promises';
import { startInterlude } from '../career/interlude';
import { measureApproval, recordApproval } from './approvalLog';
import type { ApprovalCauseKind, GovernmentState, TermEvaluation } from './types';

const G = GameConstants.government;

/** Esfera do Legislativo com que o jogador lida (para legisladores federais, o Congresso Nacional). */
export function legislatureJurisdiction(
  j: Jurisdiction,
  officeId: keyof typeof OFFICES,
): Jurisdiction {
  if (OFFICES[officeId].level === 'federal')
    return { level: 'federal', stateId: null, label: 'Brasil' };
  return j;
}

/** Fim do mandato = início da campanha do próximo ciclo do mesmo cargo. */
export function termEndDate(electionYear: number, officeId: keyof typeof OFFICES): string {
  const office = OFFICES[officeId];
  const nextYear = electionYear + office.termYears;
  return addDays(firstSundayOfOctober(nextYear), -office.campaignDays);
}

function governedPops(state: GameState) {
  const gov = state.government;
  return Object.values(state.population.pops).filter(
    (p) => !gov || gov.jurisdiction.level === 'federal' || p.stateId === gov.jurisdiction.stateId,
  );
}

/**
 * Satisfação média dos Pops governados (ponderada pelo tamanho) e a composição do alvo para o
 * qual ela caminha (desemprego, inflação, serviços, leis...).
 */
export function governedSatisfaction(state: GameState): {
  value: number;
  parts: { label: string; value: number }[];
} {
  const pops = governedPops(state);
  const total = sum(pops.map((p) => p.size));
  if (total <= 0) return { value: 50, parts: [] };
  const acc: Partial<Record<keyof SatisfactionParts, number>> = {};
  for (const pop of pops) {
    const parts = satisfactionParts(state, pop);
    for (const k of Object.keys(parts) as (keyof SatisfactionParts)[])
      acc[k] = (acc[k] ?? 0) + parts[k] * pop.size;
  }
  return {
    value: sum(pops.map((p) => p.satisfaction * p.size)) / total,
    parts: (Object.keys(acc) as (keyof SatisfactionParts)[])
      .filter((k) => k !== 'base')
      .map((k) => ({ label: SATISFACTION_PART_LABEL[k], value: round((acc[k] ?? 0) / total, 1) }))
      .filter((x) => Math.abs(x.value) >= 0.1),
  };
}

interface TrendPart {
  kind: ApprovalCauseKind;
  label: string;
  value: number;
  sub?: { label: string; value: number }[];
}

/**
 * Aplica a tendência mensal (30% da distância até o alvo) e registra o passo parcela por
 * parcela: cada parcela puxa 30% do próprio valor; o "− 30% da aprovação atual" fica junto da
 * primeira (satisfação), que é a convergência até ela.
 */
function applyApprovalTrend(state: GameState, parts: TrendPart[]): void {
  const gov = state.government;
  if (!gov) return;
  const previous = gov.approval;
  const target = parts.reduce((a, x) => a + x.value, 0);
  const next = clamp100(approach(previous, target, G.approvalAdjustRate));
  gov.approval = next;
  gov.approvalTarget = {
    date: state.date,
    target: round(target, 1),
    parts: parts
      .filter((x, i) => i === 0 || Math.abs(x.value) >= 0.05)
      .map((x) => ({
        label: x.label,
        value: round(x.value, 1),
        ...(x.sub ? { parts: x.sub } : {}),
      })),
  };
  const raw = G.approvalAdjustRate * (target - previous);
  // Se o limite 0–100 cortou o passo, as parcelas encolhem na mesma proporção.
  const scale = Math.abs(raw) > 1e-9 ? (next - previous) / raw : 0;
  parts.forEach((x, i) => {
    const pull = G.approvalAdjustRate * (x.value - (i === 0 ? previous : 0)) * scale;
    const label =
      i === 0
        ? `${x.label} (${Math.round(x.value)}) puxa a aprovação (${Math.round(previous)})`
        : x.label;
    recordApproval(state, x.kind, label, pull);
  });
}

/** Posse: cria o estado de governo/mandato a partir da eleição vencida. */
export function assumeOffice(state: GameState): void {
  const election = requireElection(state);
  const office = OFFICES[election.officeId];
  const player = getPlayer(state);
  const party = getPlayerParty(state);
  const result = election.results[election.results.length - 1];
  const pct = result?.pct[player.id] ?? 0.5;
  const career = state.career;
  const reelected =
    career.lastOfficeId === election.officeId &&
    career.offices.at(-1)?.jurisdictionLabel === election.jurisdiction.label;

  // Período de transição até a posse: a economia segue andando.
  const inauguration = makeDate(election.year + 1, office.branch === 'legislative' ? 2 : 1, 1);
  withRng(state, (rng) => {
    let guard = 0;
    while (state.date < inauguration && guard++ < 6) {
      state.date =
        addMonths(state.date, 1) > inauguration ? inauguration : addMonths(state.date, 1);
      updateEconomy(state, rng);
    }
  });
  state.date = inauguration;

  if (office.unitsKind === 'states') state.landscape.presidentPartyId = party.id;
  else if (office.id === 'governador' && election.jurisdiction.stateId)
    state.landscape.governors[election.jurisdiction.stateId] = party.id;
  else if (office.id === 'prefeito' && election.jurisdiction.stateId)
    setMayorParty(state, election.jurisdiction.stateId, election.jurisdiction.cityId, party.id);

  const legislature = legislatureJurisdiction(election.jurisdiction, election.officeId);
  const key = jurisdictionKey(office.branch === 'executive' ? election.jurisdiction : legislature);
  switchLawJurisdiction(state, key);
  const coattail: Record<PartyId, number> = {
    [party.id]:
      pct * GameConstants.congress.coattailFactor * (office.branch === 'executive' ? 1 : 0.3),
  };
  state.congress = withRng(state, (rng) => initCongress(state, legislature, rng, coattail));
  initLegislature(state, new Rng(hashSeed(state.meta.seed, 'legislature', state.date)));

  const gov: GovernmentState = {
    officeId: election.officeId,
    jurisdiction: election.jurisdiction,
    branch: office.branch,
    startDate: inauguration,
    endDate: termEndDate(election.year, election.officeId),
    termNumber: reelected ? career.consecutiveTerms + 1 : 1,
    approval: clamp100(50 + (pct - 0.5) * 40 + G.honeymoonBonus),
    approvalHistory: [],
    politicalCapital: clamp(
      G.politicalCapitalStart + (player.attributes.leadership - 50) / 5,
      0,
      100,
    ),
    budget: office.branch === 'executive' ? initBudget(state, election.jurisdiction) : null,
    ministers: [],
    stability: 60,
    monthsInOffice: 0,
    billsPassed: 0,
    votesCast: 0,
    partyLoyalty: 70,
    vice: state.campaign?.runningMate ?? null,
  };
  gov.approvalHistory.push({ date: state.date, value: round(gov.approval, 1) });
  state.government = gov;
  offerObjectives(state);
  state.economy.termBaseline = snapshot(state.economy, state.date);
  setPromiseBaselines(state);

  career.consecutiveTerms = reelected ? career.consecutiveTerms + 1 : 1;
  career.lastOfficeId = election.officeId;
  career.offices.push({
    officeId: election.officeId,
    jurisdictionLabel: election.jurisdiction.label,
    start: inauguration,
    end: null,
    termNumber: gov.termNumber,
  });
  player.currentOffice = election.officeId;
  player.fame = clamp100(player.fame + 10 + office.prestige * 2);

  state.phase = office.branch === 'executive' ? 'governing' : 'legislating';
  state.election = null;
  state.campaign = null;
  state.interactions = { debate: null, interview: null };
  addHistory(state, {
    kind: 'office',
    title: `Toma posse como ${office.name} (${election.jurisdiction.label})`,
    importance: 3,
    sentiment: 1,
  });
  publishNews(state, {
    headline: `${player.ballotName} toma posse como ${office.name.toLowerCase()}`,
    category: 'government',
    sentiment: 1,
    importance: 3,
  });
}

function stability(state: GameState): number {
  const gov = state.government;
  if (!gov) return 50;
  const seats = coalitionSeats(state);
  const coalitionShare = seats.total > 0 ? seats.coalition / seats.total : 0.5;
  return clamp100(
    gov.approval * 0.45 +
      coalitionShare * 40 +
      getPlayerParty(state).unity * 0.15 -
      getPlayer(state).scandal * 0.2,
  );
}

/** Tick mensal do mandato. */
export function governmentMonthlyTick(state: GameState, rng: Rng): void {
  const gov = state.government;
  if (!gov) return;
  const player = getPlayer(state);
  gov.monthsInOffice += 1;

  const revenueBefore = state.economy.revenue;
  // Obras inauguradas e efeitos da economia do mês (medidos: a manchete vira a causa).
  measureApproval(state, 'works', { prefix: 'Obras e economia do mês' }, () =>
    updateEconomy(state, rng),
  );
  if (gov.budget) {
    const law = aggregateLawEffects(state, 'any');
    // A receita acompanha a arrecadação do país (bases tributárias e leis de impostos).
    const ratio = revenueBefore > 0 ? state.economy.revenue / revenueBefore : 1 + state.economy.growth / 1200;
    gov.budget.revenueTaxes *= clamp(ratio, 0.9, 1.1);
    executeBudgetMonthly(state, 1 + (law.economy.revenue ?? 0));
    // Repasses voluntários de governador e presidente conforme o alinhamento político.
    gov.budget.balance += monthlyTransfers(state);
  }
  updatePopulationMonthly(state);

  const honeymoon =
    gov.monthsInOffice <= G.honeymoonMonths
      ? G.honeymoonBonus * (1 - gov.monthsInOffice / G.honeymoonMonths)
      : 0;
  // Desgaste: depois da lua de mel, governar cansa — mais rápido em crise econômica.
  if (gov.branch === 'executive' && gov.monthsInOffice > G.honeymoonMonths) {
    const e = state.economy;
    const crisis = e.growth < 0 || e.unemployment > 11 || e.inflation > 8;
    gov.wear = clamp(
      (gov.wear ?? 0) +
        (G.wearPerMonth + (crisis ? G.wearCrisisExtra : 0)) *
          (G.wearLevelFactor[gov.jurisdiction.level] ?? 1),
      0,
      G.wearMax,
    );
  }
  // Tendência: a aprovação anda 30% da distância até o alvo a cada mês. O alvo é uma soma de
  // parcelas nomeadas, e a tendência é registrada parcela por parcela (sem ruído sorteado).
  const previous = gov.approval;
  const sat = governedSatisfaction(state);
  const parts: TrendPart[] = [];
  if (gov.branch === 'executive') {
    const deficitPenalty =
      gov.budget && gov.budget.balance < 0
        ? Math.min(8, (-gov.budget.balance / Math.max(1, gov.budget.revenueTaxes)) * 40)
        : 0;
    parts.push(
      { kind: 'satisfaction', label: 'Satisfação da população', value: sat.value, sub: sat.parts },
      { kind: 'honeymoon', label: 'Lua de mel do início do mandato', value: honeymoon },
      { kind: 'scandal', label: 'Escândalos', value: -player.scandal * 0.25 },
      { kind: 'deficit', label: 'Orçamento no vermelho', value: -deficitPenalty },
      { kind: 'wear', label: 'Desgaste de governar', value: -(gov.wear ?? 0) },
    );
  } else {
    parts.push(
      { kind: 'satisfaction', label: 'Patamar de um parlamentar', value: 40 },
      {
        kind: 'satisfaction',
        label: 'Satisfação da população (20%)',
        value: sat.value * 0.2,
        sub: sat.parts.map((x) => ({ label: x.label, value: round(x.value * 0.2, 1) })),
      },
      { kind: 'record', label: 'Visibilidade (fama)', value: (player.fame - 40) / 5 },
      {
        kind: 'record',
        label: `Projetos seus aprovados (${gov.billsPassed})`,
        value: gov.billsPassed * 2,
      },
      { kind: 'honeymoon', label: 'Início do mandato', value: honeymoon },
      { kind: 'scandal', label: 'Escândalos', value: -player.scandal * 0.25 },
    );
  }
  applyApprovalTrend(state, parts);
  gov.approvalHistory.push({ date: state.date, value: round(gov.approval, 1) });
  if (gov.approvalHistory.length > 120) gov.approvalHistory.shift();
  player.attributes.popularity = clamp100(
    approach(player.attributes.popularity, gov.approval, 0.15),
  );

  gov.politicalCapital = clamp(
    gov.politicalCapital +
      G.politicalCapitalBaseRegen +
      gov.approval * G.politicalCapitalApprovalFactor +
      player.attributes.leadership * G.politicalCapitalLeadershipFactor -
      3,
    0,
    G.politicalCapitalMax,
  );
  measureApproval(state, 'other', { prefix: 'Grupos de interesse' }, () =>
    updateInterestGroups(state, rng),
  );
  if (state.nation.strikes.some((x) => x.groupId === 'civil_servants')) gov.hadServantsStrike = true;
  measureApproval(state, 'cabinet', { prefix: 'Ministros' }, () => processMinisters(state, rng));
  measureApproval(state, 'congress', { prefix: 'Leis em vigor' }, () =>
    processLawsMonthly(state, rng),
  );
  measureApproval(state, 'congress', { prefix: 'Congresso' }, () =>
    processLegislatureMonth(state, rng),
  );
  measureApproval(state, 'street', { prefix: 'Greves e instituições' }, () =>
    nationalMonthlyTick(state, rng),
  );
  if (state.government)
    measureApproval(state, 'street', { prefix: 'Ruas' }, () => processStreetMonth(state));
  driftRelations(state);
  driftPartiesInState(state, 30);
  player.scandal = clamp(player.scandal * 0.93, 0, 100);
  player.attributes.experience = clamp100(player.attributes.experience + 0.25);
  gov.stability = round(stability(state), 1);

  if (gov.approval < previous - GameConstants.alerts.approvalDrop) {
    pushAlert(state, {
      kind: 'approval_drop',
      severity: 'danger',
      title: 'Sua popularidade caiu',
      message: `Aprovação em ${Math.round(gov.approval)}%.`,
      link: 'government',
    });
  }
  if (
    gov.budget &&
    gov.budget.balance < 0 &&
    sum(Object.values(gov.budget.spending)) > gov.budget.revenueTaxes + gov.budget.revenueOther
  ) {
    pushAlert(state, {
      kind: 'deficit',
      severity: 'warning',
      title: 'Seu orçamento está deficitário',
      message: 'Os gastos superam as receitas. A dívida e a inflação podem subir.',
      link: 'budget',
    });
  }
  if (getPlayerParty(state).unity < GameConstants.alerts.partyUnityWarning) {
    pushAlert(state, {
      kind: 'party_divided',
      severity: 'warning',
      title: 'Seu partido está dividido',
      message: 'Facções insatisfeitas ameaçam a base.',
      link: 'party',
    });
  }
  measureApproval(state, 'event', { prefix: 'Evento' }, () => {
    rollEvent(
      state,
      gov.branch === 'executive'
        ? GameConstants.events.monthlyChanceGovernment
        : GameConstants.events.monthlyChanceLegislature,
    );
  });
  startCabinet(state, rng);
}

/** Encerra o mandato: avalia promessas, atualiza reputação e libera as escolhas de carreira. */
export function endTerm(state: GameState): TermEvaluation | null {
  const gov = state.government;
  if (!gov) return null;
  const player = getPlayer(state);
  const office = OFFICES[gov.officeId];
  const promises = finalizePromises(state);
  const rate =
    promises.total > 0 ? (promises.fulfilled + promises.partial * 0.5) / promises.total : 0.5;
  const reputationDelta = round((gov.approval - 50) / 5 + (rate - 0.5) * 20, 1);
  player.attributes.credibility = clamp100(
    player.attributes.credibility +
      clamp(
        promises.fulfilled * G.promiseCredibilityFulfilled +
          promises.broken * G.promiseCredibilityBroken,
        -15,
        12,
      ),
  );
  const evaluation: TermEvaluation = {
    officeId: gov.officeId,
    endDate: state.date,
    approval: round(gov.approval, 1),
    promisesTotal: promises.total,
    promisesFulfilled: promises.fulfilled,
    promisesPartial: promises.partial,
    promisesBroken: promises.broken,
    fulfillmentRate: round(rate, 3),
    economySummary: economySummary(state.economy),
    reputationDelta,
    canRunForReelection: office.termLimit ? state.career.consecutiveTerms < office.termLimit : true,
  };
  // Objetivos do mandato: cada um cumprido vale reputação e credibilidade.
  const objectives = objectiveProgress(state);
  const done = objectives.filter((o) => o.done).length;
  if (objectives.length > 0) evaluation.objectives = objectives;
  evaluation.reputationDelta = round(
    reputationDelta + done * GameConstants.objectives.reputationPerObjective,
    1,
  );
  player.attributes.credibility = clamp100(
    player.attributes.credibility + done * GameConstants.objectives.credibilityPerObjective,
  );
  for (const o of objectives.filter((x) => x.done))
    addHistory(state, { kind: 'reform', title: `Objetivo cumprido: ${o.title}`, importance: 2, sentiment: 1 });
  state.career.reputation = clamp100(state.career.reputation + evaluation.reputationDelta);
  state.career.lastEvaluation = evaluation;
  const record = state.career.offices.at(-1);
  if (record) record.end = state.date;
  player.currentOffice = null;
  addHistory(state, {
    kind: 'office',
    title: `Fim do mandato de ${office.name} — aprovação ${Math.round(gov.approval)}%`,
    description: `Promessas: ${promises.fulfilled} cumpridas, ${promises.partial} parciais, ${promises.broken} não cumpridas.`,
    importance: 3,
    sentiment: gov.approval >= 50 ? 1 : -1,
  });
  publishNews(state, {
    headline: `Mandato de ${player.ballotName} chega ao fim com ${Math.round(gov.approval)}% de aprovação`,
    category: 'government',
    importance: 3,
    sentiment: gov.approval >= 50 ? 1 : -1,
  });
  state.government = null;
  state.phase = 'career';
  // O mandato deixa base no lugar governado, conforme a aprovação final.
  startInterlude(state, {
    jurisdiction: gov.jurisdiction,
    base: clamp(15 + (gov.approval - 40) * 0.6, 5, 45),
  });
  return evaluation;
}

export function termYear(state: GameState): number {
  return yearOf(state.date);
}

// Cassação por revolta popular (governador/prefeito) encerra o mandato.
setRemovalHandler((state) => {
  endTerm(state);
});
