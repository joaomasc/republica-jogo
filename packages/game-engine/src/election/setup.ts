import { createCampaignState, computeMoneyScale } from '../campaign/finance';
import { generateNpcCandidate, applyParodyPersona } from '../candidate/candidate';
import { GameConstants } from '../config/constants';
import { addDays, diffDays, firstSundayOfOctober, lastSundayOfOctober } from '../core/date';
import { clamp, clamp100, sum } from '../core/math';
import { withRng, type Rng } from '../core/rng';
import type { CandidateId, PartyId, StateId } from '../core/types';
import type { IssueId } from '../ideology/issues';
import { averageIdeology, blendIdeology } from '../ideology/ideology';
import { STATES } from '../map/states';
import { buildUnits } from '../map/units';
import { DEBATE_HOSTS } from '../media/outlets';
import type { Party } from '../parties/types';
import { POP_TYPE_IDS, type PopTypeId } from '../population/popTypes';
import { getDifficulty, getParty, getPlayer, nextId } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { jurisdictionFor, OFFICES, officeSeats, type OfficeId } from './offices';
import type { CampaignStatus, Election, ElectoralUnit, ScheduledDebate } from './types';
import { pickParodyPolitician } from '../world/parody';
import { governingPartyFor } from './voterModel';

const C = GameConstants;

export interface ElectionSetup {
  officeId: OfficeId;
  stateId: StateId;
  /** Cidade nas eleições municipais (código IBGE); ausente = capital. */
  cityId?: string | null;
  year: number;
  /** O jogador disputa a reeleição. */
  playerIncumbent?: boolean;
  campaignDays?: number;
  startingMoney?: number;
}

function emptyPopRecord(value = 0): Record<PopTypeId, number> {
  const out = {} as Record<PopTypeId, number>;
  for (const t of POP_TYPE_IDS) out[t] = value;
  return out;
}

function localStrength(state: GameState, party: Party, stateId: StateId | null): number {
  const popularity = Math.max(2, party.popularity);
  if (!stateId) return popularity * (0.5 + party.influence / 100);
  const strength = state.regions[stateId]?.partyStrength[party.id] ?? 50;
  return popularity * (strength / 50) * (0.5 + party.influence / 100);
}

function initialKnowledge(
  rng: Rng,
  fame: number,
  homeStateId: StateId,
  units: ElectoralUnit[],
  isPlayer: boolean,
  jurisdictionState: StateId | null,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const unit of units) {
    let base: number;
    if (unit.kind === 'state') {
      const sameState = unit.stateId === homeStateId;
      const sameRegion = STATES[unit.stateId].region === STATES[homeStateId].region;
      base =
        fame * (sameState ? 1.35 : sameRegion ? 1 : 0.75) +
        (sameState && isPlayer ? C.campaign.knowledgeHomeStateBonus : 0);
    } else {
      // Em disputas estaduais/municipais o conhecimento de partida é a própria fama (sem bônus de casa).
      const local = jurisdictionState === homeStateId;
      base = isPlayer ? fame * (local ? 1 : 0.6) : fame;
    }
    out[unit.id] = clamp(base * rng.range(0.85, 1.15), 2, 95);
  }
  return out;
}

function buildStatus(
  state: GameState,
  rng: Rng,
  candidateId: CandidateId,
  units: ElectoralUnit[],
  jurisdictionState: StateId | null,
  isIncumbent: boolean,
  money: number,
): CampaignStatus {
  const cand = state.candidates[candidateId];
  if (!cand) throw new Error(`Candidato inexistente: ${candidateId}`);
  const party = getParty(state, cand.partyId);
  const issueFocus: Partial<Record<IssueId, number>> = {};
  for (const issue of party.priorities) issueFocus[issue] = 30;
  const presence: Record<string, number> = {};
  for (const unit of units) {
    const home = unit.stateId === cand.homeStateId;
    presence[unit.id] = isIncumbent ? 20 : home ? (cand.isPlayer ? 10 : rng.range(5, 15)) : 0;
  }
  const focusUnits = rng
    .shuffle(units)
    .sort((a, b) => b.voters - a.voters)
    .slice(0, Math.max(2, Math.ceil(units.length / 3)))
    .map((u) => u.id);
  return {
    candidateId,
    partyId: cand.partyId,
    knowledge: initialKnowledge(
      rng,
      cand.fame,
      cand.homeStateId,
      units,
      cand.isPlayer,
      jurisdictionState,
    ),
    presence,
    regionalMomentum: Object.fromEntries(units.map((u) => [u.id, 0])),
    popMomentum: emptyPopRecord(),
    perceivedIdeology: blendIdeology(cand.ideology, party.ideology, 0.4),
    issueFocus,
    rejectionMod: 0,
    debateScore: 0,
    money,
    isIncumbent,
    aggressiveness: rng.range(0.2, 0.8),
    focusUnits,
    eliminated: false,
  };
}

