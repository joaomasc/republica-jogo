import { randomName } from '../candidate/names';
import { clamp, round, sigmoid } from '../core/math';
import { makeDate, yearOf } from '../core/date';
import type { Rng } from '../core/rng';
import type { ActionResult, IsoDate, PartyId } from '../core/types';
import { ideologyAffinity } from '../ideology/ideology';
import { getLawOption } from '../laws/laws.data';
import type { Bill, RelatorInfo } from '../laws/types';
import { getPlayer } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { LegislatureConstants as LC } from './constants';
import {
  baselineOptionId,
  chamberById,
  chamberName,
  currentChamberId,
  executiveInfo,
  governmentCoalition,
  isExecutiveBill,
  isPlayerBill,
  legAlert,
  legLog,
  legNews,
  legRng,
  memberPrefix,
  playerChamberId,
} from './context';
import type { ChamberLeadership } from './types';
import { billPartyLogit, ideologicalGain, partyPragmatism, voteContext } from './voting';

/**
 * Mesas diretoras (seção 5.4): o presidente de cada casa controla a pauta e designa relatores.
 * Eleição em 1º de fevereiro dos anos ímpares; o jogador parlamentar pode concorrer e o jogador
 * Executivo pode apoiar um aliado.
 */

/** Próximo 1º de fevereiro de ano ímpar, estritamente depois de `date`. */
export function nextLeadershipElection(date: IsoDate): IsoDate {
  let year = yearOf(date);
  let d = makeDate(year, 2, 1);
  while (d <= date || year % 2 === 0) {
    year += 1;
    d = makeDate(year, 2, 1);
  }
  return d;
}

/** Relação "natural" do presidente de um partido com o jogador. */
export function initialSpeakerRelation(state: GameState, partyId: PartyId): number {
  const player = state.candidates[state.playerId];
  const own = player ? state.parties[player.partyId] : undefined;
  const sp = state.parties[partyId];
  if (!player || !own || !sp) return 0;
  let base =
    partyId === own.id ? 50 : clamp((ideologyAffinity(own.ideology, sp.ideology) - 0.65) * 160, -60, 40);
  const exec = executiveInfo(state);
  const coalition = governmentCoalition(state);
  if (exec.isPlayer && coalition.includes(partyId) && partyId !== own.id) base += 20;
  else if (!exec.isPlayer && coalition.includes(partyId) && coalition.includes(own.id)) base += 10;
  return round(clamp(base, -100, 100), 1);
}

/** Peso de um partido na disputa pela presidência da casa (grande e pragmático). */
function speakerWeight(state: GameState, partyId: PartyId, seats: number): number {
  const party = state.parties[partyId];
  if (!party || seats <= 0) return 0;
  const coalition = governmentCoalition(state);
  return seats ** 1.2 * (0.3 + partyPragmatism(party)) ** 2 * (coalition.includes(partyId) ? 1.3 : 1);
}

function npcSpeakerName(rng: Rng, chamberId: string): string {
  const n = randomName(rng, rng.chance(0.5) ? 'male' : 'female');
  return `${memberPrefix(chamberId)} ${n.firstName} ${n.lastName}`;
}

/** Monta as mesas das casas atuais (presidente NPC de partido grande/pragmático). */
export function initLeadership(state: GameState, rng: Rng): void {
  const leg = state.legislature;
  const next: Record<string, ChamberLeadership> = {};
  for (const chamber of state.congress.chambers) {
    const entries = Object.entries(chamber.seats).filter(([, s]) => s > 0);
    const pick =
      rng.weightedPick(entries, ([pid, seats]) => speakerWeight(state, pid, seats))?.[0] ??
      entries.sort((a, b) => b[1] - a[1])[0]?.[0] ??
      state.landscape.presidentPartyId;
    next[chamber.id] = {
      chamberId: chamber.id,
      presidentName: npcSpeakerName(rng, chamber.id),
      presidentPartyId: pick,
      relation: initialSpeakerRelation(state, pick),
      nextElection: nextLeadershipElection(state.date),
      isPlayer: false,
      playerCandidate: false,
      backedPartyId: null,
      lastElection: state.date,
    };
  }
  leg.leadership = next;
}

/** Relações com as mesas voltam devagar ao "natural". */
export function driftLeadership(state: GameState): void {
  for (const lead of Object.values(state.legislature.leadership)) {
    if (lead.isPlayer) {
      lead.relation = 100;
      continue;
    }
    const target = initialSpeakerRelation(state, lead.presidentPartyId);
    lead.relation = round(lead.relation + (target - lead.relation) * LC.speakerRelationDrift, 2);
  }
}

