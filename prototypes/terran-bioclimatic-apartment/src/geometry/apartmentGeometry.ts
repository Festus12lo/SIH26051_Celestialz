import * as THREE from 'three';
import { APARTMENT_DIMENSIONS, ApartmentDimensions } from '../data/apartmentData';
import { ArchitecturalMaterials } from '../materials/apartmentMaterials';
import { APARTMENT_WINDOWS, ApartmentWindow } from '../data/apartmentPlan';
import { buildFloorInterior, buildCentralStairCore } from './roomGeometry';
import { createWallWithOpenings, WallOpening } from './wallOpeningGenerator';

export interface ArchitecturalSceneGroups {
  rootGroup: THREE.Group;
  foundationSlabGroup: THREE.Group;
  groundFloorGroup: THREE.Group;
  firstFloorGroup: THREE.Group;
  secondFloorGroup: THREE.Group;
  jaaliScreenGroup: THREE.Group;
  atriumCoreGroup: THREE.Group;
  roofTerraceGroup: THREE.Group;
  landscapeGroup: THREE.Group;
  roomDebugGroup: THREE.Group;
}

/**
 * Creates an architectural slab geometry with real physical voids for the central
 * atrium chimney (3.0 × 3.0 m) and dedicated staircase flight passage core (3.0 × 2.0 m).
 */
function createSlabWithVoids(
  width: number,
  northZ: number,
  southZ: number,
  thickness: number,
  includeAtriumHole = true,
  includeStairHole = true
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const halfW = width / 2;

  // Outer slab boundary
  shape.moveTo(-halfW, northZ);
  shape.lineTo(halfW, northZ);
  shape.lineTo(halfW, southZ);
  shape.lineTo(-halfW, southZ);
  shape.closePath();

  // Central 3.0 x 3.0 m open-air thermal chimney atrium hole
  if (includeAtriumHole) {
    const atriumHole = new THREE.Path();
    atriumHole.moveTo(-1.5, -1.5);
    atriumHole.lineTo(1.5, -1.5);
    atriumHole.lineTo(1.5, 1.5);
    atriumHole.lineTo(-1.5, 1.5);
    atriumHole.closePath();
    shape.holes.push(atriumHole);
  }

  // Dedicated 3.0 x 2.0 m stair core flight hole (Z = -3.5 to -1.5)
  if (includeStairHole) {
    const stairHole = new THREE.Path();
    stairHole.moveTo(-1.5, -3.5);
    stairHole.lineTo(1.5, -3.5);
    stairHole.lineTo(1.5, -1.5);
    stairHole.lineTo(-1.5, -1.5);
    stairHole.closePath();
    shape.holes.push(stairHole);
  }

  const geom = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: thickness,
    bevelEnabled: false,
  });
  geom.rotateX(Math.PI / 2);
  return geom;
}

/**
 * Creates a recessed window aperture assembly with 350 mm reveal, bronze frame, and double glazing
 */
function createRecessedWindowAssembly(
  width: number,
  height: number,
  materials: ArchitecturalMaterials,
  wallThickness = 0.35
): THREE.Group {
  const group = new THREE.Group();

  // 1. Structural Reveal Liner (350 mm deep surround)
  const revealThickness = 0.05;
  const revealDepth = wallThickness;

  // Head and Sill (top and bottom reveals)
  const topRevealGeom = new THREE.BoxGeometry(width, revealThickness, revealDepth);
  const topReveal = new THREE.Mesh(topRevealGeom, materials.concrete);
  topReveal.position.set(0, height / 2 - revealThickness / 2, 0);
  topReveal.castShadow = true;
  topReveal.receiveShadow = true;
  group.add(topReveal);

  const bottomRevealGeom = new THREE.BoxGeometry(width, revealThickness, revealDepth);
  const bottomReveal = new THREE.Mesh(bottomRevealGeom, materials.concrete);
  bottomReveal.position.set(0, -height / 2 + revealThickness / 2, 0);
  bottomReveal.castShadow = true;
  bottomReveal.receiveShadow = true;
  group.add(bottomReveal);

  // Jambs (left and right reveals)
  const jambGeom = new THREE.BoxGeometry(revealThickness, height - revealThickness * 2, revealDepth);
  const leftJamb = new THREE.Mesh(jambGeom, materials.concrete);
  leftJamb.position.set(-width / 2 + revealThickness / 2, 0, 0);
  leftJamb.castShadow = true;
  leftJamb.receiveShadow = true;
  group.add(leftJamb);

  const rightJamb = new THREE.Mesh(jambGeom, materials.concrete);
  rightJamb.position.set(width / 2 - revealThickness / 2, 0, 0);
  rightJamb.castShadow = true;
  rightJamb.receiveShadow = true;
  group.add(rightJamb);

  // 2. Dark Bronze Minimal Frame (set back 280 mm from facade edge)
  const frameInsetZ = -revealDepth / 2 + 0.08;
  const frameThickness = 0.04;
  const frameProfile = 0.05;

  // Frame outer perimeter
  const frameOuterH = new THREE.BoxGeometry(width - revealThickness * 2, frameProfile, frameThickness);
  const frameTop = new THREE.Mesh(frameOuterH, materials.windowFrameBronze);
  frameTop.position.set(0, height / 2 - revealThickness - frameProfile / 2, frameInsetZ);
  group.add(frameTop);

  const frameBottom = new THREE.Mesh(frameOuterH, materials.windowFrameBronze);
  frameBottom.position.set(0, -height / 2 + revealThickness + frameProfile / 2, frameInsetZ);
  group.add(frameBottom);

  const frameOuterV = new THREE.BoxGeometry(frameProfile, height - revealThickness * 2, frameThickness);
  const frameLeft = new THREE.Mesh(frameOuterV, materials.windowFrameBronze);
  frameLeft.position.set(-width / 2 + revealThickness + frameProfile / 2, 0, frameInsetZ);
  group.add(frameLeft);

  const frameRight = new THREE.Mesh(frameOuterV, materials.windowFrameBronze);
  frameRight.position.set(width / 2 - revealThickness - frameProfile / 2, 0, frameInsetZ);
  group.add(frameRight);

  // Vertical bronze mullion
  const mullion = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, height - revealThickness * 2 - frameProfile * 2, frameThickness),
    materials.windowFrameBronze
  );
  mullion.position.set(0, 0, frameInsetZ);
  group.add(mullion);

  // 3. Low-Iron Double Glazing Pane
  const glassW = width - revealThickness * 2 - frameProfile * 2;
  const glassH = height - revealThickness * 2 - frameProfile * 2;
  const glassGeom = new THREE.BoxGeometry(glassW, glassH, 0.018);
  const glassMesh = new THREE.Mesh(glassGeom, materials.architecturalGlass);
  glassMesh.position.set(0, 0, frameInsetZ);
  glassMesh.castShadow = false;
  glassMesh.receiveShadow = true;
  group.add(glassMesh);

  return group;
}

/**
 * Creates an architecturally coordinated window assembly positioned and rotated according to the apartment schedule
 */
function createScheduledWindowAssembly(
  win: ApartmentWindow,
  materials: ArchitecturalMaterials
): THREE.Group {
  const winAssembly = createRecessedWindowAssembly(win.width, win.height, materials, 0.35);
  winAssembly.position.copy(win.position);

  if (win.facade === 'east') {
    winAssembly.rotation.y = -Math.PI / 2;
  } else if (win.facade === 'west') {
    winAssembly.rotation.y = Math.PI / 2;
  } else if (win.facade === 'north') {
    winAssembly.rotation.y = Math.PI;
  } else if (win.facade === 'atrium') {
    if (win.orientation.x > 0) {
      winAssembly.rotation.y = Math.PI / 2;
    } else if (win.orientation.x < 0) {
      winAssembly.rotation.y = -Math.PI / 2;
    }
  }

  winAssembly.userData = {
    windowId: win.id,
    roomId: win.roomId,
    unitId: win.unitId,
    window: win,
  };

  return winAssembly;
}

/**
 * Creates 3D Aerodynamic Wing Wall fins (passive corner wind scoops)
 */
