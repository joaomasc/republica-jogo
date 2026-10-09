import { useId, type ReactElement, type ReactNode } from 'react';
import type { AvatarConfig } from '@republica/game-engine';
import { mix, shade } from './color';

/**
 * Retrato semi-realista do personagem em SVG puro (sem imagens): volumes com degradês, luz vinda
 * do alto à esquerda, olhos com íris e brilho, lábios e nariz com sombra, cabelo com textura de
 * fios e roupas com caimento. Tudo é derivado de `AvatarConfig` (mesmos campos do editor).
 */

interface AvatarProps {
  config: AvatarConfig;
  size?: number;
  /** Cor de fundo do retrato (ex.: cor do partido). */
  background?: string;
  /** Cor do broche partidário. */
  partyColor?: string;
  age?: number;
  frame?: 'circle' | 'rounded' | 'none';
  className?: string;
  title?: string;
}

const n = (v: number) => (Math.round(v * 10) / 10).toString();

/* ──────────────── Geometria ──────────────── */

interface Head {
  /** Meia-largura da testa, das maçãs do rosto e da mandíbula. */
  fw: number;
  cw: number;
  jw: number;
  jawY: number;
  chinY: number;
  chinW: number;
  top: number;
  /** Centro dos olhos (x = 100 ± eyeDx). */
  eyeY: number;
  eyeDx: number;
  noseY: number;
  mouthY: number;
}

function headFor(config: AvatarConfig): Head {
  const base: Record<AvatarConfig['faceShape'], Omit<Head, 'top' | 'eyeY' | 'eyeDx' | 'noseY' | 'mouthY'>> = {
    oval: { fw: 39, cw: 43, jw: 35, jawY: 134, chinY: 157, chinW: 12 },
    round: { fw: 41, cw: 46, jw: 40, jawY: 136, chinY: 154, chinW: 17 },
    square: { fw: 41, cw: 44, jw: 42, jawY: 141, chinY: 156, chinW: 20 },
    long: { fw: 36, cw: 40, jw: 33, jawY: 141, chinY: 163, chinW: 11 },
    heart: { fw: 43, cw: 44, jw: 31, jawY: 132, chinY: 156, chinW: 8 },
  };
  const h = { ...base[config.faceShape] };
  if (config.presentation === 'feminine') {
    h.jw -= 3;
    h.cw -= 1;
    h.chinW *= 0.8;
    h.chinY -= 2;
  } else if (config.presentation === 'neutral') {
    h.jw -= 1.5;
    h.chinW *= 0.9;
  }
  const long = config.faceShape === 'long';
  return { ...h, top: 36, eyeY: 99, eyeDx: long ? 17 : 18, noseY: long ? 124 : 122, mouthY: long ? 139 : 137 };
}

const L = (dx: number) => n(100 - dx);
const R = (dx: number) => n(100 + dx);

function headPath(h: Head): string {
  const { fw, cw, jw, jawY, chinY, chinW, top } = h;
  return [
    `M100 ${top}`,
    `C${R(fw * 0.62)} ${top} ${R(fw)} ${top + 12} ${R(fw)} 72`,
    `C${R(fw)} 86 ${R(cw)} 90 ${R(cw)} 104`,
    `C${R(cw)} 118 ${R(jw + 2)} ${jawY - 12} ${R(jw)} ${jawY}`,
    `C${R(jw - 3)} ${jawY + 10} ${R(chinW + 6)} ${chinY - 2} ${R(chinW)} ${chinY}`,
    `C${R(chinW * 0.5)} ${chinY + 2.5} ${L(chinW * 0.5)} ${chinY + 2.5} ${L(chinW)} ${chinY}`,
    `C${L(chinW + 6)} ${chinY - 2} ${L(jw - 3)} ${jawY + 10} ${L(jw)} ${jawY}`,
    `C${L(jw + 2)} ${jawY - 12} ${L(cw)} 118 ${L(cw)} 104`,
    `C${L(cw)} 90 ${L(fw)} 86 ${L(fw)} 72`,
    `C${L(fw)} ${top + 12} ${L(fw * 0.62)} ${top} 100 ${top}Z`,
  ].join('');
}

/** Contorno da metade inferior do rosto (barba), das orelhas até o queixo, com `grow` px de folga. */
function jawOutline(h: Head, grow = 0): string {
  const { cw, jw, jawY, chinY, chinW } = h;
  const g = grow;
  return [
    `M${L(cw - 1 + g * 0.3)} 101`,
    `C${L(cw - 1 + g * 0.4)} 118 ${L(jw + 2 + g)} ${jawY - 12} ${L(jw + g)} ${jawY + g * 0.4}`,
    `C${L(jw - 3 + g)} ${jawY + 10 + g} ${L(chinW + 6 + g * 0.6)} ${chinY - 2 + g} ${L(chinW + g * 0.4)} ${chinY + g}`,
    `C${L(chinW * 0.5)} ${chinY + 2.5 + g} ${R(chinW * 0.5)} ${chinY + 2.5 + g} ${R(chinW + g * 0.4)} ${chinY + g}`,
    `C${R(chinW + 6 + g * 0.6)} ${chinY - 2 + g} ${R(jw - 3 + g)} ${jawY + 10 + g} ${R(jw + g)} ${jawY + g * 0.4}`,
    `C${R(jw + 2 + g)} ${jawY - 12} ${R(cw - 1 + g * 0.4)} 118 ${R(cw - 1 + g * 0.3)} 101`,
  ].join('');
}

/* ──────────────── Paleta ──────────────── */

interface Palette {
  skin: string;
  light: string;
  shadow: string;
  deep: string;
  blush: string;
  lip: string;
  hair: string;
  hairLight: string;
  hairDark: string;
  brow: string;
}

function paletteFor(config: AvatarConfig): Palette {
  const skin = config.skinTone;
  const fem = config.presentation === 'feminine';
  const hair = config.hairColor;
  const lip = mix(skin, fem ? '#b23a4b' : '#a4504a', fem ? 0.5 : 0.32);
  return {
    skin,
    light: mix(skin, '#ffffff', 0.2),
    shadow: shade(skin, -0.22),
    deep: shade(skin, -0.42),
    blush: mix(skin, '#d9534f', 0.35),
    lip,
    hair,
    hairLight: mix(hair, '#ffffff', 0.22),
    hairDark: shade(hair, -0.4),
    brow: config.hairStyle === 'bald' || config.hairStyle === 'buzz' ? shade(mix(hair, skin, 0.25), -0.35) : shade(hair, -0.2),
  };
}

/* ──────────────── Cabelo ──────────────── */

interface HairLayers {
  back: ReactNode;
  front: ReactNode;
}

/** Fios (traços finos) para dar textura a uma massa de cabelo. */
function Strands({ d, p }: { d: string[]; p: Palette }) {
  return (
    <g fill="none" strokeLinecap="round">
      {d.map((path, i) => (
        <path
          key={i}
          d={path}
          stroke={i % 3 === 0 ? p.hairLight : p.hairDark}
          strokeWidth={i % 3 === 0 ? 0.9 : 0.7}
          opacity={i % 3 === 0 ? 0.45 : 0.35}
        />
      ))}
    </g>
  );
}

/** Calota de cabelo curto com linha de cabelo na testa e costeletas. */
function capPath(h: Head, o: { top: number; hairline: number; side: number; sideburn: number; recede?: number }): string {
  const { fw, cw } = h;
  const r = o.recede ?? 0;
  return [
    `M${L(cw - 2)} ${o.sideburn}`,
    `L${L(cw + o.side * 0.2)} 86`,
    `C${L(fw + 4 + o.side)} 58 ${L(fw - 2 + o.side)} ${o.top + 4} 100 ${o.top}`,
    `C${R(fw - 2 + o.side)} ${o.top + 4} ${R(fw + 4 + o.side)} 58 ${R(cw + o.side * 0.2)} 86`,
    `L${R(cw - 2)} ${o.sideburn}`,
    `L${R(cw - 6)} ${o.sideburn - 1}`,
    `C${R(cw - 6)} 90 ${R(fw - 4)} ${76 - r} ${R(fw - 10 - r * 0.6)} ${66 - r}`,
    `C${R(18)} ${o.hairline} ${L(18)} ${o.hairline} ${L(fw - 10 - r * 0.6)} ${66 - r}`,
    `C${L(fw - 4)} ${76 - r} ${L(cw - 6)} 90 ${L(cw - 6)} ${o.sideburn - 1}Z`,
  ].join('');
}

/** Linhas de fios saindo da linha de cabelo em direção ao topo. */
function capStrands(h: Head, hairline: number, top: number, sweep = 0): string[] {
  const out: string[] = [];
  for (let i = -5; i <= 5; i++) {
    const x = 100 + i * (h.fw / 6);
    out.push(`M${n(x)} ${n(hairline + 4 + Math.abs(i) * 1.6)} Q${n(x + sweep * 0.6 - i * 1.5)} ${n((hairline + top) / 2)} ${n(100 + i * 3 + sweep)} ${n(top + 4)}`);
  }
  return out;
}

/** Pontos ao longo de um arco de elipse, ligados por pequenas bossas (contorno de cabelo crespo). */
function scallop(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, count: number, bump: number, first: boolean): string {
  let d = '';
  for (let i = 0; i <= count; i++) {
    const a = a0 + ((a1 - a0) * i) / count;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if (i === 0) {
      d += `${first ? 'M' : 'L'}${n(x)} ${n(y)}`;
      continue;
    }
    const am = a - (a1 - a0) / count / 2;
    const k = bump * (0.75 + ((i * 37) % 10) / 20);
    d += `Q${n(cx + Math.cos(am) * (rx + k))} ${n(cy + Math.sin(am) * (ry + k))} ${n(x)} ${n(y)}`;
  }
  return d;
}