/** Eleição da mesa (1º de fevereiro dos anos ímpares). */
export function holdLeadershipElection(state: GameState, chamberId: string): void {
  const chamber = chamberById(state, chamberId);
  const lead = state.legislature.leadership[chamberId];
  if (!chamber || !lead) return;
  const rng = legRng(state, 'speaker', chamberId);
  const player = getPlayer(state);
  const playerRuns = !!lead.playerCandidate && playerChamberId(state) === chamberId;
  const coalition = governmentCoalition(state);
  const exec = executiveInfo(state);
  const parties = Object.entries(chamber.seats).filter(([, s]) => s > 0);
  const npc = [...parties]
    .sort((a, b) => speakerWeight(state, b[0], b[1]) - speakerWeight(state, a[0], a[1]))
    .slice(0, LC.speakerCandidates)
    .map(([pid]) => pid);
  const candidates: { key: string; partyId: PartyId; isPlayer: boolean }[] = npc.map((pid) => ({
    key: pid,
    partyId: pid,
    isPlayer: false,
  }));
  if (playerRuns) candidates.push({ key: 'player', partyId: player.partyId, isPlayer: true });
  const votes: Record<string, number> = {};
  for (const [pid, seats] of parties) {
    const voter = state.parties[pid];
    if (!voter) continue;
    const utils = candidates.map((c) => {
      const cand = state.parties[c.partyId];
      let u = cand ? 3 * ideologyAffinity(voter.ideology, cand.ideology) : 0;
      if (c.partyId === pid) u += 1.5;
      if (c.isPlayer) {
        u += (state.congress.relations[pid] ?? 0) * 0.015;
        u += (player.attributes.leadership - 50) * 0.01;
        u += (player.attributes.negotiation - 50) * 0.01;
      } else if (
        exec.isPlayer &&
        lead.backedPartyId &&
        c.partyId === lead.backedPartyId &&
        coalition.includes(pid)
      )
        u += LC.speakerBackLogit;
      return u + rng.normal(0, LC.speakerElectionNoiseSd);
    });
    const max = Math.max(...utils);
    const exps = utils.map((u) => Math.exp((u - max) * 2));
    const sumExp = exps.reduce((a, b) => a + b, 0) || 1;
    candidates.forEach((c, i) => {
      votes[c.key] = (votes[c.key] ?? 0) + (seats * (exps[i] ?? 0)) / sumExp;
    });
  }
  const winner = [...candidates].sort((a, b) => (votes[b.key] ?? 0) - (votes[a.key] ?? 0))[0];
  const backed = lead.backedPartyId ?? null;
  const name = chamberName(state, chamberId);
  if (winner?.isPlayer) {
    lead.isPlayer = true;
    lead.presidentName = player.ballotName;
    lead.presidentPartyId = player.partyId;
    lead.relation = 100;
    legLog(state, `Você é eleito(a) presidente da ${name}.`, 'good');
    legNews(
      state,
      {
        headline: `${player.ballotName} é eleito(a) presidente da ${name}`,
        category: 'congress',
        sentiment: 1,
        importance: 3,
      },
      `speaker:${chamberId}`,
    );
  } else {
    const partyId = winner?.partyId ?? lead.presidentPartyId;
    const party = state.parties[partyId];
    lead.isPlayer = false;
    lead.presidentPartyId = partyId;
    lead.presidentName = npcSpeakerName(rng, chamberId);
    lead.relation = initialSpeakerRelation(state, partyId);
    if (exec.isPlayer && backed && backed === partyId) lead.relation += LC.speakerBackedRelation;
    if (playerRuns) lead.relation -= 10;
    lead.relation = round(clamp(lead.relation, -100, 100), 1);
    legLog(
      state,
      `${lead.presidentName} (${party?.acronym ?? partyId}) é eleito(a) presidente da ${name}.`,
      'info',
    );
    legNews(
      state,
      {
        headline: `${lead.presidentName} (${party?.acronym ?? partyId}) assume a presidência da ${name}`,
        category: 'congress',
        sentiment: playerRuns ? -1 : 0,
        importance: 2,
      },
      `speaker:${chamberId}`,
    );
  }
  if (playerRuns || backed)
    legAlert(state, {
      kind: 'speaker_election',
      severity: winner?.isPlayer || (backed && winner?.partyId === backed) ? 'success' : 'warning',
      title: `Eleição da mesa: ${name}`,
      message: winner?.isPlayer
        ? 'Você preside a casa e controla a pauta.'
        : `${lead.presidentName} venceu a eleição.`,
      link: 'congress',
    });
  lead.playerCandidate = false;
  lead.backedPartyId = null;
  lead.lastElection = state.date;
  lead.nextElection = nextLeadershipElection(state.date);
}

