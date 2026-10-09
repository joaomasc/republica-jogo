import { clamp100, formatPct } from '../core/math';
import { hashSeed, Rng } from '../core/rng';
import type { CandidateId } from '../core/types';
import type { ElectionResult, ProportionalOutcome } from '../election/types';
import { OFFICES } from '../election/offices';
import { assumeOffice } from '../government/government';
import { addHistory } from '../history/history';
import { federalLaws } from '../laws/federal';
import { getLawCategory, getLawOption, LAW_CATEGORIES } from '../laws/laws.data';
import { publishNews } from '../media/news';
import { onLawEnacted } from '../nation/nation';
import { getPlayer, getPlayerParty, requireElection } from '../simulation/access';
import type { GameState } from '../simulation/state';
import { registerObjective, type ObjectiveDefinition } from './objectives';

/**
 * Modo Nação: começa o jogo já empossado. Simula uma vitória coerente na eleição do cargo
 * (majoritária ~52–58%; proporcional com o jogador eleito), chama `assumeOffice`, aplica o pacote
 * de leis federais e registra os objetivos. Usa um RNG derivado da seed (não consome o principal).
 */

export interface StartInOfficeOptions {
  /** Leis federais iniciais (categoria → opção), sem tramitação, com força 1. */
  lawPreset?: Record<string, string>;
  objectives?: ObjectiveDefinition[];
}

const WIN = {
  /** Faixa do percentual de votos válidos do vencedor em eleições majoritárias. */
  majoritarianMin: 0.52,
  majoritarianMax: 0.58,
  /** Comparecimento e fração de votos válidos simulados. */
  turnoutRate: 0.8,
  validRate: 0.93,
  /** Fatia do partido do jogador nas eleições proporcionais. */
  partyShareMin: 0.06,
  partyShareMax: 0.16,
  /** Votação do jogador relativa à média por cadeira do partido. */
  playerVsAverageMin: 1.1,
  playerVsAverageMax: 1.7,
} as const;

/** Valida o pacote de leis: categorias/opções existentes e requisitos atendidos. */
export function validateLawPreset(preset: Record<string, string>): string | null {
  const final: Record<string, string> = {};
  for (const cat of LAW_CATEGORIES) final[cat.id] = cat.defaultOptionId;
  for (const [categoryId, optionId] of Object.entries(preset)) {
    const cat = getLawCategory(categoryId);
    if (!cat) return `Pacote de leis: categoria desconhecida "${categoryId}".`;
    if (!getLawOption(categoryId, optionId))
      return `Pacote de leis: opção "${optionId}" não existe em "${categoryId}".`;
    final[categoryId] = optionId;
  }
  for (const [categoryId, optionId] of Object.entries(preset)) {
    const requires = getLawOption(categoryId, optionId)?.requires;
    if (requires && !requires.some((r) => Object.values(final).includes(r)))
      return `Pacote de leis: "${optionId}" exige ${requires.join(' ou ')}.`;
  }
  return null;
}