/** Textura de cachos: pequenos arcos espalhados dentro de uma elipse (acima de `maxY`). */
function curlTexture(cx: number, cy: number, rx: number, ry: number, maxY: number, size: number, p: Palette, minY = -Infinity): ReactElement {
  const arcs: string[] = [];
  const arcsLight: string[] = [];
  let i = 0;
  for (let y = cy - ry + size; y < Math.min(maxY, cy + ry); y += size * 1.15) {
    for (let x = cx - rx + size; x < cx + rx; x += size * 1.3) {
      i++;
      const jx = x + (((i * 53) % 10) / 10 - 0.5) * size;
      const jy = y + (((i * 29) % 10) / 10 - 0.5) * size;
      const dn = ((jx - cx) / rx) ** 2 + ((jy - cy) / ry) ** 2;
      if (dn > 0.86 || jy > maxY || jy < minY) continue;
      const r = size * (0.45 + ((i * 17) % 10) / 40);
      const arc = `M${n(jx - r)} ${n(jy)}a${n(r)} ${n(r)} 0 1 1 ${n(r * 1.6)} ${n(r * 0.9)}`;
      (i % 3 === 0 ? arcsLight : arcs).push(arc);
    }
  }
  return (
    <g fill="none" strokeLinecap="round">
      <path d={arcs.join('')} stroke={p.hairDark} strokeWidth="0.9" opacity="0.55" />
      <path d={arcsLight.join('')} stroke={p.hairLight} strokeWidth="0.8" opacity="0.4" />
    </g>
  );
}

/** Laterais em degradê (fade): o cabelo some aos poucos até a pele, acima das orelhas. */
function fadeSides(h: Head, fade: string, strength = 1): ReactElement {
  const { fw, cw } = h;
  const side = (s: 1 | -1) => {
    const X = (dx: number) => n(100 + s * dx);
    return `M${X(fw + 1)} 56C${X(cw + 1.5)} 70 ${X(cw + 1)} 88 ${X(cw - 1)} 101L${X(cw - 6)} 100C${X(cw - 6)} 88 ${X(fw - 5)} 72 ${X(fw - 10)} 62Z`;
  };
  return (
    <g fill={fade} opacity={strength}>
      <path d={side(-1)} />
      <path d={side(1)} />
    </g>
  );
}

/** Recorta uma textura no formato do cabelo (não vaza para fora da mecha). */
function Clipped({ id, d, children }: { id: string; d: string; children: ReactNode }) {
  return (
    <g>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
      <g clipPath={`url(#${id})`}>{children}</g>
    </g>
  );
}

