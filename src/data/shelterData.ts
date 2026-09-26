import type { HotspotInfo, MaterialConfig, ColorSchemeId, BOMItem, AssemblyStep } from '../types/shelter';

export const COLOR_SCHEMES: Record<ColorSchemeId, MaterialConfig> = {
  'olive-warm': {
    name: 'Olive Drab & Warm White (Standard Relief)',
    description: 'High-performance Kingspan-style composite sandwich panels with horizontal micro-rib striations, modular EPDM seal joints, and PVDF matte coating.',
    wallPrimary: '#465345', // Olive drab
    wallSecondary: '#f2ede4', // Warm white
    frameColor: '#8a929a', // Galvanized steel
    roofColor: '#3a443a', // Darker corrugated composite olive
    roughness: 0.58,
    metalness: 0.12,
    frameMetalness: 0.88,
    frameRoughness: 0.32,
  },
  'arctic-white': {
    name: 'Arctic High-Albedo & Rescue Orange',
    description: 'Maximum thermal R-28 composite sandwich envelope with micro-profile flutes, architectural reveal joints, and cold-galvanized corner closures.',
    wallPrimary: '#eaecef', // Arctic white
    wallSecondary: '#ffffff', // Pure white
    frameColor: '#c5cdd6', // Cold galvanized zinc
    roofColor: '#2d333b', // Dark solar absorbing corrugated slate
    roughness: 0.52,
    metalness: 0.10,
    frameMetalness: 0.9,
    frameRoughness: 0.28,
  },
  'desert-sand': {
    name: 'Khaki Sand & Thermal Shield',
    description: 'High solar-reflectance insulated composite panels with architectural joint reveals engineered for extreme arid diurnal swings.',
    wallPrimary: '#c4b59d', // Khaki sand
    wallSecondary: '#ebe4d6', // Light plaster
    frameColor: '#979a9d', // Anodized LGSF
    roofColor: '#dfd8cb', // Solar reflective pale roof
    roughness: 0.62,
    metalness: 0.08,
    frameMetalness: 0.85,
    frameRoughness: 0.35,
  },
  'treated-bamboo': {
    name: 'Treated Modular Bamboo Hybrid Frame',
    description: 'Eco-resilient boron-treated modular bamboo composite envelope with natural fibrous grain and precision structural connection trims.',
    wallPrimary: '#545f4e',
    wallSecondary: '#ede6d8',
    frameColor: '#9e794b', // Rich cured bamboo ochre
    roofColor: '#3f453a',
    roughness: 0.65,
    metalness: 0.04,
    frameMetalness: 0.25,
    frameRoughness: 0.7,
  }
};

