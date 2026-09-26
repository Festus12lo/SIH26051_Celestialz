import * as THREE from 'three';

export type ShadingMode = 'studio' | 'thermal' | 'wireframe' | 'xray';

export type CameraPreset = 'hero' | 'facade' | 'atrium' | 'roof' | 'street';

export type MaterialSchemeId =
  | 'terracotta-earth'
  | 'limestone-coastal'
  | 'basalt-monolith'
  | 'rammed-clay-ochre';

export interface MaterialScheme {
  id: MaterialSchemeId;
  name: string;
  subtitle: string;
  colors: {
    wall: string;
    secondaryWall: string;
    terracotta: string;
    concrete: string;
    stone: string;
    wood: string;
    roof: string;
    metal: string;
  };
  roughness: {
    wall: number;
    terracotta: number;
    concrete: number;
    stone: number;
    wood: number;
    roof: number;
  };
  description: string;
  thermalLagHours: number;
  solarReflectance: number; // e.g. 0.82 for high-albedo
}

export interface ApartmentHotspot {
  id: string;
  title: string;
  position: THREE.Vector3;
  description: string;
  technicalPrinciple: string;
  category: 'geometry' | 'material' | 'ventilation' | 'solar';
  metrics?: {
    label: string;
    value: string;
  }[];
}

export interface ApartmentDimensions {
  length: number; // 14.0 m
  width: number; // 10.0 m
  floorHeight: number; // 3.2 m
  buildingHeight: number; // 10.5 m
  atriumSize: number; // 3.0 m x 3.0 m
  balconyDepth: number; // 1.5 m
  wallThickness: number; // 0.35 m
  windowRevealDepth: number; // 0.35 m
  wingWallProjection: number; // 0.60 m
  roofParapetHeight: number; // 1.20 m
}

export interface CameraPresetConfig {
  name: CameraPreset;
  label: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  description: string;
}

export interface ThermalConfig {
  thermalIntensity: number; // 0.0 - 2.0
  sunExposure: number; // 0.0 - 1.0
  thermalMassFactor: number; // 0.0 - 1.0
  ambientCooling: number; // 0.0 - 1.0
}

export const APARTMENT_DIMENSIONS: ApartmentDimensions = {
  length: 14.0,
  width: 10.0,
  floorHeight: 3.2,
  buildingHeight: 10.5,
  atriumSize: 3.0,
  balconyDepth: 1.5,
  wallThickness: 0.35,
  windowRevealDepth: 0.35,
  wingWallProjection: 0.6,
  roofParapetHeight: 1.2,
};

export const MATERIAL_SCHEMES: Record<MaterialSchemeId, MaterialScheme> = {
  'terracotta-earth': {
    id: 'terracotta-earth',
    name: 'Terracotta & Earth',
    subtitle: 'Warm sedimentary monolithic massing',
    colors: {
      wall: '#b37356', // Rammed earth warm tone
      secondaryWall: '#9e6247',
      terracotta: '#c86432', // Warm umber terracotta
      concrete: '#e3ded7', // Warm structural concrete
      stone: '#383b42', // Basalt floor plinth
      wood: '#5a3d28', // Weathered cedar pergolas
      roof: '#edebe4', // High-albedo lime wash
      metal: '#2c221e', // Dark bronze window frames
    },
    roughness: {
      wall: 0.76,
      terracotta: 0.65,
      concrete: 0.68,
      stone: 0.62,
      wood: 0.72,
      roof: 0.85,
    },
    description: 'Stabilized rammed-earth monolith with high thermal mass, paired with artisanal terracotta jaali screens for solar interception.',
    thermalLagHours: 9.5,
    solarReflectance: 0.82,
  },
  'limestone-coastal': {
    id: 'limestone-coastal',
    name: 'Limestone & Coastal',
    subtitle: 'Bright high-reflectance maritime vernacular',
    colors: {
      wall: '#ded8cb', // Pale calcitic limestone
      secondaryWall: '#cec7b6',
      terracotta: '#d97d4b', // Fired sand terracotta
      concrete: '#f0ece1', // White portland pozzolan
      stone: '#4d4f53', // Honed grey granite
      wood: '#6e472b', // Teak framing
      roof: '#f5f4ef', // Ultra-high-albedo hydraulic lime
      metal: '#3d3730', // Deep bronze
    },
    roughness: {
      wall: 0.7,
      terracotta: 0.6,
      concrete: 0.65,
      stone: 0.58,
      wood: 0.68,
      roof: 0.88,
    },
    description: 'Calcareous maritime limestone and lime plaster offering over 84% solar reflectance to suppress diurnal heat absorption.',
    thermalLagHours: 8.2,
    solarReflectance: 0.86,
  },
  'basalt-monolith': {
    id: 'basalt-monolith',
    name: 'Basalt Monolith',
    subtitle: 'Dense volcanic heat-sink envelope',
    colors: {
      wall: '#383b42', // Dense volcanic basalt
      secondaryWall: '#2e3035',
      terracotta: '#a34827', // Burnt terracotta
      concrete: '#d5d0c8', // Silver concrete slabs
      stone: '#242629', // Charcoal volcanic flagstone
      wood: '#3a2b20', // Torrefied hardwood
      roof: '#e8e5de', // Calcite lime topcoat
      metal: '#201a17', // Darkened architectural bronze
    },
    roughness: {
      wall: 0.78,
      terracotta: 0.68,
      concrete: 0.62,
      stone: 0.7,
      wood: 0.7,
      roof: 0.82,
    },
    description: 'Extra-dense igneous envelope designed for maximum night-flush cycle storage and extreme diurnal swing moderation.',
    thermalLagHours: 10.4,
    solarReflectance: 0.80,
  },
  'rammed-clay-ochre': {
    id: 'rammed-clay-ochre',
    name: 'Rammed Clay & Ochre',
    subtitle: 'Sun-baked sub-tropical earthen fabric',
    colors: {
      wall: '#bf874b', // Rich clay ochre
      secondaryWall: '#ad7439',
      terracotta: '#b8542b', // Clay red brise-soleil
      concrete: '#dfd6c8', // Warm aggregated concrete
      stone: '#3f3833', // Sandstone flagstone
      wood: '#423023', // Dark timber lintels
      roof: '#f2ece0', // Pozzolanic lime plaster
      metal: '#271f1a', // Oxidized bronze
    },
    roughness: {
      wall: 0.8,
      terracotta: 0.66,
      concrete: 0.65,
      stone: 0.65,
      wood: 0.75,
      roof: 0.84,
    },
    description: 'Stabilized subsoil clay composition reflecting vernacular Sahelian and Mediterranean micro-climatic traditions.',
    thermalLagHours: 9.0,
    solarReflectance: 0.83,
  },
};

