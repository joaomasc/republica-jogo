import { CITIES, STATE_LIST, type OfficeId, type StateId } from '@republica/game-engine';
import type { WizardPreset } from '../features/newgame/wizardTypes';

/** Semana ISO (1–53) de uma data. */
function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

export interface WeeklyChallenge {
  label: string;
  description: string;
  preset: WizardPreset;
}

/**
 * Desafio da semana (bloco 12): mesma semente e mesma disputa para todo mundo na mesma semana.
 * Alterna prefeituras de cidades-polo e governos estaduais, sempre no modo difícil.
 */
export function weeklyChallenge(now = new Date()): WeeklyChallenge {
  const { year, week } = isoWeek(now);
  const seed = year * 100 + week;
  const cities = Object.values(CITIES)
    .filter((c) => !c.capital)
    .sort((a, b) => a.id.localeCompare(b.id));
  const mayor = week % 2 === 1;
  let officeId: OfficeId;
  let stateId: StateId;
  let cityId: string | undefined;
  let where: string;
  if (mayor && cities.length > 0) {
    const city = cities[(seed * 7) % cities.length]!;
    officeId = 'prefeito';
    stateId = city.stateId;
    cityId = city.id;
    where = `Prefeitura de ${city.name} (${city.stateId})`;
  } else {
    const st = STATE_LIST[(seed * 13) % STATE_LIST.length]!;
    officeId = 'governador';
    stateId = st.id;
    where = `Governo de ${st.name}`;
  }
  return {
    label: `Desafio da semana ${week}`,
    description: `${where} · difícil · mesma semente para todos`,
    preset: {
      mode: 'career',
      officeId,
      stateId,
      ...(cityId ? { cityId } : {}),
      difficulty: 'hard',
      world: 'real',
      lockOffice: true,
      seed,
      challenge: `Semana ${week}/${year}`,
    },
  };
}