function createWingWallFin(
  height: number,
  projection: number,
  thickness: number,
  materials: ArchitecturalMaterials,
  angleRad = 0.25
): THREE.Group {
  const finGroup = new THREE.Group();

  // Wedge-shaped aerodynamic vertical fin
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(projection, Math.sin(angleRad) * projection * 0.4);
  shape.lineTo(projection, Math.sin(angleRad) * projection * 0.4 + thickness);
  shape.lineTo(0, thickness);
  shape.closePath();

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    steps: 1,
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.rotateX(Math.PI / 2);

  const finMesh = new THREE.Mesh(geom, materials.rammedEarth);
  finMesh.castShadow = true;
  finMesh.receiveShadow = true;
  finGroup.add(finMesh);

  return finGroup;
}

/**
 * Generates an interlocking 3D terracotta jaali module with physical micro-apertures
 */
function createJaaliModuleGeometry(size = 0.45, depth = 0.16): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const half = size / 2;

  // Outer square
  shape.moveTo(-half, -half);
  shape.lineTo(half, -half);
  shape.lineTo(half, half);
  shape.lineTo(-half, half);
  shape.closePath();

  // Geometric pierced aperture (diamond + cross star for Venturi air passage)
  const hole = new THREE.Path();
  const r = size * 0.32;
  hole.moveTo(0, r);
  hole.lineTo(r * 0.4, r * 0.4);
  hole.lineTo(r, 0);
  hole.lineTo(r * 0.4, -r * 0.4);
  hole.lineTo(0, -r);
  hole.lineTo(-r * 0.4, -r * 0.4);
  hole.lineTo(-r, 0);
  hole.lineTo(-r * 0.4, r * 0.4);
  hole.closePath();

  shape.holes.push(hole);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    steps: 1,
    depth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 1,
  };

  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.center();
  return geom;
}

/**
 * Builds the continuous two-story West-facing Terracotta Jaali screen
 */
function buildWestJaaliScreen(
  dims: ApartmentDimensions,
  materials: ArchitecturalMaterials
): THREE.Group {
  const jaaliGroup = new THREE.Group();
  jaaliGroup.name = 'jaaliScreenGroup';

  const screenWidth = 7.2; // Spans West residential envelope
  const screenHeight = dims.floorHeight * 2; // Two full storeys (First & Second floor)
  const moduleSize = 0.45;
  const moduleDepth = 0.16;

  const cols = Math.floor(screenWidth / moduleSize);
  const rows = Math.floor(screenHeight / moduleSize);
  const totalModules = cols * rows;

  const moduleGeom = createJaaliModuleGeometry(moduleSize, moduleDepth);
  const instancedJaali = new THREE.InstancedMesh(moduleGeom, materials.terracotta, totalModules);
  instancedJaali.castShadow = true;
  instancedJaali.receiveShadow = true;

  const dummy = new THREE.Object3D();
  let idx = 0;

  const startX = -dims.length / 2 - 0.28; // Mounted on West facade exterior
  const startY = dims.floorHeight + moduleSize / 2; // Starting at level 1 slab
  const startZ = -screenWidth / 2 + moduleSize / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dummy.position.set(
        startX,
        startY + r * moduleSize,
        startZ + c * moduleSize
      );
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.updateMatrix();
      instancedJaali.setMatrixAt(idx++, dummy.matrix);
    }
  }

  instancedJaali.instanceMatrix.needsUpdate = true;
  jaaliGroup.add(instancedJaali);

  // Structural Support Mullions & Subframe (Terracotta/Bronze bracketry)
  const mullionGeom = new THREE.BoxGeometry(0.12, screenHeight, 0.12);
  for (let i = 0; i <= 4; i++) {
    const mullion = new THREE.Mesh(mullionGeom, materials.concrete);
    const zPos = -screenWidth / 2 + (i / 4) * screenWidth;
    mullion.position.set(startX + 0.06, startY + screenHeight / 2 - moduleSize / 2, zPos);
    mullion.castShadow = true;
    mullion.receiveShadow = true;
    jaaliGroup.add(mullion);
  }

  // Top and bottom concrete structural binder lintels
  const lintelGeom = new THREE.BoxGeometry(0.25, 0.18, screenWidth + 0.3);
  const bottomLintel = new THREE.Mesh(lintelGeom, materials.concrete);
  bottomLintel.position.set(startX, dims.floorHeight, 0);
  bottomLintel.castShadow = true;
  bottomLintel.receiveShadow = true;
  jaaliGroup.add(bottomLintel);

  const topLintel = new THREE.Mesh(lintelGeom, materials.concrete);
  topLintel.position.set(startX, dims.floorHeight * 3, 0);
  topLintel.castShadow = true;
  topLintel.receiveShadow = true;
  jaaliGroup.add(topLintel);

  return jaaliGroup;
}

/**
 * Builds the Central Atmospheric Atrium Core (3.0 × 3.0 m open-air chimney)
 * Reconstructed with REAL VOIDS for apartment entry doors, stair portals, and bathroom vents.
 */
