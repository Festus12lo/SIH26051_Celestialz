import * as THREE from 'three';

// Cache generated textures so we don't recreate them needlessly
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates an authentic, ultra-fast Rammed Earth PBR texture set:
 * Broad 150-250mm formwork compaction lifts with rich mineral earth pigments
 * (raw sienna, ochre, umber, terracotta clay) and natural compaction seams.
 */
export function createRammedEarthPBR(): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  if (
    textureCache.has('rammed_earth_map') &&
    textureCache.has('rammed_earth_rough') &&
    textureCache.has('rammed_earth_bump')
  ) {
    return {
      map: textureCache.get('rammed_earth_map')!,
      roughnessMap: textureCache.get('rammed_earth_rough')!,
      bumpMap: textureCache.get('rammed_earth_bump')!
    };
  }

  const width = 1024;
  const height = 1024;

  // 1. Color Map
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const cctx = colorCanvas.getContext('2d')!;

  // 2. Bump Map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bctx = bumpCanvas.getContext('2d')!;

  // Base earth tone
  cctx.fillStyle = '#b47b54';
  cctx.fillRect(0, 0, width, height);

  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, width, height);

  // Geological compaction lifts (calibrated natural subsoil earth pigments)
  const strataColors = [
    { c: '#a46f49', bump: '#707070' },
    { c: '#ba865f', bump: '#8c8c8c' },
    { c: '#95623e', bump: '#686868' },
    { c: '#c8966e', bump: '#969696' },
    { c: '#865431', bump: '#606060' },
    { c: '#b17e57', bump: '#858585' },
    { c: '#a7704a', bump: '#787878' },
    { c: '#cf9e78', bump: '#9a9a9a' },
    { c: '#905d38', bump: '#666666' },
    { c: '#bc8760', bump: '#888888' }
  ];

  // ~16 broad, heavy earth layers (representing 150-250mm lifts)
  let currentY = 0;
  while (currentY < height) {
    const layerHeight = 50 + Math.floor(Math.sin(currentY * 0.015) * 15 + Math.random() * 35);
    const actualHeight = Math.min(layerHeight, height - currentY);
    const stratum = strataColors[Math.floor(Math.random() * strataColors.length)];

    cctx.fillStyle = stratum.c;
    cctx.fillRect(0, currentY, width, actualHeight);

    bctx.fillStyle = stratum.bump;
    bctx.fillRect(0, currentY, width, actualHeight);

    // Subtle internal density gradient
    const liftGrad = cctx.createLinearGradient(0, currentY, 0, currentY + actualHeight);
    liftGrad.addColorStop(0, 'rgba(0, 0, 0, 0.08)');
    liftGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.04)');
    liftGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.03)');
    liftGrad.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
    cctx.fillStyle = liftGrad;
    cctx.fillRect(0, currentY, width, actualHeight);

    // Organic wavy compaction line between lifts
    cctx.strokeStyle = 'rgba(45, 22, 10, 0.25)';
    cctx.lineWidth = 2.5;
    cctx.beginPath();
    cctx.moveTo(0, currentY + actualHeight);

    bctx.strokeStyle = '#505050';
    bctx.lineWidth = 3;
    bctx.beginPath();
    bctx.moveTo(0, currentY + actualHeight);

    for (let x = 0; x <= width; x += 64) {
      const offsetY = Math.sin(x * 0.012 + currentY * 0.08) * 4;
      cctx.lineTo(x, currentY + actualHeight + offsetY);
      bctx.lineTo(x, currentY + actualHeight + offsetY);
    }
    cctx.stroke();
    bctx.stroke();

    currentY += actualHeight;
  }

  // Fast procedural aggregate specks (2000 specks instead of 4 million pixel iterations!)
  for (let s = 0; s < 2500; s++) {
    const sx = Math.random() * width;
    const sy = Math.random() * height;
    const sr = 1 + Math.random() * 2.5;
    cctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(30,15,5,0.18)';
    cctx.beginPath();
    cctx.arc(sx, sy, sr, 0, Math.PI * 2);
    cctx.fill();

    bctx.fillStyle = Math.random() > 0.5 ? '#a0a0a0' : '#404040';
    bctx.beginPath();
    bctx.arc(sx, sy, sr, 0, Math.PI * 2);
    bctx.fill();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  textureCache.set('rammed_earth_map', map);
  textureCache.set('rammed_earth_rough', bumpMap);
  textureCache.set('rammed_earth_bump', bumpMap);

  return { map, roughnessMap: bumpMap, bumpMap };
}