export const APARTMENT_HOTSPOTS: ApartmentHotspot[] = [
  {
    id: 'cantilever-shading',
    title: '1.5 m Balcony Slabs',
    position: new THREE.Vector3(0, 4.8, 5.8),
    description: 'Deep structural cantilever slabs protecting the South & West envelopes.',
    technicalPrinciple: 'Engineered 55° summer solar cut-off geometry blocks peak overhead insolation while permitting low-angle winter sunlight to penetrate deep into residential floor plates.',
    category: 'solar',
    metrics: [
      { label: 'Cantilever Depth', value: '1.50 m' },
      { label: 'Solar Cut-off Angle', value: '55° Noon' },
      { label: 'Solar Load Reduction', value: '≈ 68%' },
    ],
  },
  {
    id: 'atrium-chimney',
    title: 'Central 3 m Buoyancy Thermal Stack',
    position: new THREE.Vector3(0, 9.8, 0),
    description: 'Continuous vertical atmospheric void running from plinth to roof exhaust.',
    technicalPrinciple: 'Exploits natural fluid buoyancy (stack effect). Rising solar-warmed air creates negative pressure at lower residential units, drawing cooler air across courtyard garden intakes.',
    category: 'ventilation',
    metrics: [
      { label: 'Atrium Section', value: '3.0 × 3.0 m' },
      { label: 'Exhaust Elevation', value: '+10.5 m' },
      { label: 'Ventilation Mechanism', value: 'Pure Buoyancy (0 fans)' },
    ],
  },
  {
    id: 'venturi-jaali',
    title: 'Geometric Terracotta Screen',
    position: new THREE.Vector3(-7.2, 5.0, 0),
    description: 'Continuous two-story West-facing interlocking terracotta lattice screen.',
    technicalPrinciple: 'Modulates intense late-afternoon solar heat gain. Architectural micro-apertures induce passive pressure acceleration and Venturi effect without any mechanical louvers or moving parts.',
    category: 'ventilation',
    metrics: [
      { label: 'Orientation', value: 'West Façade' },
      { label: 'Aperture Ratio', value: '42% Porosity' },
      { label: 'Air Speedup Ratio', value: '1.25× – 1.4×' },
    ],
  },
  {
    id: 'mass-walls',
    title: '350 mm Rammed Earth Envelope',
    position: new THREE.Vector3(7.2, 4.8, 2.0),
    description: 'Solid continuous monolithic stabilized earth external wall assembly.',
    technicalPrinciple: 'Provides extraordinary volumetric heat capacity. Absorbs daytime heat and delays thermal conduction by 8–10 hours, naturally releasing warmth during cool desert night hours.',
    category: 'material',
    metrics: [
      { label: 'Assembly Thickness', value: '350 mm' },
      { label: 'Thermal Phase Lag', value: '8 – 10 Hours' },
      { label: 'Volumetric Heat Cap.', value: '1750 kJ/m³K' },
    ],
  },
  {
    id: 'recessed-windows',
    title: '350 mm Deep Glazing Reveals',
    position: new THREE.Vector3(3.5, 4.6, 5.15),
    description: 'Self-shading window apertures set deep into the structural envelope.',
    technicalPrinciple: 'Eliminates direct oblique solar radiation hitting the glass pane during high-angle periods, while framing natural diffused daylight and preserving view corridors without glare.',
    category: 'geometry',
    metrics: [
      { label: 'Reveal Inset', value: '350 mm' },
      { label: 'Glazing Type', value: 'Low-Iron DGU' },
      { label: 'Glare Shielding', value: 'Self-Shading Façade' },
    ],
  },
  {
    id: 'wing-scoops',
    title: 'Corner Wind Deflectors',
    position: new THREE.Vector3(7.3, 4.8, 5.3),
    description: 'Aerodynamic 600 mm vertical structural fins at facade corner junctures.',
    technicalPrinciple: 'Passively intercepts prevailing micro-climatic wind vectors, creating positive pressure zones that funnel ambient breezes directly into adjacent window reveals.',
    category: 'geometry',
    metrics: [
      { label: 'Fin Projection', value: '600 mm' },
      { label: 'Deflection Vector', value: 'Corner Intercept' },
      { label: 'Induced Draft', value: 'Passive Pressure P/Δ' },
    ],
  },
  {
    id: 'high-albedo-roof',
    title: 'Calcite Lime Parapet & Terrace',
    position: new THREE.Vector3(0, 10.8, -2.5),
    description: 'Reflective hydraulic lime plaster terrace slab with shaded timber pergola.',
    technicalPrinciple: 'Ultra-high solar reflectance (>82%) reflects shortwave solar radiation back to space, preventing roof-slab heat accumulation and nocturnal downward radiant re-emission.',
    category: 'solar',
    metrics: [
      { label: 'Parapet Height', value: '1.20 m' },
      { label: 'Solar Reflectance Index', value: '≥ 82%' },
      { label: 'Roof Insulation', value: 'Thermal Mass + Air Cavity' },
    ],
  },
  {
    id: 'thermal-plinth',
    title: 'Dense Stone Ground Heat Sink',
    position: new THREE.Vector3(0, 0.4, 3.5),
    description: 'Continuous basalt flagstone plinth coupling the lower floor with ground mass.',
    technicalPrinciple: 'Couples the ground-level interior with stable sub-surface terrestrial temperatures, acting as a natural convective cooling sink during peak midday heat cycles.',
    category: 'material',
    metrics: [
      { label: 'Plinth Material', value: 'Dense Basalt Slab' },
      { label: 'Thermal Coupling', value: 'Subterranean Ground-Sink' },
      { label: 'Mechanical Input', value: '0.0 W (Passive)' },
    ],
  },
];