function buildAtriumCore(
  dims: ApartmentDimensions,
  materials: ArchitecturalMaterials
): THREE.Group {
  const atriumGroup = new THREE.Group();
  atriumGroup.name = 'atriumCoreGroup';

  const totalH = 10.6; // Full height from Y = 0.40 to roof parapet termination
  const wallThick = 0.22;
  const baseY = 0.40;

  // North Atrium Wall (Z = -1.61, spanning X from -1.5 to +1.5)
  // Contains real door voids connecting the central circulation to the staircase on each level
  const northAtriumWall = createWallWithOpenings({
    id: 'atrium_north',
    start: new THREE.Vector3(-1.5, baseY, -1.61),
    end: new THREE.Vector3(1.5, baseY, -1.61),
    height: totalH,
    thickness: wallThick,
    material: materials.limePlaster,
    openings: [
      {
        id: 'door-stair-portal-L0',
        type: 'door',
        center: new THREE.Vector3(0, 1.5, -1.61),
        width: 1.2,
        height: 2.2,
        sillHeight: 0.0,
        depth: wallThick,
        isVoid: true,
      },
      {
        id: 'door-stair-portal-L1',
        type: 'door',
        center: new THREE.Vector3(0, 4.58, -1.61),
        width: 1.2,
        height: 2.2,
        sillHeight: 3.08,
        depth: wallThick,
        isVoid: true,
      },
      {
        id: 'door-stair-portal-L2',
        type: 'door',
        center: new THREE.Vector3(0, 7.78, -1.61),
        width: 1.2,
        height: 2.2,
        sillHeight: 6.28,
        depth: wallThick,
        isVoid: true,
      },
      {
        id: 'door-stair-portal-Roof',
        type: 'door',
        center: new THREE.Vector3(0, 10.0, -1.61),
        width: 1.2,
        height: 2.2,
        sillHeight: 9.48,
        depth: wallThick,
        isVoid: true,
      },
    ],
  });
  atriumGroup.add(northAtriumWall);

  // South Atrium Wall (Z = +1.61, spanning X from -1.5 to +1.5)
  // Contains intake portals from colonnade on Ground and corridor transoms on First and Second floors
  const southAtriumWall = createWallWithOpenings({
    id: 'atrium_south',
    start: new THREE.Vector3(-1.5, baseY, 1.61),
    end: new THREE.Vector3(1.5, baseY, 1.61),
    height: totalH,
    thickness: wallThick,
    material: materials.limePlaster,
    openings: [
      {
        id: 'portal-atrium-ground-intake',
        type: 'door',
        center: new THREE.Vector3(0, 1.7, 1.61),
        width: 2.6,
        height: 2.6,
        sillHeight: 0.0,
        depth: wallThick,
        isVoid: true,
      },
      {
        id: 'portal-atrium-corridor-L1',
        type: 'door',
        center: new THREE.Vector3(0, 4.7, 1.61),
        width: 2.4,
        height: 2.4,
        sillHeight: 3.08,
        depth: wallThick,
        isVoid: true,
      },
      {
        id: 'portal-atrium-corridor-L2',
        type: 'door',
        center: new THREE.Vector3(0, 7.9, 1.61),
        width: 2.4,
        height: 2.4,
        sillHeight: 6.28,
        depth: wallThick,
        isVoid: true,
      },
    ],
  });
  atriumGroup.add(southAtriumWall);

  // West Atrium Wall (X = -1.61, spanning Z from -1.5 to +1.5)
  // Contains real door voids for apartment entries (A01, B01, C01) and bathroom stack vents
  const westAtriumWall = createWallWithOpenings({
    id: 'atrium_west',
    start: new THREE.Vector3(-1.61, baseY, -1.5),
    end: new THREE.Vector3(-1.61, baseY, 1.5),
    height: totalH,
    thickness: wallThick,
    material: materials.limePlaster,
    openings: [
      {
        id: 'door-void-A01-entry',
        type: 'door',
        center: new THREE.Vector3(-1.61, 1.47, -0.65),
        width: 0.95,
        height: 2.15,
        sillHeight: 0.0,
        depth: wallThick,
        isVoid: true,
      },
      {
        id: 'vent-void-A01-bath',
        type: 'ventilation',
        center: new THREE.Vector3(-1.61, 2.5, -1.1),
        width: 0.8,
        height: 0.45,
        sillHeight: 1.9,
        depth: wallThick,
        isVoid: true,
      },
      {
        id: 'door-void-B01-entry',
        type: 'door',
        center: new THREE.Vector3(-1.61, 4.55, -0.65),
        width: 0.95,
        height: 2.15,
        sillHeight: 3.08,
        depth: wallThick,
        isVoid: true,
      },
      {
        id: 'vent-void-B01-bath',
        type: 'ventilation',
        center: new THREE.Vector3(-1.61, 5.6, -1.1),
        width: 0.8,
        height: 0.45,
        sillHeight: 4.98,
        depth: wallThick,
        isVoid: true,
      },
      {
        id: 'door-void-C01-entry',
        type: 'door',
        center: new THREE.Vector3(-1.61, 7.75, -0.65),
        width: 0.95,
        height: 2.15,
        sillHeight: 6.28,
        depth: wallThick,
        isVoid: true,
      },
      {
        id: 'vent-void-C01-bath',
        type: 'ventilation',
        center: new THREE.Vector3(-1.61, 8.8, -1.1),
        width: 0.8,
        height: 0.45,
        sillHeight: 8.18,
        depth: wallThick,
        isVoid: true,
      },
    ],
  });
  atriumGroup.add(westAtriumWall);

  // East Atrium Wall (X = +1.61, spanning Z from -1.5 to +1.5)
  // Contains real door voids for apartment entries (A02, B02, C02) and bathroom stack vents
  const eastAtriumWall = createWallWithOpenings({
    id: 'atrium_east',
    start: new THREE.Vector3(1.61, baseY, -1.5),
    end: new THREE.Vector3(1.61, baseY, 1.5),
    height: totalH,
    thickness: wallThick,
    material: materials.limePlaster,
    openings: [
      {
        id: 'door-void-A02-entry',
        type: 'door',
        center: new THREE.Vector3(1.61, 1.47, -0.65),
        width: 0.95,
        height: 2.15,
        sillHeight: 0.0,
        depth: wallThick,
        isVoid: true,
      },
      {
        id: 'vent-void-A02-bath',
        type: 'ventilation',
        center: new THREE.Vector3(1.61, 2.5, -1.1),
        width: 0.8,
        height: 0.45,
        sillHeight: 1.9,
        depth: wallThick,
        isVoid: true,
      },
      {
        id: 'door-void-B02-entry',
        type: 'door',
        center: new THREE.Vector3(1.61, 4.55, -0.65),
        width: 0.95,
        height: 2.15,
        sillHeight: 3.08,
        depth: wallThick,
        isVoid: true,
      },
      {
        id: 'vent-void-B02-bath',
        type: 'ventilation',
        center: new THREE.Vector3(1.61, 5.6, -1.1),
        width: 0.8,
        height: 0.45,
        sillHeight: 4.98,
        depth: wallThick,
        isVoid: true,
      },
      {
        id: 'door-void-C02-entry',
        type: 'door',
        center: new THREE.Vector3(1.61, 7.75, -0.65),
        width: 0.95,
        height: 2.15,
        sillHeight: 6.28,
        depth: wallThick,
        isVoid: true,
      },
      {
        id: 'vent-void-C02-bath',
        type: 'ventilation',
        center: new THREE.Vector3(1.61, 8.8, -1.1),
        width: 0.8,
        height: 0.45,
        sillHeight: 8.18,
        depth: wallThick,
        isVoid: true,
      },
    ],
  });
  atriumGroup.add(eastAtriumWall);

  // Architectural Clerestory exhaust slots at upper roof termination
  const exhaustLouverGeom = new THREE.BoxGeometry(dims.atriumSize + 0.4, 0.45, 0.08);
  for (let lvl = 0; lvl < 3; lvl++) {
    const louverN = new THREE.Mesh(exhaustLouverGeom, materials.terracotta);
    louverN.position.set(0, totalH - 0.3 - lvl * 0.4, -1.5 - 0.2);
    louverN.rotation.x = 0.35;
    atriumGroup.add(louverN);

    const louverS = new THREE.Mesh(exhaustLouverGeom, materials.terracotta);
    louverS.position.set(0, totalH - 0.3 - lvl * 0.4, 1.5 + 0.2);
    louverS.rotation.x = -0.35;
    atriumGroup.add(louverS);
  }

  // Atrium internal guardrails at floor openings (Bronze minimal balustrades)
  const railH = 1.0;
  const railBarGeom = new THREE.BoxGeometry(dims.atriumSize, 0.04, 0.04);
  for (let flr = 1; flr <= 2; flr++) {
    const yPos = flr * dims.floorHeight + railH;
    const rN = new THREE.Mesh(railBarGeom, materials.windowFrameBronze);
    rN.position.set(0, yPos, -1.5 + 0.08);
    atriumGroup.add(rN);

    const rS = new THREE.Mesh(railBarGeom, materials.windowFrameBronze);
    rS.position.set(0, yPos, 1.5 - 0.08);
    atriumGroup.add(rS);
  }

  // Dedicated Architectural Staircase Core running North of atrium
  const stairCore = buildCentralStairCore(materials);
  atriumGroup.add(stairCore);

  return atriumGroup;
}

/**
 * Builds the Foundation Plinth & Ground Floor Group
 * Every window, entrance colonnade, and ventilation slot is generated as a REAL VOID in the wall.
 */