/**
 * Creates Reclaimed Teak PBR texture with realistic wood grain.
 */
export function createTeakWoodPBR(): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  if (
    textureCache.has('teak_map') &&
    textureCache.has('teak_rough') &&
    textureCache.has('teak_bump')
  ) {
    return {
      map: textureCache.get('teak_map')!,
      roughnessMap: textureCache.get('teak_rough')!,
      bumpMap: textureCache.get('teak_bump')!
    };
  }

  const width = 512;
  const height = 1024;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const cctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bctx = bumpCanvas.getContext('2d')!;

  // Base warm teak tone
  cctx.fillStyle = '#6d4021';
  cctx.fillRect(0, 0, width, height);

  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, width, height);

  // Longitudinal wood fibers
  const fiberTones = ['#573016', '#804b26', '#61371b', '#8d552c', '#4e2a12', '#734423'];
  for (let x = 0; x < width; x += 3) {
    const tone = fiberTones[Math.floor(Math.random() * fiberTones.length)];
    cctx.strokeStyle = tone;
    cctx.lineWidth = 1 + Math.random() * 2;

    bctx.strokeStyle = Math.random() > 0.5 ? '#8e8e8e' : '#727272';
    bctx.lineWidth = 1;

    cctx.beginPath();
    bctx.beginPath();
    cctx.moveTo(x, 0);
    bctx.moveTo(x, 0);

    const waveFreq = 0.003 + Math.random() * 0.003;
    const waveAmp = 3 + Math.random() * 6;
    for (let y = 0; y <= height; y += 32) {
      const offsetX = Math.sin(y * waveFreq) * waveAmp;
      cctx.lineTo(x + offsetX, y);
      bctx.lineTo(x + offsetX, y);
    }
    cctx.stroke();
    bctx.stroke();
  }

  // Soft longitudinal grain wash
  const grad = cctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, 'rgba(40, 20, 10, 0.18)');
  grad.addColorStop(0.35, 'rgba(145, 88, 48, 0.12)');
  grad.addColorStop(0.65, 'rgba(40, 20, 10, 0.22)');
  grad.addColorStop(1, 'rgba(115, 68, 32, 0.12)');
  cctx.fillStyle = grad;
  cctx.fillRect(0, 0, width, height);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  textureCache.set('teak_map', map);
  textureCache.set('teak_rough', bumpMap);
  textureCache.set('teak_bump', bumpMap);

  return { map, roughnessMap: bumpMap, bumpMap };
}

/**
 * Creates natural Kota Stone paving slabs (900x600 ratio).
 */