/** Candidatura do jogador parlamentar ou apoio do Executivo jogador a um aliado. */
export function runForSpeakerAction(state: GameState, chamberId: string): ActionResult {
  const gov = state.government;
  const lead = state.legislature.leadership[chamberId];
  if (!gov || !lead) return { ok: false, message: 'Casa legislativa não encontrada.' };
  const name = chamberName(state, chamberId);
  if (gov.branch === 'legislative') {
    if (playerChamberId(state) !== chamberId)
      return { ok: false, message: `Você não é membro da ${name}.` };
    if (lead.isPlayer) return { ok: false, message: `Você já preside a ${name}.` };
    if (lead.playerCandidate) return { ok: false, message: 'Sua candidatura já está registrada.' };
    if (gov.politicalCapital < LC.speakerRunCapital)
      return { ok: false, message: 'Capital político insuficiente.' };
    gov.politicalCapital -= LC.speakerRunCapital;
    lead.playerCandidate = true;
    legLog(state, `Você lança candidatura à presidência da ${name}.`, 'info');
    return {
      ok: true,
      message: `Candidatura registrada. A eleição da mesa é em ${lead.nextElection}.`,
    };
  }
  const coalition = state.congress.coalition;
  const chamber = chamberById(state, chamberId);
  const ally = Object.entries(chamber?.seats ?? {})
    .filter(([pid, seats]) => seats > 0 && coalition.includes(pid))
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!ally) return { ok: false, message: 'Sua base não tem um nome viável nesta casa.' };
  if (lead.backedPartyId) return { ok: false, message: 'O governo já apoia um candidato.' };
  if (gov.politicalCapital < LC.speakerSupportCapital)
    return { ok: false, message: 'Capital político insuficiente.' };
  gov.politicalCapital -= LC.speakerSupportCapital;
  lead.backedPartyId = ally;
  const acronym = state.parties[ally]?.acronym ?? ally;
  legLog(state, `O governo apoia o candidato do ${acronym} à presidência da ${name}.`, 'info');
  return {
    ok: true,
    message: `O governo vai apoiar o candidato do ${acronym} na eleição de ${lead.nextElection}.`,
  };
}

/** Postura do presidente da casa diante da proposição (−100 hostil .. 100 aliado). */
export function speakerStance(state: GameState, bill: Bill, chamberId: string): number {
  const lead = state.legislature.leadership[chamberId];
  const option = getLawOption(bill.categoryId, bill.optionId);
  const currentId = baselineOptionId(state, bill);
  const current = currentId ? getLawOption(bill.categoryId, currentId) : undefined;
  if (!lead || !option) return 0;
  const playerBill = isPlayerBill(state, bill);
  if (lead.isPlayer) {
    if (playerBill) return 100;
    const player = getPlayer(state);
    return clamp(
      ideologicalGain(player.ideology, option, current) * LC.speakerIdeologyWeight,
      -100,
      100,
    );
  }
  const sp = state.parties[lead.presidentPartyId];
  if (!sp) return playerBill ? lead.relation : 0;
  const ideol = ideologicalGain(sp.ideology, option, current) * LC.speakerIdeologyWeight;
  if (playerBill) return clamp(lead.relation + ideol * 0.5, -100, 100);
  const author = bill.authorPartyId ? state.parties[bill.authorPartyId] : undefined;
  let base = author
    ? author.id === sp.id
      ? 40
      : (ideologyAffinity(sp.ideology, author.ideology) - 0.65) * 160
    : 0;
  if (isExecutiveBill(bill)) base += governmentCoalition(state).includes(sp.id) ? 25 : -10;
  return clamp(base + ideol, -100, 100);
}

