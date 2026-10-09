import type { Rng } from '../core/rng';

/**
 * Configuração visual do personagem — 100% serializável.
 * O motor só conhece IDs; a renderização (SVG hoje, sprites no futuro) fica no pacote de UI.
 */
export interface AvatarConfig {
  presentation: 'masculine' | 'feminine' | 'neutral';
  skinTone: string;
  faceShape: FaceShape;
  eyes: EyeStyle;
  eyeColor: string;
  eyebrows: EyebrowStyle;
  hairStyle: HairStyle;
  hairColor: string;
  beard: BeardStyle;
  glasses: GlassesStyle;
  accessory: AccessoryStyle;
  outfit: OutfitStyle;
  outfitColor: string;
  shirtColor: string;
  tie: TieStyle;
  tieColor: string;
  expression: ExpressionStyle;
}

export const FACE_SHAPES = ['oval', 'round', 'square', 'long', 'heart'] as const;
export const EYE_STYLES = ['round', 'almond', 'sleepy', 'wide', 'narrow'] as const;
export const EYEBROW_STYLES = ['straight', 'arched', 'thick', 'thin', 'angry'] as const;
export const HAIR_STYLES = [
  'bald',
  'buzz',
  'short',
  'side_part',
  'receding',
  'wavy',
  'curly',
  'afro',
  'mohawk',
  'bob',
  'long',
  'ponytail',
  'bun',
  'braids',
  'fade',
  'crew_cut',
  'waves',
  'high_top',
  'cornrows',
  'dreads',
  'twists',
  'man_bun',
  'pompadour',
  'slick_back',
  'undercut',
  'pixie',
] as const;
export const BEARD_STYLES = ['none', 'stubble', 'mustache', 'goatee', 'chin', 'full'] as const;
export const GLASSES_STYLES = ['none', 'round', 'square', 'aviator', 'half', 'sunglasses'] as const;
export const ACCESSORY_STYLES = [
  'none',
  'flag_pin',
  'party_pin',
  'earrings',
  'hat',
  'headband',
  'scarf',
] as const;
export const OUTFIT_STYLES = [
  'suit',
  'blazer',
  'shirt',
  'polo',
  'tshirt',
  'jacket',
  'dress',
] as const;
export const TIE_STYLES = ['none', 'classic', 'thin', 'bow'] as const;
export const EXPRESSION_STYLES = [
  'smile',
  'confident',
  'serious',
  'laugh',
  'determined',
  'surprised',
] as const;

export type FaceShape = (typeof FACE_SHAPES)[number];
export type EyeStyle = (typeof EYE_STYLES)[number];
export type EyebrowStyle = (typeof EYEBROW_STYLES)[number];
export type HairStyle = (typeof HAIR_STYLES)[number];
export type BeardStyle = (typeof BEARD_STYLES)[number];
export type GlassesStyle = (typeof GLASSES_STYLES)[number];
export type AccessoryStyle = (typeof ACCESSORY_STYLES)[number];
export type OutfitStyle = (typeof OUTFIT_STYLES)[number];
export type TieStyle = (typeof TIE_STYLES)[number];
export type ExpressionStyle = (typeof EXPRESSION_STYLES)[number];

export const SKIN_TONES = [
  '#ffe0c7',
  '#f6cfa8',
  '#e8b48a',
  '#d29a6c',
  '#b77a4e',
  '#965c38',
  '#734126',
  '#4f2c1a',
];
export const HAIR_COLORS = [
  '#1b1b1b',
  '#3b2416',
  '#6a4325',
  '#a8742f',
  '#d9b15c',
  '#b84a2a',
  '#9a9a9a',
  '#e6e6e6',
  '#3b5bdb',
  '#c2255c',
];
export const EYE_COLORS = ['#3d2a1e', '#6b4423', '#2f6f4f', '#3a6ea5', '#5a5a5a'];
export const OUTFIT_COLORS = [
  '#1f2a44',
  '#2b2d42',
  '#4a4e69',
  '#6c757d',
  '#7f1d1d',
  '#14532d',
  '#1e3a8a',
  '#8b5e34',
  '#e9ecef',
  '#c1121f',
];
export const SHIRT_COLORS = [
  '#ffffff',
  '#dbe7f5',
  '#f8edeb',
  '#e9f5db',
  '#fff3bf',
  '#d0bfff',
  '#222222',
];
export const TIE_COLORS = [
  '#c1121f',
  '#1d4ed8',
  '#15803d',
  '#7c3aed',
  '#f59e0b',
  '#111827',
  '#db2777',
];