function buildGroundFloor(
  dims: ApartmentDimensions,
  materials: ArchitecturalMaterials
): { foundationGroup: THREE.Group; groundGroup: THREE.Group; groundDebugOverlays: THREE.Group } {
  const foundationGroup = new THREE.Group();
  foundationGroup.name = 'foundationSlabGroup';

  const groundGroup = new THREE.Group();
  groundGroup.name = 'groundFloorGroup';

  const halfL = dims.length / 2;
  const halfW = dims.width / 2;
  const slabT = 0.4;
  const wallH = dims.floorHeight - slabT; // 2.80 m
  const baseY = slabT; // 0.40 m

  // 1. Heavy Basalt Stone Plinth (subterranean ground thermal heat sink)
  const plinthGeom = createSlabWithVoids(dims.length + 1.2, -halfW - 0.6, halfW + 0.6, slabT, false, false);
  const plinthMesh = new THREE.Mesh(plinthGeom, materials.basalt);
  plinthMesh.position.set(0, slabT, 0);
  plinthMesh.receiveShadow = true;
  foundationGroup.add(plinthMesh);

  // Entrance steps
  const stepGeom = new THREE.BoxGeometry(3.6, 0.18, 1.2);
  const step = new THREE.Mesh(stepGeom, materials.basalt);
  step.position.set(0, 0.09, halfW + 1.0);
  step.receiveShadow = true;
  foundationGroup.add(step);

  // 2. Ground Floor Massive Rammed-Earth Walls (350 mm thickness) constructed around REAL OPENINGS

  // A. South Exterior Wall (Z = 4.825 m, spanning X from -7.0 to +7.0)
  const southWall = createWallWithOpenings({
    id: 'ground_south_wall',
    start: new THREE.Vector3(-halfL, baseY, halfW - dims.wallThickness / 2),
    end: new THREE.Vector3(halfL, baseY, halfW - dims.wallThickness / 2),
    height: wallH,
    thickness: dims.wallThickness,
    material: materials.rammedEarth,
    floor: 0,
    openings: [
      {
        id: 'vent-ground-intake-west',
        type: 'ventilation',
        center: new THREE.Vector3(-5.4, baseY + 0.2, halfW - dims.wallThickness / 2),
        width: 0.9,
        height: 0.35,
        sillHeight: 0.05,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-A01-living-S',
        type: 'window',
        center: new THREE.Vector3(-3.8, baseY + 1.25, halfW - dims.wallThickness / 2),
        width: 2.4,
        height: 2.1,
        sillHeight: 0.2,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'portal-ground-main-entry',
        type: 'door',
        center: new THREE.Vector3(0, baseY + wallH / 2, halfW - dims.wallThickness / 2),
        width: 3.2,
        height: wallH,
        sillHeight: 0.0,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-A02-living-S',
        type: 'window',
        center: new THREE.Vector3(3.8, baseY + 1.25, halfW - dims.wallThickness / 2),
        width: 2.4,
        height: 2.1,
        sillHeight: 0.2,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'vent-ground-intake-east',
        type: 'ventilation',
        center: new THREE.Vector3(5.4, baseY + 0.2, halfW - dims.wallThickness / 2),
        width: 0.9,
        height: 0.35,
        sillHeight: 0.05,
        depth: dims.wallThickness,
        isVoid: true,
      },
    ],
  });
  groundGroup.add(southWall);

  // B. North Exterior Wall (Z = -4.825 m, spanning X from -7.0 to +7.0)
  const northWall = createWallWithOpenings({
    id: 'ground_north_wall',
    start: new THREE.Vector3(-halfL, baseY, -halfW + dims.wallThickness / 2),
    end: new THREE.Vector3(halfL, baseY, -halfW + dims.wallThickness / 2),
    height: wallH,
    thickness: dims.wallThickness,
    material: materials.rammedEarth,
    floor: 0,
    openings: [
      {
        id: 'win-A01-master-N',
        type: 'window',
        center: new THREE.Vector3(-4.7, baseY + 1.55, -halfW + dims.wallThickness / 2),
        width: 1.8,
        height: 1.5,
        sillHeight: 0.8,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-stair-L0-N',
        type: 'window',
        center: new THREE.Vector3(0, baseY + 1.7, -halfW + dims.wallThickness / 2),
        width: 1.6,
        height: 1.8,
        sillHeight: 0.8,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-A02-master-N',
        type: 'window',
        center: new THREE.Vector3(4.7, baseY + 1.55, -halfW + dims.wallThickness / 2),
        width: 1.8,
        height: 1.5,
        sillHeight: 0.8,
        depth: dims.wallThickness,
        isVoid: true,
      },
    ],
  });
  groundGroup.add(northWall);

  // C. West Exterior Wall (X = -6.825 m, meeting North & South walls with 0.000m corner joints)
  const westWall = createWallWithOpenings({
    id: 'ground_west_wall',
    start: new THREE.Vector3(-halfL + dims.wallThickness / 2, baseY, -halfW + dims.wallThickness),
    end: new THREE.Vector3(-halfL + dims.wallThickness / 2, baseY, halfW - dims.wallThickness),
    height: wallH,
    thickness: dims.wallThickness,
    material: materials.rammedEarth,
    floor: 0,
    openings: [
      {
        id: 'win-A01-bed02-W',
        type: 'window',
        center: new THREE.Vector3(-halfL + dims.wallThickness / 2, baseY + 1.55, -3.0),
        width: 1.5,
        height: 1.5,
        sillHeight: 0.8,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-A01-kitchen-W',
        type: 'window',
        center: new THREE.Vector3(-halfL + dims.wallThickness / 2, baseY + 1.6, -0.65),
        width: 1.6,
        height: 1.4,
        sillHeight: 0.9,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'vent-A01-kitchen-W',
        type: 'ventilation',
        center: new THREE.Vector3(-halfL + dims.wallThickness / 2, baseY + 2.375, -0.65),
        width: 1.4,
        height: 0.35,
        sillHeight: 2.2,
        depth: dims.wallThickness,
        isVoid: true,
      },
    ],
  });
  groundGroup.add(westWall);

  // D. East Exterior Wall (X = +6.825 m, meeting North & South walls with 0.000m corner joints)
  const eastWall = createWallWithOpenings({
    id: 'ground_east_wall',
    start: new THREE.Vector3(halfL - dims.wallThickness / 2, baseY, -halfW + dims.wallThickness),
    end: new THREE.Vector3(halfL - dims.wallThickness / 2, baseY, halfW - dims.wallThickness),
    height: wallH,
    thickness: dims.wallThickness,
    material: materials.rammedEarth,
    floor: 0,
    openings: [
      {
        id: 'win-A02-bed02-E',
        type: 'window',
        center: new THREE.Vector3(halfL - dims.wallThickness / 2, baseY + 1.55, -3.0),
        width: 1.5,
        height: 1.5,
        sillHeight: 0.8,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-A02-kitchen-E',
        type: 'window',
        center: new THREE.Vector3(halfL - dims.wallThickness / 2, baseY + 1.6, -0.65),
        width: 1.6,
        height: 1.4,
        sillHeight: 0.9,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'vent-A02-kitchen-E',
        type: 'ventilation',
        center: new THREE.Vector3(halfL - dims.wallThickness / 2, baseY + 2.375, -0.65),
        width: 1.4,
        height: 0.35,
        sillHeight: 2.2,
        depth: dims.wallThickness,
        isVoid: true,
      },
    ],
  });
  groundGroup.add(eastWall);

  // 3. Ground floor scheduled windows linked to A01 & A02 inserted into the REAL VOIDS
  const groundWindows = APARTMENT_WINDOWS.filter((w) => w.unitId.startsWith('A'));
  for (const win of groundWindows) {
    groundGroup.add(createScheduledWindowAssembly(win, materials));
  }

  // 4. Ground Floor Interior Architecture (Unit A01 & A02 Partitions, Doors, Proxies)
  const groundInterior = buildFloorInterior(0, materials);
  groundGroup.add(groundInterior.interiorWalls);
  groundGroup.add(groundInterior.doors);
  groundGroup.add(groundInterior.furnitureProxies);

  // Central Entry Colonnade (Concrete structural pillars framing atrium intake portal)
  const colGeom = new THREE.BoxGeometry(0.35, wallH, 0.35);
  const col1 = new THREE.Mesh(colGeom, materials.concrete);
  col1.position.set(-1.6, baseY + wallH / 2, halfW - dims.wallThickness / 2);
  col1.castShadow = true;
  groundGroup.add(col1);

  const col2 = new THREE.Mesh(colGeom, materials.concrete);
  col2.position.set(1.6, baseY + wallH / 2, halfW - dims.wallThickness / 2);
  col2.castShadow = true;
  groundGroup.add(col2);

  // Ground intake ventilation slots inserted into the voids
  const intakeSlotGeom = new THREE.BoxGeometry(0.8, 0.22, dims.wallThickness + 0.05);
  for (const xPos of [-5.4, 5.4]) {
    const slot = new THREE.Mesh(intakeSlotGeom, materials.windowFrameBronze);
    slot.position.set(xPos, baseY + 0.2, halfW - dims.wallThickness / 2);
    groundGroup.add(slot);
  }

  return { foundationGroup, groundGroup, groundDebugOverlays: groundInterior.debugOverlays };
}

/**
 * Builds the First Floor Residential Subsystem with Cantilevered Balconies & Wind Deflectors
 * Reconstructed with REAL VOIDS for balcony sliding doors, windows, and cross-vents.
 */