function pickOpponentParties(
  state: GameState,
  rng: Rng,
  count: number,
  exclude: PartyId[],
  stateId: StateId | null,
  mustInclude: PartyId[],
): PartyId[] {
  const chosen: PartyId[] = [];
  for (const id of mustInclude)
    if (chosen.length < count && !exclude.includes(id) && !chosen.includes(id) && state.parties[id])
      chosen.push(id);
  const pool = Object.values(state.parties).filter(
    (p) => !exclude.includes(p.id) && !chosen.includes(p.id),
  );
  while (chosen.length < count && pool.length > 0) {
    const pick = rng.weightedPick(pool, (p) => localStrength(state, p, stateId) ** 1.3);
    if (!pick) break;
    chosen.push(pick.id);
    pool.splice(pool.indexOf(pick), 1);
  }
  return chosen;
}

function scheduleDebates(
  state: GameState,
  electionDate: string,
  startDate: string,
  round: 1 | 2,
): ScheduledDebate[] {
  const days = round === 1 ? C.election.debateDaysBefore : C.election.runoffDebateDaysBefore;
  return days
    .map((d, i) => ({ date: addDays(electionDate, -d), i }))
    .filter((d) => d.date > startDate)
    .map((d) => ({
      id: nextId(state, 'deb'),
      date: d.date,
      round,
      host: DEBATE_HOSTS[d.i % DEBATE_HOSTS.length] ?? 'TV Horizonte',
      status: 'scheduled' as const,
      participantIds: [],
    }));
}

/** Remove candidatos NPC de eleições passadas (mantém o jogador). */
function pruneCandidates(state: GameState): void {
  for (const [id, cand] of Object.entries(state.candidates)) {
    if (cand.isPlayer) continue;
    delete state.candidates[id];
    for (const party of Object.values(state.parties))
      party.candidateIds = party.candidateIds.filter((c) => c !== id);
  }
}

