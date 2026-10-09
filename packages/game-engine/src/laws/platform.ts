import { clamp } from '../core/math';
import type { CandidateId } from '../core/types';
import { IDEOLOGY_AXES, type IdeologyVector } from '../ideology/axes';
import type { Party } from '../parties/types';
import type { InterestGroupId } from '../politics/types';
import { POP_TYPE_IDS, type PopTypeId } from '../population/popTypes';
import type { GameState } from '../simulation/state';
import { getLawCategory, getLawOption, LAW_CATEGORIES } from './laws.data';
import { optionIdeology, partyPreferredOption } from './laws';
import { ideologyAffinity } from '../ideology/ideology';

/**
 * Plataforma ("bandeiras"): as leis que um político ou partido defende publicamente.
 * Efeitos: (1) eleitores cujos interesses ganham com essas leis gostam mais do candidato e os
 * que perdem gostam menos; (2) grupos de interesse reagem ao que você defende; (3) partidos
 * votam a favor das próprias bandeiras no Congresso; (4) no governo, propor o que você
 * defendeu dá credibilidade e propor o contrário custa credibilidade (incoerência).
 */

/** Máximo de bandeiras de um candidato ou partido. */
export const PLATFORM_MAX = 8;

export type Platform = Record<string, string>;

/** Categorias que podem virar bandeira (as federais: são as que mudam o país). */
export const PLATFORM_CATEGORIES = LAW_CATEGORIES.filter((c) => c.levels.includes('federal'));

/** Valida uma plataforma (categorias e opções existentes, limite de bandeiras). */
export function validatePlatform(platform: Platform | undefined): string | null {
  if (!platform) return null;
  const entries = Object.entries(platform);
  if (entries.length > PLATFORM_MAX) return `Escolha no máximo ${PLATFORM_MAX} bandeiras.`;
  for (const [c, o] of entries) if (!getLawOption(c, o)) return 'Bandeira inválida.';
  return null;
}

/** Plataforma efetiva de um candidato: a dele ou, se não tiver, a explícita do partido. */
export function candidatePlatform(state: GameState, id: CandidateId): Platform {
  const cand = state.candidates[id];
  if (!cand) return {};
  if (cand.platform && Object.keys(cand.platform).length > 0) return cand.platform;
  return state.parties[cand.partyId]?.lawPositions ?? {};
}

/**
 * Apelo da plataforma para cada tipo de Pop (−1..1): soma dos efeitos de satisfação das opções
 * defendidas para aquele Pop, normalizada.
 */
export function platformPopAppeal(platform: Platform): Partial<Record<PopTypeId, number>> {
  const out: Partial<Record<PopTypeId, number>> = {};
  for (const [c, o] of Object.entries(platform)) {
    const opt = getLawOption(c, o);
    if (!opt) continue;
    for (const t of POP_TYPE_IDS) {
      const v = opt.pops[t];
      if (v) out[t] = (out[t] ?? 0) + v;
    }
  }
  for (const t of Object.keys(out) as PopTypeId[]) out[t] = clamp((out[t] ?? 0) / 14, -1, 1);
  return out;
}

/** Postura de cada grupo de interesse diante da plataforma (soma dos efeitos das opções). */
export function platformGroupStance(platform: Platform): Partial<Record<InterestGroupId, number>> {
  const out: Partial<Record<InterestGroupId, number>> = {};
  for (const [c, o] of Object.entries(platform)) {
    const opt = getLawOption(c, o);
    if (!opt) continue;
    for (const [g, v] of Object.entries(opt.groups) as [InterestGroupId, number][]) out[g] = (out[g] ?? 0) + v;
  }
  return out;
}

/**
 * Posição ideológica coerente com a plataforma: em cada eixo coberto pelas leis escolhidas, a
 * média das posições delas (mantém o valor atual nos eixos não cobertos).
 */
export function ideologyFromPlatform(platform: Platform, base: IdeologyVector): IdeologyVector {
  const sum: Partial<Record<keyof IdeologyVector, number>> = {};
  const cnt: Partial<Record<keyof IdeologyVector, number>> = {};
  for (const [c, o] of Object.entries(platform)) {
    const opt = getLawOption(c, o);
    if (!opt) continue;
    for (const [axis, v] of Object.entries(opt.ideology) as [keyof IdeologyVector, number][]) {
      sum[axis] = (sum[axis] ?? 0) + v;
      cnt[axis] = (cnt[axis] ?? 0) + 1;
    }
  }
  const out = { ...base };
  for (const axis of IDEOLOGY_AXES) {
    const k = cnt[axis] ?? 0;
    if (k > 0) out[axis] = Math.round((sum[axis] ?? 0) / k);
  }
  return out;
}

