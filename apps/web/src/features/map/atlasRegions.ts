import { STATES, type StateId } from '@republica/game-engine';
import { projectLonLat, STATE_GEOMETRY, type AtlasPin, type AtlasRegion } from '@republica/ui';

/** Estados pequenos têm a sigla escrita um pouco ao lado (no mar ou no vizinho maior). */
const LABEL_OFFSET: Record<string, [number, number]> = {
  DF: [0, -17],
  GO: [-10, 14],
  SE: [10, 4],
  AL: [14, 2],
  PE: [24, 0],
  PB: [26, -2],
  RN: [14, -6],
  ES: [14, 4],
  RJ: [12, 10],
  SC: [6, 0],
  MT: [0, 10],
  PA: [0, 10],
  AP: [0, 6],
  RO: [0, 4],
  TO: [0, 6],
  PI: [-2, 10],
  MG: [8, 6],
};

/** As 27 UFs prontas para o Atlas (geometria IBGE + nomes do motor). */
export const ATLAS_REGIONS: AtlasRegion[] = Object.entries(STATE_GEOMETRY).map(([id, geo]) => ({
  id,
  name: STATES[id as StateId]?.name ?? id,
  short: id,
  d: geo.d,
  centroid: geo.centroid,
  bbox: geo.bbox,
  ...(LABEL_OFFSET[id] ? { labelOffset: LABEL_OFFSET[id] } : {}),
}));

/** Capitais estaduais (Brasília em destaque). */
export const CAPITAL_PINS: AtlasPin[] = Object.values(STATES).map((s) => {
  const [x, y] = projectLonLat(s.capitalCoords[0], s.capitalCoords[1]);
  return {
    id: `capital-${s.id}`,
    x,
    y,
    kind: s.id === 'DF' ? 'federal-capital' : 'capital',
    label: s.capital,
  };
});