export const HOTSPOTS: HotspotInfo[] = [
  {
    id: 'footings',
    title: '150mm Raised Ground-Anchor Footings',
    category: 'Foundation',
    position: [-2.9, 0.08, 1.9],
    summary: 'Adjustable heavy-duty cold-formed steel pier footings elevating the subfloor 150mm off wet, flooded, or frozen terrain.',
    specs: [
      { label: 'Ground Clearance', value: '150 mm nominal (adjustable ±50 mm)' },
      { label: 'Anchoring Method', value: 'Hex-drive helical ground anchors (zero wet concrete curing)' },
      { label: 'Flood Defense', value: 'Flash water diversion & acute surface moisture barrier' },
      { label: 'Load Capacity', value: '18.5 kN per point footing (8 perimeter points)' },
    ]
  },
  {
    id: 'lgsf-exoskeleton',
    title: 'LGSF Corner Exoskeleton & Hex Brackets',
    category: 'Structure',
    position: [-3.05, 1.35, 2.05],
    summary: 'Lightweight Galvanized Steel (LGSF) C-channel structural corner columns fastened with M12 high-tensile hex-bolt gusset plates.',
    specs: [
      { label: 'Steel Grade', value: 'G550 cold-formed galvanized zinc-coated steel (Z275)' },
      { label: 'Wall Thickness', value: '1.2 mm gauge with rolled stiffening lips' },
      { label: 'Seismic / Wind', value: 'Wind resistance up to 140 km/h (Category 1 hurricane)' },
      { label: 'Fasteners', value: 'M12 Grade 8.8 hex bolts with integrated neoprene sealing washers' },
    ]
  },
  {
    id: 'sandwich-panels',
    title: 'High-R Composite Sandwich Envelope',
    category: 'Envelope',
    position: [-0.6, 1.35, 2.04],
    summary: 'Weatherproof tongue-and-groove insulated sandwich panels with closed-cell PIR core and matte powder-coated steel facings.',
    specs: [
      { label: 'Panel Thickness', value: '75 mm modular interlocking tongue-and-groove' },
      { label: 'Insulation Core', value: 'PIR (Polyisocyanurate) closed-cell foam (R-value: R-28 / U=0.20 W/m²K)' },
      { label: 'Facings', value: '0.5 mm pre-weathered matte steel with warm white/olive drab finish' },
      { label: 'Vapor Barrier', value: 'Reflective aluminum thermal vapor barrier, 97% radiant heat reflection' },
    ]
  },
  {
    id: 'corrugated-roof',
    title: '15° Pitched Corrugated Composite Roof',
    category: 'Envelope',
    position: [0.0, 3.25, -0.2],
    summary: 'Lightweight composite corrugated roof assembly sloped at a 15-degree pitch for immediate rain shedding and snow discharge.',
    specs: [
      { label: 'Roof Slope', value: '15° mono-pitch water-shedding gradient' },
      { label: 'Profile', value: 'Sinusoidal heavy-duty corrugated composite profile with 250mm eaves' },
      { label: 'Rain Shedding', value: 'Over 120 mm/hr acute tropical downpour discharge rate' },
      { label: 'Snow Load', value: 'Rated for 1.2 kN/m² winter snow accumulation' },
    ]
  },
  {
    id: 'polycarb-windows',
    title: 'South-Facing Double-Glazed Polycarbonate',
    category: 'Fenestration',
    position: [1.2, 1.55, 2.04],
    summary: 'Impact-resistant multi-wall polycarbonate windows positioned south for passive solar thermal harvest with EPDM rubber seals.',
    specs: [
      { label: 'Glazing', value: '16 mm dual-wall UV-shielded impact-resistant polycarbonate' },
      { label: 'Impact Rating', value: '250× impact strength of float glass (shatterproof in hail/debris)' },
      { label: 'Weatherstripping', value: 'Dual-lip vulcanized EPDM continuous rubber gasket' },
      { label: 'Passive Solar', value: '+3.8°C net solar thermal gain during peak daylight hours' },
    ]
  },
  {
    id: 'curtain-entry',
    title: 'Insulated Thermal-Curtain Entryway',
    category: 'Aperture',
    position: [-1.85, 1.25, 2.04],
    summary: 'Weatherproof heavy-duty storm door with airtight zip-seal thermal barrier flap and industrial stainless latching hardware.',
    specs: [
      { label: 'Aperture Dimension', value: '900 mm × 2050 mm clear rapid egress opening' },
      { label: 'Thermal Lock', value: 'Magnetic inner seal + industrial exterior storm cam-latch' },
      { label: 'Thermal Curtain', value: 'Quilted aerogel/fiber thermal drape preventing cold air wash' },
      { label: 'Threshold', value: 'Integrated thermal break sill with water-barrier lip' },
    ]
  },
  {
    id: 'ventilation',
    title: 'Passive Thermosiphon & Roof Extraction Ventilation',
    category: 'Envelope',
    position: [0.0, 3.75, -1.2],
    summary: 'Dual-zone passive ventilation combining aerodynamic roof wind-turbine extraction cowls, high-level storm louvers, and low-level fresh air intake for continuous moisture and CO₂ removal.',
    specs: [
      { label: 'Ventilation Mechanism', value: 'Buoyancy stack thermosiphon + wind-driven roof turbine extraction' },
      { label: 'Air Exchange Rate', value: '1.8 ACH (Air Changes per Hour) at 10 km/h ambient wind' },
      { label: 'Weather Protection', value: 'Dual-tier downward chevron louvers with anti-backdraft damper & insect mesh' },
      { label: 'Freeze Protection', value: 'Interior insulated throttle damper preventing acute freeze drafts' },
    ]
  },
  {
    id: 'interior-lighting',
    title: 'Dual-Zone 24V Modular Interior LED System',
    category: 'Structure',
    position: [0.0, 2.30, 0.0],
    summary: 'High-efficacy 24V DC architectural ceiling battens, entryway threshold downlight, and tactical task illumination with dimming and emergency modes.',
    specs: [
      { label: 'Luminaires', value: 'Twin 2.4m linear ceiling battens (48W total, 5,200 lumens output)' },
      { label: 'Color Temperature', value: '3500K Warm Architectural / 5000K Daylight / Red Night-Vision' },
      { label: 'Power Draw', value: '24V DC bus powered directly from central solar/battery hub' },
      { label: 'Emergency Runtime', value: 'Over 48 hours at low-lux survival mode (4W)' },
    ]
  }
];

