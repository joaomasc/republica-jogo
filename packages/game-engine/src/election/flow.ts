import { beginWeek } from '../campaign/weekly';
import { clamp100, formatPct } from '../core/math';
import type { ActionResult } from '../core/types';
import { assumeOffice } from '../government/government';
import { addHistory } from '../history/history';
import { setMayorParty } from '../map/cities';
import { publishNews } from '../media/news';
import { getPlayer, getPlayerParty, requireElection } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { OFFICES } from './offices';
import { addPoll, createPoll, pickPollster } from './polls';
import { setupRunoff } from './setup';
import { simulateElection } from './simulate';

/** Realiza a votação do turno atual e registra o resultado. */
export function holdElection(state: GameState): ActionResult {
  if (state.phase !== 'election_day' || !state.election)
    return { ok: false, message: 'Ainda não é dia de eleição.' };
  const election = state.election;
  const office = OFFICES[election.officeId];
  const player = getPlayer(state);
  const result = simulateElection(state);
  election.results.push(result);
  state.phase = 'results';

  const playerPct = result.pct[player.id] ?? 0;
  const winner = result.winnerId ? state.candidates[result.winnerId] : null;
  let message: string;

  if (result.runoff) {
    const inRunoff = result.runoff.includes(player.id);
    const [a, b] = result.runoff.map((id) => state.candidates[id]?.ballotName ?? id);
    election.status = 'campaign';
    message = inRunoff
      ? `Você está no 2º turno contra ${result.runoff[0] === player.id ? b : a}!`
      : `Você ficou fora do 2º turno (${formatPct(playerPct)}).`;
    publishNews(state, {
      headline: `${a} e ${b} vão ao segundo turno`,
      category: 'election',
      importance: 3,
      sentiment: inRunoff ? 1 : -1,
    });
    if (!inRunoff) {
      // O 2º turno entre NPCs é resolvido direto (o jogador já foi eliminado).
      const runoff = simulateElection(state, { candidateIds: result.runoff, round: 2 });
      election.results.push(runoff);
      election.status = 'finished';
      election.outcome = { won: false, pct: playerPct, round: 1 };
      recordElection(state, false, playerPct, 1);
      if (runoff.winnerId) setLandscapeWinner(state, runoff.winnerId);
    }
  } else {
    election.status = 'finished';
    const won = result.playerElected;
    election.outcome = { won, pct: playerPct, round: election.round };
    recordElection(state, won, playerPct, election.round);
    if (result.winnerId && office.branch === 'executive')
      setLandscapeWinner(state, won ? player.id : result.winnerId);
    if (office.system === 'proportional') {
      const p = result.proportional;
      message = won
        ? `Eleito(a)! ${p?.playerVotes.toLocaleString('pt-BR')} votos.`
        : `Não eleito(a). Faltaram votos para superar a linha de corte do partido.`;
    } else {
      message = won
        ? `Vitória! ${formatPct(playerPct)} dos votos válidos.`
        : `Derrota. ${winner?.ballotName ?? 'Adversário'} venceu.`;
    }
    publishNews(state, {
      headline: won
        ? `${player.ballotName} é eleito(a) ${office.name.toLowerCase()}!`
        : `${winner?.ballotName ?? 'Adversário'} vence a eleição para ${office.name.toLowerCase()}`,
      category: 'election',
      importance: 3,
      sentiment: won ? 1 : -1,
    });
  }
  return { ok: true, message: message ?? 'Eleição concluída.' };
}

function setLandscapeWinner(state: GameState, winnerId: string): void {
  const election = state.election;
  const cand = state.candidates[winnerId];
  if (!election || !cand) return;
  const stateId = election.jurisdiction.stateId;
  if (election.officeId === 'presidente') state.landscape.presidentPartyId = cand.partyId;
  else if (election.officeId === 'governador' && stateId)
    state.landscape.governors[stateId] = cand.partyId;
  else if (election.officeId === 'prefeito' && stateId)
    setMayorParty(state, stateId, election.jurisdiction.cityId, cand.partyId);
}

function recordElection(state: GameState, won: boolean, pct: number, round: 1 | 2): void {
  const election = requireElection(state);
  const office = OFFICES[election.officeId];
  const player = getPlayer(state);
  state.career.elections.push({
    year: election.year,
    officeId: election.officeId,
    jurisdictionLabel: election.jurisdiction.label,
    round,
    won,
    pct,
    partyId: player.partyId,
  });
  addHistory(state, {
    kind: won ? 'victory' : 'defeat',
    title: `${won ? 'Eleito(a)' : 'Derrotado(a)'} para ${office.name} (${election.jurisdiction.label}) com ${formatPct(pct)}`,
    importance: 3,
    sentiment: won ? 1 : -1,
  });
  const party = getPlayerParty(state);
  party.popularity = clamp100(party.popularity + (won ? 3 : -1));
  player.fame = clamp100(player.fame + (won ? 8 : 3));
}

/** Depois da tela de resultados: 2º turno, posse ou volta à carreira. */
export function continueAfterResults(state: GameState): ActionResult {
  if (state.phase !== 'results' || !state.election)
    return { ok: false, message: 'Nada a continuar.' };
  const election = state.election;
  const last = election.results[election.results.length - 1];
  if (election.status === 'campaign' && last?.runoff && last.runoff.includes(state.playerId)) {
    setupRunoff(state, last.runoff);
    addPoll(state, createPoll(state, { kind: 'public', pollster: pickPollster(state) }));
    beginWeek(state);
    publishNews(state, {
      headline: 'Começa a campanha do segundo turno',
      category: 'election',
      importance: 2,
    });
    return { ok: true, message: 'Campanha do 2º turno começou!' };
  }
  if (election.outcome?.won) {
    assumeOffice(state);
    return { ok: true, message: 'Você tomou posse!' };
  }
  state.phase = 'career';
  state.campaign = null;
  state.election = null;
  state.interactions = { debate: null, interview: null };
  state.career.lastEvaluation = null;
  return { ok: true, message: 'A vida segue. Planeje o próximo passo da sua carreira.' };
}
