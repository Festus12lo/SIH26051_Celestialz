import * as THREE from 'three';

export interface PBRTextureSet {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  aoMap?: THREE.CanvasTexture;
  metalnessMap?: THREE.CanvasTexture;
}

export interface TexturePalette {
  rammedEarth: PBRTextureSet;
  secondaryEarth: PBRTextureSet;
  terracotta: PBRTextureSet;
  concrete: PBRTextureSet;
  basalt: PBRTextureSet;
  limePlaster: PBRTextureSet;
  bronze: PBRTextureSet;
  glass: PBRTextureSet;
  wood: PBRTextureSet;
  groundTerrain: PBRTextureSet;
}

// Global texture cache to prevent regeneration during animations/re-renders
let cachedTextures: TexturePalette | null = null;

/**
 * Creates an offscreen 2D canvas with optimal rendering attributes
 */
function createOffscreenCanvas(width = 512, height = 512): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to obtain 2D rendering context');
  }
  return { canvas, ctx };
}

/**
 * Wraps a canvas into a high-performance THREE.CanvasTexture with anisotropic filtering
 */
function createTextureFromCanvas(
  canvas: HTMLCanvasElement,
  repeatU = 2,
  repeatV = 2,
  isColor = true
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatU, repeatV);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  texture.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return texture;
}

/**
 * Generates an accurate tangent-space normal map using a 3x3 central difference filter
 */
function generateNormalMap(heightCanvas: HTMLCanvasElement, strength = 2.2): THREE.CanvasTexture {
  const width = heightCanvas.width;
  const height = heightCanvas.height;
  const { canvas, ctx } = createOffscreenCanvas(width, height);
  const srcCtx = heightCanvas.getContext('2d');
  if (!srcCtx) return createTextureFromCanvas(canvas, 1, 1, false);

  const srcData = srcCtx.getImageData(0, 0, width, height).data;
  const outImg = ctx.createImageData(width, height);
  const dst = outImg.data;

  const getH = (x: number, y: number): number => {
    const px = (x + width) % width;
    const py = (y + height) % height;
    return srcData[(py * width + px) * 4] / 255.0;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 3x3 Sobel/Central difference gradient estimation
      const hL = getH(x - 1, y);
      const hR = getH(x + 1, y);
      const hD = getH(x, y - 1);
      const hU = getH(x, y + 1);

      const dx = (hR - hL) * strength;
      const dy = (hU - hD) * strength;
      const dz = 1.0;

      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const nx = dx / len;
      const ny = dy / len;
      const nz = dz / len;

      const idx = (y * width + x) * 4;
      dst[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }

  ctx.putImageData(outImg, 0, 0);
  return createTextureFromCanvas(canvas, 1, 1, false);
}

/**
 * Generates an ambient occlusion cavity map from a procedural height field
 */
function generateAOMap(heightCanvas: HTMLCanvasElement, intensity = 1.4): THREE.CanvasTexture {
  const width = heightCanvas.width;
  const height = heightCanvas.height;
  const { canvas, ctx } = createOffscreenCanvas(width, height);
  const srcCtx = heightCanvas.getContext('2d');
  if (!srcCtx) return createTextureFromCanvas(canvas, 1, 1, false);

  const srcData = srcCtx.getImageData(0, 0, width, height).data;
  const outImg = ctx.createImageData(width, height);
  const dst = outImg.data;

  const sampleR = 4;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerH = srcData[(y * width + x) * 4] / 255.0;
      let occluded = 0;
      let count = 0;

      for (let dy = -sampleR; dy <= sampleR; dy += 2) {
        for (let dx = -sampleR; dx <= sampleR; dx += 2) {
          if (dx === 0 && dy === 0) continue;
          const px = (x + dx + width) % width;
          const py = (y + dy + height) % height;
          const neighborH = srcData[(py * width + px) * 4] / 255.0;
          if (neighborH > centerH) {
            occluded += (neighborH - centerH);
          }
          count++;
        }
      }

      const aoFactor = Math.max(0.0, Math.min(1.0, 1.0 - (occluded / count) * intensity * 2.5));
      const val = Math.floor(aoFactor * 255);
      const idx = (y * width + x) * 4;
      dst[idx] = val;
      dst[idx + 1] = val;
      dst[idx + 2] = val;
      dst[idx + 3] = 255;
    }
  }

  ctx.putImageData(outImg, 0, 0);
  return createTextureFromCanvas(canvas, 1, 1, false);
}

