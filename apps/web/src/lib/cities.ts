import type { CityData } from '@republica/game-engine';

const REGIC_LABEL: Record<CityData['regic'], string> = {
  '1A': 'grande metrópole nacional',
  '1B': 'metrópole nacional',
  '1C': 'metrópole',
  '2A': 'capital regional A',
  '2B': 'capital regional B',
  '2C': 'capital regional C',
  metro: 'região metropolitana',
};

/** "1,3 mi" / "464 mil" habitantes (população em milhares). */
export function cityPopulationLabel(city: CityData): string {
  return city.population >= 1000
    ? `${(city.population / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi hab.`
    : `${Math.round(city.population).toLocaleString('pt-BR')} mil hab.`;
}

/** Papel da cidade na rede urbana (REGIC 2018, IBGE). */
export function cityKindLabel(city: CityData): string {
  if (city.capital) return `Capital · ${REGIC_LABEL[city.regic]}`;
  if (city.regic === 'metro') return 'Grande cidade da região metropolitana';
  return `Cidade-polo · ${REGIC_LABEL[city.regic]} (IBGE)`;
}
