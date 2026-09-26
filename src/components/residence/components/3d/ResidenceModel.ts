import * as THREE from 'three';
import {
  createRammedEarthPBR,
  createTeakWoodPBR,
  createKotaStonePBR,
  createTerracottaJaaliTexture,
  createLinenFabricTexture
} from '../../utils/proceduralTextures';
import { ROOMS } from '../../data/residenceData';
import type { CutawayLevel } from '../../types/architectural';

export interface ResidenceModelHierarchy {
  root: THREE.Group;
  structureGroup: THREE.Group;
  openingsGroup: THREE.Group;
  circulationGroup: THREE.Group;
  interiorGroup: THREE.Group;
  furnitureGroup: THREE.Group;
  airflowParticles: THREE.Points;
  updateAirflow: (delta: number) => void;
  setCutaway: (level: CutawayLevel) => void;
  highlightRoom: (roomId: string | null) => void;
}

export function buildResidenceModel(): ResidenceModelHierarchy {
  const root = new THREE.Group();
  root.name = 'HOUSE_ROOT';

  // -------------------------------------------------------------
  // HIGH-RESOLUTION PBR MATERIALS SETUP
  // -------------------------------------------------------------
  const earthPBR = createRammedEarthPBR();
  const teakPBR = createTeakWoodPBR();
  const stonePBR = createKotaStonePBR();
  const { colorMap: jaaliColor, alphaMap: jaaliAlpha } = createTerracottaJaaliTexture();
  const linenTexture = createLinenFabricTexture();

  // Stabilized Rammed Earth (350mm continuous mineral monoliths)
  const rammedEarthMaterial = new THREE.MeshStandardMaterial({
    map: earthPBR.map,
    roughnessMap: earthPBR.roughnessMap,
    bumpMap: earthPBR.bumpMap,
    bumpScale: 0.05,
    roughness: 0.88,
    metalness: 0.02
  });

  // Reclaimed Old-Growth Teak (joinery, frames, furniture)
  const teakMaterial = new THREE.MeshStandardMaterial({
    map: teakPBR.map,
    roughnessMap: teakPBR.roughnessMap,
    bumpMap: teakPBR.bumpMap,
    bumpScale: 0.02,
    roughness: 0.48,
    metalness: 0.06
  });

  // Natural Kota Stone / Limestone (floors, sills, stairs, thresholds)
  const kotaStoneMaterial = new THREE.MeshStandardMaterial({
    map: stonePBR.map,
    roughnessMap: stonePBR.roughnessMap,
    bumpMap: stonePBR.bumpMap,
    bumpScale: 0.035,
    roughness: 0.68,
    metalness: 0.08
  });

  // Indian Contemporary Terracotta Jaali
  const jaaliMaterial = new THREE.MeshStandardMaterial({
    map: jaaliColor,
    alphaMap: jaaliAlpha,
    transparent: true,
    alphaTest: 0.45,
    roughness: 0.82,
    metalness: 0.02,
    side: THREE.DoubleSide
  });

  // Architectural Low-E Glazing (physically transparent glass)
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xcde0ec,
    transparent: true,
    opacity: 0.22,
    roughness: 0.08,
    metalness: 0.05,
    reflectivity: 0.85
  });

  // Frosted Privacy Glass (Ensuite shower / bathroom screen)
  const frostedGlassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd6e5ed,
    transparent: true,
    opacity: 0.45,
    roughness: 0.35,
    metalness: 0.05
  });

  // Natural Belgian Linen Fabric
  const linenMaterial = new THREE.MeshStandardMaterial({
    map: linenTexture,
    roughness: 0.92,
    metalness: 0.02
  });

  // Neutral Lime-Wash Plaster (Interior partitions)
  const plasterMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8e2d8,
    roughness: 0.84,
    metalness: 0.02
  });

  // Brushed Architectural Dark Bronze / Metal
  const darkMetalMaterial = new THREE.MeshStandardMaterial({
    color: 0x242426,
    roughness: 0.32,
    metalness: 0.88
  });

  // Water Mirror / Honed Basalt (Courtyard contemplation basin)
  const waterBasinMaterial = new THREE.MeshStandardMaterial({
    color: 0x181c20,
    roughness: 0.10,
    metalness: 0.70
  });

  // -------------------------------------------------------------
  // MODEL PRODUCTION HIERARCHY
  // -------------------------------------------------------------
  const structureGroup = new THREE.Group();
  structureGroup.name = 'STRUCTURE';

  const openingsGroup = new THREE.Group();
  openingsGroup.name = 'OPENINGS';

  const circulationGroup = new THREE.Group();
  circulationGroup.name = 'CIRCULATION';

  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'INTERIOR';

  const furnitureGroup = new THREE.Group();
  furnitureGroup.name = 'FURNITURE';

  const groundStructure = new THREE.Group();
  groundStructure.name = 'GROUND_STRUCTURE';

  const firstStructure = new THREE.Group();
  firstStructure.name = 'FIRST_STRUCTURE';

  const roofStructure = new THREE.Group();
  roofStructure.name = 'ROOF_STRUCTURE';

  structureGroup.add(groundStructure);
  structureGroup.add(firstStructure);
  structureGroup.add(roofStructure);

  root.add(structureGroup);
  root.add(openingsGroup);
  root.add(circulationGroup);
  root.add(interiorGroup);
  root.add(furnitureGroup);

  // Helper function to create snapped, manifold box geometry
  const createBox = (
    w: number, h: number, d: number,
    x: number, y: number, z: number,
    material: THREE.Material,
    castShadow = true, receiveShadow = true
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    return mesh;
  };

  // -------------------------------------------------------------
  // GENUINE ARCHITECTURAL WINDOW ASSEMBLY GENERATOR
  // The wall opening is an actual VOID.
  // This helper builds ONLY the perimeter timber frame profile (head, sill, jambs),
  // optional vertical dividing mullions, projecting stone sub-sill, and the transparent glass pane.
  // There is ZERO OPAQUE WALL OR WOOD BEHIND THE GLASS.
  // -------------------------------------------------------------
  const createArchitecturalWindow = (
    orientation: 'NS' | 'EW', // NS: facing North/South (opening along X), EW: facing East/West (opening along Z)
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    centerZ: number,
    recessDepth: number, // distance inward from outer wall face
    mullionCount = 0,
    isFrosted = false
  ) => {
    const group = new THREE.Group();
    const frameProfile = 0.06; // 60mm frame width
    const frameThickness = 0.08; // 80mm frame depth
    const glassThickness = 0.015; // 15mm double glazing

    const activeGlassMat = isFrosted ? frostedGlassMaterial : glassMaterial;

    if (orientation === 'NS') {
      // Facing North or South. Width is along X, Depth along Z.
      const frameZ = centerZ + recessDepth;

      // Top Head Member (Width: W, Height: 60mm, Depth: 80mm)
      group.add(createBox(width, frameProfile, frameThickness, centerX, centerY + height / 2 - frameProfile / 2, frameZ, teakMaterial));
      // Bottom Sill Member
      group.add(createBox(width, frameProfile, frameThickness, centerX, centerY - height / 2 + frameProfile / 2, frameZ, teakMaterial));
      // Left Jamb Member
      const jambH = height - 2 * frameProfile;
      group.add(createBox(frameProfile, jambH, frameThickness, centerX - width / 2 + frameProfile / 2, centerY, frameZ, teakMaterial));
      // Right Jamb Member
      group.add(createBox(frameProfile, jambH, frameThickness, centerX + width / 2 - frameProfile / 2, centerY, frameZ, teakMaterial));

      // Vertical Mullions (if any)
      const clearW = width - 2 * frameProfile;
      const bayCount = mullionCount + 1;
      const mullionW = 0.05;
      const glassBayW = (clearW - mullionCount * mullionW) / bayCount;

      for (let m = 1; m <= mullionCount; m++) {
        const mullionX = centerX - width / 2 + frameProfile + m * (glassBayW + mullionW) - mullionW / 2;
        group.add(createBox(mullionW, jambH, frameThickness, mullionX, centerY, frameZ, teakMaterial));
      }

      // Glazing Panes (positioned in the true opening voids between frame and mullions)
      for (let b = 0; b < bayCount; b++) {
        const bayCenterX = centerX - width / 2 + frameProfile + b * (glassBayW + mullionW) + glassBayW / 2;
        group.add(createBox(glassBayW, jambH, glassThickness, bayCenterX, centerY, frameZ, activeGlassMat, false, false));
      }

      // Projecting Stone Sub-Sill (at the bottom exterior edge)
      const sillZ = centerZ + (recessDepth > 0 ? recessDepth - 0.06 : recessDepth + 0.06);
      group.add(createBox(width + 0.08, 0.04, 0.14, centerX, centerY - height / 2 - 0.02, sillZ, kotaStoneMaterial));

    } else {
      // Facing East or West. Width is along Z, Depth along X.
      const frameX = centerX + recessDepth;

      // Top Head Member (Depth: W along Z, Height: 60mm, Thickness: 80mm along X)
      group.add(createBox(frameThickness, frameProfile, width, frameX, centerY + height / 2 - frameProfile / 2, centerZ, teakMaterial));
      // Bottom Sill Member
      group.add(createBox(frameThickness, frameProfile, width, frameX, centerY - height / 2 + frameProfile / 2, centerZ, teakMaterial));
      // Left Jamb Member (South jamb along Z)
      const jambH = height - 2 * frameProfile;
      group.add(createBox(frameThickness, jambH, frameProfile, frameX, centerY, centerZ - width / 2 + frameProfile / 2, teakMaterial));
      // Right Jamb Member (North jamb along Z)
      group.add(createBox(frameThickness, jambH, frameProfile, frameX, centerY, centerZ + width / 2 - frameProfile / 2, teakMaterial));

      // Vertical Mullions
      const clearW = width - 2 * frameProfile;
      const bayCount = mullionCount + 1;
      const mullionD = 0.05;
      const glassBayW = (clearW - mullionCount * mullionD) / bayCount;

      for (let m = 1; m <= mullionCount; m++) {
        const mullionZ = centerZ - width / 2 + frameProfile + m * (glassBayW + mullionD) - mullionD / 2;
        group.add(createBox(frameThickness, jambH, mullionD, frameX, centerY, mullionZ, teakMaterial));
      }

      // Glazing Panes
      for (let b = 0; b < bayCount; b++) {
        const bayCenterZ = centerZ - width / 2 + frameProfile + b * (glassBayW + mullionD) + glassBayW / 2;
        group.add(createBox(glassThickness, jambH, glassBayW, frameX, centerY, bayCenterZ, activeGlassMat, false, false));
      }

      // Projecting Stone Sub-Sill
      const sillX = centerX + (recessDepth > 0 ? recessDepth - 0.06 : recessDepth + 0.06);
      group.add(createBox(0.14, 0.04, width + 0.08, sillX, centerY - height / 2 - 0.02, centerZ, kotaStoneMaterial));
    }

    return group;
  };

  // -------------------------------------------------------------
  // STRICT ARCHITECTURAL COORDINATE SYSTEM & REFERENCE DATUMS
  // -------------------------------------------------------------
  // Footprint: 18.00m EW (X: -9.00 to +9.00) × 12.00m NS (Z: -6.00 to +6.00)
  // Wall Thickness: strictly 0.35m (350mm)
  // Interior Dimensions: 17.30m EW (X: -8.65 to +8.65) × 11.30m NS (Z: -5.65 to +5.65)
  //
  // Vertical Levels:
  // Ground Finished Floor Level (FFL): Y = 0.00
  // Ground Clear Ceiling: Y = 3.40 (Ground Wall H = 3.40m)
  // GROUND WINDOW HEAD DATUM: strictly Y = 3.00m across all ground floor openings!
  // Ground structural lintel: Y = 3.00 to 3.40m (0.40m continuous lintel)
  //
  // First Floor Structural Slab: Y = 3.40 to 3.60 (0.20m thick)
  // First Floor Finished Floor Level (FFL): Y = 3.60
  // First Floor Clear Ceiling: Y = 6.90 (First Wall H = 3.30m)
  // FIRST FLOOR WINDOW HEAD DATUM: strictly Y = 6.50m across all upper floor openings!
  // First floor structural lintel: Y = 6.50 to 6.90m (0.40m continuous lintel)
  //
  // Roof Slab: Y = 6.90 to 7.15 (0.25m thick)
  // Clerestory Thermal Chimney: Y = 7.15 to 8.65 (H = 1.50m stack)
  // Roof Canopy Cap: Y = 8.65 to 8.85
  //
  // Courtyard Void Datum: Center (0, 0), Width: 4.20m (X: -2.10 to +2.10), Depth: 4.50m (Z: -2.25 to +2.25)

  // -------------------------------------------------------------
  // 1. FOUNDATION & FLOOR SLABS
  // -------------------------------------------------------------
  // Sub-base foundation plinth
  const foundation = createBox(18.00, 0.30, 12.00, 0, -0.15, 0, kotaStoneMaterial, false, true);
  groundStructure.add(foundation);

  // Ground Floor Interior Finished Slab
  const groundFloorFinish = createBox(17.30, 0.05, 11.30, 0, 0.025, 0, kotaStoneMaterial, false, true);
  groundStructure.add(groundFloorFinish);

  // Southern Verandah Extension Slab (1.50m deep terrace)
  const verandahSlab = createBox(17.30, 0.15, 2.00, 0, -0.075, 6.65, kotaStoneMaterial, false, true);
  groundStructure.add(verandahSlab);

  // -------------------------------------------------------------
  // 2. GROUND FLOOR EXTERIOR RAMMED-EARTH WALLS (H = 3.40m, Y: 0.00 to 3.40)
  // Openings are true voids cleanly bounded by sills, lintels, and jambs
  // -------------------------------------------------------------
  const wallH_G = 3.40;
  const wallY_G = wallH_G / 2; // 1.70

  // WEST WALL (Full continuous edge from Z = -6.00 to +6.00, Thickness 0.35m, X: -9.00 to -8.65, Center X = -8.825)
  // South-West solid section (Z: +2.00 to +6.00, L = 4.00m)
  groundStructure.add(createBox(0.35, wallH_G, 4.00, -8.825, wallY_G, 4.00, rammedEarthMaterial));
  // Central Service Wash Court Opening (Z: -2.00 to +2.00, L = 4.00m, Opening H = 2.60m from Y = 0.40 to 3.00)
  groundStructure.add(createBox(0.35, 0.40, 4.00, -8.825, 0.20, 0.00, rammedEarthMaterial)); // Low sill
  groundStructure.add(createBox(0.35, 0.40, 4.00, -8.825, 3.20, 0.00, rammedEarthMaterial)); // Lintel (head at Y = 3.00)
  // North-West solid section (Z: -6.00 to -2.00, L = 4.00m)
  groundStructure.add(createBox(0.35, wallH_G, 4.00, -8.825, wallY_G, -4.00, rammedEarthMaterial));

  // EAST WALL (Full continuous edge from Z = -6.00 to +6.00, Thickness 0.35m, X: +8.65 to +9.00, Center X = +8.825)
  // South-East solid section (Z: +1.75 to +6.00, L = 4.25m, Center Z = +3.875)
  groundStructure.add(createBox(0.35, wallH_G, 4.25, 8.825, wallY_G, 3.875, rammedEarthMaterial));
  // Central Kitchen/Dining Window Opening (Z: -1.75 to +1.75, L = 3.50m, Opening H = 2.10m from Y = 0.90 to 3.00)
  groundStructure.add(createBox(0.35, 0.90, 3.50, 8.825, 0.45, 0.00, rammedEarthMaterial)); // 900mm counter sill
  groundStructure.add(createBox(0.35, 0.40, 3.50, 8.825, 3.20, 0.00, rammedEarthMaterial)); // Lintel (head at Y = 3.00)
  // North-East solid section (Z: -6.00 to -1.75, L = 4.25m, Center Z = -3.875)
  groundStructure.add(createBox(0.35, wallH_G, 4.25, 8.825, wallY_G, -3.875, rammedEarthMaterial));

  // NORTH WALL (Runs between West and East inner faces: X: -8.65 to +8.65, Z: -6.00 to -5.65, Center Z = -5.825)
  // North-West bedroom wall section (X: -8.65 to -3.40, L = 5.25m, Center X = -6.025)
  groundStructure.add(createBox(5.25, wallH_G, 0.35, -6.025, wallY_G, -5.825, rammedEarthMaterial));
  // Guest Suite Northern Window Opening (X: -3.40 to -0.60, L = 2.80m, Opening H = 2.10m from Y = 0.90 to 3.00)
  groundStructure.add(createBox(2.80, 0.90, 0.35, -2.00, 0.45, -5.825, rammedEarthMaterial)); // 900mm sill
  groundStructure.add(createBox(2.80, 0.40, 0.35, -2.00, 3.20, -5.825, rammedEarthMaterial)); // Lintel (head at Y = 3.00)
  // North-East section (X: -0.60 to +8.65, L = 9.25m, Center X = +4.025)
  groundStructure.add(createBox(9.25, wallH_G, 0.35, 4.025, wallY_G, -5.825, rammedEarthMaterial));

  // SOUTH WALL (Active Solar Facade, X: -8.65 to +8.65, Z: +5.65 to +6.00, Center Z = +5.825)
  // Living Room South Glazed Opening to Verandah (X: -8.65 to -1.00, L = 7.65m, Opening H = 2.90m from Y = 0.10 to 3.00)
  groundStructure.add(createBox(7.65, 0.10, 0.35, -4.825, 0.05, 5.825, rammedEarthMaterial)); // Low sill
  groundStructure.add(createBox(7.65, 0.40, 0.35, -4.825, 3.20, 5.825, rammedEarthMaterial)); // Lintel (head at Y = 3.00)
  // Central Structural Pier between Living and Entrance (X: -1.00 to +1.00, L = 2.00m, Center X = 0.00)
  groundStructure.add(createBox(2.00, wallH_G, 0.35, 0.00, wallY_G, 5.825, rammedEarthMaterial));
  // Entrance Porch & Pivot Door Opening (X: +1.00 to +2.50, L = 1.50m, Opening H = 2.80m from Y = 0.00 to 2.80)
  groundStructure.add(createBox(1.50, 0.60, 0.35, 1.75, 3.10, 5.825, rammedEarthMaterial)); // Lintel over door
  // South-East solid corner wall (X: +2.50 to +8.65, L = 6.15m, Center X = +5.575)
  groundStructure.add(createBox(6.15, wallH_G, 0.35, 5.575, wallY_G, 5.825, rammedEarthMaterial));

  // -------------------------------------------------------------
  // 3. GROUND FLOOR INTERIOR PARTITIONS (Zero Gaps)
  // -------------------------------------------------------------
  // West Rammed Earth Spine (Flanking Staircase and Courtyard West edge, X = -2.275, Thickness = 0.35m)
  groundStructure.add(createBox(0.35, wallH_G, 3.40, -2.275, wallY_G, -3.95, rammedEarthMaterial));
  groundStructure.add(createBox(0.35, wallH_G, 3.40, -2.275, wallY_G, 3.95, rammedEarthMaterial));

  // East Spine between Courtyard and Dining (X = +2.275, Thickness = 0.35m)
  groundStructure.add(createBox(0.35, wallH_G, 1.40, 2.275, wallY_G, 4.95, rammedEarthMaterial));
  groundStructure.add(createBox(0.35, wallH_G, 1.40, 2.275, wallY_G, -4.95, rammedEarthMaterial));
  groundStructure.add(createBox(0.35, 0.40, 4.50, 2.275, 3.20, 0.00, teakMaterial)); // Architraved Lintel

  // Kitchen Partition Wall (Z = -1.20, X: +2.45 to +8.65, Thickness = 0.20m)
  groundStructure.add(createBox(1.60, wallH_G, 0.20, 3.25, wallY_G, -1.20, plasterMaterial));
  groundStructure.add(createBox(1.80, wallH_G, 0.20, 7.75, wallY_G, -1.20, plasterMaterial));
  groundStructure.add(createBox(2.80, 0.40, 0.20, 5.45, 3.20, -1.20, plasterMaterial)); // Lintel over passage

  // Guest Suite & Bathroom Partition (X = -5.40, Z: -5.65 to -1.50, Thickness = 0.15m)
  groundStructure.add(createBox(0.15, wallH_G, 4.15, -5.40, wallY_G, -3.575, plasterMaterial));

  // Entrance Vestibule Acoustic Buffer Wall (Z = +2.80, X: +1.00 to +4.50, Thickness = 0.15m)
  groundStructure.add(createBox(3.50, wallH_G, 0.15, 2.75, wallY_G, 2.80, plasterMaterial));

  // -------------------------------------------------------------
  // 4. CENTRAL COURTYARD (G04) CONTEMPLATION COURT & BASIN
  // Void: X: -2.10 to +2.10 (4.20m), Z: -2.25 to +2.25 (4.50m)
  // -------------------------------------------------------------
  // Perimeter Stone Curb (80mm high, 120mm wide)
  groundStructure.add(createBox(4.20, 0.08, 0.12, 0.00, 0.04, -2.19, kotaStoneMaterial));
  groundStructure.add(createBox(4.20, 0.08, 0.12, 0.00, 0.04, 2.19, kotaStoneMaterial));
  groundStructure.add(createBox(0.12, 0.08, 4.26, -2.04, 0.04, 0.00, kotaStoneMaterial));
  groundStructure.add(createBox(0.12, 0.08, 4.26, 2.04, 0.04, 0.00, kotaStoneMaterial));

  // Monolithic Honed Kota Stone Contemplation Plinth (Centered)
  const courtPlinth = createBox(2.60, 0.06, 2.60, 0.00, 0.03, 0.00, kotaStoneMaterial);
  interiorGroup.add(courtPlinth);

  // Reflective Honed Water Basin / Inlay (Centered on plinth)
  const waterBasin = createBox(2.20, 0.02, 2.20, 0.00, 0.065, 0.00, waterBasinMaterial, false, true);
  interiorGroup.add(waterBasin);

  // Solid Reclaimed Teak Contemplation Bench
  const courtBench = createBox(2.40, 0.44, 0.50, 0.00, 0.22, -1.65, teakMaterial);
  furnitureGroup.add(courtBench);

  // -------------------------------------------------------------
  // 5. STAIRCASE (G13) — EXACT BIM RISER & TREAD MATH
  // 18 Risers @ 0.20m = 3.60m total height to First Floor finished level (Y = 3.60m)
  // -------------------------------------------------------------
  const stairW = 1.10;
  const riserH = 0.20;
  const treadD = 0.28;

  // Flight 1: 9 steps ascending South-to-North along Z (X = -2.85)
  for (let i = 0; i < 9; i++) {
    const stepY = (i + 0.5) * riserH;
    const stepZ = -1.12 + i * treadD;
    circulationGroup.add(createBox(stairW, riserH, treadD, -2.85, stepY, stepZ, kotaStoneMaterial));
    const baseH = (i + 1) * riserH;
    circulationGroup.add(createBox(stairW, baseH, treadD, -2.85, baseH / 2 - 0.001, stepZ, kotaStoneMaterial, false, true));
  }

  // Mid-Flight Halfway Landing (Flush at Y = 1.80m)
  circulationGroup.add(createBox(2.40, 0.20, 1.10, -3.50, 1.70, 1.81, kotaStoneMaterial));

  // Flight 2: 9 steps ascending North back to South (X = -4.15)
  for (let i = 0; i < 9; i++) {
    const stepY = (9 + i + 0.5) * riserH;
    const stepZ = 1.12 - i * treadD;
    circulationGroup.add(createBox(stairW, riserH, treadD, -4.15, stepY, stepZ, kotaStoneMaterial));
    const baseH = (9 + i + 1) * riserH;
    circulationGroup.add(createBox(stairW, baseH, treadD, -4.15, baseH / 2 - 0.001, stepZ, kotaStoneMaterial, false, true));
  }

  // Continuous Teak Handrail & Balusters along open stair edge (X = -2.25)
  const stairRailGeo = new THREE.CylinderGeometry(0.035, 0.035, 4.20, 8);
  const stairRail = new THREE.Mesh(stairRailGeo, teakMaterial);
  stairRail.position.set(-2.25, 2.30, 0.10);
  stairRail.rotation.x = Math.PI / 4.8;
  stairRail.castShadow = true;
  circulationGroup.add(stairRail);

  for (let b = -1.00; b <= 1.20; b += 0.35) {
    const balH = 0.90;
    const balY = 1.00 + (b + 1.00) * 0.70;
    circulationGroup.add(createBox(0.03, balH, 0.03, -2.25, balY, b, teakMaterial));
  }

  // -------------------------------------------------------------
  // 6. FIRST FLOOR STRUCTURAL SLAB (Y: 3.40 to 3.60, Finished Y = 3.60)
  // Snapped to exact outer wall inner faces, with central courtyard void cut out
  // -------------------------------------------------------------
  const slabH = 0.20;
  const slabY = 3.50;

  // South Wing Slab (F02 Master Bedroom & Gallery, Z: +2.25 to +5.65, Depth = 3.40m, X: -8.65 to +8.65)
  firstStructure.add(createBox(17.30, slabH, 3.40, 0.00, slabY, 3.95, kotaStoneMaterial, false, true));
  // North Wing Slab (F05/F06 Bedrooms & Bath, Z: -5.65 to -2.25, Depth = 3.40m, X: -8.65 to +8.65)
  firstStructure.add(createBox(17.30, slabH, 3.40, 0.00, slabY, -3.95, kotaStoneMaterial, false, true));
  // West Wing Slab Bridge (Stairs connection, X: -8.65 to -2.10, Width = 6.55m, Z: -2.25 to +2.25)
  firstStructure.add(createBox(6.55, slabH, 4.50, -5.375, slabY, 0.00, kotaStoneMaterial, false, true));
  // East Wing Slab Bridge (F08 Family Room & Gallery, X: +2.10 to +8.65, Width = 6.55m, Z: -2.25 to +2.25)
  firstStructure.add(createBox(6.55, slabH, 4.50, 5.375, slabY, 0.00, kotaStoneMaterial, false, true));

  // UPPER COURTYARD GALLERY BALUSTRADE (F01) — 0.95m high solid teak railing
  const railH = 0.95;
  const railY = 3.60 + railH / 2;
  firstStructure.add(createBox(4.20, railH, 0.05, 0.00, railY, -2.25, teakMaterial));
  firstStructure.add(createBox(4.20, railH, 0.05, 0.00, railY, 2.25, teakMaterial));
  firstStructure.add(createBox(0.05, railH, 4.50, -2.10, railY, 0.00, teakMaterial));
  firstStructure.add(createBox(0.05, railH, 4.50, 2.10, railY, 0.00, teakMaterial));
  // Top handrail caps
  firstStructure.add(createBox(4.30, 0.04, 0.12, 0.00, 3.60 + railH, -2.25, teakMaterial));
  firstStructure.add(createBox(4.30, 0.04, 0.12, 0.00, 3.60 + railH, 2.25, teakMaterial));
  firstStructure.add(createBox(0.12, 0.04, 4.50, -2.10, 3.60 + railH, 0.00, teakMaterial));
  firstStructure.add(createBox(0.12, 0.04, 4.50, 2.10, 3.60 + railH, 0.00, teakMaterial));

  // -------------------------------------------------------------
  // 7. FIRST FLOOR EXTERIOR RAMMED-EARTH WALLS (H = 3.30m, Y: 3.60 to 6.90)
  // All window openings bounded by common head datum Y = 6.50m!
  // -------------------------------------------------------------
  const wallH_F = 3.30;
  const wallY_F = 3.60 + wallH_F / 2; // 5.25

  // WEST WALL (Center X = -8.825, Thickness = 0.35m, Z: -6.00 to +6.00)
  // South-West solid section (Z: +1.75 to +6.00, L = 4.25m, Center Z = +3.875)
  firstStructure.add(createBox(0.35, wallH_F, 4.25, -8.825, wallY_F, 3.875, rammedEarthMaterial));
  // Master Ensuite Window Opening (Z: -1.75 to +1.75, L = 3.50m, Opening H = 2.10m from Y = 4.40 to 6.50)
  firstStructure.add(createBox(0.35, 0.80, 3.50, -8.825, 3.60 + 0.40, 0.00, rammedEarthMaterial)); // Sill (Y: 3.60 to 4.40)
  firstStructure.add(createBox(0.35, 0.40, 3.50, -8.825, 6.70, 0.00, rammedEarthMaterial)); // Lintel (head at Y = 6.50)
  // North-West solid section (Z: -6.00 to -1.75, L = 4.25m, Center Z = -3.875)
  firstStructure.add(createBox(0.35, wallH_F, 4.25, -8.825, wallY_F, -3.875, rammedEarthMaterial));

  // EAST WALL (Center X = +8.825, Thickness = 0.35m, Z: -6.00 to +6.00)
  // South-East solid section (Z: +1.50 to +6.00, L = 4.50m, Center Z = +3.75)
  firstStructure.add(createBox(0.35, wallH_F, 4.50, 8.825, wallY_F, 3.75, rammedEarthMaterial));
  // Family Study East Opening (Z: -1.50 to +1.50, L = 3.00m, Opening H = 2.00m from Y = 4.50 to 6.50)
  firstStructure.add(createBox(0.35, 0.90, 3.00, 8.825, 3.60 + 0.45, 0.00, rammedEarthMaterial)); // Sill (Y: 3.60 to 4.50)
  firstStructure.add(createBox(0.35, 0.40, 3.00, 8.825, 6.70, 0.00, rammedEarthMaterial)); // Lintel (head at Y = 6.50)
  // North-East section (Z: -6.00 to -1.50, L = 4.50m, Center Z = -3.75)
  firstStructure.add(createBox(0.35, wallH_F, 4.50, 8.825, wallY_F, -3.75, rammedEarthMaterial));

  // NORTH WALL (Runs between West and East walls: X: -8.65 to +8.65, Center Z = -5.825, Thickness = 0.35m)
  // Continuous sill up to Y = 4.50m (H = 0.90m above first floor FFL)
  firstStructure.add(createBox(17.30, 0.90, 0.35, 0.00, 3.60 + 0.45, -5.825, rammedEarthMaterial));
  // Continuous lintel above Y = 6.50m (H = 0.40m up to ceiling Y = 6.90m)
  firstStructure.add(createBox(17.30, 0.40, 0.35, 0.00, 6.70, -5.825, rammedEarthMaterial));
  // Solid Piers framing the two secondary bedroom openings (Opening H = 2.00m from Y = 4.50 to 6.50):
  // West corner pier (X: -8.65 to -5.50, L = 3.15m, Center X = -7.075)
  firstStructure.add(createBox(3.15, 2.00, 0.35, -7.075, 5.50, -5.825, rammedEarthMaterial));
  // Bedroom 02 Window Opening: X: -5.50 to -2.30 (L = 3.20m, Center X = -3.90) -> REAL VOID
  // Central pier between Bedroom 02 & Bedroom 03 (X: -2.30 to +2.30, L = 4.60m, Center X = 0.00)
  firstStructure.add(createBox(4.60, 2.00, 0.35, 0.00, 5.50, -5.825, rammedEarthMaterial));
  // Bedroom 03 Window Opening: X: +2.30 to +5.50 (L = 3.20m, Center X = +3.90) -> REAL VOID
  // East corner pier (X: +5.50 to +8.65, L = 3.15m, Center X = +7.075)
  firstStructure.add(createBox(3.15, 2.00, 0.35, 7.075, 5.50, -5.825, rammedEarthMaterial));

  // SOUTH WALL (South active solar facade, Center Z = +5.825, Thickness = 0.35m)
  // Master Bedroom Opening (X: -8.65 to -1.00, L = 7.65m, Opening H = 2.70m from Y = 3.80 to 6.50)
  firstStructure.add(createBox(7.65, 0.20, 0.35, -4.825, 3.60 + 0.10, 5.825, rammedEarthMaterial)); // Low sill
  firstStructure.add(createBox(7.65, 0.40, 0.35, -4.825, 6.70, 5.825, rammedEarthMaterial)); // Lintel (head at Y = 6.50)
  // South-East solid upper wall (X: -1.00 to +8.65, L = 9.65m, Center X = +3.825)
  firstStructure.add(createBox(9.65, wallH_F, 0.35, 3.825, wallY_F, 5.825, rammedEarthMaterial));

  // FIRST FLOOR INTERIOR PARTITIONS (Zero Gaps)
  // Master Suite East Partition (X = -2.20, Z: +2.25 to +5.65, Thickness = 0.20m)
  firstStructure.add(createBox(0.20, wallH_F, 3.40, -2.20, wallY_F, 3.95, plasterMaterial));
  // Master Bedroom & Walk-in/Ensuite Divider (Z = +2.00, X: -8.65 to -2.20, Thickness = 0.20m)
  firstStructure.add(createBox(6.45, wallH_F, 0.20, -5.425, wallY_F, 2.00, plasterMaterial));
  // Bedroom 02 & 03 Dividing Wall (X = 0.00, Z: -5.65 to -2.25, Thickness = 0.20m)
  firstStructure.add(createBox(0.20, wallH_F, 3.40, 0.00, wallY_F, -3.95, plasterMaterial));
  // Upper Family Room & Gallery Divider (Z = -0.60, X: +2.10 to +8.65, Thickness = 0.20m)
  firstStructure.add(createBox(6.55, wallH_F, 0.20, 5.375, wallY_F, -0.60, plasterMaterial));

  // -------------------------------------------------------------
  // 8. SOUTHERN VERANDAH STRUCTURE (1.50m Horizontal Shading)
  // Fully seated columns, plumb lintel, and aligned pergola rafters
  // -------------------------------------------------------------
  // 5 Solid Teak Columns (180×180mm), spaced at 4.00m intervals along Z = +7.50
  for (let px of [-8.00, -4.00, 0.00, 4.00, 8.00]) {
    // Stone plinth base (Y: 0.00 to 0.15)
    groundStructure.add(createBox(0.30, 0.15, 0.30, px, 0.075, 7.50, kotaStoneMaterial));
    // Plumb teak shaft (Y: 0.15 to 3.25, H = 3.10m)
    groundStructure.add(createBox(0.18, 3.10, 0.18, px, 1.70, 7.50, teakMaterial));
  }
  // Continuous 180×250mm Teak Lintel Beam resting on top of posts at Y = 3.25 to 3.50m
  groundStructure.add(createBox(17.30, 0.25, 0.18, 0.00, 3.375, 7.50, teakMaterial));

  // Horizontal Timber Pergola Shading Fins (150×60mm profiles) spanning from South Wall (Z=6.00) to Verandah Beam (Z=7.50)
  for (let pz = 6.00; pz <= 7.50; pz += 0.25) {
    groundStructure.add(createBox(17.30, 0.06, 0.14, 0.00, 3.53, pz, teakMaterial));
  }

  // -------------------------------------------------------------
  // 9. WINDOW & DOOR ASSEMBLIES (REAL CUTOUTS, HOLLOW FRAMES, CLEAR GLASS)
  // NO OPAQUE WOOD OR WALL BEHIND THE GLASS!
  // -------------------------------------------------------------

  // A. Entrance Door Assembly (G01/G02): 1.20m W × 2.70m H × 0.07m D pivot door with dark bronze bar pull
  const entranceFrame = createBox(0.06, 2.80, 0.12, 1.03, 1.40, 5.825, teakMaterial);
  openingsGroup.add(entranceFrame);
  const entrancePivotDoor = createBox(1.20, 2.70, 0.07, 1.75, 1.35, 5.825, teakMaterial);
  openingsGroup.add(entrancePivotDoor);
  const doorPull = createBox(0.04, 0.90, 0.06, 1.22, 1.20, 5.89, darkMetalMaterial);
  openingsGroup.add(doorPull);

  // B. Ground Living Room South Glazing (Opening: W = 7.65m, H = 2.90m, Y = 0.10 to 3.00, Center Y = 1.55m)
  // Recessed 150mm into 350mm wall. 3 structural bays with teak mullions and clear Low-E glass.
  // Direct visual sightline into living room sofa, table, rug, and courtyard!
  const livingWindow = createArchitecturalWindow('NS', 7.65, 2.90, -4.825, 1.55, 5.825, -0.05, 2, false);
  openingsGroup.add(livingWindow);

  // C. Ground Guest Suite North Window (Opening: W = 2.80m, H = 2.10m, Y = 0.90 to 3.00, Center Y = 1.95m)
  // Recessed 180mm into 350mm wall. Real hollow frame with 2 glass bays.
  const guestWindow = createArchitecturalWindow('NS', 2.80, 2.10, -2.00, 1.95, -5.825, 0.05, 1, false);
  openingsGroup.add(guestWindow);

  // D. Kitchen / Dining East Window & Terracotta Jaali (Opening: W = 3.50m along Z, H = 2.10m, Y = 0.90 to 3.00, Center Y = 1.95m)
  // 300mm deep recessed reveal: Jaali screen on outer face, architectural window on inner face
  openingsGroup.add(createBox(0.08, 2.10, 3.50, 8.85, 1.95, 0.00, jaaliMaterial));
  const kitchenWindow = createArchitecturalWindow('EW', 3.50, 2.10, 8.825, 1.95, 0.00, -0.10, 1, false);
  openingsGroup.add(kitchenWindow);

  // E. Service Wash Court West Terracotta Jaali Screen (Opening: W = 4.00m along Z, H = 2.60m, Y = 0.40 to 3.00, Center Y = 1.70m)
  openingsGroup.add(createBox(0.08, 2.60, 4.00, -8.825, 1.70, 0.00, jaaliMaterial));

  // F. First Floor Master Bedroom South Glazing (Opening: W = 7.65m, H = 2.70m, Y = 3.80 to 6.50, Center Y = 5.15m)
  // Recessed 150mm into 350mm wall. 3 bays with teak mullions and clear Low-E glass.
  // Direct visual sightline into master suite king bed, nightstands, and linen headboard!
  const masterWindow = createArchitecturalWindow('NS', 7.65, 2.70, -4.825, 5.15, 5.825, -0.05, 2, false);
  openingsGroup.add(masterWindow);

  // G. First Floor Secondary Bedrooms North Windows (F05 & F06)
  // Both share identical datum: Sill = Y = 4.50m, Head = Y = 6.50m (H = 2.00m, Center Y = 5.50m), Width = 3.20m
  // Bedroom 02 Window (Center X = -3.90)
  const bed02Window = createArchitecturalWindow('NS', 3.20, 2.00, -3.90, 5.50, -5.825, 0.05, 1, false);
  openingsGroup.add(bed02Window);
  // Bedroom 03 Window (Center X = +3.90)
  const bed03Window = createArchitecturalWindow('NS', 3.20, 2.00, 3.90, 5.50, -5.825, 0.05, 1, false);
  openingsGroup.add(bed03Window);

  // H. First Floor Family Study East Window (Opening: W = 3.00m along Z, H = 2.00m, Y = 4.50 to 6.50, Center Y = 5.50m)
  // Recessed 300mm into wall. Looking through reveals family library shelves and study desk!
  const studyWindow = createArchitecturalWindow('EW', 3.00, 2.00, 8.825, 5.50, 0.00, -0.10, 1, false);
  openingsGroup.add(studyWindow);

  // I. First Floor Master Ensuite West Jaali & Frosted Window (Opening: W = 3.50m along Z, H = 2.10m, Y = 4.40 to 6.50, Center Y = 5.45m)
  openingsGroup.add(createBox(0.08, 2.10, 3.50, -8.85, 5.45, 0.00, jaaliMaterial));
  const ensuiteWindow = createArchitecturalWindow('EW', 3.50, 2.10, -8.825, 5.45, 0.00, 0.10, 1, true);
  openingsGroup.add(ensuiteWindow);

  // -------------------------------------------------------------
  // 10. ROOF STRUCTURE & THERMAL CLERESTORY CHIMNEY (Watertight, Zero Gaps)
  // Slab Y: 6.90 to 7.15 (0.25m thick). Exact Courtyard Cutout!
  // -------------------------------------------------------------
  const roofSlabH = 0.25;
  const roofSlabY = 7.025;

  // South Roof Slab (Z: +2.25 to +6.00, Depth = 3.75m, X: -9.00 to +9.00, L = 18.00m)
  roofStructure.add(createBox(18.00, roofSlabH, 3.75, 0.00, roofSlabY, 4.125, plasterMaterial, true, true));
  // North Roof Slab (Z: -6.00 to -2.25, Depth = 3.75m, X: -9.00 to +9.00, L = 18.00m)
  roofStructure.add(createBox(18.00, roofSlabH, 3.75, 0.00, roofSlabY, -4.125, plasterMaterial, true, true));
  // West Roof Slab Bridge (X: -9.00 to -2.10, Width = 6.90m, Z: -2.25 to +2.25, Depth = 4.50m)
  roofStructure.add(createBox(6.90, roofSlabH, 4.50, -5.55, roofSlabY, 0.00, plasterMaterial, true, true));
  // East Roof Slab Bridge (X: +2.10 to +9.00, Width = 6.90m, Z: -2.25 to +2.25, Depth = 4.50m)
  roofStructure.add(createBox(6.90, roofSlabH, 4.50, 5.55, roofSlabY, 0.00, plasterMaterial, true, true));

  // Deep Southern Roof Eaves (1.50m overhang extension over South facade at Z = +6.00 to +7.60)
  roofStructure.add(createBox(18.40, 0.18, 1.65, 0.00, 7.00, 6.825, teakMaterial, true, true));

  // Continuous Perimeter Architectural Fascia Band (covers slab edge cleanly, eliminating any crack)
  roofStructure.add(createBox(18.40, 0.28, 0.04, 0.00, 7.025, 7.64, teakMaterial));
  roofStructure.add(createBox(18.40, 0.28, 0.04, 0.00, 7.025, -6.02, teakMaterial));
  roofStructure.add(createBox(0.04, 0.28, 13.66, 9.02, 7.025, 0.81, teakMaterial));
  roofStructure.add(createBox(0.04, 0.28, 13.66, -9.02, 7.025, 0.81, teakMaterial));

  // THERMAL CHIMNEY CLERESTORY TOWER (Centered over Courtyard void)
  // Opening: X: -2.10 to +2.10 (4.20m), Z: -2.25 to +2.25 (4.50m)
  const chimneyH = 1.50;
  const chimneyY = 7.15 + chimneyH / 2; // 7.90
  roofStructure.add(createBox(0.35, chimneyH, 0.35, -2.10, chimneyY, -2.25, rammedEarthMaterial));
  roofStructure.add(createBox(0.35, chimneyH, 0.35, 2.10, chimneyY, -2.25, rammedEarthMaterial));
  roofStructure.add(createBox(0.35, chimneyH, 0.35, -2.10, chimneyY, 2.25, rammedEarthMaterial));
  roofStructure.add(createBox(0.35, chimneyH, 0.35, 2.10, chimneyY, 2.25, rammedEarthMaterial));

  // Operable Top-Hung Louvers
  for (let lz of [-2.25, 2.25]) {
    for (let ly = 7.30; ly <= 8.50; ly += 0.28) {
      const louver = createBox(3.85, 0.04, 0.22, 0.00, ly, lz, teakMaterial);
      louver.rotation.x = (lz > 0 ? 0.35 : -0.35);
      roofStructure.add(louver);
    }
  }
  for (let lx of [-2.10, 2.10]) {
    for (let ly = 7.30; ly <= 8.50; ly += 0.28) {
      const louver = createBox(0.22, 0.04, 4.15, lx, ly, 0.00, teakMaterial);
      louver.rotation.z = (lx > 0 ? -0.35 : 0.35);
      roofStructure.add(louver);
    }
  }

  // Floating Chimney Sun Canopy Cap
  const chimneyCap = createBox(5.00, 0.16, 5.30, 0.00, 8.73, 0.00, teakMaterial, true, true);
  roofStructure.add(chimneyCap);

  // -------------------------------------------------------------
  // 11. DETAILED INTERIOR CRAFTSMAN FURNITURE & FIXTURES
  // Sits cleanly on finished floors, zero floating, contact shadows
  // -------------------------------------------------------------
  // G03 CENTRAL LIVING ROOM FURNITURE
  const sofaPlinth = createBox(2.60, 0.18, 0.95, -4.50, 0.09, 3.80, teakMaterial);
  furnitureGroup.add(sofaPlinth);
  const sofaSeat = createBox(2.52, 0.26, 0.88, -4.50, 0.31, 3.80, linenMaterial);
  furnitureGroup.add(sofaSeat);
  const sofaBack = createBox(2.52, 0.44, 0.22, -4.50, 0.64, 3.42, linenMaterial);
  furnitureGroup.add(sofaBack);

  for (let cz of [2.30, 5.10]) {
    furnitureGroup.add(createBox(0.85, 0.18, 0.85, -2.90, 0.09, cz, teakMaterial));
    furnitureGroup.add(createBox(0.78, 0.24, 0.78, -2.90, 0.30, cz, linenMaterial));
    furnitureGroup.add(createBox(0.78, 0.40, 0.18, -2.90, 0.60, cz + (cz > 3.8 ? -0.32 : 0.32), linenMaterial));
  }

  const coffeeTable = createBox(1.40, 0.36, 0.80, -3.80, 0.18, 3.80, teakMaterial);
  furnitureGroup.add(coffeeTable);
  const rug = createBox(3.40, 0.015, 3.80, -3.80, 0.008, 3.80, linenMaterial, false, true);
  furnitureGroup.add(rug);

  // G05 DINING ROOM FURNITURE
  const diningTableTop = createBox(2.60, 0.05, 1.10, 4.20, 0.735, 1.20, teakMaterial);
  furnitureGroup.add(diningTableTop);
  for (let lx of [3.10, 5.30]) {
    for (let lz of [0.75, 1.65]) {
      furnitureGroup.add(createBox(0.08, 0.71, 0.08, lx, 0.355, lz, teakMaterial));
    }
  }
  for (let cx of [3.35, 4.20, 5.05]) {
    furnitureGroup.add(createBox(0.48, 0.46, 0.46, cx, 0.23, 0.45, teakMaterial));
    furnitureGroup.add(createBox(0.48, 0.40, 0.04, cx, 0.66, 0.24, teakMaterial));
    furnitureGroup.add(createBox(0.48, 0.46, 0.46, cx, 0.23, 1.95, teakMaterial));
    furnitureGroup.add(createBox(0.48, 0.40, 0.04, cx, 0.66, 2.16, teakMaterial));
  }
  const diningPendant = createBox(1.80, 0.06, 0.12, 4.20, 2.45, 1.20, darkMetalMaterial);
  interiorGroup.add(diningPendant);

  // G06 CRAFTSMAN KITCHEN JOINERY
  furnitureGroup.add(createBox(2.30, 0.10, 0.90, 4.20, 0.05, -3.00, darkMetalMaterial));
  furnitureGroup.add(createBox(2.38, 0.76, 0.98, 4.20, 0.48, -3.00, teakMaterial));
  furnitureGroup.add(createBox(2.45, 0.05, 1.05, 4.20, 0.885, -3.00, kotaStoneMaterial));
  furnitureGroup.add(createBox(0.60, 0.01, 0.45, 3.80, 0.912, -3.00, darkMetalMaterial));
  furnitureGroup.add(createBox(0.04, 0.30, 0.12, 3.80, 1.06, -3.20, darkMetalMaterial));
  furnitureGroup.add(createBox(0.80, 0.01, 0.52, 4.80, 0.912, -5.35, darkMetalMaterial));
  furnitureGroup.add(createBox(3.80, 0.10, 0.60, 4.80, 0.05, -5.35, darkMetalMaterial));
  furnitureGroup.add(createBox(3.80, 0.76, 0.65, 4.80, 0.48, -5.35, teakMaterial));
  furnitureGroup.add(createBox(3.85, 0.05, 0.68, 4.80, 0.885, -5.35, kotaStoneMaterial));

  // G11 GUEST SUITE FURNITURE
  furnitureGroup.add(createBox(1.60, 0.35, 2.00, -3.50, 0.175, -3.50, teakMaterial));
  furnitureGroup.add(createBox(1.52, 0.25, 1.92, -3.50, 0.475, -3.50, linenMaterial));
  furnitureGroup.add(createBox(1.40, 0.74, 0.65, -1.80, 0.37, -4.50, teakMaterial));

  // F02 MASTER BEDROOM SUITE FURNITURE (Level Y = 3.60)
  furnitureGroup.add(createBox(1.90, 0.15, 2.00, -4.50, 3.60 + 0.075, 3.80, teakMaterial));
  furnitureGroup.add(createBox(2.00, 0.25, 2.10, -4.50, 3.60 + 0.275, 3.80, teakMaterial));
  furnitureGroup.add(createBox(1.92, 0.28, 2.02, -4.50, 3.60 + 0.54, 3.80, linenMaterial));
  furnitureGroup.add(createBox(2.20, 1.15, 0.12, -4.50, 3.60 + 0.975, 4.84, linenMaterial));
  for (let bx of [-5.80, -3.20]) {
    furnitureGroup.add(createBox(0.55, 0.35, 0.45, bx, 3.60 + 0.38, 4.60, teakMaterial));
  }
  furnitureGroup.add(createBox(0.85, 0.75, 0.85, -2.80, 3.60 + 0.375, 2.30, linenMaterial));

  // F04 MASTER ENSUITE SPA FIXTURES
  furnitureGroup.add(createBox(2.20, 0.40, 0.55, -5.50, 3.60 + 0.55, 0.00, teakMaterial));
  furnitureGroup.add(createBox(2.24, 0.04, 0.57, -5.50, 3.60 + 0.77, 0.00, kotaStoneMaterial));
  for (let vx of [-6.10, -4.90]) {
    furnitureGroup.add(createBox(0.48, 0.12, 0.38, vx, 3.60 + 0.85, 0.00, plasterMaterial));
    furnitureGroup.add(createBox(0.04, 0.08, 0.15, vx, 3.60 + 1.05, -0.22, darkMetalMaterial));
  }
  furnitureGroup.add(createBox(1.40, 2.30, 0.012, -7.50, 3.60 + 1.15, 0.00, frostedGlassMaterial, false, false));
  furnitureGroup.add(createBox(1.40, 0.02, 0.04, -7.50, 3.60 + 0.01, 0.00, darkMetalMaterial));

  // F05 & F06 SECONDARY BEDROOMS FURNITURE
  furnitureGroup.add(createBox(1.60, 0.35, 2.00, -4.50, 3.60 + 0.175, -3.80, teakMaterial));
  furnitureGroup.add(createBox(1.52, 0.25, 1.92, -4.50, 3.60 + 0.475, -3.80, linenMaterial));
  furnitureGroup.add(createBox(1.50, 0.74, 0.65, -3.80, 3.60 + 0.37, -5.00, teakMaterial));

  furnitureGroup.add(createBox(1.60, 0.35, 2.00, 4.50, 3.60 + 0.175, -3.80, teakMaterial));
  furnitureGroup.add(createBox(1.52, 0.25, 1.92, 4.50, 3.60 + 0.475, -3.80, linenMaterial));
  furnitureGroup.add(createBox(1.50, 0.74, 0.65, 3.80, 3.60 + 0.37, -5.00, teakMaterial));

  // F08 FAMILY ROOM / STUDY FURNITURE
  furnitureGroup.add(createBox(0.35, 2.80, 3.40, 8.45, 3.60 + 1.40, 1.80, teakMaterial));
  furnitureGroup.add(createBox(1.80, 0.74, 0.75, 5.50, 3.60 + 0.37, 3.00, teakMaterial));
  furnitureGroup.add(createBox(0.55, 0.75, 0.55, 5.50, 3.60 + 0.375, 2.30, linenMaterial));

  // -------------------------------------------------------------
  // 12. DYNAMIC AIRFLOW & THERMAL CHIMNEY STREAMLINES
  // -------------------------------------------------------------
  const particleCount = 320;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const t = Math.random();
    let px = 0, py = 0, pz = 0;

    if (t < 0.35) {
      px = (Math.random() - 0.5) * 6.0;
      py = 0.2 + Math.random() * 1.4;
      pz = 2.0 + Math.random() * 4.5;
    } else if (t < 0.8) {
      px = (Math.random() - 0.5) * 3.6;
      py = 1.4 + Math.random() * 5.4;
      pz = (Math.random() - 0.5) * 3.8;
    } else {
      px = (Math.random() - 0.5) * 4.0;
      py = 6.8 + Math.random() * 1.8;
      pz = (Math.random() - 0.5) * 4.2;
    }

    particlePositions[i * 3] = px;
    particlePositions[i * 3 + 1] = py;
    particlePositions[i * 3 + 2] = pz;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: 0x6ee7b7,
    size: 0.15,
    transparent: true,
    opacity: 0.80,
    blending: THREE.AdditiveBlending
  });

  const airflowParticles = new THREE.Points(particleGeo, particleMat);
  airflowParticles.name = 'AIRFLOW_PARTICLES';
  root.add(airflowParticles);

  const updateAirflow = (delta: number) => {
    const pos = particleGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const curX = pos[idx];
      const curY = pos[idx + 1];
      const curZ = pos[idx + 2];

      const buoyancy = (curY > 2.0 ? 1.8 : 0.9) * delta * 2.2;
      pos[idx + 1] += buoyancy;

      if (curY < 6.8) {
        pos[idx] += (0.0 - curX) * 0.012 * delta * 60;
        pos[idx + 2] += (0.0 - curZ) * 0.012 * delta * 60;
      } else {
        pos[idx] += (curX > 0 ? 0.018 : -0.018) * delta * 60;
        pos[idx + 2] += (curZ > 0 ? 0.018 : -0.018) * delta * 60;
      }

      if (pos[idx + 1] > 8.8 || Math.abs(pos[idx]) > 8.6 || Math.abs(pos[idx + 2]) > 7.2) {
        pos[idx] = (Math.random() - 0.5) * 6.0;
        pos[idx + 1] = 0.2 + Math.random() * 0.8;
        pos[idx + 2] = 4.0 + Math.random() * 2.5;
      }
    }
    particleGeo.attributes.position.needsUpdate = true;
  };

  // -------------------------------------------------------------
  // 13. CUTAWAY / FLOOR SECTION LOGIC
  // -------------------------------------------------------------
  const setCutaway = (level: CutawayLevel) => {
    switch (level) {
      case 'all':
        groundStructure.visible = true;
        firstStructure.visible = true;
        roofStructure.visible = true;
        firstStructure.position.set(0, 0, 0);
        roofStructure.position.set(0, 0, 0);
        break;

      case 'ground':
        groundStructure.visible = true;
        firstStructure.visible = false;
        roofStructure.visible = false;
        break;

      case 'first':
        groundStructure.visible = true;
        firstStructure.visible = true;
        roofStructure.visible = false;
        firstStructure.position.set(0, 0, 0);
        break;

      case 'section':
        groundStructure.visible = true;
        firstStructure.visible = true;
        roofStructure.visible = true;
        firstStructure.position.set(0, 2.0, 0);
        roofStructure.position.set(0, 4.2, 0);
        break;
    }
  };

  // -------------------------------------------------------------
  // 14. ROOM HIGHLIGHT BOX
  // -------------------------------------------------------------
  const highlightBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const highlightBoxMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    wireframe: true,
    transparent: true,
    opacity: 0.70
  });
  const highlightBox = new THREE.Mesh(highlightBoxGeo, highlightBoxMat);
  highlightBox.visible = false;
  root.add(highlightBox);

  const highlightRoom = (roomId: string | null) => {
    if (!roomId) {
      highlightBox.visible = false;
      return;
    }
    const room = ROOMS.find(r => r.id === roomId);
    if (!room) {
      highlightBox.visible = false;
      return;
    }

    const { minX, maxX, minZ, maxZ, y, height } = room.bounds;
    const w = maxX - minX;
    const d = maxZ - minZ;
    const h = height;

    highlightBox.scale.set(w, h, d);
    highlightBox.position.set(minX + w / 2, y + h / 2, minZ + d / 2);
    highlightBox.visible = true;
  };

  return {
    root,
    structureGroup,
    openingsGroup,
    circulationGroup,
    interiorGroup,
    furnitureGroup,
    airflowParticles,
    updateAirflow,
    setCutaway,
    highlightRoom
  };
}
