import { lazy } from 'react';

export * from './primitives';
export * from './icons';
export { Avatar } from './avatar/Avatar';
export { mix, readableOn, shade } from './avatar/color';
export { PartyEmblem, preloadPartyLogos } from './PartyEmblem';
export { IdeologyBars, type IdeologyMarker } from './IdeologyBars';
export { useZoneAtlas, zoneAtlas, type ZoneAtlas, type ZoneSpec } from './map/zoneGeometry';
export { BRAZIL_VIEWBOX, STATE_GEOMETRY, projectLonLat } from './map/brazilGeometry.generated';
export {
  Atlas,
  type AtlasPin,
  type AtlasProps,
  type AtlasPulse,
  type AtlasRegion,
  type AtlasTone,
} from './atlas/Atlas';
export { NO_INSETS, type Bounds, type Insets } from './atlas/camera';
export {
  lightness,
  RAMP_AXIS,
  RAMP_GOOD_BAD,
  RAMP_SEQUENTIAL,
  rampGradient,
  scaleLayer,
  type RegionPaint,
  type ScaleDomain,
  type ScaleResult,
} from './atlas/scales';

/** Mapa 3D (three.js) — pedaço próprio, baixado só quando o 3D aparece. */
export const Atlas3D = lazy(() => import('./atlas3d/Atlas3D'));
export type { Atlas3DProps } from './atlas3d/Atlas3D';
export { webglAvailable } from './atlas3d/webgl';
