import { readableOn, shade } from './avatar/color';
import { Icon } from './icons';
import { cn } from './primitives';

const logoUrl = (logo: string) => `${import.meta.env.BASE_URL}${logo}`;

/** Imagens já baixadas e decodificadas — a referência as mantém no cache de memória. */
const preloaded = new Map<string, HTMLImageElement>();

/** Baixa e decodifica os logos em segundo plano, para os selos aparecerem sem atraso. */
export function preloadPartyLogos(logos: readonly (string | undefined)[]): void {
  for (const logo of logos) {
    if (!logo || preloaded.has(logo)) continue;
    const img = new Image();
    img.src = logoUrl(logo);
    img.decode().catch(() => undefined);
    preloaded.set(logo, img);
  }
}

export function PartyEmblem({
  party,
  size = 36,
  showAcronym = false,
  className,
}: {
  party: {
    symbol: string;
    color: string;
    acronym: string;
    name?: string;
    logo?: string;
    logoBackground?: string;
  };
  size?: number;
  showAcronym?: boolean;
  className?: string;
}) {
  const fg = readableOn(party.color);
  const tile = party.logo ? (party.logoBackground ?? '#ffffff') : party.color;
  return (
    <span
      className={cn('inline-flex items-center gap-2', className)}
      title={party.name ?? party.acronym}
    >
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border-2"
        style={{
          // Logos reais costumam ser letreiros horizontais: o selo fica mais largo.
          width: party.logo ? Math.round(size * 1.5) : size,
          height: size,
          background: tile,
          borderColor: shade(party.color, -0.35),
          boxShadow: `0 3px 0 0 ${shade(party.color, -0.5)}`,
          color: fg,
          padding: party.logo ? Math.max(1, Math.round(size * 0.06)) : undefined,
        }}
      >
        {party.logo ? (
          <img
            src={logoUrl(party.logo)}
            alt={party.acronym}
            className="h-full w-full object-contain"
            draggable={false}
          />
        ) : (
          <Icon name={party.symbol} size={Math.round(size * 0.55)} strokeWidth={2.4} />
        )}
      </span>
      {showAcronym && (
        <span className="font-display font-semibold tracking-wide">{party.acronym}</span>
      )}
    </span>
  );
}