/**
 * Bandeiras de um partido: as explícitas ou, sem elas, as leis que ele mais prefere em relação à
 * lei padrão de cada tema (maior ganho de afinidade ideológica = bandeira mais característica).
 */
export function partyPlatformView(party: Pick<Party, 'ideology' | 'lawPositions'>, max = 6): { categoryId: string; optionId: string; explicit: boolean }[] {
  const explicit = Object.entries(party.lawPositions ?? {});
  if (explicit.length > 0) return explicit.map(([categoryId, optionId]) => ({ categoryId, optionId, explicit: true }));
  const out: { categoryId: string; optionId: string; gain: number }[] = [];
  for (const cat of PLATFORM_CATEGORIES) {
    const pref = partyPreferredOption(party as Party, cat.id);
    if (!pref || pref === cat.defaultOptionId) continue;
    const opt = getLawOption(cat.id, pref);
    const def = getLawOption(cat.id, cat.defaultOptionId);
    if (!opt || !def) continue;
    const gain =
      ideologyAffinity(party.ideology, optionIdeology(opt, party.ideology)) -
      ideologyAffinity(party.ideology, optionIdeology(def, party.ideology));
    out.push({ categoryId: cat.id, optionId: pref, gain });
  }
  return out
    .sort((a, b) => b.gain - a.gain)
    .slice(0, max)
    .map(({ categoryId, optionId }) => ({ categoryId, optionId, explicit: false }));
}

/** Quantas das bandeiras de `platform` o partido também defende (pela posição dele em cada tema). */
export function partyPlatformMatch(party: Pick<Party, 'ideology' | 'lawPositions'>, platform: Platform): { same: number; total: number } {
  let same = 0;
  let total = 0;
  for (const [c, o] of Object.entries(platform)) {
    total += 1;
    if (partyPreferredOption(party as Party, c) === o) same += 1;
  }
  return { same, total };
}

/** Afinidade (0..100) entre duas plataformas: bandeiras em comum vs. em conflito. */
export function platformAffinity(a: Platform, b: Platform): number | null {
  let same = 0;
  let conflict = 0;
  for (const [c, o] of Object.entries(a)) {
    const other = b[c];
    if (!other) continue;
    if (other === o) same += 1;
    else conflict += 1;
  }
  if (same + conflict === 0) return null;
  return Math.round((same / (same + conflict)) * 100);
}

/** Coerência ao propor uma lei: +1 se é bandeira sua, −1 se contraria uma bandeira sua, 0 se neutra. */
export function platformCoherence(platform: Platform, categoryId: string, optionId: string): -1 | 0 | 1 {
  const own = platform[categoryId];
  if (!own || !getLawCategory(categoryId)) return 0;
  return own === optionId ? 1 : -1;
}

/** Sugestão de bandeiras a partir de uma posição ideológica (as leis mais "suas", longe do padrão). */
export function suggestPlatform(ideology: IdeologyVector, max = 6): Platform {
  return Object.fromEntries(partyPlatformView({ ideology, lawPositions: {} }, max).map((x) => [x.categoryId, x.optionId]));
}

/** Coerência (0..100) entre cada bandeira e uma posição ideológica (100 = totalmente coerente). */
export function platformIdeologyFit(platform: Platform, ideology: IdeologyVector): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [c, o] of Object.entries(platform)) {
    const opt = getLawOption(c, o);
    if (!opt) continue;
    out[c] = Math.round(ideologyAffinity(ideology, optionIdeology(opt, ideology)) * 100);
  }
  return out;
}

/** Credibilidade perdida por bandeira abandonada ou trocada ("virar a casaca"). */
export const PLATFORM_FLIP_COST = 3;

/** Bandeiras abandonadas ou trocadas entre duas plataformas (acrescentar não conta). */
export function platformFlips(before: Platform, after: Platform): number {
  let n = 0;
  for (const [c, o] of Object.entries(before)) if (after[c] !== o) n += 1;
  return n;
}

/** O jogador redefine suas bandeiras no meio da carreira; trocar ou abandonar custa credibilidade. */
export function setPlayerPlatform(state: GameState, platform: Platform): { ok: boolean; message: string } {
  const error = validatePlatform(platform);
  if (error) return { ok: false, message: error };
  const player = state.candidates[state.playerId];
  if (!player) return { ok: false, message: 'Jogador não encontrado.' };
  const flips = platformFlips(candidatePlatform(state, player.id), platform);
  const cost = flips * PLATFORM_FLIP_COST;
  player.platform = { ...platform };
  player.attributes.credibility = clamp(player.attributes.credibility - cost, 0, 100);
  return {
    ok: true,
    message: cost > 0 ? `Bandeiras atualizadas. Mudar de posição custou ${cost} de credibilidade.` : 'Bandeiras atualizadas.',
  };
}
