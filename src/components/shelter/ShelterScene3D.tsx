import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { ColorSchemeId, RenderMode, HotspotInfo, ShelterArchetype } from '../../types/shelter';
import { COLOR_SCHEMES, HOTSPOTS } from '../../data/shelterData';
import { getWallPBRTextures, applyMetricUVMapping } from '../../utils/textureGenerator';
import { createSkyEnvironment, type SkyController } from '../../utils/skyEnvironment';
import type { EnvironmentPresetId } from '../simulation/EnvironmentSimulationPanel';

interface ShelterScene3DProps {
  shelterType?: ShelterArchetype;
  colorScheme: ColorSchemeId;
  renderMode: RenderMode;
  explodedProgress: number; // 0.0 to 1.0
  roofRemoved: boolean;
  showDimensions: boolean;
  showHotspots: boolean;
  selectedHotspotId: string | null;
  onSelectHotspot: (hotspot: HotspotInfo | null) => void;
  cameraPreset: 'hero' | 'south' | 'east' | 'roof' | 'interior';
  interiorLightsOn?: boolean;
  interiorLightMode?: 'warm' | 'daylight' | 'emergency';
  environment?: EnvironmentPresetId;
}

// ── ARCHITECTURAL X-RAY FRESNEL SHADER MATERIAL ──
const createXRayFresnelMaterial = (
  baseColor: string,
  edgeColor: string,
  baseAlpha = 0.16,
  edgeAlpha = 0.85,
  rimPower = 2.2
) => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: new THREE.Color(baseColor) },
      uEdgeColor: { value: new THREE.Color(edgeColor) },
      uBaseAlpha: { value: baseAlpha },
      uEdgeAlpha: { value: edgeAlpha },
      uRimPower: { value: rimPower },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBaseColor;
      uniform vec3 uEdgeColor;
      uniform float uBaseAlpha;
      uniform float uEdgeAlpha;
      uniform float uRimPower;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vec3 normal = normalize(vNormal);
        if (!gl_FrontFacing) normal = -normal;
        vec3 viewDir = normalize(vViewPosition);
        float rim = 1.0 - max(dot(viewDir, normal), 0.0);
        rim = pow(rim, uRimPower);
        vec3 col = mix(uBaseColor, uEdgeColor, rim * 0.9);
        float alpha = clamp(uBaseAlpha + rim * (uEdgeAlpha - uBaseAlpha), 0.0, 0.95);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
};