/**
 * 1. RAMMED EARTH PBR SYSTEM (Multi-scale sedimentary strata, compaction lifts, mineral inclusions)
 */
function createRammedEarthPBR(isSecondary = false): PBRTextureSet {
  const width = 1024;
  const height = 1024;

  const { canvas: diffCanvas, ctx: diffCtx } = createOffscreenCanvas(width, height);
  const { canvas: heightCanvas, ctx: heightCtx } = createOffscreenCanvas(width, height);
  const { canvas: roughCanvas, ctx: roughCtx } = createOffscreenCanvas(width, height);

  // MACRO SCALE: 20-24 non-parallel undulating compacted strata layers
  const strataCount = isSecondary ? 24 : 20;
  let currentY = 0;

  for (let i = 0; i < strataCount; i++) {
    const layerH = Math.max(
      18,
      Math.floor(height / strataCount + (Math.sin(i * 1.9) * 16 + (Math.cos(i * 3.3) * 10)))
    );

    // Natural tonal shifts: warm ochre, terraced clay, silt, darker mineral compaction
    const baseTone = isSecondary ? 0.44 : 0.52;
    const toneMod = (Math.sin(i * 0.85) * 0.09 + (Math.sin(i * 2.4) * 0.05));
    const finalL = baseTone + toneMod;

    const r = Math.floor(190 * finalL);
    const g = Math.floor(128 * finalL);
    const b = Math.floor(96 * finalL);

    diffCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    diffCtx.fillRect(0, currentY, width, layerH);

    // Height & Roughness variation per stratum
    // Compacted clay is slightly denser/smoother; sandier strata have higher roughness
    const stratumRoughness = Math.floor(185 + (Math.sin(i * 1.6) * 22 + Math.random() * 12));
    roughCtx.fillStyle = `rgb(${stratumRoughness}, ${stratumRoughness}, ${stratumRoughness})`;
    roughCtx.fillRect(0, currentY, width, layerH);

    const stratumHeight = Math.floor(125 + (Math.cos(i * 2.1) * 25));
    heightCtx.fillStyle = `rgb(${stratumHeight}, ${stratumHeight}, ${stratumHeight})`;
    heightCtx.fillRect(0, currentY, width, layerH);

    // MESO SCALE: Undulating boundary lines representing manual pneumatic tamper compaction
    diffCtx.strokeStyle = 'rgba(65, 38, 25, 0.28)';
    diffCtx.lineWidth = 3 + Math.random() * 2;
    diffCtx.beginPath();
    diffCtx.moveTo(0, currentY);
    for (let x = 0; x <= width; x += 32) {
      const wave = Math.sin((x / width) * Math.PI * 6 + i * 1.4) * 5 + Math.cos((x / width) * Math.PI * 12) * 2.5;
      diffCtx.lineTo(x, currentY + wave);
    }
    diffCtx.stroke();

    // Compaction lift edge line in height map
    heightCtx.strokeStyle = 'rgba(80, 80, 80, 0.45)';
    heightCtx.lineWidth = 3;
    heightCtx.beginPath();
    heightCtx.moveTo(0, currentY);
    for (let x = 0; x <= width; x += 32) {
      const wave = Math.sin((x / width) * Math.PI * 6 + i * 1.4) * 5 + Math.cos((x / width) * Math.PI * 12) * 2.5;
      heightCtx.lineTo(x, currentY + wave);
    }
    heightCtx.stroke();

    currentY += layerH;
  }

  // MICRO SCALE: Sand grain noise, quartz flecks, fine gravel inclusions (0.68 - 0.88 roughness range)
  const dImg = diffCtx.getImageData(0, 0, width, height);
  const d = dImg.data;
  const hImg = heightCtx.getImageData(0, 0, width, height);
  const h = hImg.data;
  const rImg = roughCtx.getImageData(0, 0, width, height);
  const r = rImg.data;

  for (let p = 0; p < d.length; p += 4) {
    const microGrain = (Math.random() - 0.5) * 24;
    // Mineral gravel fleck (~1.5% occurrence)
    const isPebble = Math.random() < 0.015;
    const pebbleColor = isPebble ? (Math.random() > 0.5 ? 40 : -35) : 0;

    d[p] = Math.min(255, Math.max(0, d[p] + microGrain + pebbleColor));
    d[p + 1] = Math.min(255, Math.max(0, d[p + 1] + microGrain * 0.85 + pebbleColor * 0.85));
    d[p + 2] = Math.min(255, Math.max(0, d[p + 2] + microGrain * 0.7 + pebbleColor * 0.7));

    // Height response: pebbles protrude slightly; micro-pores indent
    const hVal = Math.min(255, Math.max(0, h[p] + microGrain * 1.4 + (isPebble ? 28 : 0)));
    h[p] = h[p + 1] = h[p + 2] = hVal;

    // Roughness: pebbles are slightly smoother; porous sand matrix is rougher (0.68 - 0.88)
    const rVal = Math.min(255, Math.max(0, r[p] + microGrain * 0.6 + (isPebble ? -30 : 10)));
    r[p] = r[p + 1] = r[p + 2] = rVal;
  }

  diffCtx.putImageData(dImg, 0, 0);
  heightCtx.putImageData(hImg, 0, 0);
  roughCtx.putImageData(rImg, 0, 0);

  const repeatU = 3;
  const repeatV = 3;
  const map = createTextureFromCanvas(diffCanvas, repeatU, repeatV, true);
  const normalMap = generateNormalMap(heightCanvas, 2.0);
  normalMap.repeat.set(repeatU, repeatV);
  const roughnessMap = createTextureFromCanvas(roughCanvas, repeatU, repeatV, false);
  const aoMap = generateAOMap(heightCanvas, 1.2);
  aoMap.repeat.set(repeatU, repeatV);

  return { map, normalMap, roughnessMap, aoMap };
}

