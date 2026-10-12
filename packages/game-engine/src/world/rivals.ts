/**
 * RIVAIS RECORRENTES — adversários que não somem depois da eleição.
 *
 * Ao fim de cada eleição do jogador, os adversários relevantes vão para um elenco persistente com
 * memória (confrontos, quem venceu quem, ataques, apoios) e carreira própria (quem vence assume o
 * cargo). Nas eleições seguintes, o partido tende a relançar o mesmo nome. O rival com mais
 * histórico contra o jogador vira o NÊMESIS, com eventos próprios.
 */
import type { Candidate } from '../candidate/types';
import { GameConstants } from '../config/constants';
import type { Rng } from '../core/rng';
import type { CandidateId, PartyId, StateId } from '../core/types';
import { OFFICES, type OfficeId } from '../election/offices';
import type { Election } from '../election/types';
import { publishNews } from '../media/news';
import type { GameState } from '../simulation/state';

const RC = GameConstants.rivals;

export interface RivalMemory {
  /** Eleições disputadas contra o jogador. */
  confrontations: number;
  /** Vezes em que terminou à frente do jogador / atrás dele. */
  beatPlayer: number;
  lostToPlayer: number;
  /** Semanas em que mirou o jogador na campanha. */
  attacks: number;
  /** Apoiou o jogador num 2º turno. */
  allied: number;
}

export interface RivalRecord {
  id: string;
  /** Ficha do político (id do candidato da última eleição; a identidade fica). */
  candidate: Candidate;
  /** Ano da última eleição em que apareceu (a idade avança a partir dela). */
  lastYear: number;
  career: { year: number; officeId: OfficeId; label: string; won: boolean; pct: number }[];
  /** Cargo que ocupa agora (mandato até `until`). */
  office: { officeId: OfficeId; label: string; until: number } | null;
  memory: RivalMemory;
}

const emptyMemory = (): RivalMemory => ({
  confrontations: 0,
  beatPlayer: 0,
  lostToPlayer: 0,
  attacks: 0,
  allied: 0,
});

/** Intensidade da rivalidade com o jogador. */
export function rivalryScore(r: RivalRecord): number {
  const m = r.memory;
  return m.confrontations * 2 + m.beatPlayer * 2 + m.lostToPlayer + m.attacks * 0.5 - m.allied * 2;
}

/** O nêmesis: o rival com mais histórico contra o jogador (mínimo de confrontos e intensidade). */
export function nemesisOf(state: GameState): RivalRecord | null {
  const all = Object.values(state.rivals ?? {}).filter(
    (r) =>
      r.memory.confrontations >= RC.nemesisMinConfrontations &&
      rivalryScore(r) >= RC.nemesisMinScore,
  );
  return all.sort((a, b) => rivalryScore(b) - rivalryScore(a))[0] ?? null;
}

/** Candidato da eleição atual que é o nêmesis do jogador (ou null). */
export function nemesisInRace(state: GameState): CandidateId | null {
  const nem = nemesisOf(state);
  if (!nem || !state.election) return null;
  return state.election.candidateIds.find((id) => state.candidates[id]?.rivalId === nem.id) ?? null;
}

function ageNow(r: RivalRecord, year: number): number {
  return r.candidate.age + Math.max(0, year - r.lastYear);
}