export const BOM_DATA: BOMItem[] = [
  {
    id: 'bom-1',
    category: 'Structural Exoskeleton',
    item: 'LGSF Corner Columns (C-100/40/1.2)',
    specification: '6000 Series zinc-galvanized G550 steel, rolled profile with punched service slots',
    qty: 4,
    unit: 'pcs',
    unitWeightKg: 14.2,
    totalWeightKg: 56.8,
    fieldTool: '17mm Hex Socket / Cordless Driver'
  },
  {
    id: 'bom-2',
    category: 'Structural Exoskeleton',
    item: 'LGSF Intermediate Studs & Wall Tracks',
    specification: 'Cold-formed light gauge channel G550, 2.4m vertical studs at 600mm centers',
    qty: 22,
    unit: 'pcs',
    unitWeightKg: 8.4,
    totalWeightKg: 184.8,
    fieldTool: '17mm Hex Socket & Level'
  },
  {
    id: 'bom-3',
    category: 'Structural Exoskeleton',
    item: 'M12 Industrial Gusset Corner Brackets',
    specification: '4mm structural steel corner plate with Grade 8.8 hot-dip galvanized hex fasteners',
    qty: 16,
    unit: 'sets',
    unitWeightKg: 2.1,
    totalWeightKg: 33.6,
    fieldTool: '19mm Ratchet Wrench'
  },
  {
    id: 'bom-4',
    category: 'Foundation',
    item: 'Raised Steel Ground-Anchor Footings',
    specification: '150mm stand-off pier baseplates with integrated leveling threads and locking collar',
    qty: 8,
    unit: 'assemblies',
    unitWeightKg: 9.5,
    totalWeightKg: 76.0,
    fieldTool: 'Anchor Driver & Bubble Level'
  },
  {
    id: 'bom-5',
    category: 'Foundation',
    item: 'Helical Heavy-Duty Earth Screws',
    specification: '850mm hot-dip galvanized screw-anchors for gravel, loam, clay, or permafrost',
    qty: 8,
    unit: 'pcs',
    unitWeightKg: 6.8,
    totalWeightKg: 54.4,
    fieldTool: 'Manual Ground T-Bar / Torque Driver'
  },
  {
    id: 'bom-6',
    category: 'Envelope Panels',
    item: '75mm PIR Sandwich Wall Panels (6m & 4m walls)',
    specification: 'Interlocking tongue & groove, 0.5mm matte steel skin with fire-retardant PIR core',
    qty: 18,
    unit: 'panels',
    unitWeightKg: 18.6,
    totalWeightKg: 334.8,
    fieldTool: 'Clamping Cam & Sealing Mallet'
  },
  {
    id: 'bom-7',
    category: 'Roofing',
    item: '15° Corrugated Composite Roof Sheets',
    specification: 'Corrugated fiber-reinforced polymer composite with integrated drip-edge and UV barrier',
    qty: 6,
    unit: 'sheets',
    unitWeightKg: 16.5,
    totalWeightKg: 99.0,
    fieldTool: 'Self-Drilling Hex Tek Screws'
  },
  {
    id: 'bom-8',
    category: 'Fenestration',
    item: 'Double-Glazed Polycarbonate Windows',
    specification: '1200mm × 800mm 16mm multi-wall polycarbonate with EPDM vulcanized rubber seals',
    qty: 2,
    unit: 'units',
    unitWeightKg: 11.2,
    totalWeightKg: 22.4,
    fieldTool: 'Pre-set Cam Latches'
  },
  {
    id: 'bom-9',
    category: 'Aperture',
    item: 'Insulated Storm Entryway & Thermal Curtain',
    specification: 'Pre-hung insulated door with heavy-duty cam-latch and magnetic thermal storm curtain',
    qty: 1,
    unit: 'assembly',
    unitWeightKg: 28.5,
    totalWeightKg: 28.5,
    fieldTool: '4-Point Corner Clamp'
  },
  {
    id: 'bom-10',
    category: 'Floor & Substructure',
    item: 'Insulated Raised Floor Cassettes (1m × 2m)',
    specification: 'Structural composite decking with R-24 rigid foam underside and anti-slip traction surface',
    qty: 12,
    unit: 'cassettes',
    unitWeightKg: 19.0,
    totalWeightKg: 228.0,
    fieldTool: 'Locking Interlock Keys'
  },
  {
    id: 'bom-11',
    category: 'Ventilation & IAQ',
    item: 'Aerodynamic Rotary Roof Wind Cowl Extractor',
    specification: '300mm throat marine-grade aluminum wind turbine cowl with contoured corrugated deck flashing and insect screen',
    qty: 2,
    unit: 'units',
    unitWeightKg: 4.8,
    totalWeightKg: 9.6,
    fieldTool: 'Tek Screws & Neutral Silicone Sealant'
  },
  {
    id: 'bom-12',
    category: 'Ventilation & IAQ',
    item: 'Weatherproof Chevron Storm Louvers (Exhaust & Intake)',
    specification: 'Extruded aluminum 45° chevron louvers with stainless insect mesh, internal throttle damper, and perimeter flashings',
    qty: 4,
    unit: 'assemblies',
    unitWeightKg: 2.4,
    totalWeightKg: 9.6,
    fieldTool: 'Rivet Gun & Hex Driver'
  },
  {
    id: 'bom-13',
    category: 'Electrical & Illumination',
    item: '24V DC Dual-Zone Linear LED Luminaire Kit',
    specification: 'Twin 2.4m extruded aluminum ceiling battens (5200 lm, 3500K/5000K/Red mode), entry courtesy downlight, workstation task lamp, and DC dimmer controller',
    qty: 1,
    unit: 'kit',
    unitWeightKg: 3.2,
    totalWeightKg: 3.2,
    fieldTool: 'Quick-Snap Purlin Clips & Plug-and-Play DC Harness'
  }
];