/**
 * 2. ARTISANAL TERRACOTTA PBR SYSTEM (Firing gradation, clay micro-pores, edge darkening)
 */
function createTerracottaPBR(): PBRTextureSet {
  const width = 1024;
  const height = 1024;

  const { canvas: diffCanvas, ctx: diffCtx } = createOffscreenCanvas(width, height);
  const { canvas: heightCanvas, ctx: heightCtx } = createOffscreenCanvas(width, height);
  const { canvas: roughCanvas, ctx: roughCtx } = createOffscreenCanvas(width, height);

  // Base fired terracotta color
  diffCtx.fillStyle = '#c56133';
  diffCtx.fillRect(0, 0, width, height);

  heightCtx.fillStyle = '#808080';
  heightCtx.fillRect(0, 0, width, height);

  roughCtx.fillStyle = '#a6a6a6'; // ~0.65 base roughness
  roughCtx.fillRect(0, 0, width, height);

  // MACRO SCALE: Soft kiln thermal gradient (warmer around module boundaries)
  const grad = diffCtx.createRadialGradient(width / 2, height / 2, width * 0.1, width / 2, height / 2, width * 0.7);
  grad.addColorStop(0, 'rgba(215, 110, 55, 0.22)');
  grad.addColorStop(0.65, 'rgba(185, 85, 40, 0.1)');
  grad.addColorStop(1, 'rgba(145, 55, 25, 0.32)');
  diffCtx.fillStyle = grad;
  diffCtx.fillRect(0, 0, width, height);

  // MESO & MICRO SCALE: Clay slip brush traces and micro-pores (roughness 0.58 - 0.78)
  const dImg = diffCtx.getImageData(0, 0, width, height);
  const d = dImg.data;
  const hImg = heightCtx.getImageData(0, 0, width, height);
  const h = hImg.data;
  const rImg = roughCtx.getImageData(0, 0, width, height);
  const r = rImg.data;

  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 22;
    // Micro clay pore (~3.5% distribution)
    const isPore = Math.random() < 0.035;
    const poreDepth = isPore ? -42 : 0;

    d[i] = Math.min(255, Math.max(0, d[i] + grain + poreDepth * 0.6));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + grain * 0.75 + poreDepth * 0.5));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + grain * 0.6 + poreDepth * 0.4));

    const hVal = Math.min(255, Math.max(0, 128 + grain * 1.5 + poreDepth));
    h[i] = h[i + 1] = h[i + 2] = hVal;

    // Fired clay is vitrified/smoother in places, rougher in pores (0.58 - 0.78)
    const rVal = Math.min(255, Math.max(0, 166 + grain * 0.6 + (isPore ? 35 : -10)));
    r[i] = r[i + 1] = r[i + 2] = rVal;
  }

  diffCtx.putImageData(dImg, 0, 0);
  heightCtx.putImageData(hImg, 0, 0);
  roughCtx.putImageData(rImg, 0, 0);

  const repeat = 4;
  const map = createTextureFromCanvas(diffCanvas, repeat, repeat, true);
  const normalMap = generateNormalMap(heightCanvas, 1.8);
  normalMap.repeat.set(repeat, repeat);
  const roughnessMap = createTextureFromCanvas(roughCanvas, repeat, repeat, false);
  const aoMap = generateAOMap(heightCanvas, 1.3);
  aoMap.repeat.set(repeat, repeat);

  return { map, normalMap, roughnessMap, aoMap };
}

