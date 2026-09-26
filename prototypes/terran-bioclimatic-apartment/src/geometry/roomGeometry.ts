import * as THREE from 'three';
import {
  APARTMENT_ROOMS,
  APARTMENT_DOORS,
  ApartmentRoom,
  ArchitecturalDoor,
} from '../data/apartmentPlan';
import { ArchitecturalMaterials } from '../materials/apartmentMaterials';
import {
  BUILDING_CONFIG,
  FLOOR_ELEVATIONS,
  VENTILATION_OPENINGS,
} from '../utils/buildingCoordination';
import { createWallWithOpenings, WallOpening } from './wallOpeningGenerator';

export interface FloorInteriorGroup {
  interiorWalls: THREE.Group;
  doors: THREE.Group;
  furnitureProxies: THREE.Group;
  debugOverlays: THREE.Group;
  ventsGroup: THREE.Group;
}

/**
 * Creates an architectural interior door with timber leaf, frame, bronze hardware, or sliding double-glazing
 */
function createDoorLeaf(door: ArchitecturalDoor, materials: ArchitecturalMaterials): THREE.Group {
  const group = new THREE.Group();
  group.position.copy(door.position);
  group.rotation.y = door.rotationY;

  const frameThick = 0.06;
  const frameDepth = 0.14; // Matches 140 mm partition wall thickness

  if (door.type === 'balcony-slider') {
    // Balcony Double Sliding Glazed Door (Dark minimal bronze frame + double glazing)
    const frameH = new THREE.BoxGeometry(door.width, 0.05, 0.12);
    const topFrame = new THREE.Mesh(frameH, materials.windowFrameBronze);
    topFrame.position.set(0, door.height - 0.025, 0);
    group.add(topFrame);

    const bottomFrame = new THREE.Mesh(frameH, materials.windowFrameBronze);
    bottomFrame.position.set(0, 0.025, 0);
    group.add(bottomFrame);

    const jambGeom = new THREE.BoxGeometry(0.05, door.height, 0.12);
    const leftJamb = new THREE.Mesh(jambGeom, materials.windowFrameBronze);
    leftJamb.position.set(-door.width / 2 + 0.025, door.height / 2, 0);
    group.add(leftJamb);

    const rightJamb = new THREE.Mesh(jambGeom, materials.windowFrameBronze);
    rightJamb.position.set(door.width / 2 - 0.025, door.height / 2, 0);
    group.add(rightJamb);

    // Fixed glass panel (Left half)
    const panelW = door.width / 2 - 0.03;
    const panelH = door.height - 0.1;
    const glassFixed = new THREE.Mesh(
      new THREE.BoxGeometry(panelW, panelH, 0.018),
      materials.architecturalGlass
    );
    glassFixed.position.set(-door.width / 4, door.height / 2, -0.02);
    group.add(glassFixed);

    // Sliding glass panel (Right half, slightly offset)
    const glassSliding = new THREE.Mesh(
      new THREE.BoxGeometry(panelW, panelH, 0.018),
      materials.architecturalGlass
    );
    glassSliding.position.set(door.width / 4, door.height / 2, 0.02);
    group.add(glassSliding);

    // Minimal bronze slider handle
    const handleBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.45, 0.03),
      materials.windowFrameBronze
    );
    handleBar.position.set(0.05, 1.05, 0.04);
    group.add(handleBar);

    return group;
  }

  // Standard Hinge / Entry / Pocket Timber Door Frame
  // 1. Frame Jambs
  const jambGeom = new THREE.BoxGeometry(frameThick, door.height, frameDepth);
  const leftJamb = new THREE.Mesh(jambGeom, materials.pergolaWood);
  leftJamb.position.set(-door.width / 2 + frameThick / 2, door.height / 2, 0);
  leftJamb.castShadow = true;
  group.add(leftJamb);

  const rightJamb = new THREE.Mesh(jambGeom, materials.pergolaWood);
  rightJamb.position.set(door.width / 2 - frameThick / 2, door.height / 2, 0);
  rightJamb.castShadow = true;
  group.add(rightJamb);

  // Frame Head
  const headGeom = new THREE.BoxGeometry(door.width, frameThick, frameDepth);
  const head = new THREE.Mesh(headGeom, materials.pergolaWood);
  head.position.set(0, door.height - frameThick / 2, 0);
  head.castShadow = true;
  group.add(head);

  const leafW = door.width - frameThick * 2;
  const leafH = door.height - frameThick;
  const leafThick = 0.04;

  if (door.type === 'pocket') {
    // Sliding pocket door leaf
    const leafMesh = new THREE.Mesh(
      new THREE.BoxGeometry(leafW, leafH, leafThick),
      materials.pergolaWood
    );
    leafMesh.position.set(leafW / 2 - 0.15, door.height / 2, 0);
    leafMesh.castShadow = true;
    group.add(leafMesh);

    // Flush bronze pull
    const pull = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.12, 0.045),
      materials.windowFrameBronze
    );
    pull.position.set(0.1, 1.0, 0);
    group.add(pull);
  } else if (door.type === 'entry') {
    // Solid Secure Apartment Entry Door Leaf (Heavy timber with bronze pull and escutcheon)
    const leafPivot = new THREE.Group();
    leafPivot.position.set(-door.width / 2 + frameThick, 0, 0);

    const leafMesh = new THREE.Mesh(
      new THREE.BoxGeometry(leafW, leafH, leafThick),
      materials.pergolaWood
    );
    leafMesh.position.set(leafW / 2, door.height / 2, 0);
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = true;
    leafPivot.add(leafMesh);

    // Long vertical architectural bronze entry pull handle
    const pullBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.8, 0.035),
      materials.windowFrameBronze
    );
    pullBar.position.set(leafW - 0.1, 1.1, 0.035);
    leafPivot.add(pullBar);

    // Bronze lock cylinder escutcheon
    const escutcheon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.05),
      materials.windowFrameBronze
    );
    escutcheon.rotation.x = Math.PI / 2;
    escutcheon.position.set(leafW - 0.1, 0.95, 0);
    leafPivot.add(escutcheon);

    // Sleek architectural 12° ajar angle
    leafPivot.rotation.y = 0.21;
    group.add(leafPivot);
  } else {
    // Standard Interior Room Door (Master Bed, Bed 02, Bath)
    const leafPivot = new THREE.Group();
    leafPivot.position.set(-door.width / 2 + frameThick, 0, 0);

    const leafMesh = new THREE.Mesh(
      new THREE.BoxGeometry(leafW, leafH, leafThick),
      materials.pergolaWood
    );
    leafMesh.position.set(leafW / 2, door.height / 2, 0);
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = true;
    leafPivot.add(leafMesh);

    // Lever Handle
    const handleBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.12),
      materials.windowFrameBronze
    );
    handleBar.rotation.z = Math.PI / 2;
    handleBar.position.set(leafW - 0.08, 1.0, 0.04);
    leafPivot.add(handleBar);

    leafPivot.rotation.y = 0.32;
    group.add(leafPivot);
  }

  return group;
}

