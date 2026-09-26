import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  type ApartmentHotspot,
  type CameraPreset,
  CAMERA_PRESETS,
  type MaterialSchemeId,
  type ShadingMode,
  type ApartmentRoom,
} from '../data/apartmentData';
import {
  buildApartmentScene,
  applyExplodedView,
  type ArchitecturalSceneGroups,
} from '../geometry/apartmentGeometry';
import {
  createApartmentMaterials,
  updateMaterialsForScheme,
  disposeApartmentMaterials,
  type ArchitecturalMaterials,
  isRammedEarthMesh,
  isTerracottaMesh,
  isConcreteMesh,
  isStoneMesh,
  isGlassMesh,
  isBronzeMesh,
  isWoodMesh,
} from '../materials/apartmentMaterials';
import { createThermalMaterial } from '../shaders/thermalShader';
import { calculateSunDirection } from '../utils/solar';
import { buildDimensionsGroup } from '../utils/dimensions';
import { buildHotspotsGroup, updateHotspots, type Hotspot3DObject } from '../interaction/hotspotSystem';
import { ArchitecturalCameraController } from '../interaction/cameraController';
import { BioclimaticAirflowSystem } from '../utils/airflow';
import { disposePBRTextures } from '../utils/textureGenerator';
import { APARTMENT_DIMENSIONS } from '../data/apartmentData';
import { createSkyEnvironment, type SkyController } from '../../../utils/skyEnvironment';
import type { EnvironmentPresetId } from '../../simulation/EnvironmentSimulationPanel';

export interface ApartmentSceneProps {
  modelUrl?: string;
  explodedProgress?: number;
  shadingMode?: ShadingMode;
  materialScheme?: MaterialSchemeId;
  cameraPreset?: CameraPreset;
  showHotspots?: boolean;
  showDimensions?: boolean;
  showAirflow?: boolean;
  showRoomLabels?: boolean;
  selectedUnitId?: string | null;
  activeFloor?: 'all' | 0 | 1 | 2 | 3;
  sunAzimuth?: number;
  sunElevation?: number;
  onSelectHotspot?: (hotspot: ApartmentHotspot | null) => void;
  selectedHotspotId?: string | null;
  onSelectUnit?: (unitId: string | null) => void;
  onSelectRoom?: (room: ApartmentRoom | null) => void;
  environment?: EnvironmentPresetId;
}