/** Simula o resultado vitorioso do jogador na eleição em andamento e o registra. */
function simulateVictory(state: GameState, rng: Rng): { pct: number; votes: number } {
  const election = requireElection(state);
  const office = OFFICES[election.officeId];
  const player = getPlayer(state);
  const proportional = office.system === 'proportional';

  const turnout = Math.round(election.totalVoters * WIN.turnoutRate);
  const validVotes = Math.round(turnout * WIN.validRate);
  const rivals: CandidateId[] = election.candidateIds.filter((id) => id !== player.id);

  let pct: number;
  let proportionalOutcome: ProportionalOutcome | undefined;
  if (proportional) {
    const seats = Math.max(1, election.seats);
    const partyShare = rng.range(WIN.partyShareMin, WIN.partyShareMax);
    pct = (partyShare / seats) * rng.range(WIN.playerVsAverageMin, WIN.playerVsAverageMax);
    const playerVotes = Math.max(1, Math.round(validVotes * pct));
    const partySeats = Math.max(1, Math.round(seats * partyShare));
    proportionalOutcome = {
      seats,
      partyVotes: { [player.partyId]: Math.round(validVotes * partyShare) },
      partySeats: { [player.partyId]: partySeats },
      playerVotes,
      playerRankInParty: Math.max(1, Math.ceil(partySeats * rng.range(0.2, 0.9))),
      playerPartySeats: partySeats,
      cutLine: Math.round(validVotes / seats / 10),
      playerElected: true,
      topList: [],
    };
  } else {
    pct = rng.range(WIN.majoritarianMin, WIN.majoritarianMax);
  }

  // Votos dos adversários: o restante dividido de forma decrescente (1ª metade mais forte).
  const votes: Record<CandidateId, number> = { [player.id]: Math.round(validVotes * pct) };
  const pctMap: Record<CandidateId, number> = { [player.id]: pct };
  const weights = rivals.map((_, i) => 1 / (i + 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  rivals.forEach((id, i) => {
    const share = (1 - pct) * ((weights[i] ?? 0) / totalWeight);
    pctMap[id] = share;
    votes[id] = Math.round(validVotes * share);
  });

  const result: ElectionResult = {
    round: 1,
    date: election.date,
    seed: hashSeed(state.meta.seed, 'startInOffice', 'result'),
    totalVoters: election.totalVoters,
    turnout,
    turnoutRate: WIN.turnoutRate,
    blankNull: turnout - validVotes,
    validVotes,
    votes,
    pct: pctMap,
    ranking: [player.id, ...rivals],
    byUnit: {},
    byPopType: {},
    winnerId: player.id,
    runoff: null,
    playerElected: true,
    ...(proportionalOutcome ? { proportional: proportionalOutcome } : {}),
  };
  election.results.push(result);
  election.status = 'finished';
  election.outcome = { won: true, pct, round: 1 };
  return { pct, votes: votes[player.id] ?? 0 };
}

/**
 * Aplica o pacote às leis federais (sem tramitação, força 1). Primeiro grava todas as opções e só
 * depois avisa a Nação de cada mudança, para que requisitos entre leis (`requires`) e a identidade
 * do país sejam calculados sobre o pacote completo, e não sobre um estado intermediário.
 */
export function applyLawPreset(state: GameState, preset: Record<string, string>): void {
  const laws = federalLaws(state);
  const changed: { categoryId: string; optionId: string }[] = [];
  for (const cat of LAW_CATEGORIES) {
    const optionId = preset[cat.id];
    if (!optionId || !getLawOption(cat.id, optionId)) continue;
    if (laws.enacted[cat.id] === optionId) continue;
    laws.enacted[cat.id] = optionId;
    laws.strength[cat.id] = 1;
    laws.implementing = laws.implementing.filter((i) => i.categoryId !== cat.id);
    changed.push({ categoryId: cat.id, optionId });
  }
  for (const { categoryId, optionId } of changed) onLawEnacted(state, categoryId, optionId);
}

/**
 * Transforma a partida recém-criada (com campanha montada) numa partida já empossada.
 * Deve ser chamada depois de `setupElection` e antes de qualquer campanha.
 */
export function startInOffice(state: GameState, options: StartInOfficeOptions = {}): void {
  const election = requireElection(state);
  const office = OFFICES[election.officeId];
  const player = getPlayer(state);
  const rng = new Rng(hashSeed(state.meta.seed, 'startInOffice'));

  state.date = election.date;
  const { pct, votes } = simulateVictory(state, rng);
  const proportional = office.system === 'proportional';
  const how = proportional
    ? `${votes.toLocaleString('pt-BR')} votos`
    : `${formatPct(pct)} dos votos válidos`;

  // Registro da vitória (mesma contabilidade do fluxo de campanha).
  state.career.elections.push({
    year: election.year,
    officeId: election.officeId,
    jurisdictionLabel: election.jurisdiction.label,
    round: 1,
    won: true,
    pct,
    partyId: player.partyId,
  });
  addHistory(state, {
    kind: 'victory',
    title: `Eleito(a) para ${office.name} (${election.jurisdiction.label}) com ${how}`,
    importance: 3,
    sentiment: 1,
  });
  const party = getPlayerParty(state);
  party.popularity = clamp100(party.popularity + 3);
  player.fame = clamp100(player.fame + 8);
  publishNews(state, {
    headline: `${player.ballotName} é eleito(a) ${office.name.toLowerCase()} com ${how}`,
    category: 'election',
    sentiment: 1,
    importance: 3,
  });

  assumeOffice(state);
  state.nation.objectives = [];
  if (options.lawPreset) applyLawPreset(state, options.lawPreset);
  for (const def of options.objectives ?? []) registerObjective(state, def);
}