/**
 * Creates minimalist architectural proxy geometry to validate human scale and room function
 */
function createRoomProxies(room: ApartmentRoom, materials: ArchitecturalMaterials): THREE.Group {
  const group = new THREE.Group();
  const c = room.center;
  const floorY = room.bounds.min.y;

  switch (room.type) {
    case 'living': {
      // 1. Sleek architectural low-profile sofa (2.4m x 0.9m x 0.65m)
      const sofaBase = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.4, 0.9),
        materials.limePlaster
      );
      sofaBase.position.set(c.x, floorY + 0.2, c.z - 0.6);
      sofaBase.castShadow = true;
      group.add(sofaBase);

      const sofaBack = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.32, 0.22),
        materials.limePlaster
      );
      sofaBack.position.set(c.x, floorY + 0.52, c.z - 0.98);
      sofaBack.castShadow = true;
      group.add(sofaBack);

      // Low stone coffee table (1.2m x 0.6m x 0.32m)
      const coffeeTable = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.3, 0.6),
        materials.basalt
      );
      coffeeTable.position.set(c.x, floorY + 0.15, c.z + 0.3);
      coffeeTable.castShadow = true;
      group.add(coffeeTable);

      // Dining table & 4 chairs
      const diningTable = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.75, 0.9),
        materials.pergolaWood
      );
      diningTable.position.set(c.x + 1.6, floorY + 0.375, c.z - 0.2);
      diningTable.castShadow = true;
      group.add(diningTable);
      break;
    }

    case 'master-bedroom': {
      // Platform King Bed (2.0m x 1.8m x 0.45m)
      const bedBase = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.38, 2.0),
        materials.pergolaWood
      );
      bedBase.position.set(c.x, floorY + 0.19, c.z);
      bedBase.castShadow = true;
      group.add(bedBase);

      // Headboard
      const headboard = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.9, 0.12),
        materials.pergolaWood
      );
      headboard.position.set(c.x, floorY + 0.45, c.z - 1.0);
      headboard.castShadow = true;
      group.add(headboard);

      // Bedside stone pedestals
      for (const offset of [-1.15, 1.15]) {
        const stand = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.4, 0.42),
          materials.basalt
        );
        stand.position.set(c.x + offset, floorY + 0.2, c.z - 0.9);
        stand.castShadow = true;
        group.add(stand);
      }
      break;
    }

    case 'bedroom': {
      // Queen Bed (1.6m x 2.0m)
      const bed = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.35, 1.9),
        materials.pergolaWood
      );
      bed.position.set(c.x, floorY + 0.175, c.z);
      bed.castShadow = true;
      group.add(bed);

      // Wardrobe cabinet
      const wardrobe = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 2.2, 0.6),
        materials.limePlaster
      );
      wardrobe.position.set(c.x - 1.0, floorY + 1.1, c.z + 1.0);
      wardrobe.castShadow = true;
      group.add(wardrobe);
      break;
    }

    case 'kitchen': {
      // Linear Chef Counter with Sink & Cooktop cutout (2.6m x 0.65m x 0.9m)
      const counter = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.88, 0.65),
        materials.concrete
      );
      counter.position.set(c.x, floorY + 0.44, c.z);
      counter.castShadow = true;
      group.add(counter);

      // Upper wall cabinets
      const upperCab = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.7, 0.35),
        materials.pergolaWood
      );
      upperCab.position.set(c.x, floorY + 2.1, c.z - 0.15);
      upperCab.castShadow = true;
      group.add(upperCab);
      break;
    }

    case 'bathroom':
    case 'powder-room': {
      // Stone Vanity (1.0m x 0.55m x 0.85m)
      const vanity = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.85, 0.5),
        materials.basalt
      );
      vanity.position.set(c.x, floorY + 0.425, c.z);
      vanity.castShadow = true;
      group.add(vanity);
      break;
    }

    case 'studio': {
      // Creative Study Desk (1.6m x 0.75m x 0.75m)
      const desk = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.75, 0.7),
        materials.pergolaWood
      );
      desk.position.set(c.x, floorY + 0.375, c.z);
      desk.castShadow = true;
      group.add(desk);

      // Bookcase shelving
      const shelves = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 2.1, 0.35),
        materials.pergolaWood
      );
      shelves.position.set(c.x, floorY + 1.05, c.z - 1.2);
      shelves.castShadow = true;
      group.add(shelves);
      break;
    }
  }

  return group;
}

