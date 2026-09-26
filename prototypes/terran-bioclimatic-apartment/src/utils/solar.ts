import * as THREE from 'three';

/**
 * Calculates a normalized sunlight directional vector from compass azimuth and vertical elevation angles.
 * Coordinate convention:
 * +X = East (azimuth 90°)
 * -X = West (azimuth 270°)
 * +Z = South (azimuth 180°)
 * -Z = North (azimuth 0° / 360°)
 * +Y = Zenith (elevation 90°)
 *
 * @param azimuth Compass azimuth in degrees (0° = North, 90° = East, 180° = South, 270° = West)
 * @param elevation Angle above horizon in degrees (0° to 90°)
 * @returns Normalized direction vector pointing FROM building TO sun (or light position)
 */
export function calculateSunDirection(azimuth: number, elevation: number): THREE.Vector3 {
  const azRad = THREE.MathUtils.degToRad(azimuth);
  const elRad = THREE.MathUtils.degToRad(Math.max(1, Math.min(89.5, elevation)));

  const y = Math.sin(elRad);
  const groundProjection = Math.cos(elRad);

  // South is +Z, North is -Z, East is +X, West is -X
  const x = groundProjection * Math.sin(azRad);
  const z = groundProjection * -Math.cos(azRad);

  return new THREE.Vector3(x, y, z).normalize();
}

export interface SolarPreset {
  id: string;
  name: string;
  season: string;
  azimuth: number;
  elevation: number;
  description: string;
}

export const SOLAR_PRESETS: SolarPreset[] = [
  {
    id: 'summer-noon',
    name: 'Summer Solstice Noon',
    season: 'Peak Summer',
    azimuth: 180,
    elevation: 72,
    description: 'Overhead sun completely blocked by the 1.5 m South cantilever balcony overhangs.',
  },
  {
    id: 'summer-afternoon',
    name: 'Summer Critical Afternoon',
    season: 'Late Summer',
    azimuth: 255,
    elevation: 40,
    description: 'Low-angle intense West sun intercepted and modulated by the two-story terracotta jaali screen.',
  },
  {
    id: 'equinox-cutoff',
    name: 'Equinox 55° Cut-off Limit',
    season: 'Spring / Autumn',
    azimuth: 180,
    elevation: 55,
    description: 'Exact architectural threshold where deep balcony slabs cut off 100% of direct solar penetration to vertical glass.',
  },
  {
    id: 'winter-noon',
    name: 'Winter Solstice Noon',
    season: 'Mid Winter',
    azimuth: 180,
    elevation: 28,
    description: 'Low solar elevation allows warm sunlight to reach beneath balcony slabs and warm internal thermal stone floors.',
  },
];
