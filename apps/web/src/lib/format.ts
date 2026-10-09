import type { GamePhase } from '@republica/game-engine';

export {
  formatDateLong,
  formatDateShort,
  formatMonthYear,
  formatMoney,
  formatNumber,
  formatPct,
} from '@republica/game-engine';

export function pct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${(value * 100).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

export function num(value: number, digits = 1): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export const PHASE_LABELS: Record<GamePhase, string> = {
  campaign: 'Campanha',
  election_day: 'Dia da eleição',
  results: 'Resultado',
  governing: 'Governo',
  legislating: 'Mandato legislativo',
  career: 'Carreira',
  retired: 'Aposentado(a)',
};

export function billions(value: number): string {
  if (Math.abs(value) >= 1)
    return `R$ ${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi`;
  return `R$ ${(value * 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mi`;
}

/** Variação em pontos percentuais (entrada em fração: 0,01 = 1 p.p.). */
export function pp(delta: number, digits = 2): string {
  const n = delta * 100;
  const abs = Math.abs(n).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const zero = Math.abs(n) < 0.5 * 10 ** -digits;
  return `${zero ? '±' : n > 0 ? '+' : '−'}${abs} p.p.`;
}

/** Contagem de pessoas abreviada ("1,2 mi", "350 mil"). */
export function people(n: number): string {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (Math.abs(n) >= 1e3) return `${Math.round(n / 1e3).toLocaleString('pt-BR')} mil`;
  return Math.round(n).toLocaleString('pt-BR');
}
