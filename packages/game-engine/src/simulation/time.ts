import { processAdsDaily } from '../campaign/ads';
import { dailyFinance, earn } from '../campaign/finance';
import { freeAirtimeTick, opponentsDailyTick } from '../campaign/opponents';
import { staffBonus } from '../campaign/staff';
import { runAgendaDay, type AgendaDayReport } from '../campaign/agenda';
import { ImpactMeter } from '../campaign/impact';
import { startWeek } from '../campaign/weekly';
import { decayStatus } from '../campaign/statusOps';
import { GameConstants } from '../config/constants';
import { addDays, diffDays } from '../core/date';
import { approach, clamp, clamp100 } from '../core/math';
import { withRng, type Rng } from '../core/rng';
import { updateEconomy } from '../economy/economy';
import { addPoll, createPoll, pickPollster } from '../election/polls';
import { computeIntentions, OTHERS_KEY } from '../election/voterModel';
import { processModifiers, processScheduledEvents, rollEvent } from '../events/events';
import { endTerm, governmentMonthlyTick } from '../government/government';
import { legislatureBlockingReason, processLegislatureDay } from '../legislature/legislature';
import { handleTermEnd } from '../nation/nation';
import { campaignAlerts, debateInvitationAlerts, pushAlert } from '../media/alerts';
import { publishNews } from '../media/news';
import { driftParties, factionReaction } from '../parties/parties';
import { interestGroupDonations } from '../politics/interestGroups';
import { POP_TYPES, type PopTypeId } from '../population/popTypes';
import { updatePopulationMonthly } from '../population/satisfaction';
import { getPlayer, getPlayerParty, getPlayerStatus } from './access';
import type { GameState } from './state';

const C = GameConstants.campaign;

export type TimeStep = 'day' | 'week' | 'month';
export type Interrupt =
  | 'event'
  | 'debate'
  | 'election_day'
  | 'term_end'
  | 'interaction'
  | 'decision'
  | 'blocked'
  | null;

export interface AdvanceResult {
  days: number;
  interrupt: Interrupt;
  /** O que a agenda automática fez em cada dia avançado. */
  agenda?: AgendaDayReport[];
}

export function blockingReason(state: GameState): string | null {
  if (state.events.pending.length > 0) return 'Há um evento aguardando sua decisão.';
  if (state.interactions.debate) return 'Termine o debate em andamento.';
  if (state.interactions.interview) return 'Termine a entrevista em andamento.';
  if (state.phase === 'campaign' && state.election) {
    const debateToday = state.election.debates.find(
      (d) => d.status === 'scheduled' && d.date === state.date,
    );
    if (debateToday) return `Hoje tem debate na ${debateToday.host}: participe ou recuse.`;
  }
  if (state.phase === 'campaign' && state.campaign?.week?.pending)
    return 'Reunião de campanha: escolha a jogada da semana.';
  if (state.phase === 'election_day') return 'É dia de eleição!';
  if (state.phase === 'governing' || state.phase === 'legislating') {
    const decision = legislatureBlockingReason(state);
    if (decision) return decision;
  }
  if (state.phase !== 'campaign' && state.phase !== 'governing' && state.phase !== 'legislating')
    return 'O tempo não avança nesta fase.';
  return null;
}

function isMonthStart(date: string): boolean {
  return date.endsWith('-01');
}

/** Popularidade do jogador acompanha a intenção de voto e a rejeição. */
export function updatePopularity(state: GameState, playerShare: number, rejection: number): void {
  const player = getPlayer(state);
  const target = clamp100(25 + playerShare * 180 - rejection * 45);
  player.attributes.popularity = clamp100(approach(player.attributes.popularity, target, 0.2));
}

