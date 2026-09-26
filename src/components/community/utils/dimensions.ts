import * as THREE from 'three';
import type { ApartmentDimensions } from '../data/apartmentData';

/**
 * Creates an architectural dimension text label as a billboarded sprite
 */
export function createDimensionLabel(text: string, scale = 1.0): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(18, 20, 24, 0.88)';
    ctx.roundRect(8, 8, 368, 80, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(215, 180, 140, 0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = '600 36px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 192, 48);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(2.4 * scale, 0.6 * scale, 1.0);
  return sprite;
}

/**
 * Creates an architectural dimension tick mark / arrow line
 */
export function createDimensionArrow(
  point: THREE.Vector3,
  direction: THREE.Vector3,
  length = 0.35,
  color = 0xd7b48c
): THREE.LineSegments {
  const normal = new THREE.Vector3(0, 1, 0).cross(direction).normalize().multiplyScalar(length * 0.5);
  if (normal.lengthSq() < 0.001) {
    normal.set(1, 0, 0).multiplyScalar(length * 0.5);
  }

  const p1 = point.clone().add(normal);
  const p2 = point.clone().sub(normal);

  const geom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  const mat = new THREE.LineBasicMaterial({ color, depthTest: false });
  return new THREE.LineSegments(geom, mat);
}

/**
 * Creates a complete architectural dimension line with witness lines, ticks, and centered label
 */
export function createDimensionLine(
  start: THREE.Vector3,
  end: THREE.Vector3,
  label: string,
  offsetDir: THREE.Vector3,
  offsetDist = 1.0,
  scale = 1.0
): THREE.Group {
  const group = new THREE.Group();
  const color = 0xd7b48c;

  const actualStart = start.clone().add(offsetDir.clone().normalize().multiplyScalar(offsetDist));
  const actualEnd = end.clone().add(offsetDir.clone().normalize().multiplyScalar(offsetDist));

  // Witness line 1 (extension from start to dimension line)
  const w1Geom = new THREE.BufferGeometry().setFromPoints([start, actualStart]);
  const w1Mat = new THREE.LineBasicMaterial({ color: 0x8a7a68, transparent: true, opacity: 0.6, depthTest: false });
  group.add(new THREE.Line(w1Geom, w1Mat));

  // Witness line 2 (extension from end to dimension line)
  const w2Geom = new THREE.BufferGeometry().setFromPoints([end, actualEnd]);
  group.add(new THREE.Line(w2Geom, w1Mat));

  // Main dimension line
  const mainGeom = new THREE.BufferGeometry().setFromPoints([actualStart, actualEnd]);
  const mainMat = new THREE.LineBasicMaterial({ color, depthTest: false });
  group.add(new THREE.Line(mainGeom, mainMat));

  // Ticks
  const dir = actualEnd.clone().sub(actualStart).normalize();
  group.add(createDimensionArrow(actualStart, dir, 0.4 * scale, color));
  group.add(createDimensionArrow(actualEnd, dir, 0.4 * scale, color));

  // Centered Label
  const midPoint = actualStart.clone().add(actualEnd).multiplyScalar(0.5);
  const sprite = createDimensionLabel(label, scale);
  sprite.position.copy(midPoint).add(offsetDir.clone().normalize().multiplyScalar(0.35));
  group.add(sprite);

  return group;
}

/**
 * Builds the complete architectural dimensions system for the Terran Bioclimatic Apartment
 */
export function buildDimensionsGroup(dims: ApartmentDimensions): THREE.Group {
  const dimsGroup = new THREE.Group();
  dimsGroup.name = 'dimensionsGroup';

  // 1. Building Length: 14.00 m (Along X-axis, South elevation)
  const lenStart = new THREE.Vector3(-dims.length / 2, 0.05, dims.width / 2 + dims.balconyDepth);
  const lenEnd = new THREE.Vector3(dims.length / 2, 0.05, dims.width / 2 + dims.balconyDepth);
  dimsGroup.add(
    createDimensionLine(
      lenStart,
      lenEnd,
      '14.00 m Building Length',
      new THREE.Vector3(0, 0, 1),
      2.0,
      1.1
    )
  );

  // 2. Building Width: 10.00 m (Along Z-axis, East elevation)
  const widStart = new THREE.Vector3(dims.length / 2, 0.05, dims.width / 2);
  const widEnd = new THREE.Vector3(dims.length / 2, 0.05, -dims.width / 2);
  dimsGroup.add(
    createDimensionLine(
      widStart,
      widEnd,
      '10.00 m Building Width',
      new THREE.Vector3(1, 0, 0),
      2.0,
      1.0
    )
  );

  // 3. Overall Height: 10.50 m (Along Y-axis, East elevation)
  const hStart = new THREE.Vector3(dims.length / 2, 0, -dims.width / 2);
  const hEnd = new THREE.Vector3(dims.length / 2, dims.buildingHeight, -dims.width / 2);
  dimsGroup.add(
    createDimensionLine(
      hStart,
      hEnd,
      '10.50 m Total Height',
      new THREE.Vector3(1, 0, -0.6).normalize(),
      2.2,
      1.0
    )
  );

  // 4. Balcony Cantilever Depth: 1.50 m
  const bStart = new THREE.Vector3(4.0, 3.2, dims.width / 2);
  const bEnd = new THREE.Vector3(4.0, 3.2, dims.width / 2 + dims.balconyDepth);
  dimsGroup.add(
    createDimensionLine(
      bStart,
      bEnd,
      '1.50 m Solar Cantilever',
      new THREE.Vector3(1, 0, 0),
      0.8,
      0.75
    )
  );

  // 5. Central Atrium Void: 3.00 m x 3.00 m (Roof level)
  const aStart = new THREE.Vector3(-dims.atriumSize / 2, dims.buildingHeight + 0.1, -dims.atriumSize / 2);
  const aEnd = new THREE.Vector3(dims.atriumSize / 2, dims.buildingHeight + 0.1, -dims.atriumSize / 2);
  dimsGroup.add(
    createDimensionLine(
      aStart,
      aEnd,
      '3.00 m Atrium Core',
      new THREE.Vector3(0, 1, -0.5).normalize(),
      1.2,
      0.8
    )
  );

  // 6. Wall & Reveal Depth: 0.35 m
  const rStart = new THREE.Vector3(3.2, 4.2, dims.width / 2);
  const rEnd = new THREE.Vector3(3.2, 4.2, dims.width / 2 - dims.windowRevealDepth);
  dimsGroup.add(
    createDimensionLine(
      rStart,
      rEnd,
      '0.35 m Deep Reveal',
      new THREE.Vector3(-1, 0, 0),
      0.6,
      0.65
    )
  );

  return dimsGroup;
}