export function createKotaStonePBR(): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  if (
    textureCache.has('kota_map') &&
    textureCache.has('kota_rough') &&
    textureCache.has('kota_bump')
  ) {
    return {
      map: textureCache.get('kota_map')!,
      roughnessMap: textureCache.get('kota_rough')!,
      bumpMap: textureCache.get('kota_bump')!
    };
  }

  const width = 1024;
  const height = 1024;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const cctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bctx = bumpCanvas.getContext('2d')!;

  // Base stone tone
  cctx.fillStyle = '#646c66';
  cctx.fillRect(0, 0, width, height);

  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, width, height);

  const tileW = 256;
  const tileH = 170;
  const mortar = 4;

  for (let y = 0; y < height; y += tileH) {
    const rowOffset = (Math.floor(y / tileH) % 2) * (tileW / 2);
    for (let x = -tileW; x < width; x += tileW) {
      const tx = x + rowOffset;
      const slabLuma = Math.floor(Math.random() * 20) - 10;
      const r = Math.min(255, Math.max(0, 98 + slabLuma));
      const g = Math.min(255, Math.max(0, 107 + slabLuma));
      const b = Math.min(255, Math.max(0, 101 + slabLuma));
      cctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      cctx.fillRect(tx + mortar, y + mortar, tileW - mortar * 2, tileH - mortar * 2);

      // Subtle surface mottling
      for (let m = 0; m < 4; m++) {
        cctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.055)';
        const mx = tx + Math.random() * tileW;
        const my = y + Math.random() * tileH;
        cctx.beginPath();
        cctx.arc(mx, my, 8 + Math.random() * 20, 0, Math.PI * 2);
        cctx.fill();
      }
    }
  }

  // Recessed mortar joints
  cctx.strokeStyle = '#414743';
  cctx.lineWidth = mortar;
  bctx.strokeStyle = '#404040';
  bctx.lineWidth = mortar;

  for (let y = 0; y <= height; y += tileH) {
    cctx.beginPath();
    bctx.beginPath();
    cctx.moveTo(0, y);
    bctx.moveTo(0, y);
    cctx.lineTo(width, y);
    bctx.lineTo(width, y);
    cctx.stroke();
    bctx.stroke();
  }

  for (let y = 0; y < height; y += tileH) {
    const rowOffset = (Math.floor(y / tileH) % 2) * (tileW / 2);
    for (let x = -tileW; x <= width; x += tileW) {
      const tx = x + rowOffset;
      cctx.beginPath();
      bctx.beginPath();
      cctx.moveTo(tx, y);
      bctx.moveTo(tx, y);
      cctx.lineTo(tx, y + tileH);
      bctx.lineTo(tx, y + tileH);
      cctx.stroke();
      bctx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  textureCache.set('kota_map', map);
  textureCache.set('kota_rough', bumpMap);
  textureCache.set('kota_bump', bumpMap);

  return { map, roughnessMap: bumpMap, bumpMap };
}

/**
 * Creates contemporary Indian geometric Terracotta Jaali screen texture and alpha mask.
 */
export function createTerracottaJaaliTexture(): { colorMap: THREE.CanvasTexture; alphaMap: THREE.CanvasTexture } {
  if (textureCache.has('jaali_color') && textureCache.has('jaali_alpha')) {
    return {
      colorMap: textureCache.get('jaali_color')!,
      alphaMap: textureCache.get('jaali_alpha')!
    };
  }

  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cctx = colorCanvas.getContext('2d')!;

  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = size;
  alphaCanvas.height = size;
  const actx = alphaCanvas.getContext('2d')!;

  actx.fillStyle = '#ffffff';
  actx.fillRect(0, 0, size, size);

  cctx.fillStyle = '#b45534';
  cctx.fillRect(0, 0, size, size);

  const cell = 64;
  const margin = 12;

  actx.fillStyle = '#000000'; // cutouts

  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const cx = x + cell / 2;
      const cy = y + cell / 2;
      const cutW = cell - margin * 2;

      actx.fillRect(cx - cutW / 2, cy - cutW / 2, cutW, cutW);

      actx.fillStyle = '#ffffff';
      actx.beginPath();
      actx.moveTo(cx, cy - cutW * 0.4);
      actx.lineTo(cx + cutW * 0.4, cy);
      actx.lineTo(cx, cy + cutW * 0.4);
      actx.lineTo(cx - cutW * 0.4, cy);
      actx.closePath();
      actx.fill();

      actx.fillStyle = '#000000';
      actx.beginPath();
      actx.moveTo(cx, cy - cutW * 0.18);
      actx.lineTo(cx + cutW * 0.18, cy);
      actx.lineTo(cx, cy + cutW * 0.18);
      actx.lineTo(cx - cutW * 0.18, cy);
      actx.closePath();
      actx.fill();
    }
  }

  // Subtle firing tone variations
  for (let i = 0; i < 200; i++) {
    cctx.fillStyle = Math.random() > 0.5 ? 'rgba(145, 52, 26, 0.16)' : 'rgba(218, 112, 67, 0.14)';
    cctx.fillRect(Math.random() * size, Math.random() * size, 16 + Math.random() * 32, 16 + Math.random() * 32);
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;

  const alphaMap = new THREE.CanvasTexture(alphaCanvas);
  alphaMap.wrapS = THREE.RepeatWrapping;
  alphaMap.wrapT = THREE.RepeatWrapping;

  textureCache.set('jaali_color', colorMap);
  textureCache.set('jaali_alpha', alphaMap);

  return { colorMap, alphaMap };
}

/**
 * Creates natural Belgian Linen fabric weave texture.
 */
export function createLinenFabricTexture(): THREE.CanvasTexture {
  if (textureCache.has('linen')) return textureCache.get('linen')!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e6e0d6';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(155, 145, 132, 0.28)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 256; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set('linen', texture);
  return texture;
}

// Backwards compatibility wrappers
export function createRammedEarthTexture(): THREE.CanvasTexture {
  return createRammedEarthPBR().map;
}

export function createTeakWoodTexture(): THREE.CanvasTexture {
  return createTeakWoodPBR().map;
}

export function createKotaStoneTexture(): THREE.CanvasTexture {
  return createKotaStonePBR().map;
}