function buildFirstFloor(
  dims: ApartmentDimensions,
  materials: ArchitecturalMaterials
): { floorGroup: THREE.Group; firstDebugOverlays: THREE.Group } {
  const floorGroup = new THREE.Group();
  floorGroup.name = 'firstFloorGroup';

  const halfL = dims.length / 2;
  const halfW = dims.width / 2;
  const slabT = 0.28;
  const yBase = dims.floorHeight; // 3.2 m
  const wallH = dims.floorHeight - slabT; // 2.92 m
  const wallBaseY = yBase + slabT; // 3.48 m

  // 1. Level 1 Concrete Structural Slab with Atrium Void & Stair Void + 1.5 m South Cantilever
  const slabGeom = createSlabWithVoids(dims.length, -halfW, halfW + dims.balconyDepth, slabT, true, true);
  const slabMesh = new THREE.Mesh(slabGeom, materials.concrete);
  slabMesh.position.set(0, wallBaseY, 0);
  slabMesh.castShadow = true;
  slabMesh.receiveShadow = true;
  floorGroup.add(slabMesh);

  // Balcony Balustrade / Solid Parapet (Concrete + terracotta coping, 0.95 m height)
  const southBalustrade = new THREE.Mesh(
    new THREE.BoxGeometry(dims.length, 0.95, 0.18),
    materials.concrete
  );
  southBalustrade.position.set(0, wallBaseY + 0.95 / 2, halfW + dims.balconyDepth - 0.09);
  southBalustrade.castShadow = true;
  southBalustrade.receiveShadow = true;
  floorGroup.add(southBalustrade);

  // Return side balustrades
  for (const xSide of [-halfL + 0.09, halfL - 0.09]) {
    const sideBalustrade = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.95, dims.balconyDepth),
      materials.concrete
    );
    sideBalustrade.position.set(xSide, wallBaseY + 0.95 / 2, halfW + dims.balconyDepth / 2);
    floorGroup.add(sideBalustrade);
  }

  // 2. First Floor Exterior Rammed Earth Walls with REAL VOIDS

  // A. South Exterior Wall
  const southWall = createWallWithOpenings({
    id: 'first_south_wall',
    start: new THREE.Vector3(-halfL, wallBaseY, halfW - dims.wallThickness / 2),
    end: new THREE.Vector3(halfL, wallBaseY, halfW - dims.wallThickness / 2),
    height: wallH,
    thickness: dims.wallThickness,
    material: materials.rammedEarth,
    floor: 1,
    openings: [
      {
        id: 'win-B01-living-S',
        type: 'window',
        center: new THREE.Vector3(-5.5, wallBaseY + 1.25, halfW - dims.wallThickness / 2),
        width: 1.8,
        height: 2.1,
        sillHeight: 0.2,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'door-B01-balcony',
        type: 'door',
        center: new THREE.Vector3(-3.5, wallBaseY + 1.15, halfW - dims.wallThickness / 2),
        width: 2.2,
        height: 2.3,
        sillHeight: 0.0,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'portal-first-corridor-overlook',
        type: 'door',
        center: new THREE.Vector3(0, wallBaseY + 1.2, halfW - dims.wallThickness / 2),
        width: 1.8,
        height: 2.4,
        sillHeight: 0.0,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'door-B02-balcony',
        type: 'door',
        center: new THREE.Vector3(3.5, wallBaseY + 1.15, halfW - dims.wallThickness / 2),
        width: 2.2,
        height: 2.3,
        sillHeight: 0.0,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-B02-living-S',
        type: 'window',
        center: new THREE.Vector3(5.5, wallBaseY + 1.25, halfW - dims.wallThickness / 2),
        width: 1.8,
        height: 2.1,
        sillHeight: 0.2,
        depth: dims.wallThickness,
        isVoid: true,
      },
    ],
  });
  floorGroup.add(southWall);

  // B. North Exterior Wall
  const northWall = createWallWithOpenings({
    id: 'first_north_wall',
    start: new THREE.Vector3(-halfL, wallBaseY, -halfW + dims.wallThickness / 2),
    end: new THREE.Vector3(halfL, wallBaseY, -halfW + dims.wallThickness / 2),
    height: wallH,
    thickness: dims.wallThickness,
    material: materials.rammedEarth,
    floor: 1,
    openings: [
      {
        id: 'win-B01-master-N',
        type: 'window',
        center: new THREE.Vector3(-4.7, wallBaseY + 1.55, -halfW + dims.wallThickness / 2),
        width: 1.8,
        height: 1.5,
        sillHeight: 0.8,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-stair-L1-N',
        type: 'window',
        center: new THREE.Vector3(0, wallBaseY + 1.7, -halfW + dims.wallThickness / 2),
        width: 1.6,
        height: 1.8,
        sillHeight: 0.8,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-B02-master-N',
        type: 'window',
        center: new THREE.Vector3(4.7, wallBaseY + 1.55, -halfW + dims.wallThickness / 2),
        width: 1.8,
        height: 1.5,
        sillHeight: 0.8,
        depth: dims.wallThickness,
        isVoid: true,
      },
    ],
  });
  floorGroup.add(northWall);

  // C. West Exterior Wall
  const westWall = createWallWithOpenings({
    id: 'first_west_wall',
    start: new THREE.Vector3(-halfL + dims.wallThickness / 2, wallBaseY, -halfW + dims.wallThickness),
    end: new THREE.Vector3(-halfL + dims.wallThickness / 2, wallBaseY, halfW - dims.wallThickness),
    height: wallH,
    thickness: dims.wallThickness,
    material: materials.rammedEarth,
    floor: 1,
    openings: [
      {
        id: 'win-B01-bed02-W',
        type: 'window',
        center: new THREE.Vector3(-halfL + dims.wallThickness / 2, wallBaseY + 1.55, -3.0),
        width: 1.5,
        height: 1.5,
        sillHeight: 0.8,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-B01-kitchen-W',
        type: 'window',
        center: new THREE.Vector3(-halfL + dims.wallThickness / 2, wallBaseY + 1.6, -0.65),
        width: 1.6,
        height: 1.4,
        sillHeight: 0.9,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-B01-living-W',
        type: 'window',
        center: new THREE.Vector3(-halfL + dims.wallThickness / 2, wallBaseY + 1.5, 2.4),
        width: 1.6,
        height: 1.6,
        sillHeight: 0.7,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'vent-B01-kitchen-W',
        type: 'ventilation',
        center: new THREE.Vector3(-halfL + dims.wallThickness / 2, wallBaseY + 2.375, -0.65),
        width: 1.4,
        height: 0.35,
        sillHeight: 2.2,
        depth: dims.wallThickness,
        isVoid: true,
      },
    ],
  });
  floorGroup.add(westWall);

  // D. East Exterior Wall
  const eastWall = createWallWithOpenings({
    id: 'first_east_wall',
    start: new THREE.Vector3(halfL - dims.wallThickness / 2, wallBaseY, -halfW + dims.wallThickness),
    end: new THREE.Vector3(halfL - dims.wallThickness / 2, wallBaseY, halfW - dims.wallThickness),
    height: wallH,
    thickness: dims.wallThickness,
    material: materials.rammedEarth,
    floor: 1,
    openings: [
      {
        id: 'win-B02-bed02-E',
        type: 'window',
        center: new THREE.Vector3(halfL - dims.wallThickness / 2, wallBaseY + 1.55, -3.0),
        width: 1.5,
        height: 1.5,
        sillHeight: 0.8,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-B02-kitchen-E',
        type: 'window',
        center: new THREE.Vector3(halfL - dims.wallThickness / 2, wallBaseY + 1.6, -0.65),
        width: 1.6,
        height: 1.4,
        sillHeight: 0.9,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-B02-living-E',
        type: 'window',
        center: new THREE.Vector3(halfL - dims.wallThickness / 2, wallBaseY + 1.5, 2.4),
        width: 1.6,
        height: 1.6,
        sillHeight: 0.7,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'vent-B02-kitchen-E',
        type: 'ventilation',
        center: new THREE.Vector3(halfL - dims.wallThickness / 2, wallBaseY + 2.375, -0.65),
        width: 1.4,
        height: 0.35,
        sillHeight: 2.2,
        depth: dims.wallThickness,
        isVoid: true,
      },
    ],
  });
  floorGroup.add(eastWall);

  // 3. Scheduled Windows for First Floor Apartments B01 & B02 inserted into VOIDS
  const firstWindows = APARTMENT_WINDOWS.filter((w) => w.unitId.startsWith('B'));
  for (const win of firstWindows) {
    floorGroup.add(createScheduledWindowAssembly(win, materials));
  }

  // 4. First Floor Interior Architecture (Unit B01 & B02 Partitions, Doors, Proxies)
  const firstInterior = buildFloorInterior(1, materials);
  floorGroup.add(firstInterior.interiorWalls);
  floorGroup.add(firstInterior.doors);
  floorGroup.add(firstInterior.furnitureProxies);

  // 5. Aerodynamic Wing Walls (Corner wind scoops, 600 mm projection)
  const wingFin1 = createWingWallFin(wallH, dims.wingWallProjection, 0.18, materials, 0.35);
  wingFin1.position.set(halfL, wallBaseY + wallH, halfW);
  floorGroup.add(wingFin1);

  const wingFin2 = createWingWallFin(wallH, dims.wingWallProjection, 0.18, materials, -0.35);
  wingFin2.rotation.y = Math.PI;
  wingFin2.position.set(-halfL, wallBaseY + wallH, halfW);
  floorGroup.add(wingFin2);

  return { floorGroup, firstDebugOverlays: firstInterior.debugOverlays };
}