/**
 * Creates 3D billboarded room label and color-coded bounding wireframe for debug classification
 */
function createRoomDebugVisual(room: ApartmentRoom): THREE.Group {
  const group = new THREE.Group();

  // Subtle floor plate highlight colored by room type
  const colorMap: Record<string, number> = {
    living: 0xe6a15c,
    'master-bedroom': 0x5c8ce6,
    bedroom: 0x6ca3e6,
    kitchen: 0xcc6633,
    bathroom: 0x48bfe3,
    'powder-room': 0x48bfe3,
    studio: 0x9d4edd,
    entry: 0x8a929a,
    stair: 0x52b788,
    balcony: 0xf4a261,
    atrium: 0x2ec4b6,
    storage: 0x7f7f7f,
    'roof-terrace': 0x80ed99,
  };

  const col = colorMap[room.type] || 0xcccccc;

  const size = new THREE.Vector3();
  room.bounds.getSize(size);

  // Wireframe box
  const boxGeom = new THREE.BoxGeometry(size.x, size.y, size.z);
  const wireGeom = new THREE.WireframeGeometry(boxGeom);
  const wireMat = new THREE.LineBasicMaterial({
    color: col,
    transparent: true,
    opacity: 0.75,
    depthTest: false,
  });
  const wireframe = new THREE.LineSegments(wireGeom, wireMat);
  wireframe.position.copy(room.center);
  group.add(wireframe);

  // Subtle translucent spatial bounding volume
  const volumeMat = new THREE.MeshBasicMaterial({
    color: col,
    transparent: true,
    opacity: 0.10,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const volumeMesh = new THREE.Mesh(boxGeom, volumeMat);
  volumeMesh.position.copy(room.center);
  group.add(volumeMesh);

  // Billboarded Room Label Canvas Sprite
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(15, 18, 22, 0.88)';
    ctx.roundRect(6, 6, 372, 84, 8);
    ctx.fill();

    ctx.strokeStyle = '#df943f';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = '700 28px "Syne", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(room.name, 192, 42);

    ctx.font = '500 22px "JetBrains Mono", monospace';
    ctx.fillStyle = '#df943f';
    ctx.fillText(`${room.approxArea} m² · ${room.privacy.toUpperCase()}`, 192, 74);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.copy(room.center);
  sprite.position.y += 0.4;
  sprite.scale.set(2.2, 0.55, 1.0);
  sprite.userData = { room, unitId: room.unitId, roomId: room.id };
  group.add(sprite);

  volumeMesh.userData = { room, unitId: room.unitId, roomId: room.id };

  group.userData = {
    room,
    unitId: room.unitId,
    roomId: room.id,
    wireframe,
    sprite,
    volumeMesh,
    defaultColor: col,
  };

  return group;
}

/**
 * Builds the physical 3D interior architecture for a given floor level (0, 1, or 2)
 */
export function buildFloorInterior(
  floorIndex: number,
  materials: ArchitecturalMaterials
): FloorInteriorGroup {
  const interiorWalls = new THREE.Group();
  interiorWalls.name = `floorInteriorWalls_${floorIndex}`;

  const doors = new THREE.Group();
  doors.name = `floorDoors_${floorIndex}`;

  const furnitureProxies = new THREE.Group();
  furnitureProxies.name = `floorFurniture_${floorIndex}`;

  const debugOverlays = new THREE.Group();
  debugOverlays.name = `floorDebug_${floorIndex}`;

  const wallT = 0.14; // 140 mm realistic structural interior partition wall
  const floorRooms = APARTMENT_ROOMS.filter((r) => r.floor === floorIndex && r.unitId !== 'shared');

  const yBase = floorIndex === 0 ? 0.4 : floorIndex === 1 ? 3.5 : 6.7;
  const wallH = 2.75;
  const wallCenterY = yBase + wallH / 2;

  // 1. Interior Partition Walls Construction via Coordinated Wall Opening Generator
  // Every door portal and connecting aperture produces an ACTUAL VOID in the wall.

  // Demising Wall North: dividing West & East suites and framing the staircase core
  const demisingWallNorth = createWallWithOpenings({
    id: `demising_north_L${floorIndex}`,
    start: new THREE.Vector3(0, yBase, -4.65),
    end: new THREE.Vector3(0, yBase, -1.5),
    height: wallH,
    thickness: 0.18,
    material: materials.limePlaster,
    floor: floorIndex,
    openings: [
      {
        id: `door-stair-void-L${floorIndex}`,
        type: 'door',
        center: new THREE.Vector3(0, yBase + 1.075, -1.5),
        width: 1.0,
        height: 2.15,
        sillHeight: 0,
        depth: 0.18,
        isVoid: true,
      },
    ],
  });
  interiorWalls.add(demisingWallNorth);

  // Unit A01 / B01 / C01 (West) Internal Partitions with Real Door Portals
  // A. North-South Bedroom dividing wall along X = -2.8 (contains Ensuite door and Master door)
  const wBedPartition = createWallWithOpenings({
    id: `w_bed_partition_L${floorIndex}`,
    start: new THREE.Vector3(-2.8, yBase, -4.65),
    end: new THREE.Vector3(-2.8, yBase, 0.5),
    height: wallH,
    thickness: wallT,
    material: materials.limePlaster,
    floor: floorIndex,
    openings: [
      {
        id: `door-w-bath01-void-L${floorIndex}`,
        type: 'door',
        center: new THREE.Vector3(-2.8, yBase + 1.075, -3.6),
        width: 0.8,
        height: 2.15,
        sillHeight: 0,
        depth: wallT,
        isVoid: true,
      },
      {
        id: `door-w-master-void-L${floorIndex}`,
        type: 'door',
        center: new THREE.Vector3(-2.8, yBase + 1.075, -2.0),
        width: 0.9,
        height: 2.15,
        sillHeight: 0,
        depth: wallT,
        isVoid: true,
      },
    ],
  });
  interiorWalls.add(wBedPartition);

  // B. Living / Kitchen / Foyer dividing wall along Z = 0.5 (contains Living room portal)
  const wLivingPartition = createWallWithOpenings({
    id: `w_living_partition_L${floorIndex}`,
    start: new THREE.Vector3(-6.65, yBase, 0.5),
    end: new THREE.Vector3(-1.5, yBase, 0.5),
    height: wallH,
    thickness: wallT,
    material: materials.limePlaster,
    floor: floorIndex,
    openings: [
      {
        id: `door-w-living-void-L${floorIndex}`,
        type: 'door',
        center: new THREE.Vector3(-2.4, yBase + 1.075, 0.5),
        width: 1.2,
        height: 2.15,
        sillHeight: 0,
        depth: wallT,
        isVoid: true,
      },
    ],
  });
  interiorWalls.add(wLivingPartition);

  // C. Bathroom & Foyer partition along Z = -2.6
  const wBathPartition = createWallWithOpenings({
    id: `w_bath_partition_L${floorIndex}`,
    start: new THREE.Vector3(-2.8, yBase, -2.6),
    end: new THREE.Vector3(-1.5, yBase, -2.6),
    height: wallH,
    thickness: wallT,
    material: materials.limePlaster,
    floor: floorIndex,
    openings: [
      {
        id: `door-w-bath02-void-L${floorIndex}`,
        type: 'door',
        center: new THREE.Vector3(-1.9, yBase + 1.075, -2.6),
        width: 0.8,
        height: 2.15,
        sillHeight: 0,
        depth: wallT,
        isVoid: true,
      },
    ],
  });
  interiorWalls.add(wBathPartition);

  // Unit A02 / B02 / C02 (East) Internal Partitions with Real Door Portals
  // A. North-South Bedroom dividing wall along X = +2.8
  const eBedPartition = createWallWithOpenings({
    id: `e_bed_partition_L${floorIndex}`,
    start: new THREE.Vector3(2.8, yBase, -4.65),
    end: new THREE.Vector3(2.8, yBase, 0.5),
    height: wallH,
    thickness: wallT,
    material: materials.limePlaster,
    floor: floorIndex,
    openings: [
      {
        id: `door-e-bath01-void-L${floorIndex}`,
        type: 'door',
        center: new THREE.Vector3(2.8, yBase + 1.075, -3.6),
        width: 0.8,
        height: 2.15,
        sillHeight: 0,
        depth: wallT,
        isVoid: true,
      },
      {
        id: `door-e-master-void-L${floorIndex}`,
        type: 'door',
        center: new THREE.Vector3(2.8, yBase + 1.075, -2.0),
        width: 0.9,
        height: 2.15,
        sillHeight: 0,
        depth: wallT,
        isVoid: true,
      },
    ],
  });
  interiorWalls.add(eBedPartition);

  // B. Living / Kitchen / Foyer dividing wall along Z = 0.5
  const eLivingPartition = createWallWithOpenings({
    id: `e_living_partition_L${floorIndex}`,
    start: new THREE.Vector3(1.5, yBase, 0.5),
    end: new THREE.Vector3(6.65, yBase, 0.5),
    height: wallH,
    thickness: wallT,
    material: materials.limePlaster,
    floor: floorIndex,
    openings: [
      {
        id: `door-e-living-void-L${floorIndex}`,
        type: 'door',
        center: new THREE.Vector3(2.4, yBase + 1.075, 0.5),
        width: 1.2,
        height: 2.15,
        sillHeight: 0,
        depth: wallT,
        isVoid: true,
      },
    ],
  });
  interiorWalls.add(eLivingPartition);

  // C. Bathroom partition along Z = -2.6
  const eBathPartition = createWallWithOpenings({
    id: `e_bath_partition_L${floorIndex}`,
    start: new THREE.Vector3(1.5, yBase, -2.6),
    end: new THREE.Vector3(2.8, yBase, -2.6),
    height: wallH,
    thickness: wallT,
    material: materials.limePlaster,
    floor: floorIndex,
    openings: [
      {
        id: `door-e-bath02-void-L${floorIndex}`,
        type: 'door',
        center: new THREE.Vector3(1.9, yBase + 1.075, -2.6),
        width: 0.8,
        height: 2.15,
        sillHeight: 0,
        depth: wallT,
        isVoid: true,
      },
    ],
  });
  interiorWalls.add(eBathPartition);

  // Level 2 (Penthouse) Studio divider with door opening
  if (floorIndex === 2) {
    const wStudioWall = createWallWithOpenings({
      id: `w_studio_partition_L2`,
      start: new THREE.Vector3(-6.65, yBase, -0.8),
      end: new THREE.Vector3(-3.8, yBase, -0.8),
      height: wallH,
      thickness: wallT,
      material: materials.limePlaster,
      floor: floorIndex,
      openings: [
        {
          id: `door-w-studio-void-L2`,
          type: 'door',
          center: new THREE.Vector3(-4.8, yBase + 1.075, -0.8),
          width: 1.0,
          height: 2.15,
          sillHeight: 0,
          depth: wallT,
          isVoid: true,
        },
      ],
    });
    interiorWalls.add(wStudioWall);

    const eStudioWall = createWallWithOpenings({
      id: `e_studio_partition_L2`,
      start: new THREE.Vector3(3.8, yBase, -0.8),
      end: new THREE.Vector3(6.65, yBase, -0.8),
      height: wallH,
      thickness: wallT,
      material: materials.limePlaster,
      floor: floorIndex,
      openings: [
        {
          id: `door-e-studio-void-L2`,
          type: 'door',
          center: new THREE.Vector3(4.8, yBase + 1.075, -0.8),
          width: 1.0,
          height: 2.15,
          sillHeight: 0,
          depth: wallT,
          isVoid: true,
        },
      ],
    });
    interiorWalls.add(eStudioWall);
  }

  // 2. Interior Doors Placement
  const floorDoors = APARTMENT_DOORS.filter((d) => {
    const r = APARTMENT_ROOMS.find((rm) => rm.id === d.roomId);
    return r && r.floor === floorIndex;
  });

  for (const door of floorDoors) {
    doors.add(createDoorLeaf(door, materials));
  }

  // Add Stair Core Access Door for this floor level at Z = -1.5
  const stairDoor: ArchitecturalDoor = {
    id: `door-stair-L${floorIndex}`,
    roomId: `core-stair-level${floorIndex}`,
    connectsTo: `foyer-L${floorIndex}`,
    position: new THREE.Vector3(0, yBase, -1.5),
    width: 1.0,
    height: 2.15,
    rotationY: 0,
    type: 'entry',
  };
  doors.add(createDoorLeaf(stairDoor, materials));

  // 3. High-Level Bathroom Privacy Vents into Atrium Stack
  const ventsGroup = new THREE.Group();
  ventsGroup.name = `floorVents_${floorIndex}`;

  const ventGeom = new THREE.BoxGeometry(0.8, 0.45, 0.12);
  const ventW = new THREE.Mesh(ventGeom, materials.windowFrameBronze);
  ventW.position.set(-1.5, yBase + 2.3, -3.5);
  ventsGroup.add(ventW);

  // Louver glass panel
  const louverW = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.38, 0.015),
    materials.architecturalGlass
  );
  louverW.position.set(-1.5, yBase + 2.3, -3.5);
  ventsGroup.add(louverW);

  const ventE = new THREE.Mesh(ventGeom, materials.windowFrameBronze);
  ventE.position.set(1.5, yBase + 2.3, -3.5);
  ventsGroup.add(ventE);

  const louverE = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.38, 0.015),
    materials.architecturalGlass
  );
  louverE.position.set(1.5, yBase + 2.3, -3.5);
  ventsGroup.add(louverE);

  // 4. Furniture Proxies for Spatial Validation
  for (const room of floorRooms) {
    furnitureProxies.add(createRoomProxies(room, materials));
    debugOverlays.add(createRoomDebugVisual(room));
  }

  return {
    interiorWalls,
    doors,
    furnitureProxies,
    debugOverlays,
    ventsGroup,
  };
}