/**
 * 3. ARCHITECTURAL CAST-IN-PLACE CONCRETE PBR SYSTEM (Formwork seams, tie-rods, aggregate sand, pinholes)
 */
function createConcretePBR(): PBRTextureSet {
  const width = 1024;
  const height = 1024;

  const { canvas: diffCanvas, ctx: diffCtx } = createOffscreenCanvas(width, height);
  const { canvas: heightCanvas, ctx: heightCtx } = createOffscreenCanvas(width, height);
  const { canvas: roughCanvas, ctx: roughCtx } = createOffscreenCanvas(width, height);

  // Pale bone-grey architectural concrete base
  diffCtx.fillStyle = '#dedad4';
  diffCtx.fillRect(0, 0, width, height);

  heightCtx.fillStyle = '#808080';
  heightCtx.fillRect(0, 0, width, height);

  roughCtx.fillStyle = '#b0b0b0'; // ~0.69 base roughness
  roughCtx.fillRect(0, 0, width, height);

  // MACRO SCALE: Subtle formwork board division line (1.2m board pattern)
  diffCtx.strokeStyle = 'rgba(105, 100, 95, 0.22)';
  diffCtx.lineWidth = 3;
  diffCtx.beginPath();
  diffCtx.moveTo(0, height / 2);
  diffCtx.lineTo(width, height / 2);
  diffCtx.stroke();

  heightCtx.strokeStyle = 'rgba(60, 60, 60, 0.4)';
  heightCtx.lineWidth = 3;
  heightCtx.beginPath();
  heightCtx.moveTo(0, height / 2);
  heightCtx.lineTo(width, height / 2);
  heightCtx.stroke();

  // Subtle tie-rod indentations
  const tieHoles = [
    { x: 160, y: height / 2 },
    { x: width - 160, y: height / 2 },
  ];

  for (const hole of tieHoles) {
    // Outer tie cone depression
    const grad = heightCtx.createRadialGradient(hole.x, hole.y, 2, hole.x, hole.y, 16);
    grad.addColorStop(0, 'rgba(40, 40, 40, 0.6)');
    grad.addColorStop(1, 'rgba(128, 128, 128, 0)');
    heightCtx.fillStyle = grad;
    heightCtx.beginPath();
    heightCtx.arc(hole.x, hole.y, 16, 0, Math.PI * 2);
    heightCtx.fill();

    diffCtx.fillStyle = 'rgba(95, 90, 85, 0.25)';
    diffCtx.beginPath();
    diffCtx.arc(hole.x, hole.y, 12, 0, Math.PI * 2);
    diffCtx.fill();
  }

  // MESO & MICRO SCALE: Aggregate sand, fine cement hydration grain, bugholes (roughness 0.60 - 0.82)
  const dImg = diffCtx.getImageData(0, 0, width, height);
  const d = dImg.data;
  const hImg = heightCtx.getImageData(0, 0, width, height);
  const h = hImg.data;
  const rImg = roughCtx.getImageData(0, 0, width, height);
  const r = rImg.data;

  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * 16;
    // Micro bughole pinhole (~0.8% occurrence)
    const isPinhole = Math.random() < 0.008;
    const pinholeDepth = isPinhole ? -55 : 0;

    d[i] = Math.min(255, Math.max(0, d[i] + noise + pinholeDepth * 0.7));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise + pinholeDepth * 0.7));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise * 0.9 + pinholeDepth * 0.6));

    const hVal = Math.min(255, Math.max(0, 128 + noise * 1.2 + pinholeDepth));
    h[i] = h[i + 1] = h[i + 2] = hVal;

    // Smooth formwork contact vs micro-porous aggregate roughness
    const rVal = Math.min(255, Math.max(0, 175 + noise * 0.6 + (isPinhole ? 35 : -8)));
    r[i] = r[i + 1] = r[i + 2] = rVal;
  }

  diffCtx.putImageData(dImg, 0, 0);
  heightCtx.putImageData(hImg, 0, 0);
  roughCtx.putImageData(rImg, 0, 0);

  const repeat = 2;
  const map = createTextureFromCanvas(diffCanvas, repeat, repeat, true);
  const normalMap = generateNormalMap(heightCanvas, 1.8);
  normalMap.repeat.set(repeat, repeat);
  const roughnessMap = createTextureFromCanvas(roughCanvas, repeat, repeat, false);
  const aoMap = generateAOMap(heightCanvas, 1.4);
  aoMap.repeat.set(repeat, repeat);

  return { map, normalMap, roughnessMap, aoMap };
}