function hairLayers(config: AvatarConfig, h: Head, p: Palette, grad: string): HairLayers {
  const fill = `url(#${grad})`;
  const fade = `url(#${grad.replace('hair-', 'fade-')})`;
  const { fw, cw } = h;
  const edge = { stroke: p.hairDark, strokeWidth: 0.6 };
  switch (config.hairStyle) {
    case 'bald':
      return { back: null, front: null };
    case 'buzz': {
      const d = capPath(h, { top: 33, hairline: 59, side: -1, sideburn: 100 });
      return {
        back: null,
        front: (
          <g>
            <path d={d} fill={p.hair} opacity="0.72" />
            <path d={d} fill="none" stroke={p.hairDark} strokeWidth="0.5" opacity="0.4" />
          </g>
        ),
      };
    }
    case 'short': {
      const d = capPath(h, { top: 29, hairline: 58, side: 1, sideburn: 103 });
      return {
        back: null,
        front: (
          <g>
            <path d={d} fill={fill} {...edge} />
            <Strands d={capStrands(h, 58, 29)} p={p} />
          </g>
        ),
      };
    }
    case 'side_part': {
      const d = [
        `M${L(cw - 2)} 102 L${L(cw + 1)} 84`,
        `C${L(fw + 7)} 52 ${L(fw)} 26 ${L(6)} 24`,
        `C${R(fw * 0.8)} 22 ${R(fw + 8)} 46 ${R(cw + 1)} 84 L${R(cw - 2)} 102 L${R(cw - 6)} 101`,
        `C${R(cw - 6)} 88 ${R(fw - 4)} 74 ${R(fw - 9)} 66`,
        `C${R(14)} 52 ${L(4)} 60 ${L(14)} 58`,
        `C${L(22)} 57 ${L(fw - 6)} 64 ${L(fw - 9)} 68`,
        `C${L(fw - 4)} 76 ${L(cw - 6)} 88 ${L(cw - 6)} 101Z`,
      ].join('');
      const strands: string[] = [];
      for (let i = 0; i < 9; i++) strands.push(`M${L(13 - i * 0.5)} ${n(30 + i * 0.4)} Q${R(8 + i * 3)} ${n(34 + i * 2)} ${R(fw - 6 + i * 0.3)} ${n(54 + i * 3)}`);
      for (let i = 0; i < 4; i++) strands.push(`M${L(14)} ${n(30 + i)} Q${L(fw - 2)} ${n(40 + i * 4)} ${L(cw - 2)} ${n(70 + i * 6)}`);
      return {
        back: null,
        front: (
          <g>
            <path d={d} fill={fill} {...edge} />
            <path d={`M${L(14)} 28 Q${L(14)} 44 ${L(14)} 57`} stroke={p.hairDark} strokeWidth="1" opacity="0.55" fill="none" />
            <Strands d={strands} p={p} />
          </g>
        ),
      };
    }
    case 'receding': {
      const d = capPath(h, { top: 31, hairline: 50, side: 0, sideburn: 102, recede: 10 });
      return {
        back: null,
        front: (
          <g>
            <path d={d} fill={fill} {...edge} opacity="0.95" />
            <Strands d={capStrands(h, 50, 31)} p={p} />
          </g>
        ),
      };
    }
    case 'wavy': {
      const d = [
        `M${L(cw - 3)} 112`,
        `C${L(cw + 6)} 96 ${L(fw + 10)} 60 ${L(fw)} 36`,
        `C${L(18)} 18 ${R(18)} 18 ${R(fw)} 36`,
        `C${R(fw + 10)} 60 ${R(cw + 6)} 96 ${R(cw - 3)} 112`,
        `C${R(cw - 7)} 100 ${R(cw - 6)} 84 ${R(fw - 6)} 70`,
        `C${R(20)} 64 ${R(8)} 52 ${L(6)} 58`,
        `C${L(18)} 62 ${L(fw - 4)} 62 ${L(fw - 6)} 72`,
        `C${L(cw - 6)} 84 ${L(cw - 7)} 100 ${L(cw - 3)} 112Z`,
      ].join('');
      const strands: string[] = [];
      for (let i = -4; i <= 4; i++)
        strands.push(`M${n(100 + i * 8)} 26 C${n(100 + i * 9 + 6)} 40 ${n(100 + i * 9 - 6)} 52 ${n(100 + i * 10.5)} ${n(64 + Math.abs(i) * 4)}`);
      return {
        back: <path d={`M${L(cw + 6)} 120 C${L(cw + 14)} 70 ${L(fw)} 22 100 22 C${R(fw)} 22 ${R(cw + 14)} 70 ${R(cw + 6)} 120Z`} fill={p.hairDark} />,
        front: (
          <g>
            <path d={d} fill={fill} {...edge} />
            <Strands d={strands} p={p} />
          </g>
        ),
      };
    }
    case 'curly': {
      const outer = `${scallop(100, 74, fw + 9, 46, Math.PI * 0.98, Math.PI * 2.02, 14, 3.2, true)}L${R(cw - 3)} 104L${R(cw - 7)} 103`;
      const inner = `${scallop(100, 74, fw - 7, 16, Math.PI * 2, Math.PI, 9, -2.2, false)}L${L(cw - 7)} 103L${L(cw - 3)} 104Z`;
      return {
        back: <path d={`${scallop(100, 80, fw + 12, 50, Math.PI * 0.9, Math.PI * 2.1, 16, 3.5, true)}Z`} fill={p.hairDark} />,
        front: (
          <g>
            <path d={outer + inner} fill={fill} {...edge} />
            {curlTexture(100, 74, fw + 6, 44, 64, 4.2, p)}
          </g>
        ),
      };
    }
    case 'afro': {
      const cloud = `${scallop(100, 64, fw + 28, 52, 0, Math.PI * 2, 30, 3.6, true)}Z`;
      const front = `${scallop(100, 72, fw + 4, 44, Math.PI * 0.98, Math.PI * 2.02, 12, 2.6, true)}L${R(cw - 3)} 104L${R(cw - 7)} 103${scallop(100, 74, fw - 6, 15, Math.PI * 2, Math.PI, 10, -1.8, false)}L${L(cw - 7)} 103L${L(cw - 3)} 104Z`;
      return {
        back: (
          <g>
            <path d={cloud} fill={fill} {...edge} />
            <path d={cloud} fill="#000" opacity="0.18" transform="translate(100 64) scale(0.98) translate(-100 -64)" />
            {curlTexture(100, 64, fw + 28, 52, 120, 4.6, p)}
          </g>
        ),
        front: (
          <g>
            <path d={front} fill={fill} />
            {curlTexture(100, 72, fw + 4, 42, 62, 4, p)}
          </g>
        ),
      };
    }
    case 'mohawk': {
      const ridge = 'M90 62 C87 46 90 24 100 18 C110 24 113 46 110 62 C104 58 96 58 90 62Z';
      return {
        back: null,
        front: (
          <g>
            <path d={capPath(h, { top: 33, hairline: 60, side: -1, sideburn: 98 })} fill={p.hair} opacity="0.3" />
            <path d={ridge} fill={fill} {...edge} />
            <Strands d={['M100 20 L99 58', 'M95 26 L93 58', 'M105 26 L107 58', 'M92 36 L91 58', 'M108 36 L109 58']} p={p} />
          </g>
        ),
      };
    }
    case 'bob': {
      const back = `M${L(cw + 8)} 146 C${L(cw + 14)} 90 ${L(fw + 6)} 24 100 22 C${R(fw + 6)} 24 ${R(cw + 14)} 90 ${R(cw + 8)} 146 C${R(cw)} 150 ${R(cw - 6)} 146 ${R(cw - 6)} 140 L${L(cw - 6)} 140 C${L(cw - 6)} 146 ${L(cw)} 150 ${L(cw + 8)} 146Z`;
      const front = [
        `M${L(cw + 8)} 144`,
        `C${L(cw + 12)} 92 ${L(fw + 6)} 26 100 24`,
        `C${R(fw + 6)} 26 ${R(cw + 12)} 92 ${R(cw + 8)} 144`,
        `C${R(cw + 2)} 146 ${R(cw - 3)} 140 ${R(cw - 3)} 132`,
        `C${R(cw - 4)} 104 ${R(fw - 2)} 84 ${R(fw - 6)} 76`,
        `C${R(24)} 82 ${R(8)} 80 100 79 C${L(8)} 80 ${L(24)} 82 ${L(fw - 6)} 76`,
        `C${L(fw - 2)} 84 ${L(cw - 4)} 104 ${L(cw - 3)} 132`,
        `C${L(cw - 3)} 140 ${L(cw + 2)} 146 ${L(cw + 8)} 144Z`,
      ].join('');
      const strands: string[] = [];
      for (let i = -5; i <= 5; i++) strands.push(`M${n(100 + i * 4)} 28 Q${n(100 + i * 7)} 50 ${n(100 + i * 8.5)} 78`);
      for (let i = 0; i < 4; i++) {
        strands.push(`M${L(fw - 4 + i * 2)} 40 Q${L(cw + 8 + i)} 90 ${L(cw + 2 + i * 2)} 140`);
        strands.push(`M${R(fw - 4 + i * 2)} 40 Q${R(cw + 8 + i)} 90 ${R(cw + 2 + i * 2)} 140`);
      }
      return {
        back: <path d={back} fill={p.hairDark} />,
        front: (
          <g>
            <path d={front} fill={fill} {...edge} />
            <Strands d={strands} p={p} />
          </g>
        ),
      };
    }
    case 'long': {
      const back = `M${L(cw + 10)} 206 C${L(cw + 18)} 140 ${L(cw + 16)} 60 ${L(fw)} 34 C${L(16)} 18 ${R(16)} 18 ${R(fw)} 34 C${R(cw + 16)} 60 ${R(cw + 18)} 140 ${R(cw + 10)} 206Z`;
      const front = [
        `M${L(cw + 6)} 178`,
        `C${L(cw + 12)} 120 ${L(fw + 8)} 30 ${L(2)} 25`,
        `L${R(2)} 25`,
        `C${R(fw + 8)} 30 ${R(cw + 12)} 120 ${R(cw + 6)} 178`,
        `C${R(cw + 1)} 160 ${R(cw - 3)} 130 ${R(cw - 4)} 108`,
        `C${R(cw - 5)} 86 ${R(fw - 4)} 66 ${R(4)} 54`,
        `L100 56 L${L(4)} 54`,
        `C${L(fw - 4)} 66 ${L(cw - 5)} 86 ${L(cw - 4)} 108`,
        `C${L(cw - 3)} 130 ${L(cw + 1)} 160 ${L(cw + 6)} 178Z`,
      ].join('');
      const strands: string[] = [];
      for (let i = 0; i < 6; i++) {
        strands.push(`M${L(3 + i * 2)} 28 C${L(fw + i)} 50 ${L(cw + 4 + i)} 110 ${L(cw + 2 + i * 1.5)} 175`);
        strands.push(`M${R(3 + i * 2)} 28 C${R(fw + i)} 50 ${R(cw + 4 + i)} 110 ${R(cw + 2 + i * 1.5)} 175`);
      }
      return {
        back: <path d={back} fill={p.hairDark} />,
        front: (
          <g>
            <path d={front} fill={fill} {...edge} />
            <Strands d={strands} p={p} />
          </g>
        ),
      };
    }
    case 'ponytail':
    case 'bun':
    case 'braids': {
      const tight = capPath(h, { top: 30, hairline: 59, side: 0, sideburn: 92 });
      const strands = capStrands(h, 59, 30);
      let back: ReactNode;
      if (config.hairStyle === 'ponytail')
        back = (
          <g>
            <path d={`M${R(fw - 4)} 46 C${R(fw + 22)} 56 ${R(cw + 18)} 110 ${R(cw + 10)} 170 C${R(cw + 4)} 150 ${R(cw + 4)} 100 ${R(fw - 8)} 60Z`} fill={fill} {...edge} />
            <Strands d={[`M${R(fw)} 52 C${R(fw + 16)} 70 ${R(cw + 14)} 120 ${R(cw + 9)} 165`, `M${R(fw - 2)} 56 C${R(fw + 12)} 76 ${R(cw + 10)} 120 ${R(cw + 6)} 160`]} p={p} />
          </g>
        );
      else if (config.hairStyle === 'bun')
        back = (
          <g>
            <circle cx="100" cy="24" r="15" fill={fill} {...edge} />
            <Strands d={['M88 20 Q100 12 112 22', 'M90 28 Q100 20 110 30', 'M92 16 Q100 10 108 16']} p={p} />
          </g>
        );
      else {
        const braid = (side: 1 | -1) => {
          const out: ReactElement[] = [];
          for (let i = 0; i < 8; i++) {
            const x = 100 + side * (cw + 6 + i * 0.6);
            const y = 112 + i * 11;
            out.push(<ellipse key={`${side}-${i}`} cx={n(x)} cy={n(y)} rx="5.5" ry="7" fill={i % 2 ? p.hair : p.hairDark} stroke={p.hairDark} strokeWidth="0.6" />);
          }
          return out;
        };
        back = (
          <g>
            {braid(-1)}
            {braid(1)}
          </g>
        );
      }
      return {
        back,
        front: (
          <g>
            <path d={tight} fill={fill} {...edge} />
            <path d="M100 30 L100 58" stroke={p.hairDark} strokeWidth="0.9" opacity="0.5" />
            <Strands d={strands} p={p} />
          </g>
        ),
      };
    }
    case 'fade':
    case 'crew_cut':
    case 'waves':
    case 'high_top':
    case 'man_bun':
    case 'pompadour':
    case 'undercut': {
      const style = config.hairStyle;
      const sides = style === 'crew_cut' ? null : fadeSides(h, fade);
      if (style === 'fade' || style === 'crew_cut') {
        const d = capPath(h, { top: style === 'fade' ? 31 : 30, hairline: 58, side: -1, sideburn: style === 'fade' ? 84 : 98 });
        return {
          back: null,
          front: (
            <g>
              {sides}
              <path d={d} fill={fill} stroke={p.hairDark} strokeWidth="1" />
              {style === 'fade' ? (
                <Clipped id={`${grad}-fd`} d={d}>
                  {curlTexture(100, 46, fw, 20, 62, 2.4, p)}
                </Clipped>
              ) : (
                <Strands d={capStrands(h, 58, 30)} p={p} />
              )}
            </g>
          ),
        };
      }
      if (style === 'waves') {
        const d = capPath(h, { top: 31, hairline: 58, side: -1, sideburn: 90 });
        const clip = `${grad}-wv`;
        const rings: string[] = [];
        for (let r = 5; r < 48; r += 3.6) {
          let ring = '';
          for (let a = 0; a <= 64; a++) {
            const t = (a / 64) * Math.PI * 2;
            const rr = r + Math.sin(t * 9 + r) * 0.9;
            ring += `${a === 0 ? 'M' : 'L'}${n(100 + Math.cos(t) * rr * 1.1)} ${n(36 + Math.sin(t) * rr * 0.75)}`;
          }
          rings.push(ring);
        }
        return {
          back: null,
          front: (
            <g>
              {sides}
              <clipPath id={clip}>
                <path d={d} />
              </clipPath>
              <path d={d} fill={fill} stroke={p.hairDark} strokeWidth="1" />
              <g clipPath={`url(#${clip})`} fill="none">
                {rings.map((r, i) => (
                  <path key={i} d={r} stroke={i % 2 ? p.hairLight : p.hairDark} strokeWidth="1.1" opacity={i % 2 ? 0.45 : 0.55} />
                ))}
              </g>
            </g>
          ),
        };
      }
      if (style === 'high_top') {
        const d = `M${L(fw - 2)} 66C${L(fw)} 44 ${L(fw - 1)} 14 ${L(fw - 5)} 6L${R(fw - 5)} 6C${R(fw - 1)} 14 ${R(fw)} 44 ${R(fw - 2)} 66C${R(20)} 58 ${L(20)} 58 ${L(fw - 2)} 66Z`;
        return {
          back: null,
          front: (
            <g>
              {sides}
              <path d={d} fill={fill} stroke={p.hairDark} strokeWidth="1" />
              <Clipped id={`${grad}-ht`} d={d}>
                {curlTexture(100, 34, fw - 3, 30, 62, 3, p, 6)}
              </Clipped>
            </g>
          ),
        };
      }
      if (style === 'man_bun') {
        const d = capPath(h, { top: 31, hairline: 58, side: -1, sideburn: 82 });
        return {
          back: (
            <g>
              <circle cx="100" cy="27" r="11" fill={fill} stroke={p.hairDark} strokeWidth="0.6" />
              <Strands d={['M91 24 Q100 16 109 25', 'M92 30 Q100 22 108 31']} p={p} />
            </g>
          ),
          front: (
            <g>
              {sides}
              <path d={d} fill={fill} stroke={p.hairDark} strokeWidth="0.8" />
              <Strands d={capStrands(h, 58, 31, 0)} p={p} />
            </g>
          ),
        };
      }
      if (style === 'pompadour') {
        const d = `M${L(fw - 2)} 72C${L(fw + 2)} 46 ${L(fw - 6)} 16 98 12C${R(fw - 2)} 10 ${R(fw + 6)} 34 ${R(fw - 2)} 66C${R(18)} 52 ${R(4)} 48 ${L(8)} 54C${L(18)} 58 ${L(fw - 6)} 62 ${L(fw - 2)} 72Z`;
        const strands: string[] = [];
        for (let i = 0; i < 9; i++) strands.push(`M${L(fw - 6 - i)} ${n(64 - i)} C${L(14 - i * 2)} ${n(30 - i)} ${R(6 + i * 2)} ${n(16 + i)} ${R(fw - 4)} ${n(42 + i * 2)}`);
        return {
          back: null,
          front: (
            <g>
              {sides}
              <path d={d} fill={fill} stroke={p.hairDark} strokeWidth="0.8" />
              <Strands d={strands} p={p} />
            </g>
          ),
        };
      }
      // undercut: laterais raspadas, topo longo jogado para o lado.
      const d = `M${L(fw - 6)} 62C${L(fw)} 36 ${L(10)} 20 100 20C${R(fw)} 20 ${R(fw + 8)} 46 ${R(fw + 2)} 76C${R(fw - 6)} 70 ${R(12)} 66 ${L(4)} 61C${L(14)} 59 ${L(fw - 10)} 63 ${L(fw - 6)} 62Z`;
      const strands: string[] = [];
      for (let i = 0; i < 9; i++) strands.push(`M${L(fw - 8 + i * 2)} ${n(54 - i)} C${L(4 - i * 3)} ${n(24 + i)} ${R(18 + i)} ${n(28 + i * 2)} ${R(fw + 1 - i * 0.4)} ${n(66 + i)}`);
      return {
        back: null,
        front: (
          <g>
            {fadeSides(h, fade, 0.55)}
            <path d={d} fill={fill} stroke={p.hairDark} strokeWidth="0.8" />
            <Strands d={strands} p={p} />
          </g>
        ),
      };
    }
    case 'cornrows': {
      const d = capPath(h, { top: 31, hairline: 58, side: -1, sideburn: 92 });
      const clip = `${grad}-cr`;
      const rows: string[] = [];
      for (let i = -4; i <= 4; i++) rows.push(`M${n(100 + i * 8.6)} ${n(62 + Math.abs(i) * 2.4)} C${n(100 + i * 8)} 46 ${n(100 + i * 5.5)} 34 ${n(100 + i * 4)} 26`);
      return {
        back: null,
        front: (
          <g>
            <clipPath id={clip}>
              <path d={d} />
            </clipPath>
            <path d={d} fill={mix(p.hair, p.skin, 0.45)} />
            <g clipPath={`url(#${clip})`} fill="none" strokeLinecap="round">
              {rows.map((r, i) => (
                <g key={i}>
                  <path d={r} stroke={p.hair} strokeWidth="6.4" />
                  <path d={r} stroke={p.hairDark} strokeWidth="6.4" strokeDasharray="2.2 2.6" opacity="0.55" />
                  <path d={r} stroke={p.hairLight} strokeWidth="1" opacity="0.35" />
                </g>
              ))}
            </g>
            <path d={d} fill="none" stroke={p.hairDark} strokeWidth="0.8" />
          </g>
        ),
      };
    }
    case 'dreads':
    case 'twists': {
      const d = capPath(h, { top: 28, hairline: 58, side: 2, sideburn: 96 });
      if (config.hairStyle === 'twists') {
        const twists: string[] = [];
        for (let i = 0; i <= 18; i++) {
          const a = Math.PI * (1.0 + i / 18);
          const x0 = 100 + Math.cos(a) * (fw + 2);
          const y0 = 62 + Math.sin(a) * 32;
          const out = Math.cos(a);
          const len = 22 - Math.abs(Math.sin(a)) * 6;
          const x1 = x0 + out * 7;
          const y1 = Math.min(y0 + len, 74 + Math.abs(out) * 34);
          twists.push(`M${n(x0)} ${n(y0)} C${n(x0 + out * 8)} ${n(y0 + 4)} ${n(x1 + out * 2)} ${n(y1 - 8)} ${n(x1)} ${n(y1)}`);
        }
        const drawn = twists.map((t, i) => (
          <g key={i}>
            <path d={t} stroke={i % 2 ? p.hair : p.hairDark} strokeWidth="5" />
            <path d={t} stroke={p.hairLight} strokeWidth="5" strokeDasharray="1.2 2.4" opacity="0.35" />
          </g>
        ));
        return {
          back: (
            <g fill="none" strokeLinecap="round">
              <path d={`M${L(cw + 6)} 104 C${L(cw + 12)} 56 ${L(fw)} 24 100 24 C${R(fw)} 24 ${R(cw + 12)} 56 ${R(cw + 6)} 104Z`} fill={p.hairDark} />
            </g>
          ),
          front: (
            <g fill="none" strokeLinecap="round">
              <path d={d} fill={fill} stroke={p.hairDark} strokeWidth="0.8" />
              {drawn}
            </g>
          ),
        };
      }
      const loc = (x0: number, y0: number, x1: number, y1: number, bend: number) =>
        `M${n(x0)} ${n(y0)} C${n(x0 + bend)} ${n((y0 + y1) / 2 - 10)} ${n(x1 - bend)} ${n((y0 + y1) / 2 + 10)} ${n(x1)} ${n(y1)}`;
      const backLocs: string[] = [];
      for (let i = 0; i < 12; i++) {
        const s = i % 2 ? 1 : -1;
        const k = Math.floor(i / 2);
        backLocs.push(loc(100 + s * (fw - 8 + k * 2), 50 + k * 3, 100 + s * (cw + 4 + k * 3), 168 + (k % 3) * 10, s * 3));
      }
      const frontLocs: string[] = [];
      for (let i = 0; i < 8; i++) {
        const s = i % 2 ? 1 : -1;
        const k = Math.floor(i / 2);
        frontLocs.push(loc(100 + s * (fw - 10 + k * 4), 58 + k * 2, 100 + s * (cw + 1 + k * 2.5), 132 + k * 9, s * 2));
      }
      const drawLocs = (list: string[]) =>
        list.map((l, i) => (
          <g key={i}>
            <path d={l} stroke={i % 3 ? p.hair : p.hairDark} strokeWidth="5.2" />
            <path d={l} stroke={p.hairDark} strokeWidth="5.2" strokeDasharray="1 3" opacity="0.45" />
            <path d={l} stroke={p.hairLight} strokeWidth="1" opacity="0.3" />
          </g>
        ));
      return {
        back: (
          <g fill="none" strokeLinecap="round">
            {drawLocs(backLocs)}
          </g>
        ),
        front: (
          <g>
            <path d={d} fill={fill} stroke={p.hairDark} strokeWidth="0.8" />
            <g fill="none" strokeLinecap="round">
              {drawLocs(frontLocs)}
            </g>
          </g>
        ),
      };
    }
    case 'slick_back': {
      const d = capPath(h, { top: 31, hairline: 55, side: -1, sideburn: 96 });
      const strands: string[] = [];
      for (let i = -5; i <= 5; i++) strands.push(`M${n(100 + i * 6)} ${n(57 + Math.abs(i) * 1.5)} C${n(100 + i * 6.5)} 46 ${n(100 + i * 5)} 38 ${n(100 + i * 4)} 31`);
      return {
        back: null,
        front: (
          <g>
            <path d={d} fill={fill} stroke={p.hairDark} strokeWidth="0.8" />
            <Strands d={strands} p={p} />
            <ellipse cx="92" cy="42" rx="12" ry="4" fill="#ffffff" opacity="0.14" transform="rotate(-12 92 42)" />
          </g>
        ),
      };
    }
    case 'pixie': {
      const d = [
        `M${L(cw - 3)} 98 L${L(cw + 1)} 84`,
        `C${L(fw + 6)} 56 ${L(fw)} 26 100 24`,
        `C${R(fw)} 26 ${R(fw + 6)} 56 ${R(cw + 1)} 84 L${R(cw - 3)} 98 L${R(cw - 7)} 96`,
        `C${R(cw - 7)} 84 ${R(fw - 4)} 72 ${R(fw - 6)} 66`,
        `C${R(16)} 70 ${R(8)} 60 ${R(2)} 66 C${L(6)} 72 ${L(14)} 70 ${L(22)} 76 C${L(28)} 72 ${L(fw - 8)} 70 ${L(fw - 6)} 68`,
        `C${L(fw - 4)} 76 ${L(cw - 7)} 86 ${L(cw - 7)} 96Z`,
      ].join('');
      const strands: string[] = [];
      for (let i = -5; i <= 5; i++) strands.push(`M${n(100 + i * 4)} 28 Q${n(100 + i * 6 - 8)} 50 ${n(100 + i * 5 - 6)} 70`);
      return {
        back: null,
        front: (
          <g>
            <path d={d} fill={fill} stroke={p.hairDark} strokeWidth="0.8" />
            <Strands d={strands} p={p} />
          </g>
        ),
      };
    }
    default:
      return { back: null, front: null };
  }
}