export const ASSEMBLY_STEPS: AssemblyStep[] = [
  {
    step: 1,
    title: 'Site Datum & Helical Ground Anchoring',
    durationMinutes: 45,
    crewSize: 4,
    description: 'Lay out 6.0m × 4.0m perimeter grid. Drive 8 helical earth screws to load-bearing refusal depth. Secure 150mm raised steel footings and level with laser or bubble level.',
    keyVerification: 'All 8 pier footings level within ±3mm; zero wet concrete curing required.',
    toolRequired: 'Ground torque wrench, laser level, anchor key'
  },
  {
    step: 2,
    title: 'Subfloor Grid & Insulated Floor Cassettes',
    durationMinutes: 40,
    crewSize: 3,
    description: 'Fasten LGSF perimeter joists onto footing brackets. Drop in twelve 1m × 2m interlocking insulated floor cassettes to establish a rigid 24 m² dry platform.',
    keyVerification: 'Floor interlocks fully seated with vapor gasket compressed; platform rigid.',
    toolRequired: 'Cam-latch key, hex driver'
  },
  {
    step: 3,
    title: 'LGSF Corner Exoskeletons & Wall Rails',
    durationMinutes: 50,
    crewSize: 4,
    description: 'Erect 4 corner C-channel columns. Install top and bottom galvanized steel guide channels and secure industrial M12 hex-bolt gusset plates at all corner intersections.',
    keyVerification: 'Columns plumb to 90.0°; corner hex bolts torqued to 45 N·m.',
    toolRequired: '17mm/19mm socket drivers, plumb bob'
  },
  {
    step: 4,
    title: 'Tongue-and-Groove Sandwich Panel Envelope',
    durationMinutes: 65,
    crewSize: 4,
    description: 'Slide 75mm PIR wall panels into bottom channels. Interlock vertical tongue-and-groove joints. Slot in pre-hung south-facing double-glazed polycarbonate windows and storm door.',
    keyVerification: 'Continuous EPDM weatherstrip seal engaged without gaps along entire perimeter.',
    toolRequired: 'Rubber dead-blow mallet, edge clamp'
  },
  {
    step: 5,
    title: '15° Pitched Corrugated Roof & Sealing',
    durationMinutes: 50,
    crewSize: 4,
    description: 'Hoist lightweight 15° pitched corrugated composite roof sections. Fasten along purlins with EPDM-washered hex tek screws. Fasten ridge cap and thermal curtain entryway.',
    keyVerification: 'Complete watertight test: roof overhang extends 250mm over all 4 facades.',
    toolRequired: 'Cordless drill with depth-stop hex bit'
  }
];
