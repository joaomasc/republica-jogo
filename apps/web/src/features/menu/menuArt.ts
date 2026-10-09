import { DEFAULT_PARTIES, STATE_IDS, hashSeed, Rng } from '@republica/game-engine';
import type { MapFill } from '@republica/ui';

/** Mapa decorativo da tela inicial: estados pintados com cores dos partidos fictícios. */
export const DEFAULT_PARTY_COLORS: Record<string, MapFill> = (() => {
  const rng = new Rng(hashSeed('menu-art'));
  const out: Record<string, MapFill> = {};
  for (const id of STATE_IDS) {
    const party = rng.pick(DEFAULT_PARTIES);
    out[id] = { fill: party.color, opacity: 0.55 + rng.next() * 0.45 };
  }
  return out;
})();