/** Guarda os adversários relevantes da eleição que acabou (chamada com a eleição concluída). */
export function archiveRivals(state: GameState): void {
  const election = state.election;
  if (!election || election.status !== 'finished') return;
  if (OFFICES[election.officeId].system === 'proportional') return;
  const first = election.results.find((r) => r.round === 1);
  const last = election.results[election.results.length - 1];
  if (!first || !last) return;
  const me = state.playerId;
  const myPct = first.pct[me] ?? 0;
  const rivals = (state.rivals ??= {});
  const winner = last.winnerId;
  const relevant = first.ranking
    .filter((id) => id !== me)
    .filter((id, i) => i < RC.archiveTop || (state.candidates[id]?.fame ?? 0) >= RC.archiveFame);
  for (const id of relevant) {
    const cand = state.candidates[id];
    if (!cand || cand.isPlayer) continue;
    const rivalId = cand.rivalId ?? `rival_${id}`;
    const rec: RivalRecord = rivals[rivalId] ?? {
      id: rivalId,
      candidate: cand,
      lastYear: election.year,
      career: [],
      office: null,
      memory: emptyMemory(),
    };
    const status = election.participants[id];
    const pct = first.pct[id] ?? 0;
    const won = winner === id;
    rec.candidate = {
      ...cand,
      rivalId,
      currentOffice: won ? election.officeId : cand.currentOffice,
    };
    rec.lastYear = election.year;
    rec.career.push({
      year: election.year,
      officeId: election.officeId,
      label: election.jurisdiction.label,
      won,
      pct,
    });
    if (won)
      rec.office = {
        officeId: election.officeId,
        label: election.jurisdiction.label,
        until: election.year + (election.officeId === 'senador' ? 8 : 4),
      };
    rec.memory.confrontations += 1;
    if (pct > myPct) rec.memory.beatPlayer += 1;
    else rec.memory.lostToPlayer += 1;
    rec.memory.attacks += status?.attacksOnPlayer ?? 0;
    if (election.runoffDeals?.some((d) => d.candidateId === id && d.status === 'player'))
      rec.memory.allied += 1;
    rivals[rivalId] = rec;
  }
  // Elenco limitado: saem os mais antigos e sem rivalidade.
  const list = Object.values(rivals);
  if (list.length > RC.maxRoster) {
    list
      .sort((a, b) => rivalryScore(a) - rivalryScore(b) || a.lastYear - b.lastYear)
      .slice(0, list.length - RC.maxRoster)
      .forEach((r) => delete rivals[r.id]);
  }
}

/** Mandatos vencidos liberam o rival para disputar outra coisa. */
function refreshOffices(state: GameState, year: number): void {
  for (const r of Object.values(state.rivals ?? {}))
    if (r.office && r.office.until <= year) {
      r.office = null;
      r.candidate = { ...r.candidate, currentOffice: null };
    }
}

/**
 * Escolhe um rival do elenco para a candidatura de `partyId` nesta eleição (ou null para gerar um
 * nome novo). O nêmesis quase sempre volta; os outros, às vezes.
 */
export function pickReturningRival(
  state: GameState,
  rng: Rng,
  election: Pick<Election, 'officeId' | 'year' | 'jurisdiction'>,
  partyId: PartyId,
  used: Set<string>,
): RivalRecord | null {
  if (!state.rivals) return null;
  refreshOffices(state, election.year);
  const stateId = election.jurisdiction.stateId as StateId | null;
  const nem = nemesisOf(state);
  const pool = Object.values(state.rivals).filter((r) => {
    if (used.has(r.id) || r.candidate.partyId !== partyId) return false;
    if (ageNow(r, election.year) > RC.maxAge) return false;
    if (stateId && r.candidate.homeStateId !== stateId) return false;
    // Quem está no meio de um mandato só disputa cargo diferente (geralmente acima).
    if (r.office && r.office.officeId === election.officeId) return false;
    return true;
  });
  if (pool.length === 0) return null;
  pool.sort((a, b) => rivalryScore(b) - rivalryScore(a));
  const best = pool[0]!;
  const chance = best.id === nem?.id ? RC.nemesisReturnChance : RC.returnChance;
  return rng.chance(chance) ? best : null;
}

/** Monta o candidato da eleição a partir do rival que volta. */
export function candidateFromRival(rec: RivalRecord, id: CandidateId, year: number): Candidate {
  return {
    ...rec.candidate,
    id,
    rivalId: rec.id,
    age: ageNow(rec, year),
    currentOffice: rec.office?.officeId ?? null,
    // Quem já disputou fica mais conhecido.
    fame: Math.min(100, rec.candidate.fame + 5),
  };
}

/** Notícia quando um rival conhecido volta à disputa. */
export function announceReturn(state: GameState, rec: RivalRecord, isNemesis: boolean): void {
  publishNews(state, {
    headline: isNemesis
      ? `${rec.candidate.ballotName} volta para enfrentar ${state.candidates[state.playerId]?.ballotName ?? 'o rival de sempre'}: "agora é revanche"`
      : `${rec.candidate.ballotName} está de volta à disputa`,
    category: 'election',
    importance: isNemesis ? 3 : 1,
  });
}