/* ──────────────── Olhos e sobrancelhas ──────────────── */

function eyeShape(style: AvatarConfig['eyes'], expression: AvatarConfig['expression']) {
  const base = {
    almond: { w: 8.2, top: 4.4, bot: 3, tilt: -1.2, iris: 4.1 },
    round: { w: 7.6, top: 5.1, bot: 3.9, tilt: 0, iris: 4.2 },
    wide: { w: 8.6, top: 5.6, bot: 4.2, tilt: 0, iris: 4.3 },
    narrow: { w: 8.2, top: 3.1, bot: 2.3, tilt: -0.8, iris: 3.9 },
    sleepy: { w: 8.2, top: 3, bot: 3, tilt: 0.8, iris: 4 },
  }[style];
  const e = { ...base };
  if (expression === 'laugh') {
    e.top *= 0.55;
    e.bot *= 0.45;
  } else if (expression === 'smile') e.bot *= 0.78;
  else if (expression === 'surprised') {
    e.top *= 1.25;
    e.bot *= 1.1;
  } else if (expression === 'determined' || expression === 'serious') e.top *= 0.86;
  return e;
}

function Eye({ cx, cy, side, config, p, uid, fem }: { cx: number; cy: number; side: 1 | -1; config: AvatarConfig; p: Palette; uid: string; fem: boolean }) {
  const e = eyeShape(config.eyes, config.expression);
  const s = side;
  const ix = cx - s * e.w;
  const ox = cx + s * e.w;
  const oy = cy + e.tilt;
  const top = `M${n(ix)} ${n(cy)}C${n(cx - s * e.w * 0.45)} ${n(cy - e.top * 1.25)} ${n(cx + s * e.w * 0.55)} ${n(cy - e.top * 1.15)} ${n(ox)} ${n(oy)}`;
  const bottom = `C${n(cx + s * e.w * 0.5)} ${n(cy + e.bot * 1.2)} ${n(cx - s * e.w * 0.45)} ${n(cy + e.bot * 1.1)} ${n(ix)} ${n(cy)}`;
  const shape = `${top}${bottom}Z`;
  const crease = `M${n(ix + s * 0.5)} ${n(cy - 2.5)}C${n(cx - s * e.w * 0.45)} ${n(cy - e.top * 1.25 - 3.6)} ${n(cx + s * e.w * 0.55)} ${n(cy - e.top * 1.15 - 3.4)} ${n(ox + s * 0.6)} ${n(oy - 2.2)}`;
  const lower = `M${n(ox)} ${n(oy)}${bottom}`;
  const id = `eye-${uid}-${s > 0 ? 'r' : 'l'}`;
  const irisY = cy + 0.4;
  return (
    <g>
      {/* órbita */}
      <ellipse cx={n(cx)} cy={n(cy - 1)} rx="12" ry="7" fill={p.shadow} opacity="0.22" filter={`url(#blur-${uid})`} />
      <clipPath id={id}>
        <path d={shape} />
      </clipPath>
      <path d={shape} fill="#f3eee8" />
      <g clipPath={`url(#${id})`}>
        <circle cx={n(cx)} cy={n(irisY)} r={n(e.iris)} fill={`url(#iris-${uid})`} />
        <circle cx={n(cx)} cy={n(irisY)} r={n(e.iris)} fill="none" stroke={shade(config.eyeColor, -0.6)} strokeWidth="0.7" />
        <circle cx={n(cx)} cy={n(irisY)} r="1.85" fill="#0d0a09" />
        <circle cx={n(cx - 1.4)} cy={n(irisY - 1.5)} r="1.05" fill="#ffffff" opacity="0.92" />
        <circle cx={n(cx + 1.3)} cy={n(irisY + 1.1)} r="0.45" fill="#ffffff" opacity="0.6" />
        {/* sombra da pálpebra sobre o olho */}
        <path d={top} fill="none" stroke="#000" strokeWidth="2.6" opacity="0.22" />
      </g>
      <path d={crease} fill="none" stroke={p.deep} strokeWidth="0.8" opacity="0.45" strokeLinecap="round" />
      <path d={lower} fill="none" stroke={p.deep} strokeWidth="0.6" opacity="0.4" />
      <path d={top} fill="none" stroke="#1d140f" strokeWidth={fem ? 1.9 : 1.3} strokeLinecap="round" />
      {fem && (
        <g stroke="#1d140f" strokeWidth="0.8" strokeLinecap="round">
          <path d={`M${n(ox)} ${n(oy)} l${n(s * 2.2)} ${n(-1.6)}`} />
          <path d={`M${n(ox - s * 2)} ${n(oy - 1.8)} l${n(s * 1.6)} ${n(-2)}`} />
          <path d={`M${n(ox - s * 4)} ${n(oy - 2.8)} l${n(s * 1)} ${n(-2)}`} />
        </g>
      )}
    </g>
  );
}

