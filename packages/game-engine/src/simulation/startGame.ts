import { beginWeek } from '../campaign/weekly';
import { validatePlatform } from '../laws/platform';
import {
  buildPlayerCandidate,
  validateCandidateInput,
  type CreateCandidateInput,
} from '../candidate/candidate';
import { GameConstants } from '../config/constants';
import type { DifficultyId } from '../config/difficulty';
import { makeDate } from '../core/date';
import { clamp100 } from '../core/math';
import { hashSeed, Rng } from '../core/rng';
import { STATE_IDS, type StateId } from '../core/types';
import { initEconomy, type EconomicSituation } from '../economy/economy';
import {
  bootstrapEconomy,
  createEmptyIndustry,
  createInitialMarket,
} from '../economy/industry/industry';
import { createExecutiveState } from '../executive/executive';
import { createLegislatureState, initLegislature } from '../legislature/legislature';
import { createNationState } from '../nation/nation';
import { nextElectionYear, OFFICES, type OfficeId } from '../election/offices';
import { addPoll, createPoll, pickPollster } from '../election/polls';
import { setupElection } from '../election/setup';
import { addHistory } from '../history/history';
import { initLawsState } from '../laws/laws';
import { publishNews } from '../media/news';
import {
  createPartyFromInput,
  initParties,
  validatePartyInput,
  type CreatePartyInput,
} from '../parties/parties';
import { initCongress } from '../politics/congress';
import { initInterestGroups } from '../politics/interestGroups.data';
import { generatePopulation, refreshPartyAffinities } from '../population/population';
import type { ObjectiveDefinition } from '../scenarios/objectives';
import { getScenario } from '../scenarios/scenarios';
import { startInOffice, validateLawPreset } from '../scenarios/startInOffice';
import type { WorldId } from '../world/parody';
import type { GameMode, GameState } from './state';

export interface SandboxOptions {
  startingMoney?: number;
  /** Popularidade inicial do candidato (0..100). */
  popularity?: number;
  /** Conhecimento público inicial (0..100). */
  fame?: number;
  economy?: EconomicSituation;
  /** Escala da população (0.25..2). */
  populationScale?: number;
  campaignDays?: number;
}

export interface NewGameConfig {
  seed?: number;
  difficulty: DifficultyId;
  mode: GameMode;
  scenarioId?: string | null;
  candidate: CreateCandidateInput;
  party: { kind: 'existing'; partyId: string } | { kind: 'new'; input: CreatePartyInput };
  office: { officeId: OfficeId; stateId: StateId };
  year?: number;
  sandbox?: SandboxOptions;
  economy?: EconomicSituation;
  /** Data real de criação (ISO) — passada pelo chamador para manter o motor determinístico. */
  now?: string;
  /** 'parody' troca partidos e adversários por caricaturas (sátira). */
  world?: WorldId;
  /** Campanha dinâmica (reunião semanal, pauta, rivais reativos). */
  weekly?: boolean;
  name?: string;
  /** Começa já empossado no cargo (pula a campanha): 'modo nação'. Padrão: o do cenário. */
  startInOffice?: boolean;
  /** Leis federais iniciais diferentes do padrão (categoria → opção). */
  lawPreset?: Record<string, string>;
  /** Objetivos do cenário (avaliados durante o mandato). */
  objectives?: ObjectiveDefinition[];
}

/** Opções do modo nação: o que a config não define vem do cenário (se houver). */
function nationOptions(config: NewGameConfig): {
  startInOffice: boolean;
  lawPreset: Record<string, string> | undefined;
  objectives: ObjectiveDefinition[] | undefined;
} {
  const found = config.scenarioId ? getScenario(config.scenarioId) : undefined;
  // Só herda do cenário se o cargo for o dele (objetivos e leis iniciais dependem do cargo).
  const scenario = found && found.officeId === config.office.officeId ? found : undefined;
  return {
    startInOffice: config.startInOffice ?? scenario?.startInOffice ?? false,
    lawPreset: config.lawPreset ?? scenario?.lawPreset,
    objectives: config.objectives ?? scenario?.objectives,
  };
}

export function validateNewGame(config: NewGameConfig): string | null {
  const { lawPreset } = nationOptions(config);
  const presetError = lawPreset ? validateLawPreset(lawPreset) : null;
  if (presetError) return presetError;
  const candidateError = validateCandidateInput(config.candidate) ?? validatePlatform(config.candidate.platform);
  if (candidateError) return candidateError;
  if (config.party.kind === 'new') {
    const platformError = validatePlatform(config.party.input.lawPositions);
    if (platformError) return platformError;
  }
  const office = OFFICES[config.office.officeId];
  if (!office) return 'Cargo inválido.';
  if (config.candidate.age < office.minAge)
    return `Idade mínima para ${office.name}: ${office.minAge} anos.`;
  if (!STATE_IDS.includes(config.office.stateId)) return 'Estado inválido.';
  if (config.party.kind === 'new')
    return validatePartyInput(config.party.input, initParties(config.world));
  if (!initParties(config.world)[config.party.partyId]) return 'Partido inválido.';
  return null;
}