/** Monta uma nova eleição e a campanha do jogador. Muta o estado (rascunho). */
export function setupElection(state: GameState, setup: ElectionSetup): Election {
  const office = OFFICES[setup.officeId];
  const player = getPlayer(state);
  const jurisdiction = jurisdictionFor(setup.officeId, setup.stateId, setup.cityId);
  const electionDate = firstSundayOfOctober(setup.year);
  const campaignDays = setup.campaignDays ?? office.campaignDays;
  const startDate = addDays(electionDate, -campaignDays);
  const diff = getDifficulty(state);

  pruneCandidates(state);

  return withRng(state, (rng) => {
    const units = buildUnits(
      state.population,
      setup.officeId,
      setup.stateId,
      rng,
      jurisdiction.cityId,
    );
    const totalVoters = sum(units.map((u) => u.voters));
    const moneyScale = computeMoneyScale(setup.officeId, totalVoters);
    const proportional = office.system === 'proportional';

    // Esboço de eleição para calcular o partido governante (voto retrospectivo).
    const draft = { officeId: setup.officeId, jurisdiction } as Election;
    const governingParty = governingPartyFor(state, draft);

    const candidateIds: CandidateId[] = [player.id];
    const opponentPlan: { partyId: PartyId; incumbent: boolean }[] = [];
    if (proportional) {
      const P = C.election.proportional;
      for (let i = 0; i < P.notableFromPlayerParty; i++)
        opponentPlan.push({ partyId: player.partyId, incumbent: rng.chance(0.4) });
      const others = pickOpponentParties(
        state,
        rng,
        P.notableCandidates - P.notableFromPlayerParty,
        [],
        jurisdiction.stateId,
        [],
      );
      for (const p of others) opponentPlan.push({ partyId: p, incumbent: rng.chance(0.35) });
    } else {
      const count = Math.max(2, office.opponents + rng.int(-1, 1));
      const incumbentParty = setup.playerIncumbent ? null : governingParty;
      // A maior força de oposição sempre lança nome (com 30 partidos, o sorteio a diluiria).
      const mainOpposition = Object.values(state.parties)
        .filter((p) => p.id !== player.partyId && p.id !== incumbentParty)
        .sort(
          (a, b) =>
            localStrength(state, b, jurisdiction.stateId) -
            localStrength(state, a, jurisdiction.stateId),
        )[0]?.id;
      const parties = pickOpponentParties(
        state,
        rng,
        count,
        [player.partyId],
        jurisdiction.stateId,
        [incumbentParty, mainOpposition].filter((id): id is PartyId => !!id),
      );
      for (const p of parties)
        opponentPlan.push({
          partyId: p,
          incumbent: !setup.playerIncumbent && p === governingParty && rng.chance(0.65),
        });
    }

    // Camadas: os dois partidos mais fortes lançam favoritos; os demais, candidaturas menores.
    const O = C.opponents;
    const ranked = [...new Set(opponentPlan.map((p) => p.partyId))].sort(
      (a, b) =>
        localStrength(state, getParty(state, b), jurisdiction.stateId) -
        localStrength(state, getParty(state, a), jurisdiction.stateId),
    );
    const favorites = new Set(ranked.slice(0, proportional ? 3 : 2));

    const participants: Record<CandidateId, CampaignStatus> = {};
    const usedParody = new Set<string>();
    for (const plan of opponentPlan) {
      const party = getParty(state, plan.partyId);
      const id = nextId(state, 'cand');
      const persona =
        state.settings.world === 'parody'
          ? pickParodyPolitician(party.id, setup.officeId, jurisdiction.stateId, usedParody)
          : null;
      if (persona) usedParody.add(persona.key);
      const home =
        persona?.homeStateId ??
        jurisdiction.stateId ??
        rng.weightedPick(
          Object.values(STATES),
          (s) => s.population * ((state.regions[s.id]?.partyStrength[party.id] ?? 50) / 50),
        )?.id ??
        'SP';
      // Nas proporcionais, os nomes individualizados são "puxadores de voto" (celebridades locais).
      const favorite = proportional || favorites.has(plan.partyId);
      const tier = favorite ? O.favoriteStrength : O.minorStrength;
      const strength =
        diff.opponentStrength * rng.range(0.9, 1.1) * tier * (plan.incumbent ? 1.08 : 1);
      const fame = proportional
        ? rng.range(O.notableFameMin, O.notableFameMax)
        : plan.incumbent
          ? O.startingKnowledgeIncumbent
          : favorite
            ? rng.range(O.favoriteFameMin, O.favoriteFameMax)
            : rng.range(O.minorFameMin, O.minorFameMax);
      const generated = generateNpcCandidate(rng, {
        id,
        party,
        homeStateId: home,
        strength,
        incumbentOffice: plan.incumbent ? setup.officeId : null,
        fame,
      });
      const npc = persona ? applyParodyPersona(generated, persona, party) : generated;
      state.candidates[id] = npc;
      party.candidateIds.push(id);
      candidateIds.push(id);
      const money =
        C.campaign.baseStartingMoney * moneyScale * strength * (0.55 + party.money / 100);
      participants[id] = buildStatus(
        state,
        rng,
        id,
        units,
        jurisdiction.stateId,
        plan.incumbent,
        money,
      );
    }
    participants[player.id] = buildStatus(
      state,
      rng,
      player.id,
      units,
      jurisdiction.stateId,
      !!setup.playerIncumbent,
      0,
    );
    const playerParty = getParty(state, player.partyId);
    if (!playerParty.candidateIds.includes(player.id)) playerParty.candidateIds.push(player.id);

    const electorateIdeology = averageIdeology(
      units.flatMap((u) =>
        u.pops.map((p) => ({
          ideology: state.population.pops[p.popId]?.ideology ?? player.ideology,
          weight: p.voters,
        })),
      ),
    );

    const election: Election = {
      id: nextId(state, 'elec'),
      officeId: setup.officeId,
      year: setup.year,
      jurisdiction,
      round: 1,
      startDate,
      date: electionDate,
      firstRoundDate: electionDate,
      campaignDays,
      roundStartDate: startDate,
      units,
      totalVoters,
      candidateIds,
      participants,
      polls: [],
      debates: proportional ? [] : scheduleDebates(state, electionDate, startDate, 1),
      results: [],
      seats: proportional ? officeSeats(setup.officeId, setup.stateId, jurisdiction.cityId) : 1,
      status: 'campaign',
      outcome: null,
      electorateIdeology,
    };
    state.election = election;
    state.date = startDate;
    state.phase = 'campaign';
    state.campaign = createCampaignState(state, moneyScale, setup.startingMoney);
    state.campaign.enthusiasm = clamp100(C.campaign.baseEnthusiasm + (playerParty.unity - 60) / 4);
    state.interactions = { debate: null, interview: null };
    return election;
  });
}

/** Prepara o 2º turno entre os dois mais votados. */
export function setupRunoff(state: GameState, finalists: [CandidateId, CandidateId]): void {
  const election = state.election;
  if (!election) return;
  const runoffDate = lastSundayOfOctober(election.year);
  const date =
    diffDays(election.date, runoffDate) >= 14
      ? runoffDate
      : addDays(election.date, C.election.runoffDays);
  for (const id of election.candidateIds) {
    const status = election.participants[id];
    if (status && !finalists.includes(id)) status.eliminated = true;
  }
  election.candidateIds = [...finalists];
  election.round = 2;
  election.roundStartDate = addDays(election.date, 1);
  election.date = date;
  election.campaignDays = diffDays(election.roundStartDate, date);
  election.status = 'campaign';
  election.debates.push(...scheduleDebates(state, date, election.roundStartDate, 2));
  state.date = election.roundStartDate;
  state.phase = 'campaign';
  if (state.campaign) {
    state.campaign.energy = C.campaign.energyMax;
    state.campaign.enthusiasm = clamp100(state.campaign.enthusiasm + 10);
  }
}