export const ShelterScene3D: React.FC<ShelterScene3DProps> = ({
  shelterType = 'emergency',
  colorScheme,
  renderMode,
  explodedProgress,
  roofRemoved,
  showDimensions,
  showHotspots,
  selectedHotspotId,
  onSelectHotspot,
  cameraPreset,
  interiorLightsOn = true,
  interiorLightMode = 'warm',
  environment = 'daylight',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Groups for exploded animation
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const roofGroupRef = useRef<THREE.Group | null>(null);
  const wallsGroupRef = useRef<THREE.Group | null>(null);
  const frameGroupRef = useRef<THREE.Group | null>(null);
  const floorGroupRef = useRef<THREE.Group | null>(null);
  const footingsGroupRef = useRef<THREE.Group | null>(null);
  const interiorGroupRef = useRef<THREE.Group | null>(null);
  const dimensionsGroupRef = useRef<THREE.Group | null>(null);
  const hotspotsGroupRef = useRef<THREE.Group | null>(null);
  const ventRotatorsRef = useRef<THREE.Group[]>([]);
  const skyCtrlRef = useRef<SkyController | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const groundMeshRef = useRef<THREE.Mesh | null>(null);

  // Camera target & orbit state
  const cameraTarget = useRef(new THREE.Vector3(0, 1.4, 0));
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  const prevMousePos = useRef({ x: 0, y: 0 });
  const spherical = useRef({ radius: 10.5, theta: 0.8, phi: 1.1 });
  const targetSpherical = useRef({ radius: 10.5, theta: 0.8, phi: 1.1 });

  // Raycaster for interactive hotspots
  const raycaster = useRef(new THREE.Raycaster());
  const mouseVec = useRef(new THREE.Vector2());

  // Setup Camera Presets
  const setCameraPreset = useCallback((preset: 'hero' | 'south' | 'east' | 'roof' | 'interior') => {
    switch (preset) {
      case 'hero':
        targetSpherical.current = { radius: 10.2, theta: 0.65, phi: 1.15 };
        cameraTarget.current.set(0, 1.35, 0);
        break;
      case 'south': // Direct front view of south-facing windows and door
        targetSpherical.current = { radius: 8.8, theta: 0.0, phi: 1.5 };
        cameraTarget.current.set(0, 1.35, 0);
        break;
      case 'east': // Transverse section / side elevation showing 4m width & 15 deg slope
        targetSpherical.current = { radius: 8.5, theta: Math.PI / 2, phi: 1.5 };
        cameraTarget.current.set(0, 1.35, 0);
        break;
      case 'roof': // Top down plan view showing 15 deg corrugated composite slope
        targetSpherical.current = { radius: 11.5, theta: 0.3, phi: 0.25 };
        cameraTarget.current.set(0, 1.2, 0);
        break;
      case 'interior': // Eye level looking inside
        targetSpherical.current = { radius: 4.5, theta: 0.15, phi: 1.45 };
        cameraTarget.current.set(-0.5, 1.2, 0);
        break;
    }
  }, []);

  useEffect(() => {
    setCameraPreset(cameraPreset);
  }, [cameraPreset, setCameraPreset]);

  // Dynamic scale based on Shelter Archetype preference
  useEffect(() => {
    if (!rootGroupRef.current) return;
    if (shelterType === 'community') {
      rootGroupRef.current.scale.set(1.5, 1.15, 1.3);
    } else if (shelterType === 'permanent') {
      rootGroupRef.current.scale.set(1.25, 1.05, 1.15);
    } else {
      rootGroupRef.current.scale.set(1.0, 1.0, 1.0);
    }
  }, [shelterType]);

  // Main Scene Initialization
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = Math.max(containerRef.current.clientWidth || 800, 400);
    const height = Math.max(containerRef.current.clientHeight || 600, 300);

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null;

    // Physically-Based Atmospheric Sky & Celestial Starfield
    const skyCtrl = createSkyEnvironment(scene);
    skyCtrlRef.current = skyCtrl;

    // 2. Camera with 3000m far plane to encompass skydome
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 3000);
    cameraRef.current = camera;
    camera.position.set(7, 5, 8);
    camera.lookAt(cameraTarget.current);

    // 3. Renderer with antialiasing and tone mapping for Octane style
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // 4. Lighting Rig (Octane Studio 3-Point Diffuse Setup + Sky Irradiance)
    const ambientLight = new THREE.AmbientLight('#b0c4de', 0.55);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemiLight = new THREE.HemisphereLight('#f8fafc', '#1e293b', 0.5);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fff5e6', 2.2);
    keyLight.position.set(8, 12, 9);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0003;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const fillLight = new THREE.DirectionalLight('#90b4ce', 1.0);
    fillLight.position.set(-9, 6, -8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight('#ffffff', 1.3);
    rimLight.position.set(0, 9, -10);
    scene.add(rimLight);

    // Ground reflector / Studio Stage Floor
    const groundGeo = new THREE.PlaneGeometry(36, 36);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#12161f',
      roughness: 0.85,
      metalness: 0.15,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);
    groundMeshRef.current = ground;

    // Initialize Sky with active Environment
    skyCtrl.update(environment, keyLight, ambientLight, ground);

    // Studio Circular Technical Grid
    const gridHelper = new THREE.GridHelper(24, 24, '#384457', '#1f2733');
    gridHelper.position.y = 0.002;
    scene.add(gridHelper);

    // Build Shelter Hierarchy Groups
    const rootGroup = new THREE.Group();
    rootGroupRef.current = rootGroup;
    scene.add(rootGroup);

    const footingsGroup = new THREE.Group();
    footingsGroupRef.current = footingsGroup;
    rootGroup.add(footingsGroup);

    const floorGroup = new THREE.Group();
    floorGroupRef.current = floorGroup;
    rootGroup.add(floorGroup);

    const wallsGroup = new THREE.Group();
    wallsGroupRef.current = wallsGroup;
    rootGroup.add(wallsGroup);

    const frameGroup = new THREE.Group();
    frameGroupRef.current = frameGroup;
    rootGroup.add(frameGroup);

    const roofGroup = new THREE.Group();
    roofGroupRef.current = roofGroup;
    rootGroup.add(roofGroup);

    const interiorGroup = new THREE.Group();
    interiorGroupRef.current = interiorGroup;
    rootGroup.add(interiorGroup);

    const dimensionsGroup = new THREE.Group();
    dimensionsGroupRef.current = dimensionsGroup;
    rootGroup.add(dimensionsGroup);

    const hotspotsGroup = new THREE.Group();
    hotspotsGroupRef.current = hotspotsGroup;
    rootGroup.add(hotspotsGroup);

    // Animation Loop
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);

      // Smooth camera interpolation
      spherical.current.radius += (targetSpherical.current.radius - spherical.current.radius) * 0.08;
      spherical.current.theta += (targetSpherical.current.theta - spherical.current.theta) * 0.08;
      spherical.current.phi += (targetSpherical.current.phi - spherical.current.phi) * 0.08;

      // Clamp phi to prevent flip
      spherical.current.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.current.phi));

      const x = spherical.current.radius * Math.sin(spherical.current.phi) * Math.sin(spherical.current.theta);
      const y = spherical.current.radius * Math.cos(spherical.current.phi);
      const z = spherical.current.radius * Math.sin(spherical.current.phi) * Math.cos(spherical.current.theta);

      camera.position.set(cameraTarget.current.x + x, cameraTarget.current.y + y, cameraTarget.current.z + z);
      camera.lookAt(cameraTarget.current);

      // Animate hotspot markers gentle pulse
      if (hotspotsGroupRef.current) {
        const time = performance.now() * 0.003;
        hotspotsGroupRef.current.children.forEach((child, i) => {
          if (child instanceof THREE.Mesh) {
            const scale = 1 + Math.sin(time + i * 1.2) * 0.12;
            child.scale.set(scale, scale, scale);
          }
        });
      }

      // Animate wind-driven ventilation turbine cowls
      ventRotatorsRef.current.forEach(turbine => {
        turbine.rotation.y += 0.022;
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = Math.max(containerRef.current.clientWidth || 800, 400);
      const h = Math.max(containerRef.current.clientHeight || 600, 300);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      skyCtrlRef.current?.dispose();
      skyCtrlRef.current = null;
      renderer.dispose();
    };
  }, []);

  // Update Sky and lighting when environment changes
  useEffect(() => {
    if (skyCtrlRef.current) {
      skyCtrlRef.current.update(
        environment,
        keyLightRef.current,
        ambientLightRef.current,
        groundMeshRef.current
      );
    }
  }, [environment]);

  // Update Scene Geometry & Materials when props change
  useEffect(() => {
    if (!rootGroupRef.current) return;

    const scheme = COLOR_SCHEMES[colorScheme];

    // Helper material generator based on render mode
    const getMaterial = (baseColor: string, type: 'wall' | 'steel' | 'roof' | 'glass' | 'rubber' | 'accent' | 'wood') => {
      if (renderMode === 'wireframe') {
        return new THREE.MeshBasicMaterial({
          color: baseColor === '#ffffff' ? '#00e5ff' : '#4ade80',
          wireframe: true,
        });
      }

      if (renderMode === 'thermal') {
        // FLIR False Color Thermal Spectrum Simulation
        // Blue/Purple = cold ambient (well insulated exterior)
        // Red/Orange/Yellow = high heat retention inside / window passive solar
        let thermalColor = '#2b1b54'; // cold navy exterior
        if (type === 'wall') thermalColor = '#1e293b'; // minimal heat leakage
        if (type === 'steel') thermalColor = '#3b82f6'; // slight thermal conductivity
        if (type === 'glass') thermalColor = '#f59e0b'; // passive solar radiation zone
        if (type === 'rubber') thermalColor = '#10b981'; // tight thermal barrier
        if (type === 'roof') thermalColor = '#1e1b4b'; // super insulated R-28 roof

        return new THREE.MeshStandardMaterial({
          color: thermalColor,
          roughness: 0.6,
          metalness: 0.1,
          emissive: thermalColor,
          emissiveIntensity: 0.25,
        });
      }

      if (renderMode === 'xray') {
        // ── TRUE ARCHITECTURAL HOLOGRAPHIC X-RAY ──
        // 1. Structural Framing Skeleton (Columns, Rafters, Purlins, Studs, Footings)
        // High density bone structure: Luminous, high-contrast electric cyan
        if (type === 'steel') {
          return new THREE.MeshStandardMaterial({
            color: '#00f0ff',
            emissive: '#0284c7',
            emissiveIntensity: 0.85,
            roughness: 0.15,
            metalness: 0.85,
            transparent: true,
            opacity: 0.95,
            depthWrite: true,
          });
        }

        // 2. Glazing / Fenestration (Passive Solar Windows, Skylights)
        // Highly transparent faint cyan aperture
        if (type === 'glass') {
          return new THREE.MeshPhysicalMaterial({
            color: '#e0f2fe',
            transparent: true,
            opacity: 0.10,
            roughness: 0.05,
            transmission: 0.95,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
        }

        // 3. Exterior Envelope (Wall Panels, Roof Deck, Corrugations)
        // Translucent Ghosted Shell with Glowing Edge Silhouettes:
        // Allows camera to look straight through into internal structural skeleton & furniture
        if (type === 'wall') {
          return createXRayFresnelMaterial('#023850', '#00f5ff', 0.16, 0.85, 2.2);
        }

        if (type === 'roof') {
          return createXRayFresnelMaterial('#034360', '#38bdf8', 0.20, 0.88, 2.0);
        }

        // 4. Joints, Gaskets & Weatherproofing Lines
        if (type === 'rubber') {
          return new THREE.MeshBasicMaterial({
            color: '#38bdf8',
            transparent: true,
            opacity: 0.7,
          });
        }

        // 5. Interior Equipment, Cots, Mattress, Battery Hub & Fixtures
        return new THREE.MeshStandardMaterial({
          color: '#38bdf8',
          emissive: '#0369a1',
          emissiveIntensity: 0.55,
          roughness: 0.25,
          metalness: 0.35,
          transparent: true,
          opacity: 0.80,
          depthWrite: true,
        });
      }

      // Studio / Field PBR Mode
      if (type === 'wall') {
        const isBamboo = colorScheme === 'treated-bamboo';
        const pbrMaps = getWallPBRTextures(baseColor, scheme.wallSecondary, isBamboo);
        return new THREE.MeshStandardMaterial({
          color: baseColor,
          map: pbrMaps.diffuseMap,
          normalMap: pbrMaps.normalMap,
          normalScale: new THREE.Vector2(0.9, 0.9),
          roughnessMap: pbrMaps.roughnessMap,
          roughness: Math.min(scheme.roughness, 0.65),
          metalness: scheme.metalness,
          aoMap: pbrMaps.aoMap,
          aoMapIntensity: 0.85,
          side: THREE.DoubleSide,
        });
      }

      if (type === 'steel') {
        return new THREE.MeshStandardMaterial({
          color: scheme.frameColor,
          roughness: scheme.frameRoughness,
          metalness: scheme.frameMetalness,
        });
      }

      if (type === 'roof') {
        return new THREE.MeshStandardMaterial({
          color: scheme.roofColor,
          roughness: 0.72,
          metalness: 0.12,
          side: THREE.DoubleSide,
        });
      }

      if (type === 'glass') {
        return new THREE.MeshPhysicalMaterial({
          color: '#c2e9fb',
          metalness: 0.1,
          roughness: 0.15,
          transmission: 0.75,
          thickness: 0.16,
          transparent: true,
          opacity: 0.85,
          reflectivity: 0.9,
        });
      }

      if (type === 'rubber') {
        return new THREE.MeshStandardMaterial({
          color: '#1a1f26',
          roughness: 0.95,
          metalness: 0.05,
        });
      }

      if (type === 'accent') {
        return new THREE.MeshStandardMaterial({
          color: '#f97316', // High visibility hazard rescue orange
          roughness: 0.4,
          metalness: 0.2,
        });
      }

      return new THREE.MeshStandardMaterial({ color: baseColor });
    };

    // Clean previous children
    const clearGroup = (group: THREE.Group | null) => {
      if (!group) return;
      while (group.children.length > 0) {
        const obj = group.children[0];
        group.remove(obj);
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    };

    clearGroup(footingsGroupRef.current);
    clearGroup(floorGroupRef.current);
    clearGroup(wallsGroupRef.current);
    clearGroup(frameGroupRef.current);
    clearGroup(roofGroupRef.current);
    clearGroup(interiorGroupRef.current);
    clearGroup(dimensionsGroupRef.current);
    clearGroup(hotspotsGroupRef.current);
    ventRotatorsRef.current = [];

    // SPECIFICATION CONSTANTS
    const L = 6.0; // 6.0m Length (X axis: -3.0 to +3.0)
    const W = 4.0; // 4.0m Width (Z axis: North = -2.0, South = +2.0)
    const H = 2.4; // 2.4m Front (South) Wall Height
    const ELEVATION = 0.15; // 150mm Ground Clearance off ground
    const FLOOR_THICKNESS = 0.08; // 80mm structural floor cassette
    const SUBFLOOR_TOP = ELEVATION + FLOOR_THICKNESS; // Y = 0.23m above ground
    const PITCH_DEG = 15; // 15-degree mono-pitch slope
    const PITCH_RAD = (PITCH_DEG * Math.PI) / 180;
    const ROOF_RISE = W * Math.tan(PITCH_RAD); // Rise from South to North along 4.0m span ≈ 1.0718m
    const northH = H + ROOF_RISE; // North (Rear) Wall Height ≈ 3.4718m
    const wallThick = 0.075; // 75mm PIR sandwich panel thickness

    // Materials used across envelope and floor
    const footingMat = getMaterial(scheme.frameColor, 'steel');
    const rimMat = getMaterial(scheme.frameColor, 'steel');
    const floorDeckMat = getMaterial('#2b332b', 'wall');
    const wallPrimaryMat = getMaterial(scheme.wallPrimary, 'wall');
    const wallSecondaryMat = getMaterial(scheme.wallSecondary, 'wall');
    const rubberMat = getMaterial('#1e242b', 'rubber');
    const glassMat = getMaterial('#a5d8f3', 'glass');
    const doorCurtainMat = getMaterial('#232a22', 'wall');
    const lgsfMat = getMaterial(scheme.frameColor, 'steel');
    const boltMat = getMaterial('#475569', 'steel');
    const roofMat = getMaterial(scheme.roofColor, 'roof');
    const roofRidgeMat = getMaterial('#262e26', 'steel');

    // ==========================================
    // 1. FOUNDATION: 150mm Raised Steel Footings (8-point grid)
    // ==========================================
    const footingPositions: [number, number, number][] = [
      // 4 corners
      [-L / 2 + 0.15, ELEVATION / 2, -W / 2 + 0.15],
      [L / 2 - 0.15, ELEVATION / 2, -W / 2 + 0.15],
      [-L / 2 + 0.15, ELEVATION / 2, W / 2 - 0.15],
      [L / 2 - 0.15, ELEVATION / 2, W / 2 - 0.15],
      // 4 intermediate points (every 2m)
      [-1.0, ELEVATION / 2, -W / 2 + 0.15],
      [1.0, ELEVATION / 2, -W / 2 + 0.15],
      [-1.0, ELEVATION / 2, W / 2 - 0.15],
      [1.0, ELEVATION / 2, W / 2 - 0.15],
    ];

    footingPositions.forEach(([fx, fy, fz]) => {
      const pierGeo = new THREE.BoxGeometry(0.18, ELEVATION, 0.18);
      const pierMesh = new THREE.Mesh(pierGeo, footingMat);
      pierMesh.position.set(fx, fy, fz);
      pierMesh.castShadow = true;
      pierMesh.receiveShadow = true;
      footingsGroupRef.current?.add(pierMesh);

      const plateGeo = new THREE.BoxGeometry(0.32, 0.018, 0.32);
      const plateMesh = new THREE.Mesh(plateGeo, footingMat);
      plateMesh.position.set(fx, 0.009, fz);
      plateMesh.receiveShadow = true;
      footingsGroupRef.current?.add(plateMesh);

      const capGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.04, 6);
      const capMesh = new THREE.Mesh(capGeo, boltMat);
      capMesh.position.set(fx, 0.03, fz);
      footingsGroupRef.current?.add(capMesh);

      const topBracketGeo = new THREE.BoxGeometry(0.24, 0.02, 0.24);
      const topBracketMesh = new THREE.Mesh(topBracketGeo, footingMat);
      topBracketMesh.position.set(fx, ELEVATION - 0.01, fz);
      footingsGroupRef.current?.add(topBracketMesh);
    });

    // ==========================================
    // 2. SUBFLOOR: Insulated Floor Cassette (24 m²)
    // ==========================================
    const floorBoxGeo = new THREE.BoxGeometry(L, FLOOR_THICKNESS, W);
    const floorBox = new THREE.Mesh(floorBoxGeo, rimMat);
    floorBox.position.set(0, ELEVATION + FLOOR_THICKNESS / 2, 0);
    floorBox.castShadow = true;
    floorBox.receiveShadow = true;
    floorGroupRef.current?.add(floorBox);

    const floorDeckGeo = new THREE.BoxGeometry(L - 0.04, 0.008, W - 0.04);
    const floorDeck = new THREE.Mesh(floorDeckGeo, floorDeckMat);
    floorDeck.position.set(0, SUBFLOOR_TOP + 0.004, 0);
    floorDeck.receiveShadow = true;
    floorGroupRef.current?.add(floorDeck);

    // Module grid joints (12 cassettes of 1m x 2m)
    for (let xi = -2; xi <= 2; xi++) {
      const lineGeo = new THREE.BoxGeometry(0.008, 0.002, W - 0.08);
      const lineMesh = new THREE.Mesh(lineGeo, rubberMat);
      lineMesh.position.set(xi * 1.0, SUBFLOOR_TOP + 0.009, 0);
      floorGroupRef.current?.add(lineMesh);
    }
    const centerLineGeo = new THREE.BoxGeometry(L - 0.08, 0.002, 0.008);
    const centerLineMesh = new THREE.Mesh(centerLineGeo, rubberMat);
    centerLineMesh.position.set(0, SUBFLOOR_TOP + 0.009, 0);
    floorGroupRef.current?.add(centerLineMesh);

    // ==========================================
    // 3. ENVELOPE: High-R Composite Sandwich Panels
    // ==========================================

    // North (Rear) Wall: High solid wall (height northH = H + ROOF_RISE)
    // Runs from X = -L/2 to +L/2 at Z = -W/2 + wallThick/2
    const northWallGeo = new THREE.BoxGeometry(L - 2 * wallThick, northH, wallThick);
    applyMetricUVMapping(northWallGeo, SUBFLOOR_TOP, L, W, 0, SUBFLOOR_TOP + northH / 2, -W / 2 + wallThick / 2);
    const northWall = new THREE.Mesh(northWallGeo, wallPrimaryMat);
    northWall.position.set(0, SUBFLOOR_TOP + northH / 2, -W / 2 + wallThick / 2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    wallsGroupRef.current?.add(northWall);

    // North Wall vertical joints (1m modular intervals) with engineered weather gasket reveals
    for (let i = -2; i <= 2; i++) {
      const seamGeo = new THREE.BoxGeometry(0.016, northH - 0.04, 0.008);
      const seamMesh = new THREE.Mesh(seamGeo, rubberMat);
      seamMesh.position.set(i * 1.0, SUBFLOOR_TOP + northH / 2, -W / 2 - 0.004);
      wallsGroupRef.current?.add(seamMesh);
    }

    // North Wall High-Level Weatherproof Stack Relief Louvers (Dual Exhaust Vents)
    // Positioned high at Y = SUBFLOOR_TOP + 2.85m to exhaust rising heat, moisture, and CO2
    const nLouverW = 0.75;
    const nLouverH = 0.42;
    const nLouverY = SUBFLOOR_TOP + 2.85;
    [-1.6, 1.6].forEach(lx => {
      // Extruded aluminum perimeter frame
      const louverFrameGeo = new THREE.BoxGeometry(nLouverW, nLouverH, 0.045);
      const louverFrame = new THREE.Mesh(louverFrameGeo, rimMat);
      louverFrame.position.set(lx, nLouverY, -W / 2 - 0.015);
      louverFrame.castShadow = true;
      wallsGroupRef.current?.add(louverFrame);

      // Dark insect mesh backer
      const meshBackerGeo = new THREE.PlaneGeometry(nLouverW - 0.06, nLouverH - 0.06);
      const meshBacker = new THREE.Mesh(meshBackerGeo, rubberMat);
      meshBacker.position.set(lx, nLouverY, -W / 2 - 0.005);
      wallsGroupRef.current?.add(meshBacker);

      // Weatherproof downward-angled chevron blades (45° angle)
      const numBlades = 5;
      for (let b = 0; b < numBlades; b++) {
        const by = nLouverY - nLouverH / 2 + 0.06 + b * (nLouverH - 0.12) / (numBlades - 1);
        const bladeGeo = new THREE.BoxGeometry(nLouverW - 0.06, 0.035, 0.025);
        const bladeMesh = new THREE.Mesh(bladeGeo, lgsfMat);
        bladeMesh.rotation.x = -Math.PI / 4;
        bladeMesh.position.set(lx, by, -W / 2 - 0.025);
        bladeMesh.castShadow = true;
        wallsGroupRef.current?.add(bladeMesh);
      }

      // Louver top drip cap
      const louverDripGeo = new THREE.BoxGeometry(nLouverW + 0.06, 0.02, 0.04);
      const louverDrip = new THREE.Mesh(louverDripGeo, rimMat);
      louverDrip.position.set(lx, nLouverY + nLouverH / 2 + 0.01, -W / 2 - 0.025);
      wallsGroupRef.current?.add(louverDrip);
    });

    // East & West Gable Walls:
    // Built directly with BufferGeometry using exact 3D world coordinates to guarantee flush fit with roof and floor.
    // Z range: South = +W/2, North = -W/2
    // Bottom: Y = SUBFLOOR_TOP
    // Top: South Y = SUBFLOOR_TOP + H, North Y = SUBFLOOR_TOP + H + ROOF_RISE
    const createGableBufferGeo = (xInner: number, xOuter: number) => {
      // 8 vertices for the trapezoidal prism:
      // 0: South-Bottom-Outer (xOuter, SUBFLOOR_TOP, +W/2)
      // 1: North-Bottom-Outer (xOuter, SUBFLOOR_TOP, -W/2)
      // 2: North-Top-Outer    (xOuter, SUBFLOOR_TOP + H + ROOF_RISE, -W/2)
      // 3: South-Top-Outer    (xOuter, SUBFLOOR_TOP + H, +W/2)
      // 4: South-Bottom-Inner (xInner, SUBFLOOR_TOP, +W/2)
      // 5: North-Bottom-Inner (xInner, SUBFLOOR_TOP, -W/2)
      // 6: North-Top-Inner    (xInner, SUBFLOOR_TOP + H + ROOF_RISE, -W/2)
      // 7: South-Top-Inner    (xInner, SUBFLOOR_TOP + H, +W/2)
      const positions = new Float32Array([
        // Outer Face (0, 1, 2, 3) - 2 triangles
        xOuter, SUBFLOOR_TOP, W / 2,
        xOuter, SUBFLOOR_TOP, -W / 2,
        xOuter, SUBFLOOR_TOP + H + ROOF_RISE, -W / 2,

        xOuter, SUBFLOOR_TOP, W / 2,
        xOuter, SUBFLOOR_TOP + H + ROOF_RISE, -W / 2,
        xOuter, SUBFLOOR_TOP + H, W / 2,

        // Inner Face (4, 7, 6, 5) - 2 triangles
        xInner, SUBFLOOR_TOP, W / 2,
        xInner, SUBFLOOR_TOP + H, W / 2,
        xInner, SUBFLOOR_TOP + H + ROOF_RISE, -W / 2,

        xInner, SUBFLOOR_TOP, W / 2,
        xInner, SUBFLOOR_TOP + H + ROOF_RISE, -W / 2,
        xInner, SUBFLOOR_TOP, -W / 2,

        // Top Sloped Face (3, 2, 6, 7) - 2 triangles
        xOuter, SUBFLOOR_TOP + H, W / 2,
        xOuter, SUBFLOOR_TOP + H + ROOF_RISE, -W / 2,
        xInner, SUBFLOOR_TOP + H + ROOF_RISE, -W / 2,

        xOuter, SUBFLOOR_TOP + H, W / 2,
        xInner, SUBFLOOR_TOP + H + ROOF_RISE, -W / 2,
        xInner, SUBFLOOR_TOP + H, W / 2,

        // Bottom Face (0, 4, 5, 1) - 2 triangles
        xOuter, SUBFLOOR_TOP, W / 2,
        xInner, SUBFLOOR_TOP, W / 2,
        xInner, SUBFLOOR_TOP, -W / 2,

        xOuter, SUBFLOOR_TOP, W / 2,
        xInner, SUBFLOOR_TOP, -W / 2,
        xOuter, SUBFLOOR_TOP, -W / 2,

        // Front Face at South (0, 3, 7, 4) - 2 triangles
        xOuter, SUBFLOOR_TOP, W / 2,
        xOuter, SUBFLOOR_TOP + H, W / 2,
        xInner, SUBFLOOR_TOP + H, W / 2,

        xOuter, SUBFLOOR_TOP, W / 2,
        xInner, SUBFLOOR_TOP + H, W / 2,
        xInner, SUBFLOOR_TOP, W / 2,

        // Rear Face at North (1, 5, 6, 2) - 2 triangles
        xOuter, SUBFLOOR_TOP, -W / 2,
        xInner, SUBFLOOR_TOP, -W / 2,
        xInner, SUBFLOOR_TOP + H + ROOF_RISE, -W / 2,

        xOuter, SUBFLOOR_TOP, -W / 2,
        xInner, SUBFLOOR_TOP + H + ROOF_RISE, -W / 2,
        xOuter, SUBFLOOR_TOP + H + ROOF_RISE, -W / 2,
      ]);

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.computeVertexNormals();
      applyMetricUVMapping(geo, SUBFLOOR_TOP, L, W, 0, 0, 0);
      return geo;
    };

    // East Gable Wall: outer face at +L/2, inner face at +L/2 - wallThick
    const eastGeo = createGableBufferGeo(L / 2 - wallThick, L / 2);
    const eastWall = new THREE.Mesh(eastGeo, wallPrimaryMat);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    wallsGroupRef.current?.add(eastWall);

    // West Gable Wall: outer face at -L/2, inner face at -L/2 + wallThick
    const westGeo = createGableBufferGeo(-L / 2 + wallThick, -L / 2);
    const westWall = new THREE.Mesh(westGeo, wallPrimaryMat);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    wallsGroupRef.current?.add(westWall);

    // Gable-End Apex Weatherproof Ventilation Louvers (East & West High Relief)
    const gLouverW = 0.48;
    const gLouverH = 0.36;
    const gLouverZ = -1.1; // positioned toward upper North roof slope
    const gLouverY = SUBFLOOR_TOP + 2.70;
    [-L / 2, L / 2].forEach(gx => {
      const isEast = gx > 0;
      const xOffset = isEast ? 0.015 : -0.015;

      // Outer frame
      const gFrameGeo = new THREE.BoxGeometry(0.045, gLouverH, gLouverW);
      const gFrame = new THREE.Mesh(gFrameGeo, rimMat);
      gFrame.position.set(gx + xOffset, gLouverY, gLouverZ);
      gFrame.castShadow = true;
      wallsGroupRef.current?.add(gFrame);

      // Insect mesh
      const gMeshGeo = new THREE.PlaneGeometry(gLouverW - 0.06, gLouverH - 0.06);
      const gMesh = new THREE.Mesh(gMeshGeo, rubberMat);
      gMesh.rotation.y = isEast ? Math.PI / 2 : -Math.PI / 2;
      gMesh.position.set(gx + (isEast ? 0.005 : -0.005), gLouverY, gLouverZ);
      wallsGroupRef.current?.add(gMesh);

      // Angled chevron blades
      const numGBlades = 4;
      for (let b = 0; b < numGBlades; b++) {
        const by = gLouverY - gLouverH / 2 + 0.05 + b * (gLouverH - 0.10) / (numGBlades - 1);
        const bladeGeo = new THREE.BoxGeometry(0.025, 0.03, gLouverW - 0.06);
        const bladeMesh = new THREE.Mesh(bladeGeo, lgsfMat);
        bladeMesh.rotation.z = isEast ? Math.PI / 4 : -Math.PI / 4;
        bladeMesh.position.set(gx + (isEast ? 0.025 : -0.025), by, gLouverZ);
        bladeMesh.castShadow = true;
        wallsGroupRef.current?.add(bladeMesh);
      }
    });

    // South (Front) Wall:
    // Low wall height H = 2.4m, positioned at Z = +W/2 - wallThick/2.
    // Length is L - 2*wallThick = 5.85m.
    // Openings:
    // 1. Storm Door: from X = -2.30 to X = -1.35 (width 0.95m, height 2.05m)
    // 2. Window 1: from X = -0.35 to X = +1.00 (width 1.35m, height 1.10m, sill @ 0.85m)
    // 3. Window 2: from X = +1.30 to X = +2.65 (width 1.35m, height 1.10m, sill @ 0.85m)

    // Solid Piers:
    // Pier Left: X = -3.00 to -2.30 (width 0.70m, less corner wallThick)
    const pLeftWidth = 0.70 - wallThick;
    const pLeftGeo = new THREE.BoxGeometry(pLeftWidth, 2.05, wallThick);
    const pLeftPosX = -L / 2 + wallThick + pLeftWidth / 2;
    const pLeftPosY = SUBFLOOR_TOP + 2.05 / 2;
    const pLeftPosZ = W / 2 - wallThick / 2;
    applyMetricUVMapping(pLeftGeo, SUBFLOOR_TOP, L, W, pLeftPosX, pLeftPosY, pLeftPosZ);
    const pLeft = new THREE.Mesh(pLeftGeo, wallPrimaryMat);
    pLeft.position.set(pLeftPosX, pLeftPosY, pLeftPosZ);
    pLeft.castShadow = true;
    pLeft.receiveShadow = true;
    wallsGroupRef.current?.add(pLeft);

    // Pier Mid 1 (between door & window 1): X = -1.35 to -0.35 (width 1.00m)
    const pMid1Geo = new THREE.BoxGeometry(1.00, 2.05, wallThick);
    const pMid1PosX = -0.85;
    const pMid1PosY = SUBFLOOR_TOP + 2.05 / 2;
    const pMid1PosZ = W / 2 - wallThick / 2;
    applyMetricUVMapping(pMid1Geo, SUBFLOOR_TOP, L, W, pMid1PosX, pMid1PosY, pMid1PosZ);
    const pMid1 = new THREE.Mesh(pMid1Geo, wallPrimaryMat);
    pMid1.position.set(pMid1PosX, pMid1PosY, pMid1PosZ);
    pMid1.castShadow = true;
    pMid1.receiveShadow = true;
    wallsGroupRef.current?.add(pMid1);

    // Pier Mid 2 (between window 1 & window 2): X = +1.00 to +1.30 (width 0.30m, height 1.20m)
    const pMid2Geo = new THREE.BoxGeometry(0.30, 1.20, wallThick);
    const pMid2PosX = 1.15;
    const pMid2PosY = SUBFLOOR_TOP + 0.85 + 1.20 / 2;
    const pMid2PosZ = W / 2 - wallThick / 2;
    applyMetricUVMapping(pMid2Geo, SUBFLOOR_TOP, L, W, pMid2PosX, pMid2PosY, pMid2PosZ);
    const pMid2 = new THREE.Mesh(pMid2Geo, wallPrimaryMat);
    pMid2.position.set(pMid2PosX, pMid2PosY, pMid2PosZ);
    pMid2.castShadow = true;
    pMid2.receiveShadow = true;
    wallsGroupRef.current?.add(pMid2);

    // Pier Right: X = +2.65 to +3.00 (width 0.35m, less corner wallThick)
    const pRightWidth = 0.35 - wallThick;
    const pRightGeo = new THREE.BoxGeometry(pRightWidth, 1.20, wallThick);
    const pRightPosX = L / 2 - wallThick - pRightWidth / 2;
    const pRightPosY = SUBFLOOR_TOP + 0.85 + 1.20 / 2;
    const pRightPosZ = W / 2 - wallThick / 2;
    applyMetricUVMapping(pRightGeo, SUBFLOOR_TOP, L, W, pRightPosX, pRightPosY, pRightPosZ);
    const pRight = new THREE.Mesh(pRightGeo, wallPrimaryMat);
    pRight.position.set(pRightPosX, pRightPosY, pRightPosZ);
    pRight.castShadow = true;
    pRight.receiveShadow = true;
    wallsGroupRef.current?.add(pRight);

    // Apron wall below windows: X = -0.35 to +3.00 - wallThick (height 0.85m)
    const apronW = (L / 2 - wallThick) - (-0.35);
    const apronGeo = new THREE.BoxGeometry(apronW, 0.85, wallThick);
    const apronPosX = -0.35 + apronW / 2;
    const apronPosY = SUBFLOOR_TOP + 0.85 / 2;
    const apronPosZ = W / 2 - wallThick / 2;
    applyMetricUVMapping(apronGeo, SUBFLOOR_TOP, L, W, apronPosX, apronPosY, apronPosZ);
    const apronMesh = new THREE.Mesh(apronGeo, wallPrimaryMat);
    apronMesh.position.set(apronPosX, apronPosY, apronPosZ);
    apronMesh.castShadow = true;
    apronMesh.receiveShadow = true;
    wallsGroupRef.current?.add(apronMesh);

    // Lintel header wall (continuous across front above door and windows, height 0.35m from 2.05m to 2.40m)
    const lintelW = L - 2 * wallThick;
    const lintelGeo = new THREE.BoxGeometry(lintelW, 0.35, wallThick);
    const lintelPosX = 0;
    const lintelPosY = SUBFLOOR_TOP + 2.05 + 0.35 / 2;
    const lintelPosZ = W / 2 - wallThick / 2;
    applyMetricUVMapping(lintelGeo, SUBFLOOR_TOP, L, W, lintelPosX, lintelPosY, lintelPosZ);
    const lintelMesh = new THREE.Mesh(lintelGeo, wallPrimaryMat);
    lintelMesh.position.set(lintelPosX, lintelPosY, lintelPosZ);
    lintelMesh.castShadow = true;
    lintelMesh.receiveShadow = true;
    wallsGroupRef.current?.add(lintelMesh);

    // Architectural two-tone accent stripe under eave line
    const stripeGeo = new THREE.BoxGeometry(lintelW - 0.04, 0.05, 0.008);
    const stripeMesh = new THREE.Mesh(stripeGeo, wallSecondaryMat);
    stripeMesh.position.set(0, SUBFLOOR_TOP + 2.30, W / 2 + 0.002);
    wallsGroupRef.current?.add(stripeMesh);

    // Architectural Base Starter Flashing Track (Galvanized J-Runner sealing wall base to subfloor)
    const baseTrackMat = rimMat;
    const baseTrackH = 0.035;
    const baseTrackD = 0.02;

    // North Base Flashing
    const northBaseGeo = new THREE.BoxGeometry(L, baseTrackH, baseTrackD);
    const northBaseMesh = new THREE.Mesh(northBaseGeo, baseTrackMat);
    northBaseMesh.position.set(0, SUBFLOOR_TOP + baseTrackH / 2, -W / 2 - baseTrackD / 2);
    northBaseMesh.castShadow = true;
    wallsGroupRef.current?.add(northBaseMesh);

    // East Base Flashing
    const eastBaseGeo = new THREE.BoxGeometry(baseTrackD, baseTrackH, W);
    const eastBaseMesh = new THREE.Mesh(eastBaseGeo, baseTrackMat);
    eastBaseMesh.position.set(L / 2 + baseTrackD / 2, SUBFLOOR_TOP + baseTrackH / 2, 0);
    eastBaseMesh.castShadow = true;
    wallsGroupRef.current?.add(eastBaseMesh);

    // West Base Flashing
    const westBaseGeo = new THREE.BoxGeometry(baseTrackD, baseTrackH, W);
    const westBaseMesh = new THREE.Mesh(westBaseGeo, baseTrackMat);
    westBaseMesh.position.set(-L / 2 - baseTrackD / 2, SUBFLOOR_TOP + baseTrackH / 2, 0);
    westBaseMesh.castShadow = true;
    wallsGroupRef.current?.add(westBaseMesh);

    // South Base Flashing (Left of door: X = -3.0 to -2.30)
    const sBaseLGeo = new THREE.BoxGeometry(0.70, baseTrackH, baseTrackD);
    const sBaseLMesh = new THREE.Mesh(sBaseLGeo, baseTrackMat);
    sBaseLMesh.position.set(-L / 2 + 0.35, SUBFLOOR_TOP + baseTrackH / 2, W / 2 + baseTrackD / 2);
    sBaseLMesh.castShadow = true;
    wallsGroupRef.current?.add(sBaseLMesh);

    // South Base Flashing (Right of door: X = -1.35 to +3.0)
    const sBaseRW = L / 2 - (-1.35);
    const sBaseRGeo = new THREE.BoxGeometry(sBaseRW, baseTrackH, baseTrackD);
    const sBaseRMesh = new THREE.Mesh(sBaseRGeo, baseTrackMat);
    sBaseRMesh.position.set(-1.35 + sBaseRW / 2, SUBFLOOR_TOP + baseTrackH / 2, W / 2 + baseTrackD / 2);
    sBaseRMesh.castShadow = true;
    wallsGroupRef.current?.add(sBaseRMesh);

    // Architectural Corner Flashing Closures (Extruded L-angles capping outer corners)
    const cornerClosureMat = lgsfMat;
    const cornerWing = 0.07;
    const cornerThick = 0.01;

    const cornerFlashings = [
      // NW: (-L/2, -W/2), height northH
      { cx: -L / 2, cz: -W / 2, ch: northH, sx: 1, sz: 1 },
      // NE: (+L/2, -W/2), height northH
      { cx: L / 2, cz: -W / 2, ch: northH, sx: -1, sz: 1 },
      // SW: (-L/2, +W/2), height H
      { cx: -L / 2, cz: W / 2, ch: H, sx: 1, sz: -1 },
      // SE: (+L/2, +W/2), height H
      { cx: L / 2, cz: W / 2, ch: H, sx: -1, sz: -1 },
    ];

    cornerFlashings.forEach(({ cx, cz, ch, sx, sz }) => {
      // Flange along X
      const f1Geo = new THREE.BoxGeometry(cornerWing, ch, cornerThick);
      const f1Mesh = new THREE.Mesh(f1Geo, cornerClosureMat);
      f1Mesh.position.set(cx + (sx * cornerWing) / 2, SUBFLOOR_TOP + ch / 2, cz - (sz * cornerThick) / 2);
      f1Mesh.castShadow = true;
      wallsGroupRef.current?.add(f1Mesh);

      // Flange along Z
      const f2Geo = new THREE.BoxGeometry(cornerThick, ch, cornerWing);
      const f2Mesh = new THREE.Mesh(f2Geo, cornerClosureMat);
      f2Mesh.position.set(cx - (sx * cornerThick) / 2, SUBFLOOR_TOP + ch / 2, cz + (sz * cornerWing) / 2);
      f2Mesh.castShadow = true;
      wallsGroupRef.current?.add(f2Mesh);

      // Structural rivets along corner trim (every 0.5m)
      const numRivets = Math.floor(ch / 0.5);
      for (let r = 1; r <= numRivets; r++) {
        const rivetY = SUBFLOOR_TOP + r * 0.5;
        const rivetGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.012, 6);
        const r1 = new THREE.Mesh(rivetGeo, boltMat);
        r1.rotation.x = Math.PI / 2;
        r1.position.set(cx + sx * 0.035, rivetY, cz - sz * 0.008);
        wallsGroupRef.current?.add(r1);
      }
    });

    // Gable Top Sloped Rake Flashings (East & West)
    const rakeLen = Math.sqrt(W * W + ROOF_RISE * ROOF_RISE);
    const rakeGeo = new THREE.BoxGeometry(0.025, 0.045, rakeLen);
    const eastRake = new THREE.Mesh(rakeGeo, cornerClosureMat);
    eastRake.position.set(L / 2 + 0.008, SUBFLOOR_TOP + H + ROOF_RISE / 2, 0);
    eastRake.rotation.x = PITCH_RAD;
    wallsGroupRef.current?.add(eastRake);

    const westRake = new THREE.Mesh(rakeGeo, cornerClosureMat);
    westRake.position.set(-L / 2 - 0.008, SUBFLOOR_TOP + H + ROOF_RISE / 2, 0);
    westRake.rotation.x = PITCH_RAD;
    wallsGroupRef.current?.add(westRake);

    // ==========================================
    // 4. FENESTRATION: South Windows (Exact Aperture Fit)
    // ==========================================
    const windowConfigs = [
      { x: 0.325, y: SUBFLOOR_TOP + 0.85 + 1.10 / 2, w: 1.35, h: 1.10 },
      { x: 1.975, y: SUBFLOOR_TOP + 0.85 + 1.10 / 2, w: 1.35, h: 1.10 },
    ];

    windowConfigs.forEach(({ x, y, w, h }) => {
      const frameGeo = new THREE.BoxGeometry(w, h, 0.08);
      const frameMesh = new THREE.Mesh(frameGeo, rubberMat);
      frameMesh.position.set(x, y, W / 2 - wallThick / 2);
      wallsGroupRef.current?.add(frameMesh);

      const sillGeo = new THREE.BoxGeometry(w + 0.08, 0.035, 0.12);
      const sillMesh = new THREE.Mesh(sillGeo, rimMat);
      sillMesh.position.set(x, y - h / 2 - 0.015, W / 2 + 0.02);
      sillMesh.castShadow = true;
      wallsGroupRef.current?.add(sillMesh);

      const glassOuterGeo = new THREE.BoxGeometry(w - 0.08, h - 0.08, 0.016);
      const glassOuter = new THREE.Mesh(glassOuterGeo, glassMat);
      glassOuter.position.set(x, y, W / 2 - 0.01);
      wallsGroupRef.current?.add(glassOuter);

      const glassInnerGeo = new THREE.BoxGeometry(w - 0.08, h - 0.08, 0.016);
      const glassInner = new THREE.Mesh(glassInnerGeo, glassMat);
      glassInner.position.set(x, y, W / 2 - wallThick + 0.015);
      wallsGroupRef.current?.add(glassInner);

      const mullionGeo = new THREE.BoxGeometry(0.035, h, 0.04);
      const mullionMesh = new THREE.Mesh(mullionGeo, rimMat);
      mullionMesh.position.set(x, y, W / 2 - 0.01);
      wallsGroupRef.current?.add(mullionMesh);

      // Window Head Drip Cap
      const winDripGeo = new THREE.BoxGeometry(w + 0.08, 0.025, 0.05);
      const winDrip = new THREE.Mesh(winDripGeo, rimMat);
      winDrip.position.set(x, y + h / 2 + 0.012, W / 2 + 0.025);
      winDrip.castShadow = true;
      wallsGroupRef.current?.add(winDrip);
    });

    // Low-Level Fresh Air Intake Weather Louvers (Thermosiphon Air Exchange Intake)
    // Placed on South apron wall below window sills to introduce fresh air
    windowConfigs.forEach(({ x }) => {
      const inW = 0.52;
      const inH = 0.20;
      const inY = SUBFLOOR_TOP + 0.38;

      // Outer storm cowl frame
      const inFrameGeo = new THREE.BoxGeometry(inW, inH, 0.04);
      const inFrame = new THREE.Mesh(inFrameGeo, rimMat);
      inFrame.position.set(x, inY, W / 2 + 0.015);
      inFrame.castShadow = true;
      wallsGroupRef.current?.add(inFrame);

      // Dark insect/fine intake screen
      const inScreenGeo = new THREE.PlaneGeometry(inW - 0.04, inH - 0.04);
      const inScreen = new THREE.Mesh(inScreenGeo, rubberMat);
      inScreen.position.set(x, inY, W / 2 + 0.036);
      wallsGroupRef.current?.add(inScreen);

      // Weather deflector hood
      const inHoodGeo = new THREE.BoxGeometry(inW + 0.04, 0.025, 0.05);
      const inHood = new THREE.Mesh(inHoodGeo, rimMat);
      inHood.position.set(x, inY + inH / 2 + 0.01, W / 2 + 0.035);
      inHood.castShadow = true;
      wallsGroupRef.current?.add(inHood);
    });

    // ==========================================
    // 5. APERTURE: Insulated Thermal-Curtain Entryway
    // ==========================================
    const doorX = -1.825;
    const doorW = 0.95;
    const doorH = 2.05;
    const doorY = SUBFLOOR_TOP + doorH / 2;

    // Door Head Drip Cap
    const doorDripGeo = new THREE.BoxGeometry(doorW + 0.10, 0.03, 0.06);
    const doorDrip = new THREE.Mesh(doorDripGeo, baseTrackMat);
    doorDrip.position.set(doorX, SUBFLOOR_TOP + doorH + 0.015, W / 2 + 0.03);
    doorDrip.castShadow = true;
    wallsGroupRef.current?.add(doorDrip);

    const doorJambGeo = new THREE.BoxGeometry(doorW, doorH, 0.09);
    const doorJamb = new THREE.Mesh(doorJambGeo, rimMat);
    doorJamb.position.set(doorX, doorY, W / 2 - wallThick / 2);
    wallsGroupRef.current?.add(doorJamb);

    const doorLeafGeo = new THREE.BoxGeometry(doorW - 0.04, doorH - 0.04, 0.05);
    const doorLeaf = new THREE.Mesh(doorLeafGeo, doorCurtainMat);
    doorLeaf.position.set(doorX, doorY, W / 2 - 0.02);
    doorLeaf.castShadow = true;
    wallsGroupRef.current?.add(doorLeaf);

    const flapGeo = new THREE.BoxGeometry(doorW - 0.08, doorH - 0.08, 0.008);
    const flapMat = getMaterial('#333e31', 'wall');
    const flapMesh = new THREE.Mesh(flapGeo, flapMat);
    flapMesh.position.set(doorX, doorY, W / 2 + 0.008);
    wallsGroupRef.current?.add(flapMesh);

    const handlePlateGeo = new THREE.BoxGeometry(0.08, 0.28, 0.015);
    const handlePlate = new THREE.Mesh(handlePlateGeo, boltMat);
    handlePlate.position.set(doorX + doorW / 2 - 0.12, doorY - 0.05, W / 2 + 0.02);
    wallsGroupRef.current?.add(handlePlate);

    const leverGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.16);
    const leverMesh = new THREE.Mesh(leverGeo, boltMat);
    leverMesh.rotation.z = Math.PI / 2;
    leverMesh.position.set(doorX + doorW / 2 - 0.14, doorY - 0.05, W / 2 + 0.04);
    wallsGroupRef.current?.add(leverMesh);

    [-0.7, 0, 0.7].forEach(offsetY => {
      const hingeGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.1, 8);
      const hingeMesh = new THREE.Mesh(hingeGeo, boltMat);
      hingeMesh.position.set(doorX - doorW / 2 + 0.02, doorY + offsetY, W / 2 + 0.01);
      wallsGroupRef.current?.add(hingeMesh);
    });

    // ==========================================
    // 6. STRUCTURE: LGSF Corner Exoskeletons (Precise Outer Corners)
    // ==========================================
    // Outer corner coordinates:
    // NW: (-L/2, -W/2), NE: (+L/2, -W/2), SE: (+L/2, +W/2), SW: (-L/2, +W/2)
    // North corners height = northH; South corners height = H
    const colThickness = 0.08;
    const cornerDefs = [
      // NW corner (-L/2, -W/2)
      { x: -L / 2 + colThickness / 2, z: -W / 2 + colThickness / 2, h: northH },
      // NE corner (+L/2, -W/2)
      { x: L / 2 - colThickness / 2, z: -W / 2 + colThickness / 2, h: northH },
      // SE corner (+L/2, +W/2)
      { x: L / 2 - colThickness / 2, z: W / 2 - colThickness / 2, h: H },
      // SW corner (-L/2, +W/2)
      { x: -L / 2 + colThickness / 2, z: W / 2 - colThickness / 2, h: H },
    ];

    cornerDefs.forEach(({ x, z, h }) => {
      // Column C-channel box
      const colGeo = new THREE.BoxGeometry(colThickness, h, colThickness);
      const colMesh = new THREE.Mesh(colGeo, lgsfMat);
      colMesh.position.set(x, SUBFLOOR_TOP + h / 2, z);
      colMesh.castShadow = true;
      frameGroupRef.current?.add(colMesh);

      // Industrial Gusset Brackets with M12 Hex Bolts at top, mid, bottom
      [-h / 2 + 0.2, 0, h / 2 - 0.2].forEach(yPos => {
        const gussetGeo = new THREE.BoxGeometry(colThickness + 0.02, 0.14, colThickness + 0.02);
        const gusset = new THREE.Mesh(gussetGeo, lgsfMat);
        gusset.position.set(x, SUBFLOOR_TOP + h / 2 + yPos, z);
        frameGroupRef.current?.add(gusset);

        // Visible Hex Bolt Heads on outer faces
        const boltGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.015, 6);
        const b1 = new THREE.Mesh(boltGeo, boltMat);
        b1.rotation.x = Math.PI / 2;
        b1.position.set(x, SUBFLOOR_TOP + h / 2 + yPos, z + colThickness / 2 + 0.01);
        frameGroupRef.current?.add(b1);
      });
    });

    // ==========================================
    // 7. ROOF: 15° Pitched Corrugated Roof (Resting Flush on Walls)
    // ==========================================
    if (!roofRemoved) {
      const overhangX = 0.25;
      const overhangZ = 0.25;
      const roofSpanL = L + overhangX * 2; // 6.50m
      const roofSlopeDepth = (W + overhangZ * 2) / Math.cos(PITCH_RAD); // ≈ 4.659m
      const roofThick = 0.04;

      const roofSubGroup = new THREE.Group();

      // Sloped geometry positioning:
      // South eave (Z = +W/2): top of South wall is Y = SUBFLOOR_TOP + H
      // North ridge (Z = -W/2): top of North wall is Y = SUBFLOOR_TOP + H + ROOF_RISE
      // Midpoint along Z (Z = 0): Y_mid = SUBFLOOR_TOP + H + ROOF_RISE / 2
      // Thickness normal offset adds (roofThick / 2) / cos(PITCH_RAD)
      const roofMidY = SUBFLOOR_TOP + H + ROOF_RISE / 2 + (roofThick / 2) / Math.cos(PITCH_RAD);

      roofSubGroup.position.set(0, roofMidY, 0);
      // Slope: mono-pitch ascending from South (+Z) to North (-Z)
      // When rot.x = +PITCH_RAD:
      // Point at +Z (South front wall) has lower Y (matching H = 2.40m)
      // Point at -Z (North rear wall) has higher Y (matching northH = 3.47m)
      roofSubGroup.rotation.x = PITCH_RAD;

      // Corrugated composite substrate deck
      const substrateGeo = new THREE.BoxGeometry(roofSpanL, roofThick, roofSlopeDepth);
      const substrate = new THREE.Mesh(substrateGeo, roofMat);
      substrate.castShadow = true;
      substrate.receiveShadow = true;
      roofSubGroup.add(substrate);

      // Corrugated sinusoidal ribs (36 ribs along length)
      const numRibs = 36;
      const ribSpacing = roofSpanL / numRibs;
      for (let i = 0; i <= numRibs; i++) {
        const rx = -roofSpanL / 2 + i * ribSpacing;
        const ribGeo = new THREE.CylinderGeometry(0.018, 0.018, roofSlopeDepth, 6);
        const ribMesh = new THREE.Mesh(ribGeo, roofMat);
        ribMesh.rotation.x = Math.PI / 2;
        ribMesh.position.set(rx, roofThick / 2 + 0.016, 0);
        ribMesh.castShadow = true;
        roofSubGroup.add(ribMesh);
      }

      // Rake / Bargeboard side trim on East (+X) and West (-X) edges to seal gable profile
      [-roofSpanL / 2 + 0.015, roofSpanL / 2 - 0.015].forEach(rx => {
        const rakeTrimGeo = new THREE.BoxGeometry(0.03, roofThick + 0.045, roofSlopeDepth);
        const rakeTrim = new THREE.Mesh(rakeTrimGeo, roofRidgeMat);
        rakeTrim.position.set(rx, 0.015, 0);
        rakeTrim.castShadow = true;
        roofSubGroup.add(rakeTrim);
      });

      // Ridge Cap (at North highest edge: local Z = -roofSlopeDepth / 2)
      const ridgeGeo = new THREE.BoxGeometry(roofSpanL + 0.04, 0.08, 0.18);
      const ridgeMesh = new THREE.Mesh(ridgeGeo, roofRidgeMat);
      ridgeMesh.position.set(0, roofThick / 2 + 0.04, -roofSlopeDepth / 2 + 0.06);
      roofSubGroup.add(ridgeMesh);

      // Drip edge gutter bar at lower South edge (local Z = +roofSlopeDepth / 2)
      const dripGeo = new THREE.BoxGeometry(roofSpanL + 0.04, 0.06, 0.08);
      const dripMesh = new THREE.Mesh(dripGeo, roofRidgeMat);
      dripMesh.position.set(0, -roofThick / 2 - 0.01, roofSlopeDepth / 2 - 0.03);
      roofSubGroup.add(dripMesh);

      // Photovoltaic / Solar Thermal Survival Bracket Mounts
      [-1.8, 1.8].forEach(sx => {
        const solarMountGeo = new THREE.BoxGeometry(1.6, 0.02, 0.9);
        const solarMount = new THREE.Mesh(solarMountGeo, rimMat);
        solarMount.position.set(sx, roofThick / 2 + 0.035, 0.2);
        roofSubGroup.add(solarMount);
      });

      // Aerodynamic Rotary Wind-Turbine Extraction Cowls (Dual Roof Exhaust Turbines)
      // Positioned high near the North ridge where thermal air updraft collects
      [-0.85, 0.85].forEach(vx => {
        const vz = -roofSlopeDepth / 2 + 0.95;

        // 1. Base Flashing Skirt Plate contoured to corrugated deck
        const baseSkirtGeo = new THREE.BoxGeometry(0.50, 0.016, 0.50);
        const baseSkirt = new THREE.Mesh(baseSkirtGeo, rimMat);
        baseSkirt.position.set(vx, roofThick / 2 + 0.02, vz);
        baseSkirt.castShadow = true;
        roofSubGroup.add(baseSkirt);

        // Fastener tek screws around skirt
        [-0.20, 0.20].forEach(bx => {
          [-0.20, 0.20].forEach(bz => {
            const screwGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.015, 6);
            const screw = new THREE.Mesh(screwGeo, boltMat);
            screw.position.set(vx + bx, roofThick / 2 + 0.035, vz + bz);
            roofSubGroup.add(screw);
          });
        });

        // 2. Fixed Upstand Duct Collar
        const ductGeo = new THREE.CylinderGeometry(0.15, 0.16, 0.22, 18);
        const ductMesh = new THREE.Mesh(ductGeo, rimMat);
        ductMesh.position.set(vx, roofThick / 2 + 0.02 + 0.11, vz);
        ductMesh.castShadow = true;
        roofSubGroup.add(ductMesh);

        // Heavy-duty clamp band ring
        const clampGeo = new THREE.TorusGeometry(0.16, 0.012, 8, 20);
        const clampMesh = new THREE.Mesh(clampGeo, boltMat);
        clampMesh.rotation.x = Math.PI / 2;
        clampMesh.position.set(vx, roofThick / 2 + 0.15, vz);
        roofSubGroup.add(clampMesh);

        // 3. Rotating Turbine Head (subgroup added to ventRotatorsRef)
        const turbineGroup = new THREE.Group();
        turbineGroup.position.set(vx, roofThick / 2 + 0.02 + 0.22, vz);

        // Lower rotating throat collar
        const throatGeo = new THREE.CylinderGeometry(0.20, 0.15, 0.04, 18);
        const throatMesh = new THREE.Mesh(throatGeo, rimMat);
        throatMesh.position.y = 0.02;
        turbineGroup.add(throatMesh);

        // 12 Curved Aerodynamic Extraction Vanes
        const numVanes = 12;
        for (let v = 0; v < numVanes; v++) {
          const theta = (v / numVanes) * Math.PI * 2;
          const vaneGeo = new THREE.BoxGeometry(0.012, 0.18, 0.07);
          const vaneMesh = new THREE.Mesh(vaneGeo, rimMat);
          vaneMesh.position.set(Math.cos(theta) * 0.18, 0.11, Math.sin(theta) * 0.18);
          vaneMesh.rotation.y = theta + 0.55; // Aerodynamic angle of attack
          vaneMesh.castShadow = true;
          turbineGroup.add(vaneMesh);
        }

        // Spherical Top Dome Cap
        const domeGeo = new THREE.SphereGeometry(0.20, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMesh = new THREE.Mesh(domeGeo, rimMat);
        domeMesh.position.y = 0.20;
        domeMesh.castShadow = true;
        turbineGroup.add(domeMesh);

        // Top stainless steel bearing spindle & nut
        const spindleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.04, 6);
        const spindleMesh = new THREE.Mesh(spindleGeo, boltMat);
        spindleMesh.position.y = 0.24;
        turbineGroup.add(spindleMesh);

        roofSubGroup.add(turbineGroup);
        ventRotatorsRef.current.push(turbineGroup);
      });

      roofGroupRef.current?.add(roofSubGroup);
    }

    // ==========================================
    // 8. INTERIOR: Medical Cots & Survival Equipment
    // ==========================================
    const cotMat = getMaterial('#334155', 'wood');
    const fabricMat = getMaterial('#cbd5e1', 'wood');
    const ledMat = new THREE.MeshBasicMaterial({ color: '#fffaed' });

    // 2 Modular Disaster Relief Cots (0.85m x 1.9m)
    [
      { x: -1.7, z: -0.9 },
      { x: 1.7, z: -0.9 },
    ].forEach(({ x, z }) => {
      // Cot frame
      const cotFrameGeo = new THREE.BoxGeometry(0.85, 0.35, 1.9);
      const cotFrame = new THREE.Mesh(cotFrameGeo, cotMat);
      cotFrame.position.set(x, SUBFLOOR_TOP + 0.175, z);
      cotFrame.castShadow = true;
      interiorGroupRef.current?.add(cotFrame);

      // Cot mattress
      const padGeo = new THREE.BoxGeometry(0.78, 0.1, 1.82);
      const pad = new THREE.Mesh(padGeo, fabricMat);
      pad.position.set(x, SUBFLOOR_TOP + 0.35 + 0.05, z);
      interiorGroupRef.current?.add(pad);
    });

    // Emergency Battery & Thermal Management Hub
    const hubGeo = new THREE.BoxGeometry(0.65, 0.85, 0.45);
    const hubMat = getMaterial('#1e293b', 'steel');
    const hubMesh = new THREE.Mesh(hubGeo, hubMat);
    hubMesh.position.set(-2.4, SUBFLOOR_TOP + 0.85 / 2, 0.8);
    interiorGroupRef.current?.add(hubMesh);

    // Wall-Hung Emergency Fresh Air & HRV Filtration Unit (North Interior Wall)
    const hrvGeo = new THREE.BoxGeometry(0.65, 0.36, 0.22);
    const hrvMesh = new THREE.Mesh(hrvGeo, hubMat);
    hrvMesh.position.set(0, SUBFLOOR_TOP + 2.45, -W / 2 + wallThick + 0.11);
    interiorGroupRef.current?.add(hrvMesh);

    // Dual intake/exhaust duct sleeves penetrating North wall
    [-0.18, 0.18].forEach(dx => {
      const ductSleeveGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12);
      const ductSleeve = new THREE.Mesh(ductSleeveGeo, rimMat);
      ductSleeve.rotation.x = Math.PI / 2;
      ductSleeve.position.set(dx, SUBFLOOR_TOP + 2.45, -W / 2 + wallThick / 2);
      interiorGroupRef.current?.add(ductSleeve);
    });

    // Fresh Air Supply Diffuser Grille on front of HRV
    const diffuserGeo = new THREE.BoxGeometry(0.50, 0.12, 0.015);
    const diffuserMesh = new THREE.Mesh(diffuserGeo, rubberMat);
    diffuserMesh.position.set(0, SUBFLOOR_TOP + 2.40, -W / 2 + wallThick + 0.225);
    interiorGroupRef.current?.add(diffuserMesh);

    // Green operational status LED indicator
    const hrvLedGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.012, 8);
    const hrvLedMat = new THREE.MeshBasicMaterial({ color: '#22c55e' });
    const hrvLed = new THREE.Mesh(hrvLedGeo, hrvLedMat);
    hrvLed.rotation.x = Math.PI / 2;
    hrvLed.position.set(0.24, SUBFLOOR_TOP + 2.55, -W / 2 + wallThick + 0.225);
    interiorGroupRef.current?.add(hrvLed);

    // ==========================================
    // 8B. INTERIOR LIGHTING: Dual-Zone Suspended LED Battens & Task Luminaires
    // ==========================================
    const isLightOn = interiorLightsOn !== false;
    const lightColorHex = !isLightOn
      ? '#0f172a'
      : interiorLightMode === 'emergency'
      ? '#ef4444' // Tactical low-lux emergency red
      : interiorLightMode === 'daylight'
      ? '#e0f2fe' // 5000K crisp daylight inspection white
      : '#ffeacc'; // 3200K warm architectural amber

    const glowColorHex = !isLightOn
      ? '#334155'
      : interiorLightMode === 'emergency'
      ? '#f87171'
      : interiorLightMode === 'daylight'
      ? '#ffffff'
      : '#fff7ed';

    const lightIntensity = !isLightOn ? 0 : interiorLightMode === 'emergency' ? 1.6 : 2.8;

    // Emissive material for linear diffuser lens
    const battenDiffuserMat = new THREE.MeshStandardMaterial({
      color: glowColorHex,
      emissive: glowColorHex,
      emissiveIntensity: isLightOn ? (interiorLightMode === 'emergency' ? 1.8 : 1.4) : 0.05,
      roughness: 0.2,
      metalness: 0.05,
    });
    const luminaireHousingMat = getMaterial('#1e293b', 'steel');
    const luminaireTrimMat = rimMat;

    // 1. Dual Overhead Suspended LED Battens (West Zone X = -1.5m, East Zone X = +1.5m)
    // Running along Z axis for 2.4m, pitched at 15° matching the ceiling slope
    const battenLen = 2.4;
    [-1.5, 1.5].forEach(lx => {
      const battenGroup = new THREE.Group();
      // Mid-ceiling reference height at Z = 0
      const battenY = SUBFLOOR_TOP + H + ROOF_RISE / 2 - 0.16;
      battenGroup.position.set(lx, battenY, 0);
      battenGroup.rotation.x = PITCH_RAD; // 15° mono-pitch ceiling alignment

      // Extruded aluminum housing channel
      const housingGeo = new THREE.BoxGeometry(0.09, 0.045, battenLen);
      const housingMesh = new THREE.Mesh(housingGeo, luminaireHousingMat);
      housingMesh.castShadow = true;
      battenGroup.add(housingMesh);

      // Frosted convex acrylic diffuser lens on bottom
      const diffuserGeo = new THREE.BoxGeometry(0.075, 0.016, battenLen - 0.04);
      const diffuserMesh = new THREE.Mesh(diffuserGeo, battenDiffuserMat);
      diffuserMesh.position.y = -0.024;
      battenGroup.add(diffuserMesh);

      // Aluminum end caps with rubber cable glands
      [-battenLen / 2 + 0.01, battenLen / 2 - 0.01].forEach(ez => {
        const capGeo = new THREE.BoxGeometry(0.094, 0.048, 0.02);
        const capMesh = new THREE.Mesh(capGeo, luminaireTrimMat);
        capMesh.position.z = ez;
        battenGroup.add(capMesh);

        // Suspension steel drop wire up to roof purlin
        const wireGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.26);
        const wireMesh = new THREE.Mesh(wireGeo, boltMat);
        wireMesh.position.set(0, 0.14, ez);
        battenGroup.add(wireMesh);
      });

      interiorGroupRef.current?.add(battenGroup);

      // Dedicated Three.js PointLight per batten emitting realistic diffuse ambient illumination
      if (isLightOn) {
        const battenLight = new THREE.PointLight(lightColorHex, lightIntensity, 7.5, 1.5);
        battenLight.position.set(lx, battenY - 0.15, 0);
        interiorGroupRef.current?.add(battenLight);
      }
    });

    // 2. Entryway Threshold Downlight (Weather-Sealed Bulkhead Luminaire above Storm Door)
    const entryLightY = SUBFLOOR_TOP + doorH + 0.10;
    const entryLightZ = W / 2 - 0.12;

    const entryHousingGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.045, 16);
    const entryHousing = new THREE.Mesh(entryHousingGeo, luminaireHousingMat);
    entryHousing.position.set(doorX, entryLightY, entryLightZ);
    interiorGroupRef.current?.add(entryHousing);

    const entryLensGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.015, 16);
    const entryLens = new THREE.Mesh(entryLensGeo, battenDiffuserMat);
    entryLens.position.set(doorX, entryLightY - 0.025, entryLightZ);
    interiorGroupRef.current?.add(entryLens);

    if (isLightOn) {
      const entrySpot = new THREE.SpotLight(lightColorHex, lightIntensity * 0.9, 4.5, Math.PI / 3, 0.6, 1.5);
      entrySpot.position.set(doorX, entryLightY - 0.03, entryLightZ);
      entrySpot.target.position.set(doorX, SUBFLOOR_TOP, entryLightZ);
      interiorGroupRef.current?.add(entrySpot);
      interiorGroupRef.current?.add(entrySpot.target);
    }

    // 3. Equipment & Medical Workstation Articulated Task Luminaire
    const taskArmX = -2.4;
    const taskArmY = SUBFLOOR_TOP + 1.48;
    const taskArmZ = 0.8;

    // Wall mounting bracket
    const taskBracketGeo = new THREE.BoxGeometry(0.06, 0.10, 0.02);
    const taskBracket = new THREE.Mesh(taskBracketGeo, luminaireTrimMat);
    taskBracket.position.set(taskArmX - 0.35, taskArmY, taskArmZ);
    interiorGroupRef.current?.add(taskBracket);

    // Cantilever gooseneck arm
    const taskArmGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.32);
    const taskArm = new THREE.Mesh(taskArmGeo, boltMat);
    taskArm.rotation.z = Math.PI / 3;
    taskArm.position.set(taskArmX - 0.20, taskArmY + 0.08, taskArmZ);
    interiorGroupRef.current?.add(taskArm);

    // Conical lamp shade
    const taskShadeGeo = new THREE.ConeGeometry(0.08, 0.12, 16, 1, true);
    const taskShade = new THREE.Mesh(taskShadeGeo, luminaireHousingMat);
    taskShade.position.set(taskArmX, taskArmY + 0.14, taskArmZ);
    interiorGroupRef.current?.add(taskShade);

    // Internal task emitter bulb
    const taskBulbGeo = new THREE.SphereGeometry(0.03, 12, 12);
    const taskBulb = new THREE.Mesh(taskBulbGeo, battenDiffuserMat);
    taskBulb.position.set(taskArmX, taskArmY + 0.11, taskArmZ);
    interiorGroupRef.current?.add(taskBulb);

    if (isLightOn) {
      const taskSpot = new THREE.SpotLight(lightColorHex, lightIntensity * 0.85, 3.5, Math.PI / 4, 0.5, 1.4);
      taskSpot.position.set(taskArmX, taskArmY + 0.10, taskArmZ);
      taskSpot.target.position.set(taskArmX, SUBFLOOR_TOP + 0.85, taskArmZ);
      interiorGroupRef.current?.add(taskSpot);
      interiorGroupRef.current?.add(taskSpot.target);
    }

    // 4. Floor Perimeter Low-Lux Egress Guide Strips
    // Photoluminescent baseboard markers illuminating circulation paths
    const guideStripColor = isLightOn
      ? interiorLightMode === 'emergency'
        ? '#ef4444'
        : '#0284c7'
      : '#1e293b';
    const guideStripMat = new THREE.MeshBasicMaterial({ color: guideStripColor });

    // North & South interior baseboard strips
    const nsStripGeo = new THREE.BoxGeometry(L - 2 * wallThick - 0.2, 0.015, 0.008);
    const northStrip = new THREE.Mesh(nsStripGeo, guideStripMat);
    northStrip.position.set(0, SUBFLOOR_TOP + 0.012, -W / 2 + wallThick + 0.006);
    interiorGroupRef.current?.add(northStrip);

    const southStrip = new THREE.Mesh(nsStripGeo, guideStripMat);
    southStrip.position.set(0, SUBFLOOR_TOP + 0.012, W / 2 - wallThick - 0.006);
    interiorGroupRef.current?.add(southStrip);

    // ==========================================
    // 9. TECHNICAL DIMENSION LINES (6m × 4m × 2.4m, 150mm, 15°)
    // ==========================================
    if (showDimensions) {
      const dimLineMat = new THREE.LineBasicMaterial({ color: '#38bdf8', linewidth: 2 });
      const createDimLine = (p1: [number, number, number], p2: [number, number, number]) => {
        const points = [new THREE.Vector3(...p1), new THREE.Vector3(...p2)];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        return new THREE.Line(geo, dimLineMat);
      };

      // 6.0m Length dimension line along front
      const dimLength = createDimLine([-L / 2, 0.05, W / 2 + 0.65], [L / 2, 0.05, W / 2 + 0.65]);
      dimensionsGroupRef.current?.add(dimLength);

      // End tick marks for 6.0m
      dimensionsGroupRef.current?.add(createDimLine([-L / 2, 0.05, W / 2 + 0.55], [-L / 2, 0.05, W / 2 + 0.75]));
      dimensionsGroupRef.current?.add(createDimLine([L / 2, 0.05, W / 2 + 0.55], [L / 2, 0.05, W / 2 + 0.75]));

      // 4.0m Width dimension line along right side
      const dimWidth = createDimLine([L / 2 + 0.65, 0.05, -W / 2], [L / 2 + 0.65, 0.05, W / 2]);
      dimensionsGroupRef.current?.add(dimWidth);
      dimensionsGroupRef.current?.add(createDimLine([L / 2 + 0.55, 0.05, -W / 2], [L / 2 + 0.75, 0.05, -W / 2]));
      dimensionsGroupRef.current?.add(createDimLine([L / 2 + 0.55, 0.05, W / 2], [L / 2 + 0.75, 0.05, W / 2]));

      // 2.4m Wall Height line on right corner
      const dimHeight = createDimLine([L / 2 + 0.35, SUBFLOOR_TOP, W / 2 + 0.05], [L / 2 + 0.35, SUBFLOOR_TOP + H, W / 2 + 0.05]);
      dimensionsGroupRef.current?.add(dimHeight);

      // 150mm Elevation line
      const dimElev = createDimLine([-L / 2 - 0.35, 0, W / 2], [-L / 2 - 0.35, ELEVATION, W / 2]);
      dimensionsGroupRef.current?.add(dimElev);
    }

    // ==========================================
    // 10. INTERACTIVE 3D HOTSPOT PINS
    // ==========================================
    if (showHotspots) {
      HOTSPOTS.forEach(spot => {
        const isSelected = selectedHotspotId === spot.id;
        const pinColor = isSelected ? '#f59e0b' : '#38bdf8';

        // Outer pulsing ring / sphere marker
        const pinGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const pinMat = new THREE.MeshBasicMaterial({
          color: pinColor,
          wireframe: !isSelected,
        });
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        pinMesh.position.set(...spot.position);
        pinMesh.userData = { hotspotId: spot.id };
        hotspotsGroupRef.current?.add(pinMesh);

        // Core dot
        const coreGeo = new THREE.SphereGeometry(0.06, 12, 12);
        const coreMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.position.set(...spot.position);
        hotspotsGroupRef.current?.add(coreMesh);
      });
    }

    // In X-Ray mode, ensure internal structural skeleton & interior equipment render before translucent envelope
    if (frameGroupRef.current) frameGroupRef.current.renderOrder = 0;
    if (footingsGroupRef.current) footingsGroupRef.current.renderOrder = 0;
    if (interiorGroupRef.current) interiorGroupRef.current.renderOrder = 0;
    if (floorGroupRef.current) floorGroupRef.current.renderOrder = renderMode === 'xray' ? 1 : 0;
    if (wallsGroupRef.current) wallsGroupRef.current.renderOrder = renderMode === 'xray' ? 2 : 0;
    if (roofGroupRef.current) roofGroupRef.current.renderOrder = renderMode === 'xray' ? 2 : 0;

  }, [colorScheme, renderMode, roofRemoved, showDimensions, showHotspots, selectedHotspotId, interiorLightsOn, interiorLightMode]);

  // Handle Exploded View animation slider
  useEffect(() => {
    const p = explodedProgress;

    // Separate groups smoothly
    if (roofGroupRef.current) {
      roofGroupRef.current.position.y = p * 1.8;
      roofGroupRef.current.position.z = -p * 0.4;
    }
    if (wallsGroupRef.current) {
      wallsGroupRef.current.position.y = p * 0.4;
    }
    if (frameGroupRef.current) {
      frameGroupRef.current.position.x = 0;
      frameGroupRef.current.position.y = p * 0.8;
    }
    if (footingsGroupRef.current) {
      footingsGroupRef.current.position.y = -p * 0.5;
    }
  }, [explodedProgress]);

  // Pointer & Raycasting Event Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    isPanning.current = e.button === 2 || e.shiftKey;
    prevMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;

    if (isDragging.current) {
      const dx = e.clientX - prevMousePos.current.x;
      const dy = e.clientY - prevMousePos.current.y;
      prevMousePos.current = { x: e.clientX, y: e.clientY };

      if (isPanning.current) {
        // Pan camera target
        const factor = 0.005 * targetSpherical.current.radius;
        const forward = new THREE.Vector3();
        cameraRef.current?.getWorldDirection(forward);
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3(0, 1, 0);

        cameraTarget.current.addScaledVector(right, -dx * factor);
        cameraTarget.current.addScaledVector(up, dy * factor);
      } else {
        // Orbit rotate
        targetSpherical.current.theta -= dx * 0.008;
        targetSpherical.current.phi -= dy * 0.008;
        targetSpherical.current.phi = Math.max(0.1, Math.min(Math.PI / 2 + 0.15, targetSpherical.current.phi));
      }
    }
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    isPanning.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.006;
    targetSpherical.current.radius = Math.max(2.5, Math.min(22.0, targetSpherical.current.radius + zoomDelta));
  };

  // Hotspot Click Detector
  const handleClick = (e: React.MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseVec.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseVec.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouseVec.current, cameraRef.current);
    if (!hotspotsGroupRef.current) return;

    const intersects = raycaster.current.intersectObjects(hotspotsGroupRef.current.children, true);
    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      const hotspotId = hitObj.userData?.hotspotId;
      if (hotspotId) {
        const found = HOTSPOTS.find(h => h.id === hotspotId) || null;
        onSelectHotspot(found);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 select-none cursor-grab active:cursor-grabbing overflow-hidden bg-slate-950"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      onClick={handleClick}
      onContextMenu={e => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