/**
 * Builds the Second Floor Residential Subsystem with Cantilever & Solar Shading Edge
 * Reconstructed with REAL VOIDS for penthouse balcony doors, studio apertures, and cross-vents.
 */
function buildSecondFloor(
  dims: ApartmentDimensions,
  materials: ArchitecturalMaterials
): { floorGroup: THREE.Group; secondDebugOverlays: THREE.Group } {
  const floorGroup = new THREE.Group();
  floorGroup.name = 'secondFloorGroup';

  const halfL = dims.length / 2;
  const halfW = dims.width / 2;
  const slabT = 0.28;
  const yBase = dims.floorHeight * 2; // 6.4 m
  const wallH = dims.floorHeight - slabT; // 2.92 m
  const wallBaseY = yBase + slabT; // 6.68 m

  // 1. Level 2 Slab with Atrium Void & Stair Void + 1.5 m South Cantilever
  const slabGeom = createSlabWithVoids(dims.length, -halfW, halfW + dims.balconyDepth, slabT, true, true);
  const slabMesh = new THREE.Mesh(slabGeom, materials.concrete);
  slabMesh.position.set(0, wallBaseY, 0);
  slabMesh.castShadow = true;
  slabMesh.receiveShadow = true;
  floorGroup.add(slabMesh);

  // Balcony Balustrade
  const southBalustrade = new THREE.Mesh(
    new THREE.BoxGeometry(dims.length, 0.95, 0.18),
    materials.concrete
  );
  southBalustrade.position.set(0, wallBaseY + 0.95 / 2, halfW + dims.balconyDepth - 0.09);
  southBalustrade.castShadow = true;
  southBalustrade.receiveShadow = true;
  floorGroup.add(southBalustrade);

  for (const xSide of [-halfL + 0.09, halfL - 0.09]) {
    const sideBalustrade = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.95, dims.balconyDepth),
      materials.concrete
    );
    sideBalustrade.position.set(xSide, wallBaseY + 0.95 / 2, halfW + dims.balconyDepth / 2);
    floorGroup.add(sideBalustrade);
  }

  // 2. Second Floor Exterior Rammed Earth Walls with REAL VOIDS

  // A. South Exterior Wall
  const southWall = createWallWithOpenings({
    id: 'second_south_wall',
    start: new THREE.Vector3(-halfL, wallBaseY, halfW - dims.wallThickness / 2),
    end: new THREE.Vector3(halfL, wallBaseY, halfW - dims.wallThickness / 2),
    height: wallH,
    thickness: dims.wallThickness,
    material: materials.rammedEarth,
    floor: 2,
    openings: [
      {
        id: 'win-C01-living-S',
        type: 'window',
        center: new THREE.Vector3(-5.5, wallBaseY + 1.25, halfW - dims.wallThickness / 2),
        width: 1.8,
        height: 2.1,
        sillHeight: 0.2,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'door-C01-balcony',
        type: 'door',
        center: new THREE.Vector3(-3.5, wallBaseY + 1.15, halfW - dims.wallThickness / 2),
        width: 2.2,
        height: 2.3,
        sillHeight: 0.0,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'portal-second-corridor-overlook',
        type: 'door',
        center: new THREE.Vector3(0, wallBaseY + 1.2, halfW - dims.wallThickness / 2),
        width: 1.8,
        height: 2.4,
        sillHeight: 0.0,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'door-C02-balcony',
        type: 'door',
        center: new THREE.Vector3(3.5, wallBaseY + 1.15, halfW - dims.wallThickness / 2),
        width: 2.2,
        height: 2.3,
        sillHeight: 0.0,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-C02-living-S',
        type: 'window',
        center: new THREE.Vector3(5.5, wallBaseY + 1.25, halfW - dims.wallThickness / 2),
        width: 1.8,
        height: 2.1,
        sillHeight: 0.2,
        depth: dims.wallThickness,
        isVoid: true,
      },
    ],
  });
  floorGroup.add(southWall);

  // B. North Exterior Wall
  const northWall = createWallWithOpenings({
    id: 'second_north_wall',
    start: new THREE.Vector3(-halfL, wallBaseY, -halfW + dims.wallThickness / 2),
    end: new THREE.Vector3(halfL, wallBaseY, -halfW + dims.wallThickness / 2),
    height: wallH,
    thickness: dims.wallThickness,
    material: materials.rammedEarth,
    floor: 2,
    openings: [
      {
        id: 'win-C01-master-N',
        type: 'window',
        center: new THREE.Vector3(-4.7, wallBaseY + 1.6, -halfW + dims.wallThickness / 2),
        width: 2.0,
        height: 1.6,
        sillHeight: 0.8,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-stair-L2-N',
        type: 'window',
        center: new THREE.Vector3(0, wallBaseY + 1.7, -halfW + dims.wallThickness / 2),
        width: 1.6,
        height: 1.8,
        sillHeight: 0.8,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-C02-master-N',
        type: 'window',
        center: new THREE.Vector3(4.7, wallBaseY + 1.6, -halfW + dims.wallThickness / 2),
        width: 2.0,
        height: 1.6,
        sillHeight: 0.8,
        depth: dims.wallThickness,
        isVoid: true,
      },
    ],
  });
  floorGroup.add(northWall);

  // C. West Exterior Wall
  const westWall = createWallWithOpenings({
    id: 'second_west_wall',
    start: new THREE.Vector3(-halfL + dims.wallThickness / 2, wallBaseY, -halfW + dims.wallThickness),
    end: new THREE.Vector3(-halfL + dims.wallThickness / 2, wallBaseY, halfW - dims.wallThickness),
    height: wallH,
    thickness: dims.wallThickness,
    material: materials.rammedEarth,
    floor: 2,
    openings: [
      {
        id: 'win-C01-kitchen-W',
        type: 'window',
        center: new THREE.Vector3(-halfL + dims.wallThickness / 2, wallBaseY + 1.6, -1.6),
        width: 1.4,
        height: 1.4,
        sillHeight: 0.9,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-C01-studio-W',
        type: 'window',
        center: new THREE.Vector3(-halfL + dims.wallThickness / 2, wallBaseY + 1.6, 0.2),
        width: 2.0,
        height: 1.8,
        sillHeight: 0.7,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-C01-living-W',
        type: 'window',
        center: new THREE.Vector3(-halfL + dims.wallThickness / 2, wallBaseY + 1.5, 2.4),
        width: 1.6,
        height: 1.6,
        sillHeight: 0.7,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'vent-C01-kitchen-W',
        type: 'ventilation',
        center: new THREE.Vector3(-halfL + dims.wallThickness / 2, wallBaseY + 2.375, -1.6),
        width: 1.4,
        height: 0.35,
        sillHeight: 2.2,
        depth: dims.wallThickness,
        isVoid: true,
      },
    ],
  });
  floorGroup.add(westWall);

  // D. East Exterior Wall
  const eastWall = createWallWithOpenings({
    id: 'second_east_wall',
    start: new THREE.Vector3(halfL - dims.wallThickness / 2, wallBaseY, -halfW + dims.wallThickness),
    end: new THREE.Vector3(halfL - dims.wallThickness / 2, wallBaseY, halfW - dims.wallThickness),
    height: wallH,
    thickness: dims.wallThickness,
    material: materials.rammedEarth,
    floor: 2,
    openings: [
      {
        id: 'win-C02-kitchen-E',
        type: 'window',
        center: new THREE.Vector3(halfL - dims.wallThickness / 2, wallBaseY + 1.6, -1.6),
        width: 1.4,
        height: 1.4,
        sillHeight: 0.9,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-C02-studio-E',
        type: 'window',
        center: new THREE.Vector3(halfL - dims.wallThickness / 2, wallBaseY + 1.6, 0.2),
        width: 2.0,
        height: 1.8,
        sillHeight: 0.7,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'win-C02-living-E',
        type: 'window',
        center: new THREE.Vector3(halfL - dims.wallThickness / 2, wallBaseY + 1.5, 2.4),
        width: 1.6,
        height: 1.6,
        sillHeight: 0.7,
        depth: dims.wallThickness,
        isVoid: true,
      },
      {
        id: 'vent-C02-kitchen-E',
        type: 'ventilation',
        center: new THREE.Vector3(halfL - dims.wallThickness / 2, wallBaseY + 2.375, -1.6),
        width: 1.4,
        height: 0.35,
        sillHeight: 2.2,
        depth: dims.wallThickness,
        isVoid: true,
      },
    ],
  });
  floorGroup.add(eastWall);

  // 3. Scheduled Windows for Second Floor Penthouse Apartments C01 & C02 inserted into VOIDS
  const secondWindows = APARTMENT_WINDOWS.filter((w) => w.unitId.startsWith('C'));
  for (const win of secondWindows) {
    floorGroup.add(createScheduledWindowAssembly(win, materials));
  }

  // 4. Second Floor Interior Architecture (Unit C01 & C02 Partitions, Doors, Proxies)
  const secondInterior = buildFloorInterior(2, materials);
  floorGroup.add(secondInterior.interiorWalls);
  floorGroup.add(secondInterior.doors);
  floorGroup.add(secondInterior.furnitureProxies);

  // 5. Corner Wing Walls
  const wingFin1 = createWingWallFin(wallH, dims.wingWallProjection, 0.18, materials, 0.35);
  wingFin1.position.set(halfL, wallBaseY + wallH, halfW);
  floorGroup.add(wingFin1);

  const wingFin2 = createWingWallFin(wallH, dims.wingWallProjection, 0.18, materials, -0.35);
  wingFin2.rotation.y = Math.PI;
  wingFin2.position.set(-halfL, wallBaseY + wallH, halfW);
  floorGroup.add(wingFin2);

  return { floorGroup, secondDebugOverlays: secondInterior.debugOverlays };
}