function publishPublicPoll(state: GameState): void {
  const election = state.election;
  if (!election) return;
  const prev = [...election.polls].reverse().find((p) => p.kind === 'public');
  const poll = createPoll(state, { kind: 'public', pollster: pickPollster(state) });
  addPoll(state, poll);
  const player = getPlayer(state);
  const mine = poll.total.shares[player.id] ?? 0;
  const ranked = Object.entries(poll.total.shares)
    .filter(([id]) => id !== OTHERS_KEY)
    .sort((a, b) => b[1] - a[1]);
  const leader = state.candidates[ranked[0]?.[0] ?? ''];
  publishNews(state, {
    headline: `${poll.pollster}: ${leader?.ballotName ?? '—'} lidera com ${Math.round((ranked[0]?.[1] ?? 0) * 100)}%; ${player.ballotName} tem ${Math.round(mine * 100)}%`,
    category: 'poll',
    sentiment: leader?.id === player.id ? 1 : 0,
  });
  pushAlert(state, {
    kind: 'new_poll',
    severity: 'info',
    title: 'Uma nova pesquisa foi publicada',
    message: `${poll.pollster}: você tem ${Math.round(mine * 100)}% (margem ±${(poll.marginOfError * 100).toFixed(1)} p.p.).`,
    link: 'polls',
  });

  // "Pesquisa mostra mudança entre jovens/aposentados..." — notícia a partir de variação real por grupo.
  if (prev?.byPopType && poll.byPopType) {
    let best: { t: PopTypeId; delta: number } | null = null;
    for (const [t, set] of Object.entries(poll.byPopType) as [
      PopTypeId,
      NonNullable<typeof poll.total>,
    ][]) {
      const before = prev.byPopType[t]?.shares[player.id];
      if (before === undefined) continue;
      const delta = (set.shares[player.id] ?? 0) - before;
      if (!best || Math.abs(delta) > Math.abs(best.delta)) best = { t, delta };
    }
    if (best && Math.abs(best.delta) >= GameConstants.news.pollShiftThreshold) {
      publishNews(state, {
        headline: `Pesquisa mostra ${best.delta > 0 ? 'avanço' : 'queda'} de ${player.ballotName} entre ${POP_TYPES[best.t].plural.toLowerCase()}`,
        category: 'poll',
        sentiment: best.delta > 0 ? 1 : -1,
      });
    }
  }
}

/** Processa o fim de um dia de campanha. */
function campaignDailyTick(state: GameState, rng: Rng, meter: ImpactMeter): void {
  const election = state.election;
  const campaign = state.campaign;
  if (!election || !campaign) return;
  const player = getPlayer(state);
  const snapshot = computeIntentions(state, election, { includeSegments: false });
  const playerShare = snapshot.total.shares[player.id] ?? 0;

  dailyFinance(state, playerShare);
  const groupMoney = interestGroupDonations(state);
  if (groupMoney > 0) earn(state, groupMoney, 'interest_group', 'Apoio de grupos de interesse');
  processAdsDaily(state, rng, meter);
  meter.step('opponents', 'Campanha dos adversários', () =>
    opponentsDailyTick(state, rng, snapshot.total.shares),
  );
  meter.step('airtime', 'Horário eleitoral gratuito', () => freeAirtimeTick(state));

  meter.step('decay', 'Desgaste natural (todos perdem presença e momentum)', () => {
    const presenceDecay =
      C.presenceDecayPerDay * (1 - Math.min(0.7, staffBonus(campaign.staff, 'presenceDecay')));
    for (const id of election.candidateIds) {
      const status = election.participants[id];
      if (status) decayStatus(status, id === player.id ? presenceDecay : C.presenceDecayPerDay);
    }
    player.scandal = clamp(player.scandal - 0.05, 0, 100);
    for (const pop of Object.values(state.population.pops))
      pop.mood *= 1 - GameConstants.population.moodDecayPerDay;
  });
  const regen =
    C.energyRegenPerDay +
    (C.energyRegenOrganizationBonus * player.attributes.organization) / 100 +
    (player.age < C.youngAgeLimit ? C.youngAgeEnergyBonus : 0) +
    staffBonus(campaign.staff, 'energyRegen') * 10;
  campaign.energy = clamp(campaign.energy + regen, 0, C.energyMax);
  const party = getPlayerParty(state);
  const baseline = C.baseEnthusiasm + (party.unity - 60) / 4;
  campaign.enthusiasm = clamp100(
    approach(campaign.enthusiasm, baseline, C.enthusiasmDecayPerDay / 10),
  );
  campaign.militants = Math.max(
    0,
    Math.round(campaign.militants * (1 + (campaign.enthusiasm - 50) / 20000)),
  );

  driftParties(state.parties, rng, 1);
  const status = getPlayerStatus(state);
  if (status) factionReaction(party, status.perceivedIdeology);

  meter.step('event', 'Eventos e efeitos em andamento', () => {
    processModifiers(state);
    // Na véspera da eleição não surgem novos eventos (nada fica pendente por cima da votação).
    if (diffDays(state.date, election.date) > 1) {
      processScheduledEvents(state);
      rollEvent(state, GameConstants.events.dailyChanceCampaign);
    }
  });
  debateInvitationAlerts(state);

  const daysSinceStart = diffDays(election.roundStartDate, state.date);
  if (daysSinceStart > 0 && daysSinceStart % GameConstants.polls.publicIntervalDays === 0) {
    publishPublicPoll(state);
    const unitShares: Record<string, number> = {};
    for (const [unitId, agg] of Object.entries(snapshot.byUnit))
      unitShares[unitId] = agg.shares[player.id] ?? 0;
    campaignAlerts(state, playerShare, unitShares);
    updatePopularity(state, playerShare, snapshot.rejection[player.id] ?? 0);
  }
}

