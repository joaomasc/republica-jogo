import type { IsoDate } from './types';

const MONTHS_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const MONTHS_SHORT_PT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];
const DAY_MS = 86_400_000;

export function parseIso(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

export function toIso(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function makeDate(year: number, month: number, day: number): IsoDate {
  return toIso(new Date(Date.UTC(year, month - 1, day)));
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  return toIso(new Date(parseIso(iso).getTime() + days * DAY_MS));
}

export function addMonths(iso: IsoDate, months: number): IsoDate {
  const d = parseIso(iso);
  return toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate())));
}

/** Diferença em dias inteiros (b - a). */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / DAY_MS);
}

export function diffMonths(a: IsoDate, b: IsoDate): number {
  const da = parseIso(a);
  const db = parseIso(b);
  return (db.getUTCFullYear() - da.getUTCFullYear()) * 12 + (db.getUTCMonth() - da.getUTCMonth());
}

export function yearOf(iso: IsoDate): number {
  return parseIso(iso).getUTCFullYear();
}

export function isBefore(a: IsoDate, b: IsoDate): boolean {
  return a < b;
}

export function isOnOrAfter(a: IsoDate, b: IsoDate): boolean {
  return a >= b;
}

/** Primeiro domingo de outubro — data do 1º turno no Brasil. */
export function firstSundayOfOctober(year: number): IsoDate {
  const d = new Date(Date.UTC(year, 9, 1));
  const offset = (7 - d.getUTCDay()) % 7;
  return toIso(new Date(d.getTime() + offset * DAY_MS));
}

/** Último domingo de outubro — data do 2º turno no Brasil. */
export function lastSundayOfOctober(year: number): IsoDate {
  const d = new Date(Date.UTC(year, 9, 31));
  return toIso(new Date(d.getTime() - d.getUTCDay() * DAY_MS));
}

export function formatDateLong(iso: IsoDate): string {
  const d = parseIso(iso);
  return `${d.getUTCDate()} de ${MONTHS_PT[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

export function formatDateShort(iso: IsoDate): string {
  const d = parseIso(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS_SHORT_PT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatMonthYear(iso: IsoDate): string {
  const d = parseIso(iso);
  return `${MONTHS_SHORT_PT[d.getUTCMonth()]}/${d.getUTCFullYear()}`;
}
