import { beginWeek } from '../campaign/weekly';
import { GameConstants } from '../config/constants';
import { addDays, addMonths, diffDays, firstSundayOfOctober, makeDate, yearOf } from '../core/date';
import { clamp, clamp100 } from '../core/math';
import { hashSeed, Rng, withRng } from '../core/rng';
import { STATE_IDS, type ActionResult, type PartyId, type StateId } from '../core/types';
import { updateEconomy } from '../economy/economy';
import { nextElectionYear, OFFICE_LIST, OFFICES, type OfficeId } from '../election/offices';
import { addPoll, createPoll, pickPollster } from '../election/polls';
import { setupElection } from '../election/setup';
import { addHistory } from '../history/history';
import { rollCityMayors } from '../map/cities';
import { publishNews } from '../media/news';
import {
  createPartyFromInput,
  driftParties,
  partyCompatibility,
  validatePartyInput,
  type CreatePartyInput,
} from '../parties/parties';
import { refreshPartyAffinities } from '../population/population';
import { updatePopulationMonthly } from '../population/satisfaction';
import { getPlayer, getPlayerParty } from '../simulation/access';
import type { GameState } from '../simulation/state';

const K = GameConstants.career;

export interface CareerOption {
  officeId: OfficeId;
  year: number;
  campaignStart: string;
  eligible: boolean;
  reason?: string;
  reelection: boolean;
}

function campaignStartFor(officeId: OfficeId, year: number): string {
  return addDays(firstSundayOfOctober(year), -OFFICES[officeId].campaignDays);
}

/** Próximo ano em que é possível concorrer ao cargo (campanha começando hoje ou depois). */
export function nextAvailableElection(state: GameState, officeId: OfficeId): number {
  let year = nextElectionYear(officeId, yearOf(state.date));
  while (campaignStartFor(officeId, year) < state.date) year += 4;
  return year;
}

export function careerOptions(state: GameState): CareerOption[] {
  const player = getPlayer(state);
  const evaluation = state.career.lastEvaluation;
  return OFFICE_LIST.map((office) => {
    const year = nextAvailableElection(state, office.id);
    const ageThen = player.age + (year - yearOf(state.date));
    const reelection =
      state.career.lastOfficeId === office.id && !!evaluation && evaluation.officeId === office.id;
    let reason: string | undefined;
    if (ageThen < office.minAge) reason = `Idade mínima: ${office.minAge} anos`;
    if (reelection && !evaluation.canRunForReelection)
      reason = 'Limite de mandatos consecutivos atingido';
    return {
      officeId: office.id,
      year,
      campaignStart: campaignStartFor(office.id, year),
      eligible: !reason,
      ...(reason ? { reason } : {}),
      reelection,
    };
  });
}

/** Ao passar por datas de eleição sem o jogador, os NPCs mudam quem governa. */
function rollLandscape(state: GameState, rng: Rng, kind: 'general' | 'municipal'): void {
  const parties = Object.values(state.parties);
  const pick = (weight: (p: (typeof parties)[number]) => number): PartyId =>
    rng.weightedPick(parties, weight)?.id ?? parties[0]?.id ?? '';
  if (kind === 'general') {
    state.landscape.presidentPartyId = pick((p) => (p.popularity * (0.5 + p.influence / 100)) ** 2);
    for (const id of STATE_IDS)
      state.landscape.governors[id] = pick(
        (p) => (p.popularity * ((state.regions[id]?.partyStrength[p.id] ?? 50) / 50)) ** 2,
      );
  } else {
    for (const id of STATE_IDS)
      state.landscape.mayors[id] = pick(
        (p) => (p.popularity * ((state.regions[id]?.partyStrength[p.id] ?? 50) / 50)) ** 2,
      );
    state.landscape.cityMayors = rollCityMayors(
      state,
      new Rng(hashSeed(state.meta.seed, 'city-mayors', state.date)),
    );
  }
}

/** Avança o calendário mês a mês até a data indicada (anos passam, o mundo continua). */
export function fastForward(state: GameState, toDate: string): void {
  if (toDate <= state.date) return;
  const player = getPlayer(state);
  const startYear = yearOf(state.date);
  withRng(state, (rng) => {
    let guard = 0;
    while (state.date < toDate && guard++ < 240) {
      const next = addMonths(state.date, 1);
      const before = state.date;
      state.date = next > toDate ? toDate : next;
      updateEconomy(state, rng);
      updatePopulationMonthly(state);
      driftParties(state.parties, rng, 30);
      player.scandal = clamp(player.scandal * 0.92, 0, 100);
      const y = yearOf(state.date);
      const generalDate = firstSundayOfOctober(y);
      if (before < generalDate && state.date >= generalDate)
        rollLandscape(state, rng, (y - 2026) % 4 === 0 ? 'general' : 'municipal');
    }
    refreshPartyAffinities(state.population, state.regions, state.parties, 0.5);
  });
  const years = yearOf(state.date) - startYear;
  if (years > 0) {
    player.age += years;
    player.fame = clamp100(player.fame - K.fameDecayPerYearOutOfOffice * years);
  }
}

