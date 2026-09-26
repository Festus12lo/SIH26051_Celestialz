export interface VendorInfo {
  id: string;
  name: string;
  pricePerSqm: number;
  deliveryDays: number;
  url: string;
  inStock: boolean;
}

export interface MaterialDef {
  id: string;
  name: string;
  rValue?: number;
  uValue?: number;
  shgc?: number;
  vlt?: number;
  albedo?: number;
  thermalMass?: 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High' | string;
  ecoScore?: 'Poor' | 'Moderate' | 'Good' | 'Excellent' | string;
  hex: string;
  desc: string;
  categoryType: 'deployable' | 'permanent';
  deploymentTime: string;
  imageUrl?: string;
  recommendedFor?: ('emergency' | 'resident' | 'community')[];
  typologyCriteriaBadge?: string;
  vendors: VendorInfo[];
}

// ─────────────────────────────────────────────────────────────
// 1. EMERGENCY SHELTER MATERIALS (RAPID DEPLOYABLE ENVELOPE)
// ─────────────────────────────────────────────────────────────

export const EMERGENCY_WALL_MATERIALS: MaterialDef[] = [
  {
    id: 'eps',
    name: 'EPS Insulated Sandwich Panel',
    desc: 'Pre-insulated lightweight modular sandwich panels. 48-hour rapid deployment for acute relief, zero wet curing required.',
    rValue: 4.2,
    thermalMass: 'Low',
    ecoScore: 'Moderate',
    categoryType: 'deployable',
    deploymentTime: 'Rapid Deploy (24-48 Hours)',
    imageUrl: '/materials/eps.jpg',
    hex: '#c8c2b7',
    recommendedFor: ['emergency'],
    typologyCriteriaBadge: 'DEPLOYABLE MODULAR',
    vendors: [
      { id: 'w1', name: 'RapidShelter Mfg', pricePerSqm: 2000.00, deliveryDays: 1, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=eps+panels' },
      { id: 'w2', name: 'Global Relief Supply', pricePerSqm: 2240.00, deliveryDays: 1, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=insulated+sandwich+panels' }
    ]
  },
  {
    id: 'pir',
    name: 'PIR Foam Board Panel',
    desc: 'Polyisocyanurate rigid foam board with high fire rating and superior thermal resistance. Ultra-light flat-pack transport.',
    rValue: 6.0,
    thermalMass: 'Low',
    ecoScore: 'Moderate',
    categoryType: 'deployable',
    deploymentTime: 'Rapid Deploy (48 Hours)',
    imageUrl: '/materials/pir.jpg',
    hex: '#cbd5e1',
    recommendedFor: ['emergency'],
    typologyCriteriaBadge: 'DEPLOYABLE HIGH-R',
    vendors: [
      { id: 'w3', name: 'InsulCore Direct', pricePerSqm: 3600.00, deliveryDays: 2, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=pir+foam+board' }
    ]
  },
  {
    id: 'aerogel',
    name: 'Aerogel Thermal Blanket Wall',
    desc: 'Aerospace silica aerogel composite fabric. Highest thermal barrier per millimeter for severe sub-zero polar/alpine disaster relief.',
    rValue: 10.5,
    thermalMass: 'Very Low',
    ecoScore: 'Good',
    categoryType: 'deployable',
    deploymentTime: 'Rapid Deploy (72 Hours)',
    imageUrl: '/materials/aerogel.jpg',
    hex: '#e2e8f0',
    recommendedFor: ['emergency'],
    typologyCriteriaBadge: 'DEPLOYABLE SUB-ZERO',
    vendors: [
      { id: 'w4', name: 'AeroTech Textiles', pricePerSqm: 12000.00, deliveryDays: 7, inStock: false, url: 'https://dir.indiamart.com/search.mp?ss=aerogel+insulation' }
    ]
  },
  {
    id: 'insulated_canvas',
    name: 'Multi-Layer Insulated Canvas',
    desc: 'Heavy-duty ripstop canvas with reflective foil & fleece insulation. Foldable emergency tent wall with instant deployability.',
    rValue: 2.4,
    thermalMass: 'Very Low',
    ecoScore: 'Good',
    categoryType: 'deployable',
    deploymentTime: 'Instant Deploy (12-24 Hours)',
    imageUrl: '/materials/canvas.jpg',
    hex: '#78716c',
    recommendedFor: ['emergency'],
    typologyCriteriaBadge: 'INSTANT DEPLOYABLE',
    vendors: [
      { id: 'w5', name: 'ReliefTarp India', pricePerSqm: 1400.00, deliveryDays: 1, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=insulated+tarpaulin' }
    ]
  }
];

export const EMERGENCY_ROOF_MATERIALS: MaterialDef[] = [
  {
    id: 'cool_roof',
    name: 'High-Albedo Cool Membrane',
    desc: 'Lightweight synthetic polymeric membrane with 85% solar reflectance. Prevents daytime overheating in temporary relief camps.',
    albedo: 0.85,
    thermalMass: 'Low',
    ecoScore: 'Good',
    categoryType: 'deployable',
    deploymentTime: 'Rapid Deploy',
    imageUrl: '/materials/cool_roof.jpg',
    hex: '#ffffff',
    recommendedFor: ['emergency'],
    typologyCriteriaBadge: 'REFLECTIVE DEPLOYABLE',
    vendors: [
      { id: 'r1', name: 'ThermoShield Relief', pricePerSqm: 2400.00, deliveryDays: 2, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=cool+roof+coating' }
    ]
  },
  {
    id: 'galvanized',
    name: 'Corrugated Galvanized Steel Sheet',
    desc: 'Pre-cut corrugated Alu-Zinc sheets. Ubiquitous, impact resistant, weather-tight rapid roof covering.',
    albedo: 0.45,
    thermalMass: 'Very Low',
    ecoScore: 'Moderate',
    categoryType: 'deployable',
    deploymentTime: 'Rapid Deploy',
    imageUrl: '/materials/galvanized.jpg',
    hex: '#94a3b8',
    recommendedFor: ['emergency'],
    typologyCriteriaBadge: 'ECONOMICAL DEPLOYABLE',
    vendors: [
      { id: 'r2', name: 'SteelWorks Direct', pricePerSqm: 960.00, deliveryDays: 1, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=corrugated+galvanized+iron+sheets' }
    ]
  },
  {
    id: 'low_e_alu',
    name: 'Low-E Aluminum Foil Roofing',
    desc: 'Lightweight embossed aluminum radiant barrier sheet. Reflects 95% of thermal radiation.',
    albedo: 0.95,
    thermalMass: 'Low',
    ecoScore: 'Moderate',
    categoryType: 'deployable',
    deploymentTime: 'Rapid Deploy',
    imageUrl: '/materials/low_e_alu.jpg',
    hex: '#f8fafc',
    recommendedFor: ['emergency'],
    typologyCriteriaBadge: 'RADIANT BARRIER',
    vendors: [
      { id: 'r3', name: 'AluSpec India', pricePerSqm: 3800.00, deliveryDays: 3, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=aluminum+roofing+sheets' }
    ]
  },
  {
    id: 'solar_absorbent',
    name: 'Solar Absorbent Dark Tarp',
    desc: 'Dark heat-absorbing membrane designed specifically to capture solar infrared energy in high-altitude sub-zero emergencies.',
    albedo: 0.10,
    thermalMass: 'Low',
    ecoScore: 'Moderate',
    categoryType: 'deployable',
    deploymentTime: 'Rapid Deploy',
    imageUrl: '/materials/solar_absorbent.jpg',
    hex: '#1e293b',
    recommendedFor: ['emergency'],
    typologyCriteriaBadge: 'ARCTIC DEPLOYABLE',
    vendors: [
      { id: 'r4', name: 'ArcticRelief', pricePerSqm: 2800.00, deliveryDays: 3, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=epdm+rubber+roofing' }
    ]
  }
];

export const EMERGENCY_WINDOW_MATERIALS: MaterialDef[] = [
  {
    id: 'polycarbonate_multiwall',
    name: 'Multiwall Polycarbonate Sheet',
    desc: 'Shatterproof fluted panel. 200x stronger than glass, ultra-lightweight, high impact resistance for disaster relief.',
    uValue: 2.4,
    shgc: 0.55,
    vlt: 0.60,
    thermalMass: 'Very Low',
    ecoScore: 'Good',
    categoryType: 'deployable',
    deploymentTime: 'Rapid Deploy',
    imageUrl: '/materials/polycarbonate.jpg',
    hex: '#cbd5e1',
    recommendedFor: ['emergency'],
    typologyCriteriaBadge: 'SHATTERPROOF RELIEF',
    vendors: [
      { id: 'win1', name: 'Tuflite Polymers', pricePerSqm: 950.00, deliveryDays: 1, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=polycarbonate+multiwall+sheet' }
    ]
  },
  {
    id: 'single_clear',
    name: 'Single Toughened Safety Glass',
    desc: '5mm high-tensile safety glazing. Economical daylighting where rapid installation is prioritized.',
    uValue: 5.8,
    shgc: 0.85,
    vlt: 0.88,
    thermalMass: 'Very Low',
    ecoScore: 'Moderate',
    categoryType: 'deployable',
    deploymentTime: 'Rapid Deploy',
    imageUrl: '/materials/single_clear.jpg',
    hex: '#bae6fd',
    recommendedFor: ['emergency'],
    typologyCriteriaBadge: 'ECONOMICAL',
    vendors: [
      { id: 'win2', name: 'Rapid Glass Supplies', pricePerSqm: 800.00, deliveryDays: 1, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=toughened+glass+5mm' }
    ]
  }
];

// ─────────────────────────────────────────────────────────────
// 2. RESIDENT (PERMANENT RESIDENTIAL SHELTER) MATERIALS
// ─────────────────────────────────────────────────────────────

export const RESIDENT_WALL_MATERIALS: MaterialDef[] = [
  {
    id: 'cseb',
    name: 'Compressed Stabilized Earth Blocks (CSEB)',
    desc: 'High-thermal-mass compressed soil-cement masonry. 80% lower embodied carbon than fired bricks. Provides 10-14h thermal lag damping.',
    rValue: 2.8,
    thermalMass: 'High',
    ecoScore: 'Excellent',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Construction (Masonry Cured)',
    imageUrl: '/materials/cseb.jpg',
    hex: '#b4835a',
    recommendedFor: ['resident'],
    typologyCriteriaBadge: 'PERMANENT THERMAL MASS',
    vendors: [
      { id: 'pw1', name: 'Auroville Earth Institute / EcoEarth', pricePerSqm: 720.00, deliveryDays: 5, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=cseb+blocks' }
    ]
  },
  {
    id: 'rammed_earth',
    name: 'Stabilized Rammed Earth Wall',
    desc: '350mm thick monolithic natural earth wall compacted in formwork. Superior thermal capacitance eliminates diurnal heat swings passively.',
    rValue: 2.5,
    thermalMass: 'Very High',
    ecoScore: 'Excellent',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Construction (Monolithic In-Situ)',
    imageUrl: '/materials/rammed_earth.jpg',
    hex: '#9a6746',
    recommendedFor: ['resident'],
    typologyCriteriaBadge: 'MONOLITHIC MASS',
    vendors: [
      { id: 'pw2', name: 'TerraFirma Bioclimatic Builders', pricePerSqm: 850.00, deliveryDays: 7, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=rammed+earth' }
    ]
  },
  {
    id: 'hempcrete',
    name: 'Modular Cast Hempcrete Blocks',
    desc: 'Carbon-negative bio-composite of industrial hemp shiv and natural hydraulic lime. Breathable, mold-proof, with integral thermal mass.',
    rValue: 3.2,
    thermalMass: 'Medium',
    ecoScore: 'Excellent',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Construction (Modular Biocomposite)',
    imageUrl: '/materials/hempcrete.jpg',
    hex: '#bbaea0',
    recommendedFor: ['resident'],
    typologyCriteriaBadge: 'CARBON NEGATIVE',
    vendors: [
      { id: 'pw3', name: 'EcoBlock BioCrete Solutions', pricePerSqm: 5200.00, deliveryDays: 10, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=hempcrete+blocks' }
    ]
  },
  {
    id: 'aac_blocks',
    name: 'Autoclaved Aerated Concrete (AAC)',
    desc: 'Lightweight precast micro-cellular concrete blocks. Precision interlocking with high insulation and non-combustible permanent structure.',
    rValue: 3.8,
    thermalMass: 'Medium',
    ecoScore: 'Good',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Construction (Engineered Blockwork)',
    imageUrl: '/materials/aac.jpg',
    hex: '#94a3b8',
    recommendedFor: ['resident'],
    typologyCriteriaBadge: 'ENGINEERED MASONRY',
    vendors: [
      { id: 'pw4', name: 'Ultratech AAC Blocks', pricePerSqm: 1650.00, deliveryDays: 3, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=aac+blocks' }
    ]
  },
  {
    id: 'fly_ash_bricks',
    name: 'Fly Ash Lime-Gypsum Bricks',
    desc: 'Eco-friendly dense masonry produced from upcycled mineral byproducts. High compressive strength and durable permanent construction.',
    rValue: 2.6,
    thermalMass: 'High',
    ecoScore: 'Good',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Construction (Masonry Bricks)',
    imageUrl: '/materials/flyash.jpg',
    hex: '#64748b',
    recommendedFor: ['resident'],
    typologyCriteriaBadge: 'UPCYCLED DENSE BRICK',
    vendors: [
      { id: 'pw5', name: 'GreenBrick Mfg India', pricePerSqm: 550.00, deliveryDays: 3, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=fly+ash+bricks' }
    ]
  }
];

export const RESIDENT_ROOF_MATERIALS: MaterialDef[] = [
  {
    id: 'clay_tiles',
    name: 'Mangalore Fired Clay Roof Tiles',
    desc: 'Interlocking natural terracotta tiles with batten air-gap. Centuries of proven durability, natural ventilation, and zero microplastic runoff.',
    albedo: 0.35,
    thermalMass: 'Medium',
    ecoScore: 'Excellent',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Installation',
    imageUrl: '/materials/clay_tiles.jpg',
    hex: '#b45309',
    recommendedFor: ['resident'],
    typologyCriteriaBadge: 'PERMANENT TERRACOTTA',
    vendors: [
      { id: 'pr1', name: 'Mangalore Heritage Tile Works', pricePerSqm: 680.00, deliveryDays: 5, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=mangalore+roof+tiles' }
    ]
  },
  {
    id: 'stone_slate',
    name: 'Natural Himalayan Stone Slate',
    desc: 'Hand-dressed regional metamorphic stone shingles. Permanent alpine frost resistance, high thermal inertia, and storm durability.',
    albedo: 0.25,
    thermalMass: 'High',
    ecoScore: 'Excellent',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Installation',
    imageUrl: '/materials/stone_slate.jpg',
    hex: '#334155',
    recommendedFor: ['resident'],
    typologyCriteriaBadge: 'PERMANENT STONE',
    vendors: [
      { id: 'pr2', name: 'Himalayan Slate Co.', pricePerSqm: 1200.00, deliveryDays: 7, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=slate+roofing' }
    ]
  },
  {
    id: 'cool_roof',
    name: 'Cool-Coated Permanent Terracotta Tile',
    desc: 'Natural fired clay tiles coated with ceramic micro-spheres. Combines clay tile thermal mass with 85% high solar reflectance.',
    albedo: 0.85,
    thermalMass: 'Medium',
    ecoScore: 'Good',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Installation',
    imageUrl: '/materials/cool_roof.jpg',
    hex: '#ffffff',
    recommendedFor: ['resident'],
    typologyCriteriaBadge: 'COOL REFLECTIVE',
    vendors: [
      { id: 'pr3', name: 'ThermoShield Tiles', pricePerSqm: 2600.00, deliveryDays: 4, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=cool+roof+tiles' }
    ]
  },
  {
    id: 'low_e_alu',
    name: 'Standing Seam Aluminum Roof',
    desc: 'Architectural concealed-fastener standing seam aluminum roof with thermal break insulation. 50+ year permanent service life.',
    albedo: 0.90,
    thermalMass: 'Low',
    ecoScore: 'Good',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Installation',
    imageUrl: '/materials/low_e_alu.jpg',
    hex: '#f8fafc',
    recommendedFor: ['resident'],
    typologyCriteriaBadge: 'ARCHITECTURAL SEAM',
    vendors: [
      { id: 'pr4', name: 'AluSpec Architectural', pricePerSqm: 4200.00, deliveryDays: 6, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=standing+seam+roofing' }
    ]
  }
];

export const RESIDENT_WINDOW_MATERIALS: MaterialDef[] = [
  {
    id: 'low_e_argon',
    name: 'Double Glazed Low-E Argon Filled',
    desc: 'Hermetically sealed IGU with pyrolytic soft-coat Low-E and dry argon cavity. Retains 85% of winter interior heat.',
    uValue: 1.4,
    shgc: 0.35,
    vlt: 0.65,
    thermalMass: 'Low',
    ecoScore: 'Excellent',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Glazing',
    imageUrl: '/materials/low_e_glass.jpg',
    hex: '#38bdf8',
    recommendedFor: ['resident'],
    typologyCriteriaBadge: 'RESIDENTIAL RETENTION',
    vendors: [
      { id: 'win3', name: 'Saint-Gobain India', pricePerSqm: 2600.00, deliveryDays: 6, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=low+e+insulated+glass' }
    ]
  },
  {
    id: 'double_clear',
    name: 'Standard Double Clear Insulated Glass',
    desc: 'Precision dual-pane glazing with 12mm desiccated air spacer. Balanced daylight transmission and acoustic damping.',
    uValue: 2.8,
    shgc: 0.70,
    vlt: 0.78,
    thermalMass: 'Low',
    ecoScore: 'Moderate',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Glazing',
    imageUrl: '/materials/double_clear.jpg',
    hex: '#7dd3fc',
    recommendedFor: ['resident'],
    typologyCriteriaBadge: 'BALANCED DAYLIGHT',
    vendors: [
      { id: 'win7', name: 'Modiguard Clear IGU', pricePerSqm: 1600.00, deliveryDays: 3, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=double+clear+glass' }
    ]
  },
  {
    id: 'triple_low_e',
    name: 'Triple Glazed Alpine High-Performance',
    desc: 'Triple pane with dual Low-E coatings and krypton gas fills. Ultra-low heat loss (U-0.8) for permanent high-altitude cold residences.',
    uValue: 0.8,
    shgc: 0.28,
    vlt: 0.55,
    thermalMass: 'Low',
    ecoScore: 'Excellent',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Glazing',
    imageUrl: '/materials/triple_low_e.jpg',
    hex: '#0284c7',
    recommendedFor: ['resident'],
    typologyCriteriaBadge: 'HIGH ALPINE COLD',
    vendors: [
      { id: 'win8', name: 'GlazeTech Systems', pricePerSqm: 5500.00, deliveryDays: 14, inStock: false, url: 'https://dir.indiamart.com/search.mp?ss=triple+glazed+windows' }
    ]
  }
];

// ─────────────────────────────────────────────────────────────
// 3. COMMUNITY / DUPLEX (PERMANENT MULTI-FAMILY) MATERIALS
// ─────────────────────────────────────────────────────────────

export const COMMUNITY_WALL_MATERIALS: MaterialDef[] = [
  {
    id: 'cseb',
    name: 'Reinforced CSEB Structural Blocks',
    desc: 'Load-bearing stabilized earth blocks with steel-reinforced bond beams. High structural integrity, thermal mass, and acoustic privacy between units.',
    rValue: 3.0,
    thermalMass: 'High',
    ecoScore: 'Excellent',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Heavy-Duty Construction',
    imageUrl: '/materials/cseb.jpg',
    hex: '#b4835a',
    recommendedFor: ['community'],
    typologyCriteriaBadge: 'HEAVY STRUCTURAL MASS',
    vendors: [
      { id: 'cw1', name: 'Auroville Earth Institute', pricePerSqm: 780.00, deliveryDays: 5, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=cseb+blocks' }
    ]
  },
  {
    id: 'aac_blocks',
    name: 'Commercial AAC Blockwork Wall',
    desc: 'Autoclaved aerated concrete masonry engineered for multi-unit fire barrier rating (4-hour fire separation) and acoustic decoupling.',
    rValue: 4.0,
    thermalMass: 'Medium',
    ecoScore: 'Good',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Engineered Masonry',
    imageUrl: '/materials/aac.jpg',
    hex: '#94a3b8',
    recommendedFor: ['community'],
    typologyCriteriaBadge: '4HR FIRE SEPARATION',
    vendors: [
      { id: 'cw2', name: 'Ultratech AAC Commercial', pricePerSqm: 1750.00, deliveryDays: 3, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=aac+blocks' }
    ]
  },
  {
    id: 'cavity_brick',
    name: 'Double-Wythe Cavity Brick + Mineral Core',
    desc: 'Two leaves of high-density brickwork enclosing a 75mm continuous mineral wool insulation cavity. Exceptional durability and weather resilience.',
    rValue: 3.8,
    thermalMass: 'Very High',
    ecoScore: 'Moderate',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Dual-Wythe Masonry',
    imageUrl: '/materials/cavity_brick.jpg',
    hex: '#7c2d12',
    recommendedFor: ['community'],
    typologyCriteriaBadge: 'HIGH IMPACT DUAL-WYTHE',
    vendors: [
      { id: 'cw3', name: 'Bharat Brickworks', pricePerSqm: 2400.00, deliveryDays: 4, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=wirecut+bricks' }
    ]
  },
  {
    id: 'rammed_earth',
    name: 'Stabilized Rammed Earth Spine Wall',
    desc: 'Central spine monolithic earth wall functioning as structural shear support and whole-building diurnal thermal regulator.',
    rValue: 2.8,
    thermalMass: 'Very High',
    ecoScore: 'Excellent',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Monolithic In-Situ',
    imageUrl: '/materials/rammed_earth.jpg',
    hex: '#9a6746',
    recommendedFor: ['community'],
    typologyCriteriaBadge: 'CENTRAL MASS FLYWHEEL',
    vendors: [
      { id: 'cw4', name: 'TerraFirma Commercial Earth', pricePerSqm: 920.00, deliveryDays: 8, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=rammed+earth' }
    ]
  },
  {
    id: 'hollow_polymer',
    name: 'Interlocking Recycled Polymer Core',
    desc: 'Extruded high-density interlocking recycled structural panels, filled on-site with local gravel/sand for high acoustic & thermal mass.',
    rValue: 2.4,
    thermalMass: 'Variable',
    ecoScore: 'Good',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Modular Infill Construction',
    imageUrl: '/materials/hollow_polymer.jpg',
    hex: '#48525b',
    recommendedFor: ['community'],
    typologyCriteriaBadge: 'COMPOSITE INFILL CORE',
    vendors: [
      { id: 'cw5', name: 'PolyBuild Modular Systems', pricePerSqm: 2800.00, deliveryDays: 4, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=hollow+plastic+panels' }
    ]
  }
];

export const COMMUNITY_ROOF_MATERIALS: MaterialDef[] = [
  {
    id: 'standing_seam_insulated',
    name: 'Insulated Standing Seam Steel Roof',
    desc: 'Commercial-grade structural standing seam roof with rigid mineral wool core. Designed for large spans, zero penetrations, and high wind resistance.',
    albedo: 0.75,
    thermalMass: 'Medium',
    ecoScore: 'Good',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Structural Roof',
    imageUrl: '/materials/standing_seam.jpg',
    hex: '#475569',
    recommendedFor: ['community'],
    typologyCriteriaBadge: 'LONG-SPAN STRUCTURAL',
    vendors: [
      { id: 'cr1', name: 'Tata BlueScope Steel', pricePerSqm: 3800.00, deliveryDays: 4, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=standing+seam+roofing' }
    ]
  },
  {
    id: 'clay_tiles',
    name: 'Interlocking Clay Tiles on Concrete Deck',
    desc: 'Natural fired clay roof tiles laid over a structural insulated deck. Excellent acoustic damping against heavy rain and hail.',
    albedo: 0.35,
    thermalMass: 'High',
    ecoScore: 'Excellent',
    categoryType: 'permanent',
    deploymentTime: 'Permanent High-Mass Roof',
    imageUrl: '/materials/clay_tiles.jpg',
    hex: '#b45309',
    recommendedFor: ['community'],
    typologyCriteriaBadge: 'ACOUSTIC SHIELD',
    vendors: [
      { id: 'cr2', name: 'Mangalore Interlock Works', pricePerSqm: 950.00, deliveryDays: 5, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=mangalore+roof+tiles' }
    ]
  },
  {
    id: 'cool_roof',
    name: 'High-Albedo Commercial Membrane',
    desc: 'Multi-layer polymeric cool roof with 85% solar reflectance. Reduces community cooling loads by up to 40% during peak heatwaves.',
    albedo: 0.85,
    thermalMass: 'Low',
    ecoScore: 'Good',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Commercial Membrane',
    imageUrl: '/materials/cool_roof.jpg',
    hex: '#ffffff',
    recommendedFor: ['community'],
    typologyCriteriaBadge: 'SOLAR REJECTION',
    vendors: [
      { id: 'cr3', name: 'ThermoShield Commercial', pricePerSqm: 2800.00, deliveryDays: 3, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=cool+roof+coating' }
    ]
  },
  {
    id: 'green_roof',
    name: 'Extensive Vegetated Living Green Roof',
    desc: 'Sedum and indigenous succulent vegetation on lightweight substrate. Superior thermal buffer, rainwater retention, and community microclimate moderation.',
    albedo: 0.30,
    thermalMass: 'Very High',
    ecoScore: 'Excellent',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Living System',
    imageUrl: '/materials/green_roof.jpg',
    hex: '#166534',
    recommendedFor: ['community'],
    typologyCriteriaBadge: 'ECO-LIVING BUFFER',
    vendors: [
      { id: 'cr4', name: 'EcoRoof India Systems', pricePerSqm: 4500.00, deliveryDays: 14, inStock: false, url: 'https://dir.indiamart.com/search.mp?ss=green+roof' }
    ]
  }
];

export const COMMUNITY_WINDOW_MATERIALS: MaterialDef[] = [
  {
    id: 'solar_control',
    name: 'Solar Control Reflective Glazing',
    desc: 'Spectrally selective pyrolytic coating reflecting near-infrared radiation. Essential for multi-family halls to prevent high-occupancy heat buildup.',
    uValue: 2.2,
    shgc: 0.28,
    vlt: 0.45,
    thermalMass: 'Low',
    ecoScore: 'Good',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Commercial Glazing',
    imageUrl: '/materials/solar_control.jpg',
    hex: '#0284c7',
    recommendedFor: ['community'],
    typologyCriteriaBadge: 'SOLAR CONTROL',
    vendors: [
      { id: 'win5', name: 'AIS SunShield Glazing', pricePerSqm: 2100.00, deliveryDays: 4, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=solar+control+glass' }
    ]
  },
  {
    id: 'low_e_argon',
    name: 'Double Glazed Low-E Argon Filled',
    desc: 'Hermetically sealed IGU with Low-E coating. Ideal for colder climate community halls requiring high thermal containment.',
    uValue: 1.4,
    shgc: 0.35,
    vlt: 0.65,
    thermalMass: 'Low',
    ecoScore: 'Excellent',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Glazing',
    imageUrl: '/materials/low_e_glass.jpg',
    hex: '#38bdf8',
    recommendedFor: ['community'],
    typologyCriteriaBadge: 'HIGH CONTAINMENT',
    vendors: [
      { id: 'win3', name: 'Saint-Gobain India', pricePerSqm: 2600.00, deliveryDays: 6, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=low+e+insulated+glass' }
    ]
  },
  {
    id: 'double_clear',
    name: 'Double Glazed Acoustic Safety Unit',
    desc: 'Laminated acoustic double glazing for high-occupancy noise isolation and public impact safety compliance.',
    uValue: 2.8,
    shgc: 0.70,
    vlt: 0.78,
    thermalMass: 'Low',
    ecoScore: 'Moderate',
    categoryType: 'permanent',
    deploymentTime: 'Permanent Safety Glazing',
    imageUrl: '/materials/double_clear.jpg',
    hex: '#7dd3fc',
    recommendedFor: ['community'],
    typologyCriteriaBadge: 'ACOUSTIC SAFETY',
    vendors: [
      { id: 'win7', name: 'Modiguard Clear IGU', pricePerSqm: 1600.00, deliveryDays: 3, inStock: true, url: 'https://dir.indiamart.com/search.mp?ss=double+clear+glass' }
    ]
  }
];

// Combined arrays for catalogue / backwards compatibility
export const WALL_MATERIALS: MaterialDef[] = [
  ...EMERGENCY_WALL_MATERIALS,
  ...RESIDENT_WALL_MATERIALS.filter(m => !EMERGENCY_WALL_MATERIALS.some(e => e.id === m.id)),
  ...COMMUNITY_WALL_MATERIALS.filter(m => !EMERGENCY_WALL_MATERIALS.some(e => e.id === m.id) && !RESIDENT_WALL_MATERIALS.some(r => r.id === m.id))
];

export const ROOF_MATERIALS: MaterialDef[] = [
  ...EMERGENCY_ROOF_MATERIALS,
  ...RESIDENT_ROOF_MATERIALS.filter(m => !EMERGENCY_ROOF_MATERIALS.some(e => e.id === m.id)),
  ...COMMUNITY_ROOF_MATERIALS.filter(m => !EMERGENCY_ROOF_MATERIALS.some(e => e.id === m.id) && !RESIDENT_ROOF_MATERIALS.some(r => r.id === m.id))
];

export const WINDOW_MATERIALS: MaterialDef[] = [
  ...EMERGENCY_WINDOW_MATERIALS,
  ...RESIDENT_WINDOW_MATERIALS.filter(m => !EMERGENCY_WINDOW_MATERIALS.some(e => e.id === m.id)),
  ...COMMUNITY_WINDOW_MATERIALS.filter(m => !EMERGENCY_WINDOW_MATERIALS.some(e => e.id === m.id) && !RESIDENT_WINDOW_MATERIALS.some(r => r.id === m.id))
];

export interface TypologyMaterialBundle {
  categoryName: string;
  categoryType: 'deployable' | 'permanent';
  categoryBadge: string;
  categoryDesc: string;
  walls: MaterialDef[];
  roofs: MaterialDef[];
  windows: MaterialDef[];
  defaultRoofId: string;
  defaultWallId: string;
  defaultWindowId: string;
}

/**
 * Returns the exact materials tailored to a specific typology:
 * - Emergency -> Deployable modular materials ONLY
 * - Resident -> Permanent residential masonry & mass ONLY (Non-deployable)
 * - Community -> Permanent high-capacity commercial/duplex materials ONLY (Non-deployable)
 */
export function getMaterialsForTypology(typology: 'emergency' | 'resident' | 'community'): TypologyMaterialBundle {
  if (typology === 'emergency') {
    return {
      categoryName: 'Emergency Rapid-Deployment Envelope',
      categoryType: 'deployable',
      categoryBadge: '⚡ RAPID DEPLOYABLE (RELIEF MODULAR)',
      categoryDesc: 'Pre-fabricated lightweight modular components for 24-48h disaster relief. Zero wet curing required.',
      walls: EMERGENCY_WALL_MATERIALS,
      roofs: EMERGENCY_ROOF_MATERIALS,
      windows: EMERGENCY_WINDOW_MATERIALS,
      defaultRoofId: 'cool_roof',
      defaultWallId: 'eps',
      defaultWindowId: 'polycarbonate_multiwall',
    };
  } else if (typology === 'resident') {
    return {
      categoryName: 'Permanent Residential Construction',
      categoryType: 'permanent',
      categoryBadge: '🏛️ PERMANENT RESIDENTIAL (NON-DEPLOYABLE)',
      categoryDesc: 'Durable 40+ year lifecycle masonry with high thermal mass, natural diurnal damping, and passive solar energy storage.',
      walls: RESIDENT_WALL_MATERIALS,
      roofs: RESIDENT_ROOF_MATERIALS,
      windows: RESIDENT_WINDOW_MATERIALS,
      defaultRoofId: 'clay_tiles',
      defaultWallId: 'cseb',
      defaultWindowId: 'low_e_argon',
    };
  } else {
    return {
      categoryName: 'Permanent Community & Duplex Structure',
      categoryType: 'permanent',
      categoryBadge: '🏢 PERMANENT MULTI-FAMILY / PUBLIC (NON-DEPLOYABLE)',
      categoryDesc: 'Heavy-duty permanent structural envelope engineered for multi-family duplexes, public gathering halls, and 4-hour fire separation.',
      walls: COMMUNITY_WALL_MATERIALS,
      roofs: COMMUNITY_ROOF_MATERIALS,
      windows: COMMUNITY_WINDOW_MATERIALS,
      defaultRoofId: 'standing_seam_insulated',
      defaultWallId: 'cseb',
      defaultWindowId: 'solar_control',
    };
  }
}

/**
 * Helper: Get default material objects for a typology
 */
export function getDefaultMaterialsForTypology(typology: 'emergency' | 'resident' | 'community') {
  const bundle = getMaterialsForTypology(typology);
  const roof = bundle.roofs.find(m => m.id === bundle.defaultRoofId) || bundle.roofs[0];
  const wall = bundle.walls.find(m => m.id === bundle.defaultWallId) || bundle.walls[0];
  const window = bundle.windows.find(m => m.id === bundle.defaultWindowId) || bundle.windows[0];

  return { roof, wall, window, bundle };
}
