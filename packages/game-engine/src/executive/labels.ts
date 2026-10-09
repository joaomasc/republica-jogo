import { getState } from '../map/states';
import { isStateId } from '../core/types';
import type { GoodCategory, SectorId } from '../economy/industry/types';
import type { InterestGroupId } from '../politics/types';

/** Rótulos em pt-BR dos setores (também usados pela Nação e pela interface). */
export const SECTOR_LABELS: Record<SectorId, string> = {
  agro: 'Agropecuária',
  extraction: 'Extração mineral e petróleo',
  energy: 'Energia',
  heavy_industry: 'Indústria de base',
  manufacturing: 'Indústria de transformação',
  high_tech: 'Alta tecnologia',
  services: 'Serviços',
  public: 'Setor público',
  informal: 'Economia informal',
};

/** Rótulos em pt-BR das categorias de bens. */
export const GOOD_CATEGORY_LABELS: Record<GoodCategory, string> = {
  agro: 'Produtos agropecuários',
  mineral: 'Minerais',
  energy: 'Energia e combustíveis',
  industrial: 'Bens industriais intermediários',
  consumer: 'Bens de consumo',
  high_tech: 'Alta tecnologia',
  service: 'Serviços',
};

/** Grupos de interesse diretamente ligados a cada setor (reações a decretos e greves). */
export const SECTOR_GROUPS: Record<SectorId, InterestGroupId[]> = {
  agro: ['agribusiness'],
  extraction: ['industry', 'business'],
  energy: ['industry', 'business'],
  heavy_industry: ['industry', 'unions'],
  manufacturing: ['industry', 'unions', 'workers'],
  high_tech: ['tech'],
  services: ['commerce', 'business'],
  public: ['civil_servants'],
  informal: ['social_movements'],
};

/** Grupos produtores de cada categoria de bens. */
export const CATEGORY_GROUPS: Record<GoodCategory, InterestGroupId[]> = {
  agro: ['agribusiness'],
  mineral: ['industry', 'business'],
  energy: ['industry'],
  industrial: ['industry', 'unions'],
  consumer: ['industry', 'workers'],
  high_tech: ['tech', 'industry'],
  service: ['commerce'],
};

/** Nome da UF a partir do id (ou o próprio id se desconhecido). */
export function stateLabel(id: string): string {
  return isStateId(id) ? getState(id).name : id;
}