/**
 * Builds the Central Dedicated Stair Core flights (Ground to Roof Terrace)
 * Placed North of the atrium void so the central 3x3m air chimney remains unobstructed!
 */
export function buildCentralStairCore(materials: ArchitecturalMaterials): THREE.Group {
  const stairGroup = new THREE.Group();
  stairGroup.name = 'centralStairCore';

  const riserH = 0.178; // 178 mm ergonomic architectural riser
  const totalFloors = 3;
  const flightsPerFloor = 2;
  const stepsPerFlight = 9;

  for (let flr = 0; flr < totalFloors; flr++) {
    const yBase = flr * 3.2;

    for (let flight = 0; flight < flightsPerFloor; flight++) {
      const flightBaseY = yBase + flight * (stepsPerFlight * riserH);
      const isReturn = flight === 1;
      const xPos = isReturn ? 0.55 : -0.55;

      for (let s = 0; s < stepsPerFlight; s++) {
        const stepGeom = new THREE.BoxGeometry(1.05, riserH, 0.28);
        const stepMesh = new THREE.Mesh(stepGeom, materials.basalt);
        const zOffset = isReturn ? (-2.0 - s * 0.28) : (-4.5 + s * 0.28);
        stepMesh.position.set(xPos, flightBaseY + (s + 0.5) * riserH, zOffset);
        stepMesh.castShadow = true;
        stepMesh.receiveShadow = true;
        stairGroup.add(stepMesh);
      }

      // Intermediate flight landing
      const landingGeom = new THREE.BoxGeometry(2.3, 0.22, 1.1);
      const landingMesh = new THREE.Mesh(landingGeom, materials.concrete);
      landingMesh.position.set(0, flightBaseY + stepsPerFlight * riserH, isReturn ? -4.5 : -1.9);
      landingMesh.castShadow = true;
      landingMesh.receiveShadow = true;
      stairGroup.add(landingMesh);
    }

    // Bronze minimal handrails along stair stringers
    const railGeom = new THREE.CylinderGeometry(0.02, 0.02, 3.4);
    const rail1 = new THREE.Mesh(railGeom, materials.windowFrameBronze);
    rail1.rotation.x = -0.58;
    rail1.position.set(-1.1, yBase + 1.8, -3.2);
    stairGroup.add(rail1);

    const rail2 = new THREE.Mesh(railGeom, materials.windowFrameBronze);
    rail2.rotation.x = 0.58;
    rail2.position.set(1.1, yBase + 1.8, -3.2);
    stairGroup.add(rail2);
  }

  return stairGroup;
}