function Brow({ cx, cy, side, config, p }: { cx: number; cy: number; side: 1 | -1; config: AvatarConfig; p: Palette }) {
  const s = side;
  const style = config.eyebrows;
  const t = style === 'thick' ? 3.6 : style === 'thin' ? 1.5 : config.presentation === 'feminine' ? 2 : 2.6;
  const arch = style === 'arched' ? 3.6 : style === 'straight' ? 1 : style === 'thin' ? 2.6 : 1.6;
  let lift = 0;
  let innerDrop = style === 'angry' ? 2.6 : 0;
  if (config.expression === 'surprised') lift = -3.2;
  if (config.expression === 'laugh') lift = -1;
  if (config.expression === 'determined') innerDrop += 1.6;
  if (config.expression === 'serious') innerDrop += 0.6;
  const by = cy - 11 + lift;
  const ix = cx - s * 8.5;
  const ox = cx + s * 11;
  const iy = by + innerDrop;
  const oy = by + 1.6;
  const px = cx + s * 2.5;
  const py = by - arch;
  const d = [
    `M${n(ix)} ${n(iy - t * 0.55)}`,
    `Q${n(px)} ${n(py - t * 0.5)} ${n(ox)} ${n(oy)}`,
    `Q${n(px)} ${n(py + t * 0.55)} ${n(ix)} ${n(iy + t * 0.5)}Z`,
  ].join('');
  return <path d={d} fill={p.brow} opacity="0.92" />;
}

/* ──────────────── Nariz e boca ──────────────── */

function Nose({ h, p, uid }: { h: Head; p: Palette; uid: string }) {
  const y = h.noseY;
  return (
    <g>
      <path d={`M104 ${h.eyeY + 2} C106 ${y - 14} 107 ${y - 7} 108 ${y - 3}`} fill="none" stroke={p.shadow} strokeWidth="3" opacity="0.45" filter={`url(#blur-${uid})`} />
      <path d={`M98 ${h.eyeY + 3} L97 ${y - 6}`} stroke={p.light} strokeWidth="2.2" opacity="0.35" filter={`url(#blur-${uid})`} />
      <ellipse cx="100" cy={y - 3} rx="4.6" ry="3.4" fill={p.light} opacity="0.35" filter={`url(#blur-${uid})`} />
      <ellipse cx="100" cy={y + 4} rx="7" ry="2" fill={p.shadow} opacity="0.35" filter={`url(#blur-${uid})`} />
      <g fill="none" stroke={p.deep} strokeWidth="1.2" strokeLinecap="round" opacity="0.55">
        <path d={`M94 ${y - 4} C91 ${y - 2} 91 ${y + 2} 95.5 ${y + 2}`} />
        <path d={`M106 ${y - 4} C109 ${y - 2} 109 ${y + 2} 104.5 ${y + 2}`} />
      </g>
      <ellipse cx="96.6" cy={y + 1.3} rx="1.9" ry="1" fill={p.deep} opacity="0.6" />
      <ellipse cx="103.4" cy={y + 1.3} rx="1.9" ry="1" fill={p.deep} opacity="0.6" />
    </g>
  );
}