/** Cria uma nova partida pronta para a campanha. */
export function startGame(config: NewGameConfig): GameState {
  const error = validateNewGame(config);
  if (error) throw new Error(error);
  const seed =
    (config.seed ?? hashSeed(config.now ?? 'republica', config.candidate.firstName)) >>> 0;
  const rng = new Rng(seed);
  const scale = Math.min(2, Math.max(0.25, config.sandbox?.populationScale ?? 1));

  const parties = initParties(config.world);
  let partyId: string;
  if (config.party.kind === 'new') {
    partyId = 'player_party';
    parties[partyId] = createPartyFromInput(config.party.input, partyId);
  } else partyId = config.party.partyId;

  const { population, regions } = generatePopulation(rng, parties, scale);
  if (config.party.kind === 'new') {
    for (const region of Object.values(regions))
      region.partyStrength[partyId] = region.id === config.candidate.homeStateId ? 45 : 18;
    refreshPartyAffinities(population, regions, parties, 1);
  }

  const officeId = config.office.officeId;
  const year = config.year ?? nextElectionYear(officeId, 2026);
  const startDate = makeDate(year, 1, 1);
  const player = buildPlayerCandidate(config.candidate, 'player', partyId);
  if (config.sandbox?.popularity !== undefined)
    player.attributes.popularity = clamp100(config.sandbox.popularity);
  if (config.sandbox?.fame !== undefined) player.fame = clamp100(config.sandbox.fame);
  parties[partyId]?.candidateIds.push(player.id);

  const pickParty = (weight: (p: (typeof parties)[string]) => number): string =>
    rng.weightedPick(
      Object.values(parties).filter((p) => p.provenance.kind !== 'player'),
      weight,
    )?.id ?? 'udc';
  const governors = {} as Record<StateId, string>;
  const mayors = {} as Record<StateId, string>;
  for (const id of STATE_IDS) {
    governors[id] = regions[id].governorPartyId;
    mayors[id] = pickParty(
      (p) => (p.popularity * ((regions[id].partyStrength[p.id] ?? 50) / 50)) ** 2,
    );
  }

  const state: GameState = {
    meta: {
      id: `game_${seed.toString(36)}`,
      version: GameConstants.save.version,
      seed,
      createdAt: config.now ?? startDate,
      name: config.name ?? `${player.ballotName} — ${OFFICES[officeId].name}`,
      turn: 0,
    },
    settings: {
      difficulty: config.difficulty,
      mode: config.mode,
      scenarioId: config.scenarioId ?? null,
      populationScale: scale,
      world: config.world ?? 'fictional',
      weekly: config.weekly ?? false,
    },
    rngState: rng.state,
    idCounter: 0,
    date: startDate,
    phase: 'career',
    playerId: player.id,
    candidates: { [player.id]: player },
    parties,
    election: null,
    population,
    regions,
    campaign: null,
    promises: [],
    economy: initEconomy(config.sandbox?.economy ?? config.economy ?? 'normal', startDate),
    government: null,
    congress: { chambers: [], coalition: [], relations: {}, log: [] },
    laws: initLawsState('federal'),
    interestGroups: initInterestGroups(),
    landscape: {
      presidentPartyId: pickParty((p) => (p.popularity * (0.5 + p.influence / 100)) ** 2),
      governors,
      mayors,
    },
    media: { news: [] },
    events: { pending: [], scheduled: [], log: [], lastFired: {}, firedCount: {}, modifiers: [] },
    interactions: { debate: null, interview: null },
    history: [],
    alerts: [],
    career: {
      offices: [],
      elections: [],
      partyHistory: [{ partyId, from: startDate }],
      consecutiveTerms: 0,
      lastOfficeId: null,
      reputation: 50,
      lastEvaluation: null,
      retired: false,
    },
    tracking: {
      lastPlayerShare: null,
      lastUnitShares: {},
      lastPopTypeShares: {},
      lastApproval: null,
      lastCheck: null,
    },
    industry: createEmptyIndustry(),
    market: createInitialMarket(),
    legislature: createLegislatureState(),
    executive: createExecutiveState(),
    nation: createNationState(),
  };

  const congressRng = new Rng(hashSeed(seed, 'congress'));
  state.congress = initCongress(
    state,
    { level: 'federal', stateId: null, label: 'Brasil' },
    congressRng,
  );
  // Subsistemas nacionais usam RNGs derivados da seed (não consomem o RNG principal da partida).
  initLegislature(state, new Rng(hashSeed(seed, 'legislature')));
  bootstrapEconomy(state, new Rng(hashSeed(seed, 'industry')));

  const nation = nationOptions(config);
  setupElection(state, {
    officeId,
    stateId: config.office.stateId,
    year,
    ...(config.sandbox?.campaignDays ? { campaignDays: config.sandbox.campaignDays } : {}),
    ...(config.sandbox?.startingMoney !== undefined
      ? { startingMoney: config.sandbox.startingMoney }
      : {}),
  });
  if (nation.startInOffice) {
    // Modo nação: vitória simulada, posse, leis iniciais e objetivos (sem campanha pendente).
    startInOffice(state, {
      ...(nation.lawPreset ? { lawPreset: nation.lawPreset } : {}),
      ...(nation.objectives ? { objectives: nation.objectives } : {}),
    });
    return state;
  }
  addPoll(state, createPoll(state, { kind: 'public', pollster: pickPollster(state) }));
  beginWeek(state);
  const office = OFFICES[officeId];
  addHistory(state, {
    kind: 'career',
    title: `Lança candidatura a ${office.name} (${state.election?.jurisdiction.label ?? ''})`,
    importance: 2,
  });
  publishNews(state, {
    headline: `Começa a campanha para ${office.name.toLowerCase()} — ${state.election?.jurisdiction.label ?? ''}`,
    body: `${player.ballotName} (${parties[partyId]?.acronym ?? ''}) entra na disputa contra ${(state.election?.candidateIds.length ?? 1) - 1} adversários.`,
    category: 'election',
    importance: 3,
  });
  return state;
}