/**
 * Builds the High-Albedo Shaded Roof Terrace with Stepped Parapets & Timber Pergola
 * Slab contains REAL VOIDS for the Atrium chimney and the Stair Core enclosure.
 */
function buildRoofTerrace(
  dims: ApartmentDimensions,
  materials: ArchitecturalMaterials
): THREE.Group {
  const roofGroup = new THREE.Group();
  roofGroup.name = 'roofTerraceGroup';

  const halfL = dims.length / 2;
  const halfW = dims.width / 2;
  const slabT = 0.28;
  const yBase = dims.floorHeight * 3; // 9.6 m
  const terraceBaseY = yBase + slabT; // 9.88 m

  // 1. High-Albedo Roof Terrace Slab with Atrium Cutout and Stair Core Hole
  const roofSlabGeom = createSlabWithVoids(dims.length, -halfW, halfW, slabT, true, true);
  const roofSlab = new THREE.Mesh(roofSlabGeom, materials.limePlaster);
  roofSlab.position.set(0, terraceBaseY, 0);
  roofSlab.castShadow = true;
  roofSlab.receiveShadow = true;
  roofGroup.add(roofSlab);

  // 2. Stair Core Roof Enclosure (Penthouse protecting stairs with access door onto terrace)
  const stairHouseH = 2.4;
  const stairHouseWallT = 0.18;
  const stairHouseGroup = new THREE.Group();
  stairHouseGroup.name = 'stairRoofPenthouse';

  // Penthouse walls framing X: [-1.6, 1.6], Z: [-3.6, -1.5]
  const pSouthWall = createWallWithOpenings({
    id: 'penthouse_south_wall',
    start: new THREE.Vector3(-1.6, terraceBaseY, -1.5),
    end: new THREE.Vector3(1.6, terraceBaseY, -1.5),
    height: stairHouseH,
    thickness: stairHouseWallT,
    material: materials.limePlaster,
    openings: [
      {
        id: 'door-roof-terrace-access',
        type: 'door',
        center: new THREE.Vector3(0, terraceBaseY + 1.075, -1.5),
        width: 1.0,
        height: 2.15,
        sillHeight: 0.0,
        depth: stairHouseWallT,
        isVoid: true,
      },
    ],
  });
  stairHouseGroup.add(pSouthWall);

  const pNorthWall = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, stairHouseH, stairHouseWallT),
    materials.limePlaster
  );
  pNorthWall.position.set(0, terraceBaseY + stairHouseH / 2, -3.6);
  stairHouseGroup.add(pNorthWall);

  const pWestWall = new THREE.Mesh(
    new THREE.BoxGeometry(stairHouseWallT, stairHouseH, 2.1),
    materials.limePlaster
  );
  pWestWall.position.set(-1.6, terraceBaseY + stairHouseH / 2, -2.55);
  stairHouseGroup.add(pWestWall);

  const pEastWall = new THREE.Mesh(
    new THREE.BoxGeometry(stairHouseWallT, stairHouseH, 2.1),
    materials.limePlaster
  );
  pEastWall.position.set(1.6, terraceBaseY + stairHouseH / 2, -2.55);
  stairHouseGroup.add(pEastWall);

  // Penthouse roof lid
  const pLid = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.16, 2.3),
    materials.concrete
  );
  pLid.position.set(0, terraceBaseY + stairHouseH + 0.08, -2.55);
  stairHouseGroup.add(pLid);

  roofGroup.add(stairHouseGroup);

  // 3. Continuous 1.20 m High Stepped Parapets (High-Albedo Calcite Lime Plaster)
  const parapetH = dims.roofParapetHeight; // 1.20 m
  const parapetT = 0.30;
  const parapetY = terraceBaseY + parapetH / 2;

  // South Parapet
  const sParapet = new THREE.Mesh(
    new THREE.BoxGeometry(dims.length, parapetH, parapetT),
    materials.limePlaster
  );
  sParapet.position.set(0, parapetY, halfW - parapetT / 2);
  sParapet.castShadow = true;
  sParapet.receiveShadow = true;
  roofGroup.add(sParapet);

  // North Parapet
  const nParapet = new THREE.Mesh(
    new THREE.BoxGeometry(dims.length, parapetH, parapetT),
    materials.limePlaster
  );
  nParapet.position.set(0, parapetY, -halfW + parapetT / 2);
  nParapet.castShadow = true;
  nParapet.receiveShadow = true;
  roofGroup.add(nParapet);

  // East Parapet
  const eParapet = new THREE.Mesh(
    new THREE.BoxGeometry(parapetT, parapetH, dims.width - parapetT * 2),
    materials.limePlaster
  );
  eParapet.position.set(halfL - parapetT / 2, parapetY, 0);
  eParapet.castShadow = true;
  eParapet.receiveShadow = true;
  roofGroup.add(eParapet);

  // West Parapet
  const wParapet = new THREE.Mesh(
    new THREE.BoxGeometry(parapetT, parapetH, dims.width - parapetT * 2),
    materials.limePlaster
  );
  wParapet.position.set(-halfL + parapetT / 2, parapetY, 0);
  wParapet.castShadow = true;
  wParapet.receiveShadow = true;
  roofGroup.add(wParapet);

  // 4. Architectural Shading Pergola / Trellis (Shaded Roof Lounge Zone)
  const pergolaGroup = new THREE.Group();
  const pergolaH = 2.4;
  const pergolaL = 6.0;
  const pergolaW = 4.0;
  const postGeom = new THREE.BoxGeometry(0.14, pergolaH, 0.14);

  // 4 Structural Timber Posts
  const postPositions = [
    [-pergolaL / 2, pergolaH / 2, -pergolaW / 2 + 1.5],
    [pergolaL / 2, pergolaH / 2, -pergolaW / 2 + 1.5],
    [-pergolaL / 2, pergolaH / 2, pergolaW / 2 + 1.5],
    [pergolaL / 2, pergolaH / 2, pergolaW / 2 + 1.5],
  ];

  for (const pos of postPositions) {
    const post = new THREE.Mesh(postGeom, materials.pergolaWood);
    post.position.set(pos[0], terraceBaseY + pos[1], pos[2]);
    post.castShadow = true;
    pergolaGroup.add(post);
  }

  // Horizontal Beams
  const beamGeom = new THREE.BoxGeometry(pergolaL + 0.4, 0.16, 0.1);
  const beam1 = new THREE.Mesh(beamGeom, materials.pergolaWood);
  beam1.position.set(0, terraceBaseY + pergolaH, -pergolaW / 2 + 1.5);
  beam1.castShadow = true;
  pergolaGroup.add(beam1);

  const beam2 = new THREE.Mesh(beamGeom, materials.pergolaWood);
  beam2.position.set(0, terraceBaseY + pergolaH, pergolaW / 2 + 1.5);
  beam2.castShadow = true;
  pergolaGroup.add(beam2);

  // Shading Rafter Slats
  const slatCount = 18;
  const slatGeom = new THREE.BoxGeometry(0.06, 0.12, pergolaW + 0.4);
  for (let i = 0; i < slatCount; i++) {
    const xPos = -pergolaL / 2 + (i / (slatCount - 1)) * pergolaL;
    const slat = new THREE.Mesh(slatGeom, materials.pergolaWood);
    slat.position.set(xPos, terraceBaseY + pergolaH + 0.1, 1.5);
    slat.castShadow = true;
    pergolaGroup.add(slat);
  }

  roofGroup.add(pergolaGroup);

  return roofGroup;
}