/** Quando o presidente da casa pauta a proposição (ou se a engaveta). */
export function agendaPlan(
  state: GameState,
  bill: Bill,
  chamberId: string,
): { days: number; shelve: boolean; stance: number } {
  const lead = state.legislature.leadership[chamberId];
  const stance = speakerStance(state, bill, chamberId);
  if (lead?.isPlayer && isPlayerBill(state, bill)) return { days: 1, shelve: false, stance };
  if (bill.urgency || bill.rushed)
    return { days: LC.agendaUrgentDays, shelve: false, stance };
  let days = Math.round(
    LC.agendaBaseDays * (1 - clamp(stance, 0, 100) / 200) +
      (Math.max(0, -stance) / 100) * LC.agendaHostilityDays,
  );
  if (bill.agendaDeal) days = Math.min(days, LC.agendaDealDays);
  const shelve = stance < LC.shelveRelation && !bill.agendaDeal && bill.instrument !== 'mp';
  return { days: Math.max(1, days), shelve, stance };
}

/** O presidente da casa designa o relator (o jogador, se tiver boa relação e sorte). */
export function designateRelator(state: GameState, bill: Bill, rng: Rng): RelatorInfo | null {
  const chamberId = currentChamberId(bill);
  const chamber = chamberId ? chamberById(state, chamberId) : undefined;
  if (!chamberId || !chamber) return null;
  const lead = state.legislature.leadership[chamberId];
  const player = state.candidates[state.playerId];
  const mine = playerChamberId(state) === chamberId;
  if (
    mine &&
    player &&
    !isPlayerBill(state, bill) &&
    lead &&
    (lead.isPlayer || lead.relation >= LC.relatorPlayerMinRelation) &&
    rng.chance(LC.relatorPlayerChance)
  ) {
    bill.relator = {
      name: player.ballotName,
      partyId: player.partyId,
      report: 'pending',
      chamberId,
      isPlayer: true,
    };
    legAlert(state, {
      kind: 'relator',
      severity: 'info',
      title: 'Você foi designado(a) relator(a)',
      message: `Apresente o parecer sobre ${bill.number} até ${bill.nextDate}.`,
      link: 'congress',
    });
    return bill.relator;
  }
  const stance = speakerStance(state, bill, chamberId);
  const sign = stance >= 0 ? 1 : -1;
  const ctx = voteContext(state, bill);
  const entries = Object.entries(chamber.seats).filter(([pid, s]) => s > 0 && state.parties[pid]);
  const pick = rng.weightedPick(entries, ([pid, seats]) => {
    const party = state.parties[pid];
    const logit = party ? clamp(billPartyLogit(state, bill, party, ctx), -3, 3) : 0;
    return seats * Math.exp(LC.relatorAlignWeight * sign * logit);
  });
  const partyId = pick?.[0] ?? lead?.presidentPartyId ?? state.landscape.presidentPartyId;
  bill.relator = {
    name: npcSpeakerName(rng, chamberId),
    partyId,
    report: 'pending',
    chamberId,
    lean: 0,
  };
  return bill.relator;
}

/** Parecer que o jogador relator dá se não escolher: o que a sua ideologia indica. */
export function playerDefaultReport(state: GameState, bill: Bill): RelatorInfo['report'] {
  const option = getLawOption(bill.categoryId, bill.optionId);
  const currentId = baselineOptionId(state, bill);
  const current = currentId ? getLawOption(bill.categoryId, currentId) : undefined;
  if (!option) return 'amended';
  const gain = ideologicalGain(getPlayer(state).ideology, option, current);
  return gain > 0.01 ? 'favorable' : gain < -0.01 ? 'unfavorable' : 'amended';
}

/** Parecer do relator NPC (ideologia do partido, negociação, presidente da casa e ruído). */
export function relatorReport(state: GameState, bill: Bill, rng: Rng): RelatorInfo['report'] {
  const r = bill.relator;
  if (!r) return 'favorable';
  if (r.isPlayer) return r.report !== 'pending' ? r.report : playerDefaultReport(state, bill);
  const party = state.parties[r.partyId];
  const chamberId = r.chamberId ?? currentChamberId(bill) ?? '';
  const logit =
    (party ? billPartyLogit(state, bill, party) : 0) +
    (r.lean ?? 0) +
    (speakerStance(state, bill, chamberId) / 100) * LC.relatorSpeakerWeight +
    rng.normal(0, LC.relatorNoiseSd);
  const p = sigmoid(logit);
  return p >= LC.relatorFavorableP ? 'favorable' : p >= LC.relatorAmendedP ? 'amended' : 'unfavorable';
}