function moveCampaignDay(state: GameState, rng: Rng): Interrupt {
  const election = state.election;
  if (!election) return 'blocked';
  if (state.date >= election.date) {
    state.phase = 'election_day';
    election.status = 'election_day';
    return 'election_day';
  }
  const meter = new ImpactMeter(state);
  campaignDailyTick(state, rng, meter);
  state.date = addDays(state.date, 1);
  if (isMonthStart(state.date)) {
    updateEconomy(state, rng);
    updatePopulationMonthly(state);
  }
  // O que sobrou: menos indecisos com a proximidade da eleição, economia, popularidade, partidos.
  meter.settle('time', 'Passagem do tempo (indecisos, economia, popularidade)');
  if (
    state.settings.weekly &&
    state.date < election.date &&
    diffDays(election.roundStartDate, state.date) % 7 === 0
  ) {
    startWeek(state, rng);
    if (state.campaign?.week?.pending) return 'event';
  }
  if (state.date >= election.date) {
    state.phase = 'election_day';
    election.status = 'election_day';
    publishNews(state, {
      headline: 'Dia de eleição: urnas abertas em todo o território',
      category: 'election',
      importance: 3,
    });
    return 'election_day';
  }
  if (election.debates.some((d) => d.status === 'scheduled' && d.date === state.date))
    return 'debate';
  if (state.events.pending.length > 0 || state.interactions.interview) return 'event';
  return null;
}

function moveGovernmentDay(state: GameState, rng: Rng): Interrupt {
  const gov = state.government;
  if (!gov) return 'blocked';
  state.date = addDays(state.date, 1);
  if (isMonthStart(state.date)) governmentMonthlyTick(state, rng);
  if (!state.government) return 'term_end';
  processLegislatureDay(state, rng);
  if (!state.government) return 'term_end';
  if (state.date >= gov.endDate && !handleTermEnd(state)) {
    endTerm(state);
    return 'term_end';
  }
  if (state.events.pending.length > 0) return 'event';
  if (legislatureBlockingReason(state)) return 'decision';
  return null;
}

/** Avança o tempo no rascunho do estado, dia a dia, parando em interrupções. */
export function advanceTimeDraft(state: GameState, step: TimeStep): AdvanceResult {
  if (blockingReason(state)) return { days: 0, interrupt: 'blocked' };
  let days: number;
  if (state.phase === 'campaign') days = step === 'day' ? 1 : step === 'week' ? 7 : 30;
  else {
    const next = new Date(`${state.date}T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1, 1);
    const toMonthStart = diffDays(state.date, next.toISOString().slice(0, 10));
    days = step === 'day' ? 1 : step === 'week' ? 7 : toMonthStart;
  }
  const start = state.date;
  if (state.phase === 'campaign' && state.campaign?.agenda?.enabled) {
    // A agenda usa o RNG por conta própria (withRng não é reentrante): um dia por vez.
    const agenda: AgendaDayReport[] = [];
    for (let i = 0; i < days; i++) {
      const report = runAgendaDay(state);
      if (report) agenda.push(report);
      const interrupt = withRng(state, (rng) =>
        state.phase === 'campaign' ? moveCampaignDay(state, rng) : moveGovernmentDay(state, rng),
      );
      if (interrupt) return { days: diffDays(start, state.date), interrupt, agenda };
      if (state.phase !== 'campaign') break;
    }
    return { days: diffDays(start, state.date), interrupt: null, agenda };
  }
  return withRng(state, (rng) => {
    for (let i = 0; i < days; i++) {
      const interrupt =
        state.phase === 'campaign' ? moveCampaignDay(state, rng) : moveGovernmentDay(state, rng);
      if (interrupt) return { days: diffDays(start, state.date), interrupt };
    }
    return { days: diffDays(start, state.date), interrupt: null };
  });
}

/** Avança um número exato de dias (usado por ações que consomem tempo). */
export function advanceDaysDraft(state: GameState, days: number): AdvanceResult {
  const start = state.date;
  for (let i = 0; i < days; i++) {
    if (blockingReason(state)) return { days: diffDays(start, state.date), interrupt: 'blocked' };
    const r = withRng(state, (rng) =>
      state.phase === 'campaign' ? moveCampaignDay(state, rng) : moveGovernmentDay(state, rng),
    );
    if (r) return { days: diffDays(start, state.date), interrupt: r };
  }
  return { days: diffDays(start, state.date), interrupt: null };
}