/**
 * 4. BASALT / NATURAL STONE PBR SYSTEM (Geological crystalline veins, semi-polished interior floor response)
 */
function createBasaltPBR(): PBRTextureSet {
  const width = 1024;
  const height = 1024;

  const { canvas: diffCanvas, ctx: diffCtx } = createOffscreenCanvas(width, height);
  const { canvas: heightCanvas, ctx: heightCtx } = createOffscreenCanvas(width, height);
  const { canvas: roughCanvas, ctx: roughCtx } = createOffscreenCanvas(width, height);

  // Dense charcoal volcanic basalt matrix
  diffCtx.fillStyle = '#323438';
  diffCtx.fillRect(0, 0, width, height);

  heightCtx.fillStyle = '#808080';
  heightCtx.fillRect(0, 0, width, height);

  roughCtx.fillStyle = '#858585'; // ~0.52 semi-polished stone response
  roughCtx.fillRect(0, 0, width, height);

  // MACRO & MESO SCALE: Geological mineral cleavage veining
  diffCtx.strokeStyle = 'rgba(75, 80, 88, 0.28)';
  diffCtx.lineWidth = 4;
  diffCtx.beginPath();
  diffCtx.moveTo(0, height * 0.35);
  for (let x = 0; x <= width; x += 64) {
    diffCtx.lineTo(x, height * 0.35 + Math.sin(x * 0.02) * 25 + (Math.random() - 0.5) * 15);
  }
  diffCtx.stroke();

  // MICRO SCALE: Crystalline flecks & subtle honing roughness variation (0.35 - 0.65)
  const dImg = diffCtx.getImageData(0, 0, width, height);
  const d = dImg.data;
  const hImg = heightCtx.getImageData(0, 0, width, height);
  const h = hImg.data;
  const rImg = roughCtx.getImageData(0, 0, width, height);
  const r = rImg.data;

  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * 14;
    // Reflective mica inclusion (~1.2% occurrence)
    const isMica = Math.random() < 0.012;
    const micaVal = isMica ? 45 : 0;

    d[i] = Math.min(255, Math.max(0, d[i] + noise + micaVal));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise + micaVal));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise * 1.1 + micaVal * 1.1));

    const hVal = Math.min(255, Math.max(0, 128 + noise * 1.2 + (isMica ? 15 : 0)));
    h[i] = h[i + 1] = h[i + 2] = hVal;

    // Polished stone finish: mica is smooth (0.35), volcanic matrix is satin (0.55)
    const rVal = Math.min(255, Math.max(0, 132 + noise * 0.5 + (isMica ? -45 : 5)));
    r[i] = r[i + 1] = r[i + 2] = rVal;
  }

  diffCtx.putImageData(dImg, 0, 0);
  heightCtx.putImageData(hImg, 0, 0);
  roughCtx.putImageData(rImg, 0, 0);

  const repeat = 3;
  const map = createTextureFromCanvas(diffCanvas, repeat, repeat, true);
  const normalMap = generateNormalMap(heightCanvas, 1.5);
  normalMap.repeat.set(repeat, repeat);
  const roughnessMap = createTextureFromCanvas(roughCanvas, repeat, repeat, false);
  const aoMap = generateAOMap(heightCanvas, 1.2);
  aoMap.repeat.set(repeat, repeat);

  return { map, normalMap, roughnessMap, aoMap };
}

