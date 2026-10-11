import type { StateId } from '../core/types';
import { stateGdpShare } from '../economy/budget';
import { worksUnemploymentRelief } from '../economy/works/works';
import type { OfficeLevel } from '../election/offices';
import { stateOfName } from '../map/stateNames';
import { cityOf } from '../map/cities';
import { STATES } from '../map/states';
import type { GameState } from './state';

/**
 * Escopo do jogador para a interface: o prefeito vê a cidade, o governador o estado e o
 * presidente (ou quem não governa) o país. A economia é modelada por estado; os números da
 * cidade são estimados a partir do estado dela (proporção da população, com o efeito das obras
 * municipais concentrado na cidade).
 */
export interface LocalScope {
  kind: 'city' | 'state' | 'country';
  level: OfficeLevel;
  stateId: StateId | null;
  /** Nome curto ("Salvador", "Bahia", "Brasil"). */
  name: string;
  /** Com preposição ("de Salvador", "da Bahia", "do Brasil"). */
  ofName: string;
  /** Habitantes. */
  population: number;
  /** PIB anual estimado (R$ bi). */
  gdp: number;
  growth: number;
  unemployment: number;
  /** Desemprego no início da partida (para comparar). */
  unemployment0: number;
  income: number;
  /** A cidade é estimada a partir do estado (explicar na interface). */
  estimated: boolean;
}

/** Indicadores do escopo do jogador (cidade, estado ou país). */
export function localScope(state: GameState): LocalScope {
  const gov = state.government;
  const office = gov?.jurisdiction;
  const stateId = (office?.stateId as StateId | undefined) ?? null;
  const e = state.economy;
  if (!gov || !office || office.level === 'federal' || !stateId) {
    return {
      kind: 'country',
      level: 'federal',
      stateId: null,
      name: 'Brasil',
      ofName: 'do Brasil',
      population: Object.values(STATES).reduce((a, s) => a + s.population * 1000, 0),
      gdp: e.gdp,
      growth: e.growth,
      unemployment: e.unemployment,
      unemployment0: e.baseUnemployment,
      income: e.income,
      estimated: false,
    };
  }
  const st = STATES[stateId];
  const region = state.regions[stateId];
  const stateGdp = e.gdp * stateGdpShare(stateId);
  const unemployment0 = state.industry?.calib?.unemploymentRate0[stateId] ?? st.unemployment;
  if (office.level === 'estadual') {
    return {
      kind: 'state',
      level: 'estadual',
      stateId,
      name: st.name,
      ofName: stateOfName(stateId),
      population: st.population * 1000,
      gdp: stateGdp,
      growth: region?.growth ?? e.growth,
      unemployment: region?.unemployment ?? e.unemployment,
      unemployment0,
      income: region?.income ?? e.income,
      estimated: false,
    };
  }
  // Cidade: proporção da população; capitais têm renda per capita maior que as cidades-polo.
  const city = cityOf(stateId, office.cityId);
  const share = Math.min(0.95, city.population / Math.max(1, st.population));
  const stateRate = region?.unemployment ?? e.unemployment;
  // As obras do prefeito empregam gente da cidade: o efeito, diluído no estado, concentra-se nela.
  const lab = state.industry?.labor?.[stateId];
  const u0 = state.industry?.calib?.people0[stateId]?.unemployed ?? 0;
  const relief = worksUnemploymentRelief(state, stateId);
  const stateDelta = lab && u0 > 0 ? (unemployment0 * relief) / u0 : 0;
  const cityRate = Math.max(1, stateRate - stateDelta * (1 / Math.max(0.05, share) - 1));
  return {
    kind: 'city',
    level: 'municipal',
    stateId,
    name: city.name,
    ofName: `de ${city.name}`,
    population: city.population * 1000,
    gdp: stateGdp * share * (city.capital ? 1.25 : 1.1),
    growth: region?.growth ?? e.growth,
    unemployment: cityRate,
    unemployment0,
    income: (region?.income ?? e.income) * (city.capital ? 1.15 : 1.05),
    estimated: true,
  };
}