export const CAMERA_PRESETS: Record<CameraPreset, CameraPresetConfig> = {
  hero: {
    name: 'hero',
    label: 'Hero Axonometric',
    position: new THREE.Vector3(18.5, 14.5, 19.5),
    target: new THREE.Vector3(0, 4.8, 0),
    fov: 38,
    description: 'Three-quarter axonometric perspective highlighting the South/West cantilevers, West terracotta jaali screen, and roof terrace.',
  },
  facade: {
    name: 'facade',
    label: 'South Solar Façade',
    position: new THREE.Vector3(0, 5.2, 22.0),
    target: new THREE.Vector3(0, 5.2, 0),
    fov: 34,
    description: 'Direct elevation view revealing the self-shading cantilever rhythm, recessed window reveals, and wing wall wind scoops.',
  },
  atrium: {
    name: 'atrium',
    label: 'Buoyancy Atrium Core',
    position: new THREE.Vector3(3.5, 15.0, 4.0),
    target: new THREE.Vector3(0, 3.5, 0),
    fov: 46,
    description: 'Elevated cutaway perspective looking down through the 3.0 × 3.0 m central thermal chimney and natural ventilation intake paths.',
  },
  roof: {
    name: 'roof',
    label: 'Reflective Roof Terrace',
    position: new THREE.Vector3(9.0, 16.5, -9.0),
    target: new THREE.Vector3(0, 9.8, 0),
    fov: 40,
    description: 'Aerial vantage of the high-albedo lime terrace, stepped parapets, shaded seating pergola, and atrium exhaust clerestory.',
  },
  street: {
    name: 'street',
    label: 'Human Eye-Level',
    position: new THREE.Vector3(11.0, 1.7, 13.0),
    target: new THREE.Vector3(0, 4.5, 0),
    fov: 44,
    description: 'Human pedestrian perspective at Y = 1.7 m, experiencing the monumental rammed-earth massing and stone plinth.',
  },
};

export {
  APARTMENT_UNITS,
  APARTMENT_ROOMS,
  APARTMENT_WINDOWS,
  APARTMENT_DOORS,
} from './apartmentPlan';

export type {
  ApartmentUnit,
  ApartmentRoom,
  ApartmentWindow,
  ArchitecturalDoor,
  RoomType,
} from './apartmentPlan';