/**
 * 5. HYDRAULIC LIME PLASTER PBR SYSTEM (High-albedo calcite grain, float trowel relief, matte)
 */
function createLimePlasterPBR(): PBRTextureSet {
  const width = 512;
  const height = 512;

  const { canvas: diffCanvas, ctx: diffCtx } = createOffscreenCanvas(width, height);
  const { canvas: heightCanvas, ctx: heightCtx } = createOffscreenCanvas(width, height);
  const { canvas: roughCanvas, ctx: roughCtx } = createOffscreenCanvas(width, height);

  // High albedo warm off-white (SRI >= 82%)
  diffCtx.fillStyle = '#f6f5ef';
  diffCtx.fillRect(0, 0, width, height);

  heightCtx.fillStyle = '#808080';
  heightCtx.fillRect(0, 0, width, height);

  roughCtx.fillStyle = '#d6d6d6'; // ~0.84 matte chalky response
  roughCtx.fillRect(0, 0, width, height);

  // Delicate trowel stipple texture
  const dImg = diffCtx.getImageData(0, 0, width, height);
  const d = dImg.data;
  const hImg = heightCtx.getImageData(0, 0, width, height);
  const h = hImg.data;
  const rImg = roughCtx.getImageData(0, 0, width, height);
  const r = rImg.data;

  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 12;

    d[i] = Math.min(255, Math.max(0, d[i] + grain));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + grain));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + grain * 0.9));

    const hVal = Math.min(255, Math.max(0, 128 + grain * 1.5));
    h[i] = h[i + 1] = h[i + 2] = hVal;

    // High mineral diffuse roughness (0.74 - 0.92)
    const rVal = Math.min(255, Math.max(0, 214 + grain * 0.5));
    r[i] = r[i + 1] = r[i + 2] = rVal;
  }

  diffCtx.putImageData(dImg, 0, 0);
  heightCtx.putImageData(hImg, 0, 0);
  roughCtx.putImageData(rImg, 0, 0);

  const repeat = 3;
  const map = createTextureFromCanvas(diffCanvas, repeat, repeat, true);
  const normalMap = generateNormalMap(heightCanvas, 1.4);
  normalMap.repeat.set(repeat, repeat);
  const roughnessMap = createTextureFromCanvas(roughCanvas, repeat, repeat, false);

  return { map, normalMap, roughnessMap };
}

/**
 * 6. ARCHITECTURAL DARK BRONZE PBR SYSTEM (Brushed directional micro-streaks, anodized specular)
 */
function createBronzePBR(): PBRTextureSet {
  const width = 512;
  const height = 512;

  const { canvas: diffCanvas, ctx: diffCtx } = createOffscreenCanvas(width, height);
  const { canvas: heightCanvas, ctx: heightCtx } = createOffscreenCanvas(width, height);
  const { canvas: roughCanvas, ctx: roughCtx } = createOffscreenCanvas(width, height);

  diffCtx.fillStyle = '#2c221e';
  diffCtx.fillRect(0, 0, width, height);

  heightCtx.fillStyle = '#808080';
  heightCtx.fillRect(0, 0, width, height);

  roughCtx.fillStyle = '#626262'; // ~0.38 roughness
  roughCtx.fillRect(0, 0, width, height);

  // Brushed directional streaks along vertical axis
  for (let y = 0; y < height; y += 2) {
    const streak = (Math.random() - 0.5) * 16;
    diffCtx.strokeStyle = `rgba(${Math.floor(65 + streak)}, ${Math.floor(48 + streak)}, ${Math.floor(38 + streak)}, 0.45)`;
    diffCtx.beginPath();
    diffCtx.moveTo(0, y);
    diffCtx.lineTo(width, y);
    diffCtx.stroke();

    heightCtx.strokeStyle = `rgba(${Math.floor(128 + streak * 1.5)}, ${Math.floor(128 + streak * 1.5)}, ${Math.floor(128 + streak * 1.5)}, 0.3)`;
    heightCtx.beginPath();
    heightCtx.moveTo(0, y);
    heightCtx.lineTo(width, y);
    heightCtx.stroke();
  }

  const map = createTextureFromCanvas(diffCanvas, 1, 4, true);
  const normalMap = generateNormalMap(heightCanvas, 1.2);
  normalMap.repeat.set(1, 4);
  const roughnessMap = createTextureFromCanvas(roughCanvas, 1, 4, false);

  return { map, normalMap, roughnessMap };
}