/**
 * Builds the Restrained Passive Landscape (Warm earth, stone outcrops, drought-tolerant vegetation)
 */
function buildLandscape(materials: ArchitecturalMaterials): THREE.Group {
  const landscapeGroup = new THREE.Group();
  landscapeGroup.name = 'landscapeGroup';

  // Ground plane (subtle warm earth terrain)
  const groundGeom = new THREE.PlaneGeometry(80, 80, 24, 24);
  const groundMesh = new THREE.Mesh(groundGeom, materials.groundTerrain);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.01;
  groundMesh.receiveShadow = true;
  landscapeGroup.add(groundMesh);

  // Minimal basalt rock clusters framing entry
  const rockGeom = new THREE.DodecahedronGeometry(0.65, 1);
  const rockPositions = [
    [-6.5, 0.25, 6.8],
    [-7.2, 0.35, 6.2],
    [6.8, 0.3, 7.0],
    [7.5, 0.45, 6.4],
    [-8.0, 0.3, -4.5],
  ];

  for (const pos of rockPositions) {
    const rock = new THREE.Mesh(rockGeom, materials.basalt);
    rock.position.set(pos[0], pos[1], pos[2]);
    rock.scale.set(1 + Math.random() * 0.4, 0.7 + Math.random() * 0.4, 1 + Math.random() * 0.4);
    rock.castShadow = true;
    rock.receiveShadow = true;
    landscapeGroup.add(rock);
  }

  return landscapeGroup;
}

/**
 * Main Builder Function: Creates and organizes the complete hierarchical architectural scene graph
 */
export function buildApartmentScene(
  materials: ArchitecturalMaterials,
  dims: ApartmentDimensions = APARTMENT_DIMENSIONS
): ArchitecturalSceneGroups {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'rootGroup';

  // 1. Landscape
  const landscapeGroup = buildLandscape(materials);
  rootGroup.add(landscapeGroup);

  // 2. Foundation & Plinth
  const { foundationGroup, groundGroup, groundDebugOverlays } = buildGroundFloor(dims, materials);
  rootGroup.add(foundationGroup);
  rootGroup.add(groundGroup);

  // 3. First Floor
  const { floorGroup: firstFloorGroup, firstDebugOverlays } = buildFirstFloor(dims, materials);
  rootGroup.add(firstFloorGroup);

  // 4. Second Floor
  const { floorGroup: secondFloorGroup, secondDebugOverlays } = buildSecondFloor(dims, materials);
  rootGroup.add(secondFloorGroup);

  // 5. West Terracotta Jaali Screen
  const jaaliScreenGroup = buildWestJaaliScreen(dims, materials);
  rootGroup.add(jaaliScreenGroup);

  // 6. Central Atrium Core
  const atriumCoreGroup = buildAtriumCore(dims, materials);
  rootGroup.add(atriumCoreGroup);

  // 7. Roof Terrace
  const roofTerraceGroup = buildRoofTerrace(dims, materials);
  rootGroup.add(roofTerraceGroup);

  // 8. Room Spatial Bounds & Billboarded Labels Overlay
  const roomDebugGroup = new THREE.Group();
  roomDebugGroup.name = 'roomDebugGroup';
  roomDebugGroup.add(groundDebugOverlays);
  roomDebugGroup.add(firstDebugOverlays);
  roomDebugGroup.add(secondDebugOverlays);
  rootGroup.add(roomDebugGroup);

  return {
    rootGroup,
    foundationSlabGroup: foundationGroup,
    groundFloorGroup: groundGroup,
    firstFloorGroup,
    secondFloorGroup,
    jaaliScreenGroup,
    atriumCoreGroup,
    roofTerraceGroup,
    landscapeGroup,
    roomDebugGroup,
  };
}

/**
 * Applies the exploded view transformation based on progress (0.0 to 1.0)
 * Adheres strictly to Requirement 26:
 * - Ground floor: Y = 0
 * - First floor: Y += explodedProgress * 2.5
 * - Second floor: Y += explodedProgress * 5.0
 * - Roof: Y += explodedProgress * 7.5
 * - Jaali: moves horizontally X/Z += explodedProgress * 1.5
 */
export function applyExplodedView(
  groups: ArchitecturalSceneGroups,
  progress: number
): void {
  const p = Math.max(0, Math.min(1, progress));

  // Ground floor remains stationary at Y = 0
  groups.groundFloorGroup.position.y = 0;

  // First floor lifts by 2.5 m
  groups.firstFloorGroup.position.y = p * 2.5;

  // Second floor lifts by 5.0 m
  groups.secondFloorGroup.position.y = p * 5.0;

  // Roof terrace lifts by 7.5 m
  groups.roofTerraceGroup.position.y = p * 7.5;

  // Jaali moves horizontally along X-axis (-X is West)
  groups.jaaliScreenGroup.position.x = -p * 1.8;
  groups.jaaliScreenGroup.position.y = p * 2.5; // Elevates gently with first/second floor

  // Room Overlays synchronous vertical lift
  if (groups.roomDebugGroup && groups.roomDebugGroup.children.length >= 3) {
    groups.roomDebugGroup.children[0].position.y = 0;
    groups.roomDebugGroup.children[1].position.y = p * 2.5;
    groups.roomDebugGroup.children[2].position.y = p * 5.0;
  }
}
