import { DEFAULT_PARTIES, STATE_IDS, hashSeed, Rng } from '@republica/game-engine';
import type { RegionPaint } from '@republica/ui';

/** Mapa decorativo da tela inicial: estados pintados com cores dos partidos fictícios. */
export const DEFAULT_PARTY_COLORS: Record<string, RegionPaint> = (() => {
  const rng = new Rng(hashSeed('menu-art'));
  const out: Record<string, RegionPaint> = {};
  for (const id of STATE_IDS) {
    const party = rng.pick(DEFAULT_PARTIES);
    out[id] = { fill: party.color, opacity: 0.55 + rng.next() * 0.45 };
  }
  return out;
})();
