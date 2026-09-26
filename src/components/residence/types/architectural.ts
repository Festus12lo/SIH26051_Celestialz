export interface RoomData {
  id: string; // e.g. "G01", "G03", "F02"
  name: string;
  floor: 'Ground Floor' | 'First Floor';
  zone: 'South Social' | 'Center Courtyard' | 'East Culinary' | 'West Service' | 'North Private' | 'First Floor Private' | 'Upper Center';
  areaM2: number;
  dimensions: string; // e.g. "5.4 m × 5.5 m"
  ceilingHeight: string; // e.g. "3.4 m" or "6.5 m double-height"
  orientation: 'South' | 'North' | 'East' | 'West' | 'Center Lightwell';
  description: string;
  bioclimaticFeature: string;
  materials: string[];
  keyFurniture: string[];
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    y: number;
    height: number;
  };
}

export interface HeroView {
  id: string; // "HERO 01" to "HERO 12"
  title: string;
  subtitle: string;
  description: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  fov: number;
  timeOfDayHours: number; // e.g. 16.5 for golden hour, 19.5 for blue hour
  solarAltDeg: number;
  solarAzimuthDeg: number;
  lightingMood: 'Golden Hour' | 'Midday Diffused' | 'Morning Light' | 'Blue Hour';
}

export interface MaterialSpec {
  id: string;
  name: string;
  origin: string;
  thickness: string;
  role: string;
  thermalProperties: string;
  visualDetails: string;
  sustainability: string;
  colorHex: string;
}

export type ViewMode = 'orbit' | 'hero' | 'floorplan' | 'solar' | 'materials';
export type CutawayLevel = 'all' | 'ground' | 'first' | 'section';
export type SeasonType = 'summer_solstice' | 'equinox' | 'winter_solstice';