export function runForOffice(
  state: GameState,
  officeId: OfficeId,
  stateId: StateId,
  cityId?: string | null,
): ActionResult {
  if (state.phase !== 'career')
    return {
      ok: false,
      message: 'Escolha uma nova candidatura ao fim do mandato ou após uma eleição.',
    };
  const option = careerOptions(state).find((o) => o.officeId === officeId);
  if (!option || !option.eligible)
    return { ok: false, message: option?.reason ?? 'Candidatura indisponível.' };
  const evaluation = state.career.lastEvaluation;
  const sameJurisdiction = state.career.offices.at(-1)?.jurisdictionLabel;
  fastForward(state, option.campaignStart);
  setupElection(state, {
    officeId,
    stateId,
    cityId: cityId ?? null,
    year: option.year,
    playerIncumbent: option.reelection && !!evaluation,
  });
  const election = state.election;
  if (election && option.reelection && sameJurisdiction !== election.jurisdiction.label) {
    const status = election.participants[state.playerId];
    if (status) status.isIncumbent = false;
  }
  addPoll(state, createPoll(state, { kind: 'public', pollster: pickPollster(state) }));
  beginWeek(state);
  const player = getPlayer(state);
  const office = OFFICES[officeId];
  addHistory(state, {
    kind: 'career',
    title: `Candidatura a ${office.name} (${election?.jurisdiction.label ?? ''})`,
    importance: 2,
  });
  publishNews(state, {
    headline: `${player.ballotName} lança candidatura a ${office.name.toLowerCase()}`,
    category: 'campaign',
    importance: 2,
  });
  return { ok: true, message: `Campanha para ${office.name} começou!` };
}

export function switchParty(state: GameState, partyId: PartyId): ActionResult {
  if (state.phase !== 'career')
    return { ok: false, message: 'Só é possível trocar de partido fora de campanha e de mandato.' };
  const player = getPlayer(state);
  const target = state.parties[partyId];
  if (!target || partyId === player.partyId) return { ok: false, message: 'Partido inválido.' };
  const old = getPlayerParty(state);
  old.candidateIds = old.candidateIds.filter((id) => id !== player.id);
  target.candidateIds.push(player.id);
  player.partyId = partyId;
  player.attributes.credibility = clamp100(
    player.attributes.credibility + K.credibilityPartySwitch,
  );
  state.career.partyHistory.push({ partyId, from: state.date });
  addHistory(state, {
    kind: 'party_switch',
    title: `Deixa o ${old.acronym} e se filia ao ${target.acronym}`,
    importance: 2,
    sentiment: 0,
  });
  publishNews(state, {
    headline: `${player.ballotName} troca o ${old.acronym} pelo ${target.acronym}`,
    category: 'party',
    importance: 2,
  });
  return {
    ok: true,
    message: `Filiado(a) ao ${target.acronym}. Compatibilidade: ${partyCompatibility(player.ideology, target)}%.`,
  };
}

export function foundParty(state: GameState, input: CreatePartyInput): ActionResult {
  if (state.phase !== 'career')
    return { ok: false, message: 'Funde um partido fora de campanha e de mandato.' };
  const error = validatePartyInput(input, state.parties);
  if (error) return { ok: false, message: error };
  const id = `player_${state.idCounter + 1}`;
  state.idCounter += 1;
  const party = createPartyFromInput(input, id);
  state.parties[id] = party;
  const home = getPlayer(state).homeStateId;
  for (const region of Object.values(state.regions))
    region.partyStrength[id] = region.id === home ? 45 : 18;
  refreshPartyAffinities(state.population, state.regions, state.parties, 1);
  const result = switchParty(state, id);
  addHistory(state, {
    kind: 'party_founded',
    title: `Funda o ${party.name} (${party.acronym})`,
    importance: 3,
    sentiment: 1,
  });
  return { ok: result.ok, message: `Partido ${party.acronym} fundado!` };
}

export function retire(state: GameState): ActionResult {
  if (state.phase !== 'career')
    return { ok: false, message: 'Aposentadoria só fora de campanha e de mandato.' };
  state.phase = 'retired';
  state.career.retired = true;
  const player = getPlayer(state);
  addHistory(state, {
    kind: 'career',
    title: `${player.ballotName} se aposenta da política`,
    importance: 3,
  });
  publishNews(state, {
    headline: `${player.ballotName} anuncia aposentadoria da vida pública`,
    category: 'party',
    importance: 3,
  });
  return { ok: true, message: 'Uma carreira chega ao fim.' };
}

/** Passa um ano longe da política (a fama cai, a vida segue). */
export function takeBreak(state: GameState): ActionResult {
  if (state.phase !== 'career') return { ok: false, message: 'Indisponível agora.' };
  fastForward(state, makeDate(yearOf(state.date) + 1, 1, 15));
  return { ok: true, message: `O tempo passou: agora é ${yearOf(state.date)}.` };
}

export function daysUntil(state: GameState, date: string): number {
  return diffDays(state.date, date);
}
