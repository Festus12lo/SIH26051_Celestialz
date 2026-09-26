import * as THREE from 'three';

export interface WallPBRMaps {
  diffuseMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
}

// Cache textures by color key so we don't regenerate on every re-render
const textureCache = new Map<string, WallPBRMaps>();

/**
 * Generates high-definition procedural PBR textures for architectural composite sandwich panels.
 * Produces crisp horizontal micro-ribbing (flutes), modular vertical joint reveals with EPDM seals,
 * powder-coated micro-stipple grain, and structural fastener rivets.
 */
export function getWallPBRTextures(
  primaryHex: string,
  secondaryHex: string,
  isBamboo: boolean = false
): WallPBRMaps {
  const cacheKey = `${primaryHex}_${secondaryHex}_${isBamboo ? 'bamboo' : 'imp'}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const size = 1024; // 1024x1024 texture tile representing 1.0m x 1.0m of architectural panel

  // 1. Parse base color RGB
  const baseColor = new THREE.Color(primaryHex);
  const baseR = Math.round(baseColor.r * 255);
  const baseG = Math.round(baseColor.g * 255);
  const baseB = Math.round(baseColor.b * 255);

  const secColor = new THREE.Color(secondaryHex);
  const secR = Math.round(secColor.r * 255);
  const secG = Math.round(secColor.g * 255);
  const secB = Math.round(secColor.b * 255);

  // Heightfield for normal and AO calculation
  const heightField = new Float32Array(size * size);

  // -------------------------------------------------------------
  // A. Generate Diffuse / Albedo Map Canvas
  // -------------------------------------------------------------
  const diffuseCanvas = document.createElement('canvas');
  diffuseCanvas.width = size;
  diffuseCanvas.height = size;
  const diffCtx = diffuseCanvas.getContext('2d')!;

  const diffImgData = diffCtx.createImageData(size, size);
  const diffData = diffImgData.data;

  // -------------------------------------------------------------
  // B. Generate Normal Map Canvas
  // -------------------------------------------------------------
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const normCtx = normalCanvas.getContext('2d')!;
  const normImgData = normCtx.createImageData(size, size);
  const normData = normImgData.data;

  // -------------------------------------------------------------
  // C. Generate Roughness Map Canvas
  // -------------------------------------------------------------
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext('2d')!;
  const roughImgData = roughCtx.createImageData(size, size);
  const roughData = roughImgData.data;

  // -------------------------------------------------------------
  // D. Generate Ambient Occlusion Canvas
  // -------------------------------------------------------------
  const aoCanvas = document.createElement('canvas');
  aoCanvas.width = size;
  aoCanvas.height = size;
  const aoCtx = aoCanvas.getContext('2d')!;
  const aoImgData = aoCtx.createImageData(size, size);
  const aoData = aoImgData.data;

  // 1. Build mathematical height field & fill diffuse/roughness maps
  const ribCount = 10; // 10 horizontal micro-rib flutes per 1.0m height (~100mm spacing)
  const ribPeriod = size / ribCount; // 102.4px per rib
  const jointWidthPx = 16; // 16px wide modular joint reveal (~15.6mm)

  for (let y = 0; y < size; y++) {
    const yNorm = y / size;

    // Horizontal flute height profile
    const ribPos = (y % ribPeriod) / ribPeriod; // 0.0 to 1.0
    let ribHeight = 0;
    let ribFactor = 0; // -1 for shadow trough, 0 for crest, +1 for highlight crest

    if (ribPos < 0.15) {
      // Top bevel transition
      ribHeight = Math.sin((ribPos / 0.15) * (Math.PI / 2)) * 0.4;
      ribFactor = 0.5 * (1 - ribPos / 0.15);
    } else if (ribPos < 0.7) {
      // Flat rib crest with fine micro-camber
      ribHeight = 0.4 + Math.sin(((ribPos - 0.15) / 0.55) * Math.PI) * 0.1;
      ribFactor = 0.05;
    } else {
      // Bottom bevel shadow trough
      const t = (ribPos - 0.7) / 0.3;
      ribHeight = (1 - t) * 0.4;
      ribFactor = -0.5 * t;
    }

    for (let x = 0; x < size; x++) {
      const idx = (y * size + x);
      const pixelIdx = idx * 4;

      // Distance from modular vertical panel edge (x = 0 or x = size)
      const distToEdge = Math.min(x, size - x);
      let jointDepth = 0;
      let isJoint = false;

      if (distToEdge < jointWidthPx) {
        isJoint = true;
        const jt = distToEdge / jointWidthPx;
        jointDepth = -0.7 * (1 - jt);
      }

      // Fastener rivets (near y = 40 and y = 984, at x = 32 and x = size - 32)
      let rivetHeight = 0;
      let isRivet = false;
      const isRivetRow = Math.abs(y - 40) < 10 || Math.abs(y - 984) < 10;
      if (isRivetRow) {
        const rivetDistX1 = Math.abs(x - 32);
        const rivetDistX2 = Math.abs(x - (size - 32));
        const rivetDistX3 = Math.abs(x - 512);
        const minDistX = Math.min(rivetDistX1, rivetDistX2, rivetDistX3);
        const rDist = Math.sqrt(minDistX * minDistX + Math.pow((y < 500 ? y - 40 : y - 984), 2));
        if (rDist < 7) {
          isRivet = true;
          rivetHeight = 0.6 * Math.cos((rDist / 7) * (Math.PI / 2));
        }
      }

      // Micro-stipple noise for powder-coated matte metal surface
      const noise = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) - 0.5;
      const stipple = noise * 0.035;

      const totalH = (isJoint ? jointDepth : ribHeight) + rivetHeight + stipple;
      heightField[idx] = totalH;

      // Calculate Diffuse RGB
      let r = baseR;
      let g = baseG;
      let b = baseB;
      let roughnessVal = 135; // base architectural powder-coat ~0.53
      let aoVal = 255;

      if (isBamboo) {
        // Organic longitudinal bamboo fibrous grain
        const grain = Math.sin(x * 0.8 + noise * 4.0) * 12 + Math.cos(x * 0.15) * 8;
        r = Math.max(0, Math.min(255, r + grain));
        g = Math.max(0, Math.min(255, g + grain * 0.9));
        b = Math.max(0, Math.min(255, b + grain * 0.7));
      } else {
        // Architectural Composite IMP Finish
        if (isJoint) {
          // Weatherproof dark EPDM joint channel
          r = Math.round(r * 0.28 + 25);
          g = Math.round(g * 0.28 + 30);
          b = Math.round(b * 0.28 + 38);
          roughnessVal = 245; // High matte rubber seal
          aoVal = Math.round(80 + (distToEdge / jointWidthPx) * 120);
        } else if (isRivet) {
          // Stainless steel structural rivet head
          r = Math.round(secR * 0.75 + 60);
          g = Math.round(secG * 0.75 + 65);
          b = Math.round(secB * 0.75 + 75);
          roughnessVal = 55; // Semi-reflective metal
        } else {
          // Micro-rib highlight/shadow modulation & powder coat noise
          const lightMod = ribFactor * 32 + noise * 16;
          r = Math.max(0, Math.min(255, Math.round(r + lightMod)));
          g = Math.max(0, Math.min(255, Math.round(g + lightMod)));
          b = Math.max(0, Math.min(255, Math.round(b + lightMod)));
          roughnessVal = Math.round(135 - ribFactor * 25 + noise * 10);
          if (ribFactor < -0.2) aoVal = 220;
        }
      }

      // Write Diffuse
      diffData[pixelIdx] = r;
      diffData[pixelIdx + 1] = g;
      diffData[pixelIdx + 2] = b;
      diffData[pixelIdx + 3] = 255;

      // Write Roughness
      roughData[pixelIdx] = roughnessVal;
      roughData[pixelIdx + 1] = roughnessVal;
      roughData[pixelIdx + 2] = roughnessVal;
      roughData[pixelIdx + 3] = 255;

      // Write AO
      aoData[pixelIdx] = aoVal;
      aoData[pixelIdx + 1] = aoVal;
      aoData[pixelIdx + 2] = aoVal;
      aoData[pixelIdx + 3] = 255;
    }
  }

  // 2. Compute Normal Map from Height Field (Sobel / Central Difference)
  const bumpStrength = isBamboo ? 1.8 : 2.6;

  for (let y = 0; y < size; y++) {
    const ym1 = (y - 1 + size) % size;
    const yp1 = (y + 1) % size;

    for (let x = 0; x < size; x++) {
      const xm1 = (x - 1 + size) % size;
      const xp1 = (x + 1) % size;

      const idxL = y * size + xm1;
      const idxR = y * size + xp1;
      const idxT = ym1 * size + x;
      const idxB = yp1 * size + x;

      // Central difference gradients
      const dx = (heightField[idxR] - heightField[idxL]) * bumpStrength;
      const dy = (heightField[idxB] - heightField[idxT]) * bumpStrength;

      // Normal vector in tangent space (-dx, -dy, 1)
      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      const normX = nx / len;
      const normY = ny / len;
      const normZ = nz / len;

      const pIdx = (y * size + x) * 4;
      normData[pIdx] = Math.round((normX * 0.5 + 0.5) * 255);
      normData[pIdx + 1] = Math.round((normY * 0.5 + 0.5) * 255);
      normData[pIdx + 2] = Math.round((normZ * 0.5 + 0.5) * 255);
      normData[pIdx + 3] = 255;
    }
  }

  // Commit image buffers to canvases
  diffCtx.putImageData(diffImgData, 0, 0);
  normCtx.putImageData(normImgData, 0, 0);
  roughCtx.putImageData(roughImgData, 0, 0);
  aoCtx.putImageData(aoImgData, 0, 0);

  // Subtle clean engineering technical stencil stamp on diffuse canvas
  diffCtx.save();
  diffCtx.font = '600 13px "Courier New", monospace';
  diffCtx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  diffCtx.fillText('PIR-R28 // FM-APPROVED 75MM COMPOSITE ENVELOPE', 48, 68);
  diffCtx.font = '500 11px "Courier New", monospace';
  diffCtx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  diffCtx.fillText('ZERO-CURING RAPID-DEPLOYMENT SPEC 24M²', 48, 86);
  diffCtx.restore();

  // Create Three.js Canvas Textures
  const diffuseMap = new THREE.CanvasTexture(diffuseCanvas);
  diffuseMap.wrapS = THREE.RepeatWrapping;
  diffuseMap.wrapT = THREE.RepeatWrapping;
  diffuseMap.generateMipmaps = true;
  diffuseMap.anisotropy = 8;

  const normalMap = new THREE.CanvasTexture(normalCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.generateMipmaps = true;
  normalMap.anisotropy = 8;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.generateMipmaps = true;
  roughnessMap.anisotropy = 8;

  const aoMap = new THREE.CanvasTexture(aoCanvas);
  aoMap.wrapS = THREE.RepeatWrapping;
  aoMap.wrapT = THREE.RepeatWrapping;
  aoMap.generateMipmaps = true;
  aoMap.anisotropy = 8;

  const maps: WallPBRMaps = {
    diffuseMap,
    normalMap,
    roughnessMap,
    aoMap,
  };

  textureCache.set(cacheKey, maps);
  return maps;
}

/**
 * Universal Metric World-Space UV Mapping helper for architectural building envelope geometries.
 * Calibrates UV coordinates so that 1.0 UV unit corresponds to exactly 1.0 real-world meter,
 * guaranteeing seamless panel alignment, consistent rib spacing, and zero texture distortion.
 */
export function applyMetricUVMapping(
  geometry: THREE.BufferGeometry,
  subfloorTop: number = 0.23,
  buildingLength: number = 6.0,
  buildingWidth: number = 4.0,
  worldOffsetX: number = 0,
  worldOffsetY: number = 0,
  worldOffsetZ: number = 0
): THREE.BufferGeometry {
  const posAttr = geometry.getAttribute('position');
  if (!posAttr) return geometry;

  geometry.computeVertexNormals();
  const normAttr = geometry.getAttribute('normal');

  const count = posAttr.count;
  const uvs = new Float32Array(count * 2);

  const halfL = buildingLength / 2;
  const halfW = buildingWidth / 2;

  for (let i = 0; i < count; i++) {
    const px = posAttr.getX(i) + worldOffsetX;
    const py = posAttr.getY(i) + worldOffsetY;
    const pz = posAttr.getZ(i) + worldOffsetZ;

    let nx = 0;
    let ny = 0;
    let nz = 1;
    if (normAttr) {
      nx = Math.abs(normAttr.getX(i));
      ny = Math.abs(normAttr.getY(i));
      nz = Math.abs(normAttr.getZ(i));
    }

    let u = 0;
    let v = 0;

    // Determine dominant projection plane based on vertex normal
    if (nz >= nx && nz >= ny) {
      // Facing South (+Z) or North (-Z)
      u = px + halfL;
      v = py - subfloorTop;
    } else if (nx >= nz && nx >= ny) {
      // Facing East (+X) or West (-X) (Gable walls)
      u = pz + halfW;
      v = py - subfloorTop;
    } else {
      // Facing Top (+Y) or Bottom (-Y)
      u = px + halfL;
      v = pz + halfW;
    }

    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }

  const uvAttr = new THREE.BufferAttribute(uvs, 2);
  uvAttr.needsUpdate = true;
  geometry.setAttribute('uv', uvAttr);
  return geometry;
}
