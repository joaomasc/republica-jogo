import { GameConstants } from '../config/constants';
import { hashSeed, Rng } from '../core/rng';
import {
  bootstrapEconomy,
  createEmptyIndustry,
  createInitialMarket,
} from '../economy/industry/industry';
import { BUDGET_CATEGORIES } from '../economy/types';
import { createExecutiveState } from '../executive/executive';
import type { Bill } from '../laws/types';
import {
  createLegislatureState,
  initLegislature,
  upgradeBill,
} from '../legislature/legislature';
import { createNationState } from '../nation/nation';
import { formatDateShort } from '../core/date';
import { OFFICES } from '../election/offices';
import type { GameState } from '../simulation/state';

const S = GameConstants.save;

export interface SaveSummary {
  name: string;
  playerName: string;
  partyAcronym: string;
  partyColor: string;
  officeName: string;
  dateLabel: string;
  phase: GameState['phase'];
  difficulty: GameState['settings']['difficulty'];
  mode: GameState['settings']['mode'];
}

export interface SaveEnvelope {
  format: typeof S.format;
  version: number;
  savedAt: string;
  summary: SaveSummary;
  state: GameState;
}

export interface SaveSlotInfo {
  slotId: string;
  savedAt: string;
  summary: SaveSummary;
}

/** Contrato de armazenamento — localStorage hoje, PostgreSQL (via API) amanhã. */
export interface SaveStorage {
  list(): Promise<SaveSlotInfo[]>;
  write(slotId: string, envelope: SaveEnvelope): Promise<void>;
  read(slotId: string): Promise<SaveEnvelope | null>;
  remove(slotId: string): Promise<void>;
}

export function summarize(state: GameState): SaveSummary {
  const player = state.candidates[state.playerId];
  const party = player ? state.parties[player.partyId] : undefined;
  const officeId =
    state.election?.officeId ?? state.government?.officeId ?? state.career.lastOfficeId;
  return {
    name: state.meta.name,
    playerName: player?.ballotName ?? '—',
    partyAcronym: party?.acronym ?? '—',
    partyColor: party?.color ?? '#888',
    officeName: officeId ? OFFICES[officeId].name : 'Carreira',
    dateLabel: formatDateShort(state.date),
    phase: state.phase,
    difficulty: state.settings.difficulty,
    mode: state.settings.mode,
  };
}

export function createEnvelope(state: GameState, savedAt: string): SaveEnvelope {
  return { format: S.format, version: S.version, savedAt, summary: summarize(state), state };
}

export function serializeGame(state: GameState, savedAt: string): string {
  return JSON.stringify(createEnvelope(state, savedAt));
}

type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

/** Migrações de versão (índice = versão de origem). Adicione aqui ao mudar o formato do estado. */
const MIGRATIONS: Record<number, Migration> = {
  /** v1 → v2: economia industrial, mercado, processo legislativo, Executivo e Nação. */
  1: (raw) => {
    const state = raw as unknown as GameState;
    state.nation ??= createNationState();
    state.executive ??= createExecutiveState();
    state.legislature ??= createLegislatureState();
    state.industry ??= createEmptyIndustry();
    state.market ??= createInitialMarket();
    state.laws.bills = state.laws.bills.map((b) =>
      upgradeBill(state, b as Partial<Bill> & Pick<Bill, 'id'>),
    );
    const budget = state.government?.budget;
    if (budget)
      for (const c of BUDGET_CATEGORIES) {
        budget.spending[c] ??= 0;
        budget.baseline[c] ??= 0;
      }
    initLegislature(state, new Rng(hashSeed(state.meta.seed, 'legislature')));
    bootstrapEconomy(state, new Rng(hashSeed(state.meta.seed, 'industry')));
    return state as unknown as Record<string, unknown>;
  },
};

export class SaveFormatError extends Error {}

export function parseEnvelope(raw: string | unknown): SaveEnvelope {
  const data = typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw;
  if (!data || typeof data !== 'object') throw new SaveFormatError('Arquivo de save inválido.');
  const env = data as Partial<SaveEnvelope>;
  if (env.format !== S.format)
    throw new SaveFormatError('Este arquivo não é um save do República.');
  if (typeof env.version !== 'number' || env.version > S.version)
    throw new SaveFormatError('Save de uma versão mais nova do jogo.');
  let state = env.state as unknown as Record<string, unknown>;
  for (let v = env.version; v < S.version; v++) {
    const migrate = MIGRATIONS[v];
    if (migrate) state = migrate(state);
  }
  const game = state as unknown as GameState;
  if (!game.meta || !game.playerId || !game.candidates?.[game.playerId])
    throw new SaveFormatError('Save corrompido.');
  return {
    format: S.format,
    version: S.version,
    savedAt: env.savedAt ?? '',
    summary: env.summary ?? summarize(game),
    state: game,
  };
}

export function deserializeGame(raw: string): GameState {
  return parseEnvelope(raw).state;
}

export async function saveGame(
  storage: SaveStorage,
  slotId: string,
  state: GameState,
  savedAt: string,
): Promise<SaveSlotInfo> {
  const envelope = createEnvelope(state, savedAt);
  await storage.write(slotId, envelope);
  return { slotId, savedAt, summary: envelope.summary };
}

export async function loadGame(storage: SaveStorage, slotId: string): Promise<GameState | null> {
  const env = await storage.read(slotId);
  return env ? parseEnvelope(env).state : null;
}

export async function deleteSave(storage: SaveStorage, slotId: string): Promise<void> {
  await storage.remove(slotId);
}

/** Implementação em memória (testes, servidor sem banco). */
export class MemorySaveStorage implements SaveStorage {
  private slots = new Map<string, string>();

  async list(): Promise<SaveSlotInfo[]> {
    return [...this.slots.entries()]
      .map(([slotId, raw]) => {
        const env = JSON.parse(raw) as SaveEnvelope;
        return { slotId, savedAt: env.savedAt, summary: env.summary };
      })
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  async write(slotId: string, envelope: SaveEnvelope): Promise<void> {
    this.slots.set(slotId, JSON.stringify(envelope));
  }

  async read(slotId: string): Promise<SaveEnvelope | null> {
    const raw = this.slots.get(slotId);
    return raw ? parseEnvelope(raw) : null;
  }

  async remove(slotId: string): Promise<void> {
    this.slots.delete(slotId);
  }
}
