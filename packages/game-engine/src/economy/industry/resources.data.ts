import type { StateId } from '../../core/types';
import type { BuildingId, ResourceId } from './types';

/**
 * Potencial de recursos naturais por estado: número MÁXIMO de níveis de edifício que o recurso
 * sustenta (uma lavoura de grãos, soja ou plantation usa `arable`; pecuária, `pasture`; etc.).
 *
 * Calibração: o uso inicial estimado de cada estado é (eleitores × participação do Pop principal ×
 * peso do edifício) / empregos por nível do método padrão. Os potenciais ficam 30–150% acima desse
 * uso nos estados "fortes" do recurso e perto de 30% nos fracos; onde o uso estimado é quase nulo
 * mas a geografia tem vocação (pré-sal, Carajás, Quadrilátero Ferrífero, Nordeste eólico/solar,
 * hidrelétricas amazônicas e do Sul) o valor segue a geografia. Estados sem entrada para um recurso
 * não o possuem (ex.: DF sem minério, AC sem petróleo). Os valores são do modelo de jogo, não
 * estatísticas oficiais.
 */
export const STATE_RESOURCES: Record<StateId, Partial<Record<ResourceId, number>>> = {
  AC: { arable: 20, pasture: 20 },
  AL: { arable: 64, pasture: 28, hydro: 10 },
  AP: { arable: 8, pasture: 4, forest: 5, hydro: 8 },
  AM: { arable: 46, pasture: 13, oil: 5, hydro: 25 },
  BA: { arable: 544, pasture: 127, forest: 103, iron: 10, oil: 8, hydro: 55, wind_solar: 55 },
  CE: { arable: 159, pasture: 64, wind_solar: 40 },
  DF: { arable: 6, pasture: 2 },
  ES: { arable: 59, pasture: 17, forest: 12, oil: 12 },
  GO: { arable: 349, pasture: 160, forest: 24, hydro: 35 },
  MA: { arable: 373, pasture: 97, forest: 38, wind_solar: 25 },
  MT: { arable: 300, pasture: 160, forest: 14, hydro: 25 },
  MS: { arable: 156, pasture: 130, forest: 38, iron: 8, hydro: 12 },
  MG: { arable: 675, pasture: 232, forest: 127, iron: 90, hydro: 120, wind_solar: 80 },
  PA: { arable: 214, pasture: 174, forest: 65, iron: 75, hydro: 90 },
  PB: { arable: 73, pasture: 31, wind_solar: 20 },
  PR: { arable: 467, pasture: 101, forest: 85, hydro: 75 },
  PE: { arable: 133, pasture: 52, wind_solar: 30 },
  PI: { arable: 170, pasture: 44, wind_solar: 35 },
  RJ: { arable: 14, pasture: 8, oil: 45 },
  RN: { arable: 56, pasture: 22, oil: 6, wind_solar: 30 },
  RS: { arable: 399, pasture: 82, forest: 76, hydro: 60, wind_solar: 45 },
  RO: { arable: 49, pasture: 70, hydro: 25 },
  RR: { arable: 14, pasture: 8 },
  SC: { arable: 121, pasture: 39, forest: 47, hydro: 40 },
  SP: { arable: 459, pasture: 50, forest: 100, oil: 22, hydro: 80 },
  SE: { arable: 40, pasture: 16, oil: 6 },
  TO: { arable: 80, pasture: 70, forest: 8, hydro: 22 },
};

export const STATE_SPECIALTIES: Partial<Record<StateId, Partial<Record<BuildingId, number>>>> = {
  AM: { electronics_factory: 5 },
  SP: {
    aerospace: 5,
    auto_plant: 2,
    machinery_factory: 1.8,
    pharma_plant: 2,
    bank: 1.8,
    tech_hub: 1.8,
    plantation: 1.4,
  },
  MG: { steel_mill: 2.5, mine: 3, auto_plant: 1.6, plantation: 1.3 },
  ES: { steel_mill: 2.5, plantation: 1.5 },
  RJ: { oil_field: 4, refinery: 2, steel_mill: 1.6, bank: 1.5 },
  PA: { mine: 4 },
  BA: { chemical_plant: 3, refinery: 1.8 },
  PE: { refinery: 1.8 },
  RS: { food_industry: 1.4, machinery_factory: 1.6, auto_plant: 1.4 },
  PR: { food_industry: 1.5, auto_plant: 1.6 },
  SC: { textile_mill: 1.8, consumer_factory: 1.5, machinery_factory: 1.5, food_industry: 1.4 },
  CE: { textile_mill: 2 },
  GO: { food_industry: 1.5, farm_soy: 1.6, pharma_plant: 1.8 },
  MT: { food_industry: 1.5, farm_soy: 2.5 },
  MS: { farm_soy: 1.5, forestry: 2 },
  DF: { public_admin: 4 },
};
