import {
  ACCESSORY_STYLES,
  AVATAR_LABELS,
  BEARD_STYLES,
  EXPRESSION_STYLES,
  EYE_COLORS,
  EYE_STYLES,
  EYEBROW_STYLES,
  FACE_SHAPES,
  GLASSES_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_COLORS,
  OUTFIT_STYLES,
  SHIRT_COLORS,
  SKIN_TONES,
  TIE_COLORS,
  TIE_STYLES,
  type AvatarConfig,
} from '@republica/game-engine';
import { cn, Tabs } from '@republica/ui';
import { useState } from 'react';

type Section = 'rosto' | 'cabelo' | 'roupa' | 'extras';

function Chips<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              'rounded-lg border-2 px-2.5 py-1 text-xs font-bold transition',
              value === o
                ? 'border-gold-400 bg-gold-500 text-ink-950'
                : 'border-ink-600 bg-ink-900 text-muted hover:border-ink-400 hover:text-paper',
            )}
          >
            {labels[o]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Swatches({
  label,
  colors,
  value,
  onChange,
}: {
  label: string;
  colors: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Cor ${c}`}
            className={cn(
              'h-8 w-8 rounded-lg border-[3px] transition',
              value === c ? 'scale-110 border-gold-400' : 'border-ink-950 hover:scale-105',
            )}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

/** Editor visual do personagem (dados 100% serializáveis; a arte é SVG). */
export function AvatarEditor({
  value,
  onChange,
}: {
  value: AvatarConfig;
  onChange: (v: AvatarConfig) => void;
}) {
  const [section, setSection] = useState<Section>('rosto');
  const set = <K extends keyof AvatarConfig>(key: K, v: AvatarConfig[K]) =>
    onChange({ ...value, [key]: v });
  const L = AVATAR_LABELS;
  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { id: 'rosto', label: 'Rosto', icon: 'smile' },
          { id: 'cabelo', label: 'Cabelo e barba', icon: 'sparkles' },
          { id: 'roupa', label: 'Roupa', icon: 'briefcase' },
          { id: 'extras', label: 'Acessórios', icon: 'star' },
        ]}
        value={section}
        onChange={setSection}
      />
      {section === 'rosto' && (
        <div className="space-y-3">
          <Chips
            label="Apresentação"
            options={['masculine', 'feminine', 'neutral'] as const}
            labels={L.presentation}
            value={value.presentation}
            onChange={(v) => set('presentation', v)}
          />
          <Swatches
            label="Pele"
            colors={SKIN_TONES}
            value={value.skinTone}
            onChange={(v) => set('skinTone', v)}
          />
          <Chips
            label="Rosto"
            options={FACE_SHAPES}
            labels={L.faceShape}
            value={value.faceShape}
            onChange={(v) => set('faceShape', v)}
          />
          <Chips
            label="Olhos"
            options={EYE_STYLES}
            labels={L.eyes}
            value={value.eyes}
            onChange={(v) => set('eyes', v)}
          />
          <Swatches
            label="Cor dos olhos"
            colors={EYE_COLORS}
            value={value.eyeColor}
            onChange={(v) => set('eyeColor', v)}
          />
          <Chips
            label="Sobrancelhas"
            options={EYEBROW_STYLES}
            labels={L.eyebrows}
            value={value.eyebrows}
            onChange={(v) => set('eyebrows', v)}
          />
          <Chips
            label="Expressão"
            options={EXPRESSION_STYLES}
            labels={L.expression}
            value={value.expression}
            onChange={(v) => set('expression', v)}
          />
        </div>
      )}
      {section === 'cabelo' && (
        <div className="space-y-3">
          <Chips
            label="Cabelo"
            options={HAIR_STYLES}
            labels={L.hairStyle}
            value={value.hairStyle}
            onChange={(v) => set('hairStyle', v)}
          />
          <Swatches
            label="Cor do cabelo"
            colors={HAIR_COLORS}
            value={value.hairColor}
            onChange={(v) => set('hairColor', v)}
          />
          <Chips
            label="Barba"
            options={BEARD_STYLES}
            labels={L.beard}
            value={value.beard}
            onChange={(v) => set('beard', v)}
          />
        </div>
      )}
      {section === 'roupa' && (
        <div className="space-y-3">
          <Chips
            label="Traje"
            options={OUTFIT_STYLES}
            labels={L.outfit}
            value={value.outfit}
            onChange={(v) => set('outfit', v)}
          />
          <Swatches
            label="Cor do terno / roupa"
            colors={OUTFIT_COLORS}
            value={value.outfitColor}
            onChange={(v) => set('outfitColor', v)}
          />
          <Swatches
            label="Camisa"
            colors={SHIRT_COLORS}
            value={value.shirtColor}
            onChange={(v) => set('shirtColor', v)}
          />
          <Chips
            label="Gravata"
            options={TIE_STYLES}
            labels={L.tie}
            value={value.tie}
            onChange={(v) => set('tie', v)}
          />
          <Swatches
            label="Cor da gravata / detalhes"
            colors={TIE_COLORS}
            value={value.tieColor}
            onChange={(v) => set('tieColor', v)}
          />
        </div>
      )}
      {section === 'extras' && (
        <div className="space-y-3">
          <Chips
            label="Óculos"
            options={GLASSES_STYLES}
            labels={L.glasses}
            value={value.glasses}
            onChange={(v) => set('glasses', v)}
          />
          <Chips
            label="Acessório"
            options={ACCESSORY_STYLES}
            labels={L.accessory}
            value={value.accessory}
            onChange={(v) => set('accessory', v)}
          />
        </div>
      )}
    </div>
  );
}
