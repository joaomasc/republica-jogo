import { GameConstants } from '../config/constants';
import { addMonths, firstSundayOfOctober, makeDate, addDays, yearOf } from '../core/date';
import { approach, clamp, clamp100, round, sum } from '../core/math';
import { hashSeed, Rng, withRng } from '../core/rng';
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
import { pushAlert } from '../media/alerts';
import { publishNews } from '../media/news';
import { driftParties } from '../parties/parties';
import { driftRelations, initCongress, coalitionSeats } from '../politics/congress';
import { updateInterestGroups } from '../politics/interestGroups';
import { updatePopulationMonthly } from '../population/satisfaction';
import { getPlayer, getPlayerParty, requireElection } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { finalizePromises, setPromiseBaselines } from './promises';
import type { GovernmentState, TermEvaluation } from './types';

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

function governedPopsApproval(state: GameState): number {
  const gov = state.government;
  if (!gov) return 50;
  const pops = Object.values(state.population.pops).filter(
    (p) => gov.jurisdiction.level === 'federal' || p.stateId === gov.jurisdiction.stateId,
  );
  const total = sum(pops.map((p) => p.size));
  return total > 0 ? sum(pops.map((p) => p.satisfaction * p.size)) / total : 50;
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
    state.landscape.mayors[election.jurisdiction.stateId] = party.id;

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
  };
  gov.approvalHistory.push({ date: state.date, value: round(gov.approval, 1) });
  state.government = gov;
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
  updateEconomy(state, rng);
  if (gov.budget) {
    const law = aggregateLawEffects(state, 'any');
    // A receita acompanha a arrecadação do país (bases tributárias e leis de impostos).
    const ratio = revenueBefore > 0 ? state.economy.revenue / revenueBefore : 1 + state.economy.growth / 1200;
    gov.budget.revenueTaxes *= clamp(ratio, 0.9, 1.1);
    executeBudgetMonthly(state, 1 + (law.economy.revenue ?? 0));
  }
  updatePopulationMonthly(state);

  const honeymoon =
    gov.monthsInOffice <= G.honeymoonMonths
      ? G.honeymoonBonus * (1 - gov.monthsInOffice / G.honeymoonMonths)
      : 0;
  let target: number;
  if (gov.branch === 'executive') {
    const deficitPenalty =
      gov.budget && gov.budget.balance < 0
        ? Math.min(8, (-gov.budget.balance / Math.max(1, gov.budget.revenueTaxes)) * 40)
        : 0;
    target = governedPopsApproval(state) + honeymoon - player.scandal * 0.25 - deficitPenalty;
  } else {
    target =
      40 +
      governedPopsApproval(state) * 0.2 +
      (player.fame - 40) / 5 +
      gov.billsPassed * 2 +
      honeymoon -
      player.scandal * 0.25;
  }
  const previous = gov.approval;
  gov.approval = clamp100(
    approach(gov.approval, target, G.approvalAdjustRate) + rng.normal(0, 0.8),
  );
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
  updateInterestGroups(state, rng);
  processLawsMonthly(state, rng);
  processLegislatureMonth(state, rng);
  nationalMonthlyTick(state, rng);
  driftRelations(state);
  driftParties(state.parties, rng, 30);
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
  rollEvent(
    state,
    gov.branch === 'executive'
      ? GameConstants.events.monthlyChanceGovernment
      : GameConstants.events.monthlyChanceLegislature,
  );
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
  state.career.reputation = clamp100(state.career.reputation + reputationDelta);
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
  return evaluation;
}

export function termYear(state: GameState): number {
  return yearOf(state.date);
}