function Mouth({ h, p, config, uid }: { h: Head; p: Palette; config: AvatarConfig; uid: string }) {
  const fem = config.presentation === 'feminine';
  const ex = config.expression;
  const my = h.mouthY;
  const mw = fem ? 12 : 11;
  const upper = shade(p.lip, -0.12);
  const lower = mix(p.lip, '#ffffff', 0.06);
  const liftL = ex === 'smile' ? 2.6 : ex === 'laugh' ? 3.6 : ex === 'confident' ? 0.6 : ex === 'determined' ? -0.8 : 0;
  const liftR = ex === 'smile' ? 2.6 : ex === 'laugh' ? 3.6 : ex === 'confident' ? 2.8 : ex === 'determined' ? -0.8 : 0;
  const thin = ex === 'determined' ? 0.7 : 1;
  const lx = 100 - mw;
  const rx = 100 + mw;
  const ly = my - liftL;
  const ry = my - liftR;
  const folds = (
    <g fill="none" stroke={p.shadow} strokeLinecap="round" strokeWidth="1.3" opacity={ex === 'smile' || ex === 'laugh' ? 0.45 : 0.22} filter={`url(#blur-s-${uid})`}>
      <path d={`M92 ${h.noseY + 1} C87 ${h.noseY + 6} 86 ${my - 4} ${n(lx - 2.5)} ${n(ly + 3)}`} />
      <path d={`M108 ${h.noseY + 1} C113 ${h.noseY + 6} 114 ${my - 4} ${n(rx + 2.5)} ${n(ry + 3)}`} />
    </g>
  );
  const chin = <ellipse cx="100" cy={my + 8} rx="6" ry="1.8" fill={p.shadow} opacity="0.3" filter={`url(#blur-${uid})`} />;
  if (ex === 'laugh' || ex === 'surprised') {
    const open =
      ex === 'laugh'
        ? `M${n(lx)} ${n(ly)}C${n(100 - mw * 0.6)} ${n(my - 2)} ${n(100 + mw * 0.6)} ${n(my - 2)} ${n(rx)} ${n(ry)}C${n(100 + mw * 0.6)} ${n(my + 9)} ${n(100 - mw * 0.6)} ${n(my + 9)} ${n(lx)} ${n(ly)}Z`
        : `M95.5 ${my + 1}C95.5 ${my - 4} 104.5 ${my - 4} 104.5 ${my + 1}C104.5 ${my + 7} 95.5 ${my + 7} 95.5 ${my + 1}Z`;
    const clip = `mouth-${uid}`;
    return (
      <g>
        {folds}
        {chin}
        <path d={open} fill={p.lip} transform={`translate(0 -1.2) scale(1 1)`} opacity="0.9" />
        <clipPath id={clip}>
          <path d={open} />
        </clipPath>
        <path d={open} fill="#3a1414" />
        <g clipPath={`url(#${clip})`}>
          {ex === 'laugh' && <rect x={lx} y={my - 3} width={mw * 2} height="4.6" fill="#f1ece4" />}
          <ellipse cx="100" cy={my + 8} rx="7" ry="3.6" fill="#b5525a" />
        </g>
        <path d={open} fill="none" stroke={shade(p.lip, -0.2)} strokeWidth="1.4" />
      </g>
    );
  }
  const k = ex === 'smile' ? 1.6 : ex === 'confident' ? 0.9 : 0.3;
  const line = `M${n(lx)} ${n(ly)}C${n(100 - mw * 0.5)} ${n(my + k)} ${n(100 + mw * 0.5)} ${n(my + k)} ${n(rx)} ${n(ry)}`;
  const upperPath = `M${n(lx)} ${n(ly)}C${n(100 - mw * 0.6)} ${n(my - 3.2 * thin)} ${n(97.8)} ${n(my - 3.7 * thin)} 100 ${n(my - 2.7 * thin)}C${n(102.2)} ${n(my - 3.7 * thin)} ${n(100 + mw * 0.6)} ${n(my - 3.2 * thin)} ${n(rx)} ${n(ry)}C${n(100 + mw * 0.5)} ${n(my + k)} ${n(100 - mw * 0.5)} ${n(my + k)} ${n(lx)} ${n(ly)}Z`;
  const lowerPath = `M${n(lx)} ${n(ly)}C${n(100 - mw * 0.5)} ${n(my + k)} ${n(100 + mw * 0.5)} ${n(my + k)} ${n(rx)} ${n(ry)}C${n(100 + mw * 0.6)} ${n(my + (fem ? 5.6 : 4.6) * thin + k * 0.5)} ${n(100 - mw * 0.6)} ${n(my + (fem ? 5.6 : 4.6) * thin + k * 0.5)} ${n(lx)} ${n(ly)}Z`;
  return (
    <g>
      {folds}
      {chin}
      <path d={lowerPath} fill={lower} />
      <path d={upperPath} fill={upper} />
      <ellipse cx="100" cy={n(my + 2.4 * thin + k * 0.4)} rx="3.6" ry="0.9" fill="#ffffff" opacity="0.22" />
      <path d={line} fill="none" stroke={shade(p.lip, -0.45)} strokeWidth="1.1" strokeLinecap="round" />
      {(ex === 'smile' || ex === 'confident') && (
        <g fill="none" stroke={p.shadow} strokeWidth="0.9" strokeLinecap="round" opacity="0.5">
          {ex === 'smile' && <path d={`M${n(lx - 1)} ${n(ly - 1.5)} q-1.2 1.8 0.2 3.6`} />}
          <path d={`M${n(rx + 1)} ${n(ry - 1.5)} q1.2 1.8 -0.2 3.6`} />
        </g>
      )}
    </g>
  );
}

/* ──────────────── Barba ──────────────── */

function Beard({ h, p, config, uid }: { h: Head; p: Palette; config: AvatarConfig; uid: string }) {
  const style = config.beard;
  if (style === 'none') return null;
  const my = h.mouthY;
  const ny = h.noseY;
  const color = shade(p.hair, -0.1);
  const mustache = `M${L(13)} ${my + 1}C${L(12.5)} ${my - 5} ${L(5)} ${ny + 2.6} 100 ${ny + 3.6}C${R(5)} ${ny + 2.6} ${R(12.5)} ${my - 5} ${R(13)} ${my + 1}C${R(9)} ${my - 2.2} ${L(9)} ${my - 2.2} ${L(13)} ${my + 1}Z`;
  const goatee = `M${L(10)} ${my + 4.5}C${L(11)} ${h.chinY - 2} ${L(5)} ${h.chinY + 3} 100 ${h.chinY + 3}C${R(5)} ${h.chinY + 3} ${R(11)} ${h.chinY - 2} ${R(10)} ${my + 4.5}C${R(4)} ${my + 3.5} ${L(4)} ${my + 3.5} ${L(10)} ${my + 4.5}Z`;
  // Área da barba: contorno do maxilar + linha das bochechas até o bigode.
  const area = (grow: number) =>
    `${jawOutline(h, grow)}C${R(h.cw - 2)} 124 ${R(24)} ${my - 1} ${R(14)} ${my - 3}C${R(9)} ${ny + 3} ${L(9)} ${ny + 3} ${L(14)} ${my - 3}C${L(24)} ${my - 1} ${L(h.cw - 2)} 124 ${L(h.cw - 1 + grow * 0.3)} 101Z`;
  const texture: string[] = [];
  for (let i = -6; i <= 6; i++) texture.push(`M${n(100 + i * 5.5)} ${n(my + 2 + Math.abs(i))} L${n(100 + i * 6.2)} ${n(h.chinY - 1 - Math.abs(i) * 1.5)}`);
  switch (style) {
    case 'stubble':
      return (
        <g>
          <path d={area(0)} fill={color} opacity="0.22" filter={`url(#blur-${uid})`} />
          <path d={mustache} fill={color} opacity="0.26" filter={`url(#blur-s-${uid})`} />
        </g>
      );
    case 'mustache':
      return <path d={mustache} fill={`url(#beard-${uid})`} stroke={p.hairDark} strokeWidth="0.5" />;
    case 'goatee':
      return (
        <g>
          <path d={mustache} fill={`url(#beard-${uid})`} stroke={p.hairDark} strokeWidth="0.5" />
          <path d={goatee} fill={`url(#beard-${uid})`} stroke={p.hairDark} strokeWidth="0.5" />
        </g>
      );
    case 'chin':
      return (
        <g>
          <path d={`${jawOutline(h, 3)}C${R(h.cw - 2.5)} 118 ${R(h.jw - 2)} ${h.jawY - 2} ${R(h.chinW + 3)} ${h.chinY - 5}C${R(5)} ${h.chinY - 2} ${L(5)} ${h.chinY - 2} ${L(h.chinW + 3)} ${h.chinY - 5}C${L(h.jw - 2)} ${h.jawY - 2} ${L(h.cw - 2.5)} 118 ${L(h.cw - 1 + 0.9)} 101Z`} fill={`url(#beard-${uid})`} stroke={p.hairDark} strokeWidth="0.5" />
          <Strands d={texture.filter((_, i) => i % 2 === 0)} p={p} />
        </g>
      );
    default:
      return (
        <g>
          <path d={area(3)} fill={color} opacity="0.35" filter={`url(#blur-${uid})`} />
          <path d={area(2.5)} fill={`url(#beard-${uid})`} filter={`url(#blur-s-${uid})`} />
          <path d={mustache} fill={color} opacity="0.9" />
          <Strands d={texture} p={p} />
        </g>
      );
  }
}

/* ──────────────── Óculos ──────────────── */

function Glasses({ style, h }: { style: AvatarConfig['glasses']; h: Head }) {
  if (style === 'none') return null;
  const y = h.eyeY;
  const lx = 100 - h.eyeDx;
  const rx = 100 + h.eyeDx;
  const frame = style === 'aviator' ? '#b8955a' : style === 'half' ? '#3b2a20' : '#1c1c1e';
  const lens = style === 'sunglasses' ? '#0f1216' : '#ffffff';
  const lensOpacity = style === 'sunglasses' ? 0.88 : 0.07;
  const shape = (cx: number) => {
    switch (style) {
      case 'round':
        return <circle cx={cx} cy={y} r="10.5" />;
      case 'square':
      case 'half':
        return <rect x={cx - 11.5} y={y - 7.5} width="23" height="15.5" rx="3.5" />;
      default: {
        const s = cx < 100 ? -1 : 1;
        return <path d={`M${cx - s * 11} ${y - 7}C${cx - s * 4} ${y - 9} ${cx + s * 11} ${y - 9} ${cx + s * 11.5} ${y - 4}C${cx + s * 12} ${y + 6} ${cx + s * 4} ${y + 11} ${cx - s * 3} ${y + 8}C${cx - s * 10} ${y + 5} ${cx - s * 12} ${y} ${cx - s * 11} ${y - 7}Z`} />;
      }
    }
  };
  return (
    <g>
      <g fill="#000" opacity="0.12" transform="translate(0 2)">
        {shape(lx)}
        {shape(rx)}
      </g>
      <g fill={lens} fillOpacity={lensOpacity} stroke={frame} strokeWidth={style === 'half' ? 1 : 1.6}>
        {shape(lx)}
        {shape(rx)}
      </g>
      {style === 'half' && (
        <g stroke={frame} strokeWidth="2.6" strokeLinecap="round">
          <path d={`M${lx - 11} ${y - 6.5} L${lx + 11} ${y - 6.5}`} />
          <path d={`M${rx - 11} ${y - 6.5} L${rx + 11} ${y - 6.5}`} />
        </g>
      )}
      <g fill="none" stroke={frame} strokeWidth="1.5">
        <path d={`M${lx + 10.5} ${y - 2} Q100 ${y - 5} ${rx - 10.5} ${y - 2}`} />
        <path d={`M${lx - 11} ${y - 2} L${L(h.cw - 1)} ${y - 3}`} />
        <path d={`M${rx + 11} ${y - 2} L${R(h.cw - 1)} ${y - 3}`} />
      </g>
      <g stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" opacity={style === 'sunglasses' ? 0.35 : 0.5}>
        <path d={`M${lx - 6} ${y - 3} L${lx - 2} ${y - 6.5}`} />
        <path d={`M${rx - 6} ${y - 3} L${rx - 2} ${y - 6.5}`} />
      </g>
    </g>
  );
}