/** Rótulos em português por categoria (a mesma chave pode significar coisas diferentes em cada uma). */
export const AVATAR_LABELS = {
  presentation: { masculine: 'Masculina', feminine: 'Feminina', neutral: 'Neutra' },
  faceShape: {
    oval: 'Oval',
    round: 'Redondo',
    square: 'Quadrado',
    long: 'Alongado',
    heart: 'Coração',
  },
  eyes: {
    round: 'Redondos',
    almond: 'Amendoados',
    sleepy: 'Sonolentos',
    wide: 'Arregalados',
    narrow: 'Estreitos',
  },
  eyebrows: {
    straight: 'Retas',
    arched: 'Arqueadas',
    thick: 'Grossas',
    thin: 'Finas',
    angry: 'Franzidas',
  },
  hairStyle: {
    bald: 'Careca',
    buzz: 'Raspado',
    short: 'Curto',
    side_part: 'Repartido',
    receding: 'Entradas',
    wavy: 'Ondulado',
    curly: 'Cacheado',
    afro: 'Black power',
    mohawk: 'Moicano',
    bob: 'Chanel',
    long: 'Longo',
    ponytail: 'Rabo de cavalo',
    bun: 'Coque',
    braids: 'Tranças',
    fade: 'Degradê',
    crew_cut: 'Social curto',
    waves: 'Waves 360',
    high_top: 'High top',
    cornrows: 'Tranças nagô',
    dreads: 'Dreadlocks',
    twists: 'Twists',
    man_bun: 'Coque masculino',
    pompadour: 'Topete',
    slick_back: 'Penteado para trás',
    undercut: 'Undercut',
    pixie: 'Pixie',
  },
  beard: {
    none: 'Sem barba',
    stubble: 'Por fazer',
    mustache: 'Bigode',
    goatee: 'Cavanhaque',
    chin: 'Queixo',
    full: 'Cheia',
  },
  glasses: {
    none: 'Sem óculos',
    round: 'Redondos',
    square: 'Quadrados',
    aviator: 'Aviador',
    half: 'Meia-armação',
    sunglasses: 'Escuros',
  },
  accessory: {
    none: 'Nenhum',
    flag_pin: 'Broche da bandeira',
    party_pin: 'Broche do partido',
    earrings: 'Brincos',
    hat: 'Chapéu',
    headband: 'Faixa',
    scarf: 'Cachecol',
  },
  outfit: {
    suit: 'Terno',
    blazer: 'Blazer',
    shirt: 'Camisa social',
    polo: 'Polo',
    tshirt: 'Camiseta',
    jacket: 'Jaqueta',
    dress: 'Vestido',
  },
  tie: { none: 'Sem gravata', classic: 'Clássica', thin: 'Fina', bow: 'Borboleta' },
  expression: {
    smile: 'Sorriso',
    confident: 'Confiante',
    serious: 'Sério',
    laugh: 'Risada',
    determined: 'Determinado',
    surprised: 'Surpreso',
  },
} as const satisfies {
  presentation: Record<AvatarConfig['presentation'], string>;
  faceShape: Record<FaceShape, string>;
  eyes: Record<EyeStyle, string>;
  eyebrows: Record<EyebrowStyle, string>;
  hairStyle: Record<HairStyle, string>;
  beard: Record<BeardStyle, string>;
  glasses: Record<GlassesStyle, string>;
  accessory: Record<AccessoryStyle, string>;
  outfit: Record<OutfitStyle, string>;
  tie: Record<TieStyle, string>;
  expression: Record<ExpressionStyle, string>;
};