/**
 * 7. ARCHITECTURAL FLOAT GLASS MICRO-WAVINESS PBR SYSTEM
 */
function createGlassPBR(): PBRTextureSet {
  const width = 512;
  const height = 512;

  const { canvas: heightCanvas, ctx: heightCtx } = createOffscreenCanvas(width, height);
  const { canvas: roughCanvas, ctx: roughCtx } = createOffscreenCanvas(width, height);
  const { canvas: diffCanvas, ctx: diffCtx } = createOffscreenCanvas(width, height);

  diffCtx.fillStyle = '#f0f7f9';
  diffCtx.fillRect(0, 0, width, height);

  // Very gentle float-glass thermal rolling waves (amplitude 0.05)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wave = Math.sin((x / width) * Math.PI * 4) * Math.cos((y / height) * Math.PI * 4) * 8;
      const val = Math.floor(128 + wave);
      heightCtx.fillStyle = `rgb(${val}, ${val}, ${val})`;
      heightCtx.fillRect(x, y, 1, 1);
    }
  }

  roughCtx.fillStyle = '#181818'; // ~0.08 specular glass roughness
  roughCtx.fillRect(0, 0, width, height);

  const map = createTextureFromCanvas(diffCanvas, 1, 1, true);
  const normalMap = generateNormalMap(heightCanvas, 0.4); // Very soft micro-wave
  const roughnessMap = createTextureFromCanvas(roughCanvas, 1, 1, false);

  return { map, normalMap, roughnessMap };
}

/**
 * 8. ARCHITECTURAL TIMBER PERGOLA PBR SYSTEM (Cedar grain, growth rings, organic fiber pores)
 */
function createWoodPBR(): PBRTextureSet {
  const width = 512;
  const height = 512;

  const { canvas: diffCanvas, ctx: diffCtx } = createOffscreenCanvas(width, height);
  const { canvas: heightCanvas, ctx: heightCtx } = createOffscreenCanvas(width, height);
  const { canvas: roughCanvas, ctx: roughCtx } = createOffscreenCanvas(width, height);

  diffCtx.fillStyle = '#5a3d28';
  diffCtx.fillRect(0, 0, width, height);

  heightCtx.fillStyle = '#808080';
  heightCtx.fillRect(0, 0, width, height);

  roughCtx.fillStyle = '#b8b8b8'; // ~0.72 wood roughness
  roughCtx.fillRect(0, 0, width, height);

  // Linear wood grain vessels
  for (let x = 0; x < width; x += 3) {
    const ringTone = Math.sin((x / width) * Math.PI * 18) * 22;
    diffCtx.strokeStyle = `rgba(${Math.floor(110 + ringTone)}, ${Math.floor(75 + ringTone * 0.8)}, ${Math.floor(50 + ringTone * 0.6)}, 0.4)`;
    diffCtx.beginPath();
    diffCtx.moveTo(x, 0);
    diffCtx.lineTo(x + (Math.random() - 0.5) * 8, height);
    diffCtx.stroke();

    heightCtx.strokeStyle = `rgba(${Math.floor(128 + ringTone * 0.9)}, ${Math.floor(128 + ringTone * 0.9)}, ${Math.floor(128 + ringTone * 0.9)}, 0.35)`;
    heightCtx.beginPath();
    heightCtx.moveTo(x, 0);
    heightCtx.lineTo(x + (Math.random() - 0.5) * 8, height);
    heightCtx.stroke();
  }

  const map = createTextureFromCanvas(diffCanvas, 1, 3, true);
  const normalMap = generateNormalMap(heightCanvas, 1.4);
  normalMap.repeat.set(1, 3);
  const roughnessMap = createTextureFromCanvas(roughCanvas, 1, 3, false);

  return { map, normalMap, roughnessMap };
}