/* ──────────────── Roupa ──────────────── */

function Outfit({ config, uid, partyColor }: { config: AvatarConfig; uid: string; partyColor?: string }) {
  const fem = config.presentation === 'feminine';
  const sw = fem ? 92 : config.presentation === 'neutral' ? 98 : 104;
  const torso = `M${L(sw)} 246 C${L(sw)} 190 ${L(sw - 12)} 174 ${L(34)} 167 Q100 162 ${R(34)} 167 C${R(sw - 12)} 174 ${R(sw)} 190 ${R(sw)} 246Z`;
  const cloth = `url(#cloth-${uid})`;
  const shirt = config.shirtColor;
  const shirtShade = shade(shirt, -0.18);
  const outfit = config.outfit;
  const dark = shade(config.outfitColor, -0.38);
  const collar = (
    <g fill={shirt} stroke={shirtShade} strokeWidth="0.7">
      <path d={`M100 175 L${L(17)} 165 L${L(10)} 186Z`} />
      <path d={`M100 175 L${R(17)} 165 L${R(10)} 186Z`} />
    </g>
  );
  const tie = (() => {
    if (config.tie === 'none') return null;
    const c = config.tieColor;
    const g = `url(#tie-${uid})`;
    if (config.tie === 'bow')
      return (
        <g stroke={shade(c, -0.35)} strokeWidth="0.7">
          <path d="M100 178 L89 172 L89 185Z" fill={g} />
          <path d="M100 178 L111 172 L111 185Z" fill={g} />
          <rect x="97" y="175" width="6" height="6" rx="1.5" fill={shade(c, -0.1)} />
        </g>
      );
    const w = config.tie === 'thin' ? 0.62 : 1;
    return (
      <g stroke={shade(c, -0.35)} strokeWidth="0.6">
        <path d={`M${L(4.5 * w)} 174 L${R(4.5 * w)} 174 L${R(3.5 * w)} 182 L${L(3.5 * w)} 182Z`} fill={shade(c, -0.12)} />
        <path d={`M${L(3.5 * w)} 182 L${R(3.5 * w)} 182 L${R(8 * w)} 214 L100 246 L${L(8 * w)} 214Z`} fill={g} />
        <path d={`M${L(1)} 184 L${R(2 * w)} 212`} stroke="#ffffff" strokeWidth="0.8" opacity="0.2" />
      </g>
    );
  })();
  const pin = (() => {
    if (config.accessory !== 'flag_pin' && config.accessory !== 'party_pin') return null;
    const x = 72;
    const y = 197;
    if (config.accessory === 'flag_pin')
      return (
        <g>
          <rect x={x - 4.5} y={y - 3} width="9" height="6.4" rx="0.8" fill="#16a34a" stroke="#0b0b0b" strokeWidth="0.4" />
          <path d={`M${x} ${y - 2.3} L${x + 3.6} ${y + 0.2} L${x} ${y + 2.7} L${x - 3.6} ${y + 0.2}Z`} fill="#facc15" />
          <circle cx={x} cy={y + 0.2} r="1.4" fill="#1d4ed8" />
        </g>
      );
    return (
      <g>
        <circle cx={x} cy={y} r="3.6" fill={partyColor ?? config.tieColor} stroke="#d4af37" strokeWidth="1" />
        <circle cx={x - 1} cy={y - 1} r="1" fill="#ffffff" opacity="0.5" />
      </g>
    );
  })();
  const folds = (
    <g fill="none" stroke={dark} strokeLinecap="round" opacity="0.35" filter={`url(#blur-${uid})`}>
      <path d={`M${L(sw - 14)} 196 Q${L(sw - 20)} 210 ${L(sw - 16)} 246`} strokeWidth="2.5" />
      <path d={`M${R(sw - 14)} 196 Q${R(sw - 20)} 210 ${R(sw - 16)} 246`} strokeWidth="2.5" />
    </g>
  );
  const lapel = (s: 1 | -1, wide: boolean) => {
    const X = (dx: number) => n(100 + s * dx);
    const k = wide ? 1.15 : 1;
    return (
      <path
        d={`M${X(18)} 163 C${X(26 * k)} 170 ${X(29 * k)} 176 ${X(28 * k)} 181 L${X(34 * k)} 185 C${X(26 * k)} 197 ${X(14)} 207 ${X(2)} 215 L${X(8)} 199 L${X(15)} 168Z`}
        fill={shade(config.outfitColor, -0.07)}
        stroke={dark}
        strokeWidth="0.8"
      />
    );
  };
  switch (outfit) {
    case 'suit':
    case 'blazer':
      return (
        <g>
          <path d={torso} fill={cloth} />
          <path d={`M${L(16)} 166 L100 214 L${R(16)} 166 Q100 172 ${L(16)} 166Z`} fill={shirt} />
          <path d={`M${L(16)} 166 L100 214 L${R(16)} 166`} fill="none" stroke={shirtShade} strokeWidth="0.6" />
          {collar}
          {tie}
          {lapel(-1, outfit === 'blazer')}
          {lapel(1, outfit === 'blazer')}
          <circle cx="100" cy="218" r="1.6" fill={dark} />
          {folds}
          {pin}
        </g>
      );
    case 'shirt':
      return (
        <g>
          <path d={torso} fill={`url(#shirt-${uid})`} />
          <path d="M100 176 L100 246" stroke={shirtShade} strokeWidth="1" />
          {[190, 204, 218].map((y) => (
            <circle key={y} cx="102.5" cy={y} r="1.1" fill={shirtShade} />
          ))}
          {collar}
          {tie}
          {pin}
        </g>
      );
    case 'polo':
      return (
        <g>
          <path d={torso} fill={cloth} />
          <path d={`M95 174 L95 196 L105 196 L105 174Z`} fill={shade(config.outfitColor, -0.1)} />
          <circle cx="100" cy="183" r="1.1" fill="#f1f1f1" />
          <circle cx="100" cy="191" r="1.1" fill="#f1f1f1" />
          <g fill={shade(config.outfitColor, 0.05)} stroke={dark} strokeWidth="0.7">
            <path d={`M100 176 L${L(20)} 166 L${L(16)} 182Z`} />
            <path d={`M100 176 L${R(20)} 166 L${R(16)} 182Z`} />
          </g>
          {folds}
          {pin}
        </g>
      );
    case 'tshirt':
      return (
        <g>
          <path d={torso} fill={cloth} />
          <path d={`M${L(22)} 169 Q100 186 ${R(22)} 169`} fill="none" stroke={dark} strokeWidth="2.6" />
          {folds}
          {pin}
        </g>
      );
    case 'jacket':
      return (
        <g>
          <path d={torso} fill={cloth} />
          <path d={`M${L(20)} 168 Q100 186 ${R(20)} 168 L${R(12)} 246 L${L(12)} 246Z`} fill={`url(#shirt-${uid})`} />
          <path d={`M${L(20)} 168 Q100 186 ${R(20)} 168`} fill="none" stroke={shirtShade} strokeWidth="1.6" />
          <g fill={shade(config.outfitColor, -0.05)} stroke={dark} strokeWidth="0.8">
            <path d={`M${L(24)} 166 L${L(12)} 246 L${L(20)} 246 L${L(30)} 172Z`} />
            <path d={`M${R(24)} 166 L${R(12)} 246 L${R(20)} 246 L${R(30)} 172Z`} />
          </g>
          <path d={`M${L(12)} 196 L${L(12)} 246`} stroke="#c7c7c7" strokeWidth="0.8" opacity="0.6" />
          {folds}
          {pin}
        </g>
      );
    case 'dress':
    default: {
      const neck = `M${L(30)} 171 Q100 ${fem ? 204 : 196} ${R(30)} 171`;
      return (
        <g>
          <path d={`M${L(32)} 168 Q100 164 ${R(32)} 168 L${R(30)} 205 L${L(30)} 205Z`} fill={`url(#chest-${uid})`} />
          <path d={`${neck.replace('M', `M${L(sw)} 246 C${L(sw)} 196 ${L(sw - 8)} 180 ${L(30)} 171 L`)} C${R(sw - 8)} 180 ${R(sw)} 196 ${R(sw)} 246Z`} fill={cloth} />
          <path d={neck} fill="none" stroke={dark} strokeWidth="1.4" />
          {config.accessory !== 'scarf' && (
            <path d={`M${L(14)} 172 Q100 ${fem ? 190 : 184} ${R(14)} 172`} fill="none" stroke="#d4af37" strokeWidth="0.9" opacity="0.85" />
          )}
          {folds}
          {pin}
        </g>
      );
    }
  }
}

/* ──────────────── Avatar ──────────────── */

