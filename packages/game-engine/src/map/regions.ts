import type { RegionId, StateId } from '../core/types';
import { STATE_LIST } from './states';

export interface RegionData {
  id: RegionId;
  name: string;
  color: string;
}

export const REGIONS: Record<RegionId, RegionData> = {
  norte: { id: 'norte', name: 'Norte', color: '#4caf7a' },
  nordeste: { id: 'nordeste', name: 'Nordeste', color: '#f4a259' },
  centro_oeste: { id: 'centro_oeste', name: 'Centro-Oeste', color: '#e9c46a' },
  sudeste: { id: 'sudeste', name: 'Sudeste', color: '#5b8def' },
  sul: { id: 'sul', name: 'Sul', color: '#9c6ade' },
};

export function statesOfRegion(region: RegionId): StateId[] {
  return STATE_LIST.filter((s) => s.region === region).map((s) => s.id);
}
