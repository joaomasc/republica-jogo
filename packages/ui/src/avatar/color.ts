/** Escurece (amount < 0) ou clareia (amount > 0) uma cor hex. */
export function shade(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const num = Number.parseInt(full, 16);
  const channels = [(num >> 16) & 255, (num >> 8) & 255, num & 255].map((c) => {
    const v = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;
    return Math.max(0, Math.min(255, Math.round(v)));
  });
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Cor de texto legível sobre um fundo. */
export function readableOn(hex: string): string {
  const h = hex.replace('#', '');
  const num = Number.parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16,
  );
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#0b1222' : '#ffffff';
}

/** Mistura duas cores hex (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.replace('#', ''), 16);
  const pb = Number.parseInt(b.replace('#', ''), 16);
  const ch = (n: number, s: number) => (n >> s) & 255;
  const out = [16, 8, 0].map((s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t));
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
