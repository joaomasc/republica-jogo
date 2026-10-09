import type { Rng } from './rng';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Gera um id curto e determinístico a partir do RNG da partida. */
export function makeId(rng: Rng, prefix: string, length = 8): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[Math.floor(rng.next() * ALPHABET.length)];
  return `${prefix}_${out}`;
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