const FEMININE_HAIR: HairStyle[] = [
  'pixie',
  'cornrows',
  'dreads',
  'twists',
  'slick_back',
  'bob',
  'long',
  'ponytail',
  'bun',
  'braids',
  'wavy',
  'curly',
  'afro',
  'short',
];
const MASCULINE_HAIR: HairStyle[] = [
  'fade',
  'crew_cut',
  'waves',
  'high_top',
  'cornrows',
  'dreads',
  'twists',
  'man_bun',
  'pompadour',
  'slick_back',
  'undercut',
  'bald',
  'buzz',
  'short',
  'side_part',
  'receding',
  'wavy',
  'curly',
  'afro',
];

export function randomAppearance(
  rng: Rng,
  presentation: AvatarConfig['presentation'],
  age: number,
): AvatarConfig {
  const hairPool =
    presentation === 'feminine'
      ? FEMININE_HAIR
      : presentation === 'masculine'
        ? MASCULINE_HAIR
        : [...HAIR_STYLES];
  const greyChance = age > 60 ? 0.7 : age > 50 ? 0.35 : 0.05;
  const hairColor = rng.chance(greyChance)
    ? rng.pick(['#9a9a9a', '#e6e6e6'])
    : rng.pick(HAIR_COLORS.slice(0, 6));
  const formal = rng.chance(0.75);
  const outfit: OutfitStyle = formal
    ? presentation === 'feminine'
      ? rng.pick(['blazer', 'suit', 'dress'] as const)
      : rng.pick(['suit', 'suit', 'blazer'] as const)
    : rng.pick(['shirt', 'polo', 'jacket'] as const);
  const wearsTie =
    presentation !== 'feminine' && (outfit === 'suit' || outfit === 'blazer') && rng.chance(0.7);
  return {
    presentation,
    skinTone: rng.pick(SKIN_TONES),
    faceShape: rng.pick(FACE_SHAPES),
    eyes: rng.pick(EYE_STYLES),
    eyeColor: rng.pick(EYE_COLORS),
    eyebrows: rng.pick(EYEBROW_STYLES),
    hairStyle: rng.pick(hairPool),
    hairColor,
    beard:
      presentation === 'masculine' && rng.chance(0.45) ? rng.pick(BEARD_STYLES.slice(1)) : 'none',
    glasses: rng.chance(age > 50 ? 0.5 : 0.25) ? rng.pick(GLASSES_STYLES.slice(1, 5)) : 'none',
    accessory: rng.chance(0.4)
      ? rng.pick(['flag_pin', 'party_pin'] as const)
      : presentation === 'feminine' && rng.chance(0.4)
        ? 'earrings'
        : 'none',
    outfit,
    outfitColor: rng.pick(OUTFIT_COLORS.slice(0, 8)),
    shirtColor: rng.pick(SHIRT_COLORS.slice(0, 5)),
    tie: wearsTie ? rng.pick(['classic', 'classic', 'thin', 'bow'] as const) : 'none',
    tieColor: rng.pick(TIE_COLORS),
    expression: rng.pick(['smile', 'confident', 'serious', 'determined'] as const),
  };
}

export function defaultAppearance(): AvatarConfig {
  return {
    presentation: 'neutral',
    skinTone: SKIN_TONES[3] ?? '#d29a6c',
    faceShape: 'oval',
    eyes: 'almond',
    eyeColor: EYE_COLORS[0] ?? '#3d2a1e',
    eyebrows: 'straight',
    hairStyle: 'short',
    hairColor: HAIR_COLORS[1] ?? '#3b2416',
    beard: 'none',
    glasses: 'none',
    accessory: 'flag_pin',
    outfit: 'suit',
    outfitColor: OUTFIT_COLORS[0] ?? '#1f2a44',
    shirtColor: SHIRT_COLORS[0] ?? '#ffffff',
    tie: 'classic',
    tieColor: TIE_COLORS[0] ?? '#c1121f',
    expression: 'smile',
  };
}
