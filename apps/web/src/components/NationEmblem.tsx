import { useId } from 'react';

/** Estrela de cinco pontas centrada em (32, 31). */
const STAR = Array.from({ length: 10 }, (_, k) => {
  const angle = -Math.PI / 2 + (k * Math.PI) / 5;
  const r = k % 2 === 0 ? 15.5 : 6.6;
  return `${(32 + Math.cos(angle) * r).toFixed(2)} ${(31 + Math.sin(angle) * r).toFixed(2)}`;
}).join(' L');

/** 27 estrelas em anel: uma por unidade da federação. */
const RING = Array.from({ length: 27 }, (_, i) => {
  const angle = (i / 27) * Math.PI * 2 - Math.PI / 2;
  return [32 + Math.cos(angle) * 25.6, 32 + Math.sin(angle) * 25.6] as const;
});

/** Cruzeiro do Sul no disco central. */
const CRUZEIRO = [
  [32, 27.6, 0.95],
  [32, 34.6, 1.05],
  [28.9, 31.1, 0.85],
  [35.1, 30.6, 0.8],
  [33.6, 32.9, 0.55],
] as const;

/** Emblema da República: medalhão de latão, anel das 27 UFs, estrela e Cruzeiro do Sul. */
export function NationEmblem({
  size = 44,
  color = '#3d9a66',
  className,
  title,
}: {
  size?: number;
  /** Cor do anel interno (identidade do regime). */
  color?: string;
  className?: string;
  title?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const brass = `${uid}-brass`;
  const bg = `${uid}-bg`;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <radialGradient id={bg} cx="50%" cy="36%" r="68%">
          <stop offset="0%" stopColor="#25495a" />
          <stop offset="100%" stopColor="#061118" />
        </radialGradient>
        <linearGradient id={brass} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6e3a6" />
          <stop offset="52%" stopColor="#c9a24a" />
          <stop offset="100%" stopColor="#87672a" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30.4" fill={`url(#${bg})`} stroke={`url(#${brass})`} strokeWidth="2.6" />
      <circle cx="32" cy="32" r="28" fill="none" stroke="#04090c" strokeWidth="0.8" opacity="0.8" />
      {RING.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.95" fill="#ecd48d" />
      ))}
      <circle cx="32" cy="32" r="21.6" fill="none" stroke={color} strokeWidth="2.4" />
      <circle cx="32" cy="32" r="20.1" fill="none" stroke="#04090c" strokeWidth="0.7" opacity="0.7" />
      <path
        d={`M${STAR} Z`}
        fill={`url(#${brass})`}
        stroke="#05101a"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="31.4" r="6.1" fill="#1f4c86" stroke="#f3dea0" strokeWidth="0.8" />
      {CRUZEIRO.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#ffffff" />
      ))}
    </svg>
  );
}