export const ApartmentScene3D: React.FC<ApartmentSceneProps> = ({
  modelUrl,
  explodedProgress = 0,
  shadingMode = 'studio',
  materialScheme = 'terracotta-earth',
  cameraPreset = 'hero',
  showHotspots = true,
  showDimensions = true,
  showAirflow = false,
  showRoomLabels = false,
  selectedUnitId = null,
  activeFloor = 'all',
  sunAzimuth = 180,
  sunElevation = 55,
  onSelectHotspot,
  selectedHotspotId = null,
  onSelectUnit,
  onSelectRoom,
  environment = 'daylight',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // References to persistent Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controllerRef = useRef<ArchitecturalCameraController | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const materialsRef = useRef<ArchitecturalMaterials | null>(null);
  const sceneGroupsRef = useRef<ArchitecturalSceneGroups | null>(null);
  const thermalMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const wireframeMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const xrayMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const xrayStructureMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const dimensionsGroupRef = useRef<THREE.Group | null>(null);
  const hotspotsGroupRef = useRef<THREE.Group | null>(null);
  const hotspotObjectsRef = useRef<Hotspot3DObject[]>([]);
  const airflowSystemRef = useRef<BioclimaticAirflowSystem | null>(null);
  const originalMaterialsMapRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
  const animFrameIdRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const skyCtrlRef = useRef<SkyController | null>(null);
  const fillLightRef = useRef<THREE.AmbientLight | null>(null);

  // 1. Initial Scene Setup
  useEffect(() => {
    isMountedRef.current = true;
    const container = containerRef.current;
    if (!container) return;

    // Viewport Dimension Safety: Guaranteed minimums
    const width = Math.max(container.clientWidth || 800, 400);
    const height = Math.max(container.clientHeight || 600, 300);

    // Scene
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    // Physically-Based Atmospheric Sky & Celestial Starfield
    const skyCtrl = createSkyEnvironment(scene);
    skyCtrlRef.current = skyCtrl;

    // Perspective Camera with 3000m far plane to encompass skydome
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.2, 3000);
    const preset = CAMERA_PRESETS[cameraPreset];
    camera.position.copy(preset.position);
    camera.lookAt(preset.target);
    cameraRef.current = camera;

    // WebGL Renderer with ACES Filmic Tone Mapping
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setModelError('WebGL initialization failed. Please verify browser hardware acceleration.');
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Camera Controller
    const controller = new ArchitecturalCameraController(camera, renderer.domElement);
    controller.setPreset(preset.position, preset.target, preset.fov);
    controllerRef.current = controller;

    // Architectural Lighting Rig
    // A. Hemisphere sky & ground irradiance
    const hemiLight = new THREE.HemisphereLight(0xdfe6ed, 0x5a483a, 0.75);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // B. Directional Sunlight
    const sunDir = calculateSunDirection(sunAzimuth, sunElevation);
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.85);
    sunLight.position.copy(sunDir.clone().multiplyScalar(30));
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1.0;
    sunLight.shadow.camera.far = 70;
    sunLight.shadow.camera.left = -16;
    sunLight.shadow.camera.right = 16;
    sunLight.shadow.camera.top = 16;
    sunLight.shadow.camera.bottom = -16;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.04;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // C. Soft ambient fill
    const fillLight = new THREE.AmbientLight(0x2a2d33, 0.65);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    // Apply active sky environment and lighting preset
    skyCtrl.update(environment, sunLight, fillLight);

    // Initialize Material Pipeline
    const materials = createApartmentMaterials(materialScheme);
    materialsRef.current = materials;

    // Shared Shader & Wireframe Materials
    const thermalMat = createThermalMaterial(sunDir, 1.0, 0.75);
    thermalMaterialRef.current = thermalMat;

    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xd8b58a,
      wireframe: true,
      wireframeLinewidth: 1,
    });
    wireframeMaterialRef.current = wireMat;

    // Architectural Holographic X-Ray Materials
    const xrayMat = new THREE.ShaderMaterial({
      uniforms: {
        uBaseColor: { value: new THREE.Color('#023850') },
        uEdgeColor: { value: new THREE.Color('#00f5ff') },
        uBaseAlpha: { value: 0.16 },
        uEdgeAlpha: { value: 0.85 },
        uRimPower: { value: 2.2 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
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
    xrayMaterialRef.current = xrayMat;

    const xrayStructureMat = new THREE.MeshStandardMaterial({
      color: '#00f0ff',
      emissive: '#0284c7',
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.90,
      depthWrite: true,
    });
    xrayStructureMaterialRef.current = xrayStructureMat;

    // Build Architectural Geometry Scene Graph
    const sceneGroups = buildApartmentScene(materials, APARTMENT_DIMENSIONS);
    sceneGroupsRef.current = sceneGroups;
    scene.add(sceneGroups.rootGroup);

    // Cache original materials for shading mode switching
    sceneGroups.rootGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        originalMaterialsMapRef.current.set(child, child.material);
      }
    });

    // Dimensions Group
    const dimsGroup = buildDimensionsGroup(APARTMENT_DIMENSIONS);
    dimsGroup.visible = showDimensions;
    scene.add(dimsGroup);
    dimensionsGroupRef.current = dimsGroup;

    // Hotspots Group
    const { hotspotsGroup, hotspotObjects } = buildHotspotsGroup();
    hotspotsGroup.visible = showHotspots;
    scene.add(hotspotsGroup);
    hotspotsGroupRef.current = hotspotsGroup;
    hotspotObjectsRef.current = hotspotObjects;

    // Airflow Simulation System
    const airflowSystem = new BioclimaticAirflowSystem();
    airflowSystem.setVisible(showAirflow);
    scene.add(airflowSystem.group);
    airflowSystemRef.current = airflowSystem;

    // Raycaster for Hotspot Clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerClick = (e: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);

      // 1. Check Hotspots
      if (hotspotsGroupRef.current && hotspotsGroupRef.current.visible) {
        const intersects = raycaster.intersectObjects(hotspotsGroupRef.current.children, true);
        if (intersects.length > 0) {
          let currentObj: THREE.Object3D | null = intersects[0].object;
          while (currentObj && !currentObj.userData.hotspot) {
            currentObj = currentObj.parent;
          }
          if (currentObj && currentObj.userData.hotspot) {
            if (onSelectHotspot) {
              onSelectHotspot(currentObj.userData.hotspot as ApartmentHotspot);
            }
            return;
          }
        }
      }

      // 2. Check Rooms & Apartments
      if (sceneGroupsRef.current?.roomDebugGroup) {
        const roomIntersects = raycaster.intersectObjects(sceneGroupsRef.current.roomDebugGroup.children, true);
        if (roomIntersects.length > 0) {
          let currentObj: THREE.Object3D | null = roomIntersects[0].object;
          while (currentObj && !currentObj.userData.room) {
            currentObj = currentObj.parent;
          }
          if (currentObj && currentObj.userData.room) {
            if (onSelectRoom) onSelectRoom(currentObj.userData.room);
            if (onSelectUnit) onSelectUnit(currentObj.userData.unitId);
            return;
          }
        }
      }
    };

    renderer.domElement.addEventListener('click', handlePointerClick);

    // ResizeObserver with strict safety bounds
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newW = Math.max(entry.contentRect.width || 800, 400);
        const newH = Math.max(entry.contentRect.height || 600, 300);

        if (cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = newW / newH;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newW, newH);
          rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        }
      }
    });

    resizeObserver.observe(container);

    // Animation Loop
    let lastTime = performance.now();
    const clock = new THREE.Clock();

    const animate = () => {
      if (!isMountedRef.current) return;

      const now = performance.now();
      const delta = (now - lastTime) * 0.001;
      lastTime = now;
      const elapsedTime = clock.getElapsedTime();

      // Camera controller damping update
      if (controllerRef.current) {
        controllerRef.current.update();
      }

      // Hotspots animation
      if (cameraRef.current && hotspotObjectsRef.current.length > 0) {
        updateHotspots(hotspotObjectsRef.current, cameraRef.current, elapsedTime, selectedHotspotId);
      }

      // Airflow particles update
      if (airflowSystemRef.current && showAirflow) {
        airflowSystemRef.current.update();
      }

      // Update thermal uniforms
      if (thermalMaterialRef.current && shadingMode === 'thermal') {
        thermalMaterialRef.current.uniforms.uTime.value = elapsedTime;
      }

      // Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('click', handlePointerClick);

      if (controllerRef.current) {
        controllerRef.current.dispose();
      }

      if (materialsRef.current) {
        disposeApartmentMaterials(materialsRef.current);
      }

      if (thermalMaterialRef.current) {
        thermalMaterialRef.current.dispose();
      }

      if (wireframeMaterialRef.current) {
        wireframeMaterialRef.current.dispose();
      }

      if (xrayMaterialRef.current) {
        xrayMaterialRef.current.dispose();
      }

      if (xrayStructureMaterialRef.current) {
        xrayStructureMaterialRef.current.dispose();
      }

      if (airflowSystemRef.current) {
        airflowSystemRef.current.dispose();
      }

      disposePBRTextures();

      // Traverse and dispose all geometries
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      skyCtrlRef.current?.dispose();
      skyCtrlRef.current = null;
      renderer.dispose();
      container.replaceChildren();
    };
  }, []);

  // Sky, Atmospheric Scattering & Environment Preset Updates
  useEffect(() => {
    if (skyCtrlRef.current) {
      skyCtrlRef.current.update(
        environment,
        sunLightRef.current,
        fillLightRef.current
      );
    }
  }, [environment]);

  // 2. Solar Direction & Lighting Updates
  useEffect(() => {
    if (!sunLightRef.current || !thermalMaterialRef.current) return;
    const sunDir = calculateSunDirection(sunAzimuth, sunElevation);
    sunLightRef.current.position.copy(sunDir.clone().multiplyScalar(30));
    thermalMaterialRef.current.uniforms.uSunDirection.value.copy(sunDir);
  }, [sunAzimuth, sunElevation]);

  // 3. Exploded View Progress Updates
  useEffect(() => {
    if (!sceneGroupsRef.current) return;
    applyExplodedView(sceneGroupsRef.current, explodedProgress);
  }, [explodedProgress]);

  // 4. Material Scheme Switching
  useEffect(() => {
    if (!materialsRef.current) return;
    updateMaterialsForScheme(materialsRef.current, materialScheme);
  }, [materialScheme]);

  // 5. Shading Mode Updates (Studio / Thermal / Wireframe)
  useEffect(() => {
    const sceneGroups = sceneGroupsRef.current;
    if (!sceneGroups) return;

    sceneGroups.rootGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Exclude ground terrain plane and rock meshes from thermal override to maintain contextual ground
        if (child.parent?.name === 'landscapeGroup' && shadingMode === 'thermal') {
          return;
        }

        if (shadingMode === 'studio') {
          const originalMat = originalMaterialsMapRef.current.get(child);
          if (originalMat) {
            child.material = originalMat;
          }
        } else if (shadingMode === 'thermal') {
          if (thermalMaterialRef.current) {
            child.material = thermalMaterialRef.current;
          }
        } else if (shadingMode === 'wireframe') {
          if (wireframeMaterialRef.current) {
            child.material = wireframeMaterialRef.current;
          }
        } else if (shadingMode === 'xray') {
          if (child.parent?.name === 'landscapeGroup') {
            return;
          }
          if (
            child.parent?.name === 'structureGroup' ||
            child.name.toLowerCase().includes('column') ||
            child.name.toLowerCase().includes('slab') ||
            child.name.toLowerCase().includes('stair')
          ) {
            if (xrayStructureMaterialRef.current) {
              child.material = xrayStructureMaterialRef.current;
            }
          } else if (xrayMaterialRef.current) {
            child.material = xrayMaterialRef.current;
          }
        }
      }
    });
  }, [shadingMode]);

  // 6. Camera Preset Changes
  useEffect(() => {
    if (!controllerRef.current) return;
    const preset = CAMERA_PRESETS[cameraPreset];
    if (preset) {
      controllerRef.current.setPreset(preset.position, preset.target, preset.fov);
    }
  }, [cameraPreset]);

  // 7. Toggle Dimensions Visibility
  useEffect(() => {
    if (dimensionsGroupRef.current) {
      dimensionsGroupRef.current.visible = showDimensions;
    }
  }, [showDimensions]);

  // 8. Toggle Hotspots Visibility
  useEffect(() => {
    if (hotspotsGroupRef.current) {
      hotspotsGroupRef.current.visible = showHotspots;
    }
  }, [showHotspots]);

  // 9. Toggle Airflow Visibility
  useEffect(() => {
    if (airflowSystemRef.current) {
      airflowSystemRef.current.setVisible(showAirflow);
    }
  }, [showAirflow]);

  // 10. Toggle Room Labels & Spatial Boundaries
  useEffect(() => {
    if (sceneGroupsRef.current?.roomDebugGroup) {
      sceneGroupsRef.current.roomDebugGroup.visible = showRoomLabels || !!selectedUnitId;
    }
  }, [showRoomLabels, selectedUnitId]);

  // 11. Highlight Selected Residential Unit & Frame Camera
  useEffect(() => {
    const debugGroup = sceneGroupsRef.current?.roomDebugGroup;
    if (!debugGroup) return;

    debugGroup.traverse((child) => {
      const uData = child.userData;
      if (uData && uData.volumeMesh && uData.wireframe) {
        const isSelected = selectedUnitId && uData.unitId === selectedUnitId;
        const isOther = selectedUnitId && uData.unitId !== selectedUnitId;

        if (isSelected) {
          uData.volumeMesh.material.opacity = 0.35;
          uData.wireframe.material.opacity = 1.0;
          if (uData.sprite) {
            uData.sprite.scale.set(2.8, 0.7, 1.0);
            uData.sprite.visible = true;
          }
        } else if (isOther) {
          uData.volumeMesh.material.opacity = 0.03;
          uData.wireframe.material.opacity = 0.25;
          if (uData.sprite) {
            uData.sprite.scale.set(1.9, 0.48, 1.0);
            uData.sprite.visible = showRoomLabels;
          }
        } else {
          uData.volumeMesh.material.opacity = 0.10;
          uData.wireframe.material.opacity = 0.75;
          if (uData.sprite) {
            uData.sprite.scale.set(2.2, 0.55, 1.0);
            uData.sprite.visible = showRoomLabels;
          }
        }
      }
    });

    // If unit selected, frame camera to that unit
    if (selectedUnitId && controllerRef.current) {
      const unitTargets: Record<string, { target: THREE.Vector3; pos: THREE.Vector3 }> = {
        A01: { target: new THREE.Vector3(-4.0, 1.8, 1.0), pos: new THREE.Vector3(-14.0, 8.0, 14.0) },
        A02: { target: new THREE.Vector3(4.0, 1.8, 1.0), pos: new THREE.Vector3(14.0, 8.0, 14.0) },
        B01: { target: new THREE.Vector3(-4.0, 4.95, 1.0), pos: new THREE.Vector3(-14.0, 11.0, 14.0) },
        B02: { target: new THREE.Vector3(4.0, 4.95, 1.0), pos: new THREE.Vector3(14.0, 11.0, 14.0) },
        C01: { target: new THREE.Vector3(-4.0, 8.15, 1.0), pos: new THREE.Vector3(-14.0, 14.0, 14.0) },
        C02: { target: new THREE.Vector3(4.0, 8.15, 1.0), pos: new THREE.Vector3(14.0, 14.0, 14.0) },
      };

      const framing = unitTargets[selectedUnitId];
      if (framing) {
        controllerRef.current.setPreset(framing.pos, framing.target, 36);
      }
    }
  }, [selectedUnitId, showRoomLabels]);

  // 12. Active Floor Level Slicing & Visibility
  useEffect(() => {
    const groups = sceneGroupsRef.current;
    if (!groups) return;

    if (activeFloor === 'all') {
      groups.groundFloorGroup.visible = true;
      groups.firstFloorGroup.visible = true;
      groups.secondFloorGroup.visible = true;
      groups.roofTerraceGroup.visible = true;
      groups.jaaliScreenGroup.visible = true;
      groups.atriumCoreGroup.visible = true;
    } else if (activeFloor === 0) {
      groups.groundFloorGroup.visible = true;
      groups.firstFloorGroup.visible = false;
      groups.secondFloorGroup.visible = false;
      groups.roofTerraceGroup.visible = false;
      groups.jaaliScreenGroup.visible = false;
      groups.atriumCoreGroup.visible = true;
    } else if (activeFloor === 1) {
      groups.groundFloorGroup.visible = true;
      groups.firstFloorGroup.visible = true;
      groups.secondFloorGroup.visible = false;
      groups.roofTerraceGroup.visible = false;
      groups.jaaliScreenGroup.visible = true;
      groups.atriumCoreGroup.visible = true;
    } else if (activeFloor === 2) {
      groups.groundFloorGroup.visible = true;
      groups.firstFloorGroup.visible = true;
      groups.secondFloorGroup.visible = true;
      groups.roofTerraceGroup.visible = false;
      groups.jaaliScreenGroup.visible = true;
      groups.atriumCoreGroup.visible = true;
    } else if (activeFloor === 3) {
      groups.groundFloorGroup.visible = true;
      groups.firstFloorGroup.visible = true;
      groups.secondFloorGroup.visible = true;
      groups.roofTerraceGroup.visible = true;
      groups.jaaliScreenGroup.visible = true;
      groups.atriumCoreGroup.visible = true;
    }
  }, [activeFloor]);

  // 10. Optional External GLTF Loading
  useEffect(() => {
    if (!modelUrl || !sceneRef.current || !materialsRef.current) return;

    setIsLoadingModel(true);
    setModelError(null);
    const loader = new GLTFLoader();

    loader.load(
      modelUrl,
      (gltf) => {
        if (!isMountedRef.current || !sceneRef.current) return;
        setIsLoadingModel(false);
        const importedModel = gltf.scene;
        importedModel.name = 'importedGLTFModel';

        // Auto-assign materials to imported meshes based on semantic predicates and tags
        importedModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if (isGlassMesh(child)) {
              child.material = materialsRef.current!.architecturalGlass;
            } else if (isTerracottaMesh(child)) {
              child.material = materialsRef.current!.terracotta;
            } else if (isConcreteMesh(child)) {
              child.material = materialsRef.current!.concrete;
            } else if (isStoneMesh(child)) {
              child.material = materialsRef.current!.basalt;
            } else if (isBronzeMesh(child)) {
              child.material = materialsRef.current!.windowFrameBronze;
            } else if (isWoodMesh(child)) {
              child.material = materialsRef.current!.pergolaWood;
            } else if (isRammedEarthMesh(child)) {
              child.material = materialsRef.current!.rammedEarth;
            }
          }
        });

        // Hide procedural building to feature the imported GLTF model
        if (sceneGroupsRef.current) {
          sceneGroupsRef.current.rootGroup.visible = false;
        }

        sceneRef.current.add(importedModel);
      },
      undefined,
      (error) => {
        setIsLoadingModel(false);
        setModelError(`Failed to load GLTF model from: ${modelUrl}. Displaying procedural model.`);
        console.warn('GLTF Load Error:', error);
      }
    );
  }, [modelUrl]);

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-neutral-950">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Loading Overlay */}
      {isLoadingModel && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm z-30">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-neutral-300">Loading Architectural Asset...</p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {modelError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-rose-950/85 border border-rose-700/60 text-rose-200 text-xs px-4 py-2 rounded shadow-lg z-30">
          {modelError}
        </div>
      )}

      {/* Viewport Floating Compass / Orientation Marker */}
      <div className="absolute bottom-5 left-5 pointer-events-none z-10 flex items-center gap-3 bg-neutral-900/80 backdrop-blur-md border border-neutral-800/80 px-3.5 py-2 rounded-lg text-xs text-neutral-400">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-neutral-200 font-semibold">14.0 × 10.0 m</span>
          <span>·</span>
          <span>S / W Solar Cantilever</span>
        </div>
      </div>
    </div>
  );
};