export function Avatar({ config, size = 120, background, partyColor, age = 40, frame = 'circle', className, title }: AvatarProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const h = headFor(config);
  const p = paletteFor(config);
  const fem = config.presentation === 'feminine';
  const head = headPath(h);
  const hair = hairLayers(config, h, p, `hair-${uid}`);
  const clip = frame === 'none' ? undefined : `url(#clip-${uid})`;
  const bg = background ?? '#2c3d63';
  const nw = h.jw * (fem ? 0.52 : 0.6);
  const ex = config.expression;
  const smiling = ex === 'smile' || ex === 'laugh';
  return (
    <svg viewBox="0 0 200 222" width={size} height={size * 1.11} className={className} role="img" aria-label={title ?? 'Retrato do candidato'}>
      {title && <title>{title}</title>}
      <defs>
        <clipPath id={`clip-${uid}`}>
          {frame === 'circle' ? <circle cx="100" cy="111" r="100" /> : <rect x="0" y="0" width="200" height="222" rx="28" />}
        </clipPath>
        <radialGradient id={`bg-${uid}`} cx="50%" cy="32%" r="78%">
          <stop offset="0%" stopColor={shade(bg, 0.28)} />
          <stop offset="70%" stopColor={bg} />
          <stop offset="100%" stopColor={shade(bg, -0.35)} />
        </radialGradient>
        <radialGradient id={`face-${uid}`} cx="42%" cy="36%" r="72%">
          <stop offset="0%" stopColor={p.light} />
          <stop offset="55%" stopColor={p.skin} />
          <stop offset="100%" stopColor={p.shadow} />
        </radialGradient>
        <linearGradient id={`side-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={p.deep} stopOpacity="0.18" />
          <stop offset="22%" stopColor={p.deep} stopOpacity="0" />
          <stop offset="62%" stopColor={p.deep} stopOpacity="0" />
          <stop offset="100%" stopColor={p.deep} stopOpacity="0.42" />
        </linearGradient>
        <linearGradient id={`neck-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.deep} />
          <stop offset="45%" stopColor={p.shadow} />
          <stop offset="100%" stopColor={p.skin} />
        </linearGradient>
        <linearGradient id={`chest-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.shadow} />
          <stop offset="100%" stopColor={p.skin} />
        </linearGradient>
        <linearGradient id={`hair-${uid}`} x1="0.2" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={p.hairLight} />
          <stop offset="45%" stopColor={p.hair} />
          <stop offset="100%" stopColor={p.hairDark} />
        </linearGradient>
        <linearGradient id={`fade-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.hair} stopOpacity="0.95" />
          <stop offset="45%" stopColor={p.hair} stopOpacity="0.55" />
          <stop offset="100%" stopColor={p.hair} stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id={`beard-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.hair} stopOpacity="0.25" />
          <stop offset="30%" stopColor={p.hair} stopOpacity="0.8" />
          <stop offset="100%" stopColor={p.hairDark} />
        </linearGradient>
        <radialGradient id={`iris-${uid}`} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor={mix(config.eyeColor, '#ffffff', 0.3)} />
          <stop offset="70%" stopColor={config.eyeColor} />
          <stop offset="100%" stopColor={shade(config.eyeColor, -0.5)} />
        </radialGradient>
        <linearGradient id={`cloth-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={shade(config.outfitColor, 0.16)} />
          <stop offset="55%" stopColor={config.outfitColor} />
          <stop offset="100%" stopColor={shade(config.outfitColor, -0.32)} />
        </linearGradient>
        <linearGradient id={`shirt-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={mix(config.shirtColor, '#ffffff', 0.3)} />
          <stop offset="100%" stopColor={shade(config.shirtColor, -0.2)} />
        </linearGradient>
        <linearGradient id={`tie-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={shade(config.tieColor, 0.15)} />
          <stop offset="100%" stopColor={shade(config.tieColor, -0.3)} />
        </linearGradient>
        <filter id={`blur-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id={`blur-s-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
        <filter id={`soft-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>
      <g clipPath={clip}>
        {frame !== 'none' && <rect x="0" y="0" width="200" height="222" fill={`url(#bg-${uid})`} />}
        {frame !== 'none' && <ellipse cx="100" cy="230" rx="110" ry="40" fill="#000" opacity="0.25" filter={`url(#soft-${uid})`} />}
        <g transform={frame === 'none' ? undefined : 'translate(9 5) scale(0.91)'}>
        {hair.back}
        {/* pescoço */}
        <path d={`M${L(nw)} ${h.jawY - 16} L${L(nw + 2)} 172 Q100 180 ${R(nw + 2)} 172 L${R(nw)} ${h.jawY - 16}Z`} fill={`url(#neck-${uid})`} />
        <ellipse cx="100" cy={h.chinY + 3} rx={n(h.chinW + 12)} ry="6" fill={p.deep} opacity="0.35" filter={`url(#soft-${uid})`} />
        <Outfit config={config} uid={uid} {...(partyColor ? { partyColor } : {})} />
        {config.accessory === 'scarf' && (
          <g>
            <path d={`M${L(36)} 168 Q100 190 ${R(36)} 168 L${R(38)} 182 Q100 204 ${L(38)} 182Z`} fill={`url(#tie-${uid})`} />
            <path d={`M${R(12)} 188 L${R(20)} 246 L${R(6)} 246 L${R(2)} 192Z`} fill={shade(config.tieColor, -0.15)} />
          </g>
        )}
        {/* orelhas */}
        {([-1, 1] as const).map((s) => {
          const X = (dx: number) => n(100 + s * dx);
          return (
            <g key={s}>
              <path d={`M${X(h.cw - 3)} 95 C${X(h.cw + 5)} 89 ${X(h.cw + 9)} 99 ${X(h.cw + 7)} 108 C${X(h.cw + 6)} 116 ${X(h.cw + 2)} 121 ${X(h.cw - 2)} 119Z`} fill={s > 0 ? p.shadow : p.skin} />
              <path d={`M${X(h.cw + 1)} 99 C${X(h.cw + 5)} 99 ${X(h.cw + 5)} 108 ${X(h.cw + 2)} 113`} fill="none" stroke={p.deep} strokeWidth="1.2" opacity="0.5" />
            </g>
          );
        })}
        {/* cabeça com volume */}
        <path d={head} fill={`url(#face-${uid})`} />
        <path d={head} fill={`url(#side-${uid})`} />
        <path d={head} fill="none" stroke={p.deep} strokeWidth="0.8" opacity="0.45" />
        <ellipse cx="93" cy="64" rx="15" ry="8" fill={p.light} opacity="0.35" filter={`url(#soft-${uid})`} />
        <ellipse cx={100 - h.cw + 16} cy="117" rx="8" ry="5" fill={p.blush} opacity={fem ? 0.32 : smiling ? 0.2 : 0.12} filter={`url(#soft-${uid})`} />
        <ellipse cx={100 + h.cw - 16} cy="117" rx="8" ry="5" fill={p.blush} opacity={fem ? 0.32 : smiling ? 0.2 : 0.12} filter={`url(#soft-${uid})`} />
        <ellipse cx="100" cy={h.chinY - 7} rx="6" ry="3" fill={p.light} opacity="0.25" filter={`url(#blur-${uid})`} />
        {/* idade */}
        {age > 45 && (
          <g fill="none" stroke={p.shadow} strokeLinecap="round" strokeWidth="0.9" opacity={age > 60 ? 0.55 : 0.35}>
            <path d="M84 70 Q100 66 116 70" />
            {age > 55 && <path d="M86 76 Q100 73 114 76" />}
            {age > 55 && (
              <>
                <path d={`M${n(100 - h.eyeDx - 11)} ${h.eyeY - 1} l-3 -1.5 M${n(100 - h.eyeDx - 11)} ${h.eyeY + 1.5} l-3 1.2`} />
                <path d={`M${n(100 + h.eyeDx + 11)} ${h.eyeY - 1} l3 -1.5 M${n(100 + h.eyeDx + 11)} ${h.eyeY + 1.5} l3 1.2`} />
                <path d={`M${n(100 - h.eyeDx - 6)} ${h.eyeY + 6} q6 3 12 0 M${n(100 + h.eyeDx - 6)} ${h.eyeY + 6} q6 3 12 0`} />
              </>
            )}
          </g>
        )}
        <Beard h={h} p={p} config={config} uid={uid} />
        <Nose h={h} p={p} uid={uid} />
        <Mouth h={h} p={p} config={config} uid={uid} />
        <Eye cx={100 - h.eyeDx} cy={h.eyeY} side={-1} config={config} p={p} uid={uid} fem={fem} />
        <Eye cx={100 + h.eyeDx} cy={h.eyeY} side={1} config={config} p={p} uid={uid} fem={fem} />
        <Brow cx={100 - h.eyeDx} cy={h.eyeY} side={-1} config={config} p={p} />
        <Brow cx={100 + h.eyeDx} cy={h.eyeY} side={1} config={config} p={p} />
        {hair.front}
        <Glasses style={config.glasses} h={h} />
        {config.accessory === 'earrings' && (
          <g>
            {([-1, 1] as const).map((s) => (
              <g key={s}>
                <circle cx={n(100 + s * (h.cw + 2))} cy="121" r="2" fill="#e8c35a" />
                <path d={`M${n(100 + s * (h.cw + 2))} 123 l0 4`} stroke="#e8c35a" strokeWidth="0.8" />
                <circle cx={n(100 + s * (h.cw + 2))} cy="129" r="2.4" fill="#f5d77a" stroke="#b8902e" strokeWidth="0.5" />
              </g>
            ))}
          </g>
        )}
        {config.accessory === 'headband' && (
          <path d={`M${L(h.fw + 2)} 74 C${L(h.fw - 4)} 46 ${R(h.fw - 4)} 46 ${R(h.fw + 2)} 74`} fill="none" stroke={`url(#tie-${uid})`} strokeWidth="6" strokeLinecap="round" />
        )}
        {config.accessory === 'hat' && (
          <g>
            <ellipse cx="100" cy="52" rx="64" ry="10" fill={shade(config.outfitColor, -0.2)} />
            <path d="M66 52 C62 18 138 18 134 52Z" fill={`url(#cloth-${uid})`} />
            <path d="M68 44 Q100 48 132 44 L133 51 Q100 55 67 51Z" fill={config.tieColor} />
            <ellipse cx="100" cy="51" rx="64" ry="9" fill="none" stroke={shade(config.outfitColor, -0.45)} strokeWidth="0.8" />
          </g>
        )}
        </g>
      </g>
    </svg>
  );
}

export type { ReactElement };