/**
 * 9. GROUND TERRAIN PBR SYSTEM (Natural compacted earth and mineral sand)
 */
function createGroundTerrainPBR(): PBRTextureSet {
  const width = 512;
  const height = 512;

  const { canvas: diffCanvas, ctx: diffCtx } = createOffscreenCanvas(width, height);
  const { canvas: heightCanvas, ctx: heightCtx } = createOffscreenCanvas(width, height);
  const { canvas: roughCanvas, ctx: roughCtx } = createOffscreenCanvas(width, height);

  diffCtx.fillStyle = '#bfa588';
  diffCtx.fillRect(0, 0, width, height);

  heightCtx.fillStyle = '#808080';
  heightCtx.fillRect(0, 0, width, height);

  roughCtx.fillStyle = '#e6e6e6'; // ~0.90 dry earth roughness
  roughCtx.fillRect(0, 0, width, height);

  const dImg = diffCtx.getImageData(0, 0, width, height);
  const d = dImg.data;
  const hImg = heightCtx.getImageData(0, 0, width, height);
  const h = hImg.data;

  for (let i = 0; i < d.length; i += 4) {
    const grain = (Math.random() - 0.5) * 22;
    d[i] = Math.min(255, Math.max(0, d[i] + grain));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + grain * 0.85));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + grain * 0.7));

    const hVal = Math.min(255, Math.max(0, 128 + grain * 1.6));
    h[i] = h[i + 1] = h[i + 2] = hVal;
  }

  diffCtx.putImageData(dImg, 0, 0);
  heightCtx.putImageData(hImg, 0, 0);

  const repeat = 8;
  const map = createTextureFromCanvas(diffCanvas, repeat, repeat, true);
  const normalMap = generateNormalMap(heightCanvas, 1.8);
  normalMap.repeat.set(repeat, repeat);
  const roughnessMap = createTextureFromCanvas(roughCanvas, repeat, repeat, false);

  return { map, normalMap, roughnessMap };
}

/**
 * Main procedural PBR texture factory: Builds and caches the complete texture palette
 */
export function getApartmentPBRTextures(): TexturePalette {
  if (cachedTextures) {
    return cachedTextures;
  }

  cachedTextures = {
    rammedEarth: createRammedEarthPBR(false),
    secondaryEarth: createRammedEarthPBR(true),
    terracotta: createTerracottaPBR(),
    concrete: createConcretePBR(),
    basalt: createBasaltPBR(),
    limePlaster: createLimePlasterPBR(),
    bronze: createBronzePBR(),
    glass: createGlassPBR(),
    wood: createWoodPBR(),
    groundTerrain: createGroundTerrainPBR(),
  };

  return cachedTextures;
}

/**
 * Clean GPU disposal of all procedural canvas textures
 */
export function disposePBRTextures(): void {
  if (!cachedTextures) return;

  const disposeSet = (set: PBRTextureSet) => {
    set.map.dispose();
    set.normalMap.dispose();
    set.roughnessMap.dispose();
    if (set.aoMap) set.aoMap.dispose();
    if (set.metalnessMap) set.metalnessMap.dispose();
  };

  disposeSet(cachedTextures.rammedEarth);
  disposeSet(cachedTextures.secondaryEarth);
  disposeSet(cachedTextures.terracotta);
  disposeSet(cachedTextures.concrete);
  disposeSet(cachedTextures.basalt);
  disposeSet(cachedTextures.limePlaster);
  disposeSet(cachedTextures.bronze);
  disposeSet(cachedTextures.glass);
  disposeSet(cachedTextures.wood);
  disposeSet(cachedTextures.groundTerrain);

  cachedTextures = null;
}
