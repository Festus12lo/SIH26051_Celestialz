import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildResidenceModel, ResidenceModelHierarchy } from './ResidenceModel';
import { CutawayLevel, SeasonType } from '../../types/architectural';

interface ArchitecturalViewerProps {
  cameraTargetPos: [number, number, number];
  cameraLookAt: [number, number, number];
  targetFov: number;
  timeOfDayHours: number;
  season: SeasonType;
  cutawayLevel: CutawayLevel;
  highlightedRoomId: string | null;
  showAirflow: boolean;
  onCameraChange?: (pos: [number, number, number], target: [number, number, number]) => void;
}

export const ArchitecturalViewer: React.FC<ArchitecturalViewerProps> = ({
  cameraTargetPos,
  cameraLookAt,
  targetFov,
  timeOfDayHours,
  season,
  cutawayLevel,
  highlightedRoomId,
  showAirflow,
  onCameraChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References to Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<ResidenceModelHierarchy | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const interiorLightsRef = useRef<THREE.PointLight[]>([]);

  // Camera animation interpolation state
  const curCameraPos = useRef(new THREE.Vector3(...cameraTargetPos));
  const curTargetPos = useRef(new THREE.Vector3(...cameraLookAt));
  const desCameraPos = useRef(new THREE.Vector3(...cameraTargetPos));
  const desTargetPos = useRef(new THREE.Vector3(...cameraLookAt));

  // User manual interaction state (orbit/pan)
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });

  // Update target when props change
  useEffect(() => {
    desCameraPos.current.set(...cameraTargetPos);
    desTargetPos.current.set(...cameraLookAt);
    if (cameraRef.current && targetFov) {
      cameraRef.current.fov = targetFov;
      cameraRef.current.updateProjectionMatrix();
    }
  }, [cameraTargetPos, cameraLookAt, targetFov]);

  // Update cutaway
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.setCutaway(cutawayLevel);
    }
  }, [cutawayLevel]);

  // Update room highlight
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.highlightRoom(highlightedRoomId);
    }
  }, [highlightedRoomId]);

  // Update airflow visibility
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.airflowParticles.visible = showAirflow;
    }
  }, [showAirflow]);

  // Update Sun lighting position and color according to Time of Day and Season
  useEffect(() => {
    if (!sunLightRef.current || !ambientLightRef.current || !hemiLightRef.current) return;

    // Calculate solar altitude and azimuth based on hour & season
    // True South = 180° azimuth (corresponds to +Z in Three.js coordinates)
    const hour = timeOfDayHours;
    let peakAlt = 76.5; // summer default
    if (season === 'equinox') peakAlt = 52.0;
    if (season === 'winter_solstice') peakAlt = 38.5;

    // Calculate sun elevation angle from 6:00 (sunrise) to 18:00 (sunset)
    const solarProg = (hour - 6) / 12; // 0 at 6am, 0.5 at noon, 1.0 at 6pm
    const isDay = hour >= 6.0 && hour <= 18.8;

    let altitudeDeg = 0;
    let azimuthDeg = 180;

    if (isDay) {
      // Smooth sinusoidal arc for solar altitude
      altitudeDeg = Math.sin(solarProg * Math.PI) * peakAlt;
      // Azimuth progresses from East (approx 90°) to South (180° at noon) to West (approx 270°)
      azimuthDeg = 90 + solarProg * 180;
    } else {
      altitudeDeg = -10; // below horizon
    }

    const altRad = (altitudeDeg * Math.PI) / 180;
    const azRad = (azimuthDeg * Math.PI) / 180;

    // Sun vector in Three.js coordinates (+Z is South, +X is East, -X is West, -Z is North)
    const sunDist = 45;
    const sunX = Math.sin(azRad) * Math.cos(altRad) * sunDist; // East-West
    const sunY = Math.max(1.0, Math.sin(altRad) * sunDist);
    const sunZ = Math.cos(azRad) * Math.cos(altRad) * sunDist; // South-North

    sunLightRef.current.position.set(sunX, sunY, sunZ);

    // Color and intensity grading
    if (hour >= 18.8 || hour < 6.0) {
      // Twilight / Blue Hour
      sunLightRef.current.intensity = 0.05;
      sunLightRef.current.color.setHex(0x3b5275);
      ambientLightRef.current.color.setHex(0x1a2638);
      ambientLightRef.current.intensity = 0.5;
      hemiLightRef.current.intensity = 0.3;

      // Turn on warm interior lights (2700K)
      interiorLightsRef.current.forEach((light) => {
        light.intensity = 2.2;
      });
    } else if (altitudeDeg < 35) {
      // Golden Hour (late afternoon or early morning)
      sunLightRef.current.intensity = 2.4;
      sunLightRef.current.color.setHex(0xffaa5e); // warm amber golden light
      ambientLightRef.current.color.setHex(0x8a705e);
      ambientLightRef.current.intensity = 0.85;
      hemiLightRef.current.intensity = 0.7;

      interiorLightsRef.current.forEach((light) => {
        light.intensity = 1.0;
      });
    } else {
      // Midday sun
      sunLightRef.current.intensity = 2.8;
      sunLightRef.current.color.setHex(0xfff5e6); // bright warm sun
      ambientLightRef.current.color.setHex(0x757a7d);
      ambientLightRef.current.intensity = 0.95;
      hemiLightRef.current.intensity = 0.8;

      interiorLightsRef.current.forEach((light) => {
        light.intensity = 0.4;
      });
    }
  }, [timeOfDayHours, season]);

  // Main Three.js Setup & Animation Loop
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    let width = containerRef.current.clientWidth || window.innerWidth || 1200;
    let height = containerRef.current.clientHeight || window.innerHeight || 800;
    if (width <= 0) width = window.innerWidth || 1200;
    if (height <= 0) height = window.innerHeight || 800;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x16181b); // quiet architectural slate charcoal
    scene.fog = new THREE.FogExp2(0x16181b, 0.012);

    // Camera
    const camera = new THREE.PerspectiveCamera(targetFov, width / height, 0.1, 200);
    camera.position.set(...cameraTargetPos);
    camera.lookAt(...cameraLookAt);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance'
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    // Lighting setup
    // 1. Ambient
    const ambientLight = new THREE.AmbientLight(0x757a7d, 0.9);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // 2. Hemisphere (sky warmth vs earth bounce)
    const hemiLight = new THREE.HemisphereLight(0xfff3e5, 0x3d3229, 0.7);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // 3. Directional Sun
    const sunLight = new THREE.DirectionalLight(0xffaa5e, 2.4);
    sunLight.position.set(15, 24, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 85;
    const d = 13.5;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0001;
    sunLight.shadow.normalBias = 0.025; // Crucial: prevents light leaks at wall joints and eliminates shadow acne
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // 4. Interior Warm Point Lights (2700K recessed warmth in Living, Dining, Courtyard, Guest, Master, and Bedrooms)
    const intLights: THREE.PointLight[] = [];
    const lightPositions: [number, number, number][] = [
      [-4.0, 2.8, 3.8], // Living room ceiling
      [4.2, 2.5, 1.2],  // Dining pendant
      [0.0, 1.2, 0.0],  // Courtyard base uplight
      [-2.5, 2.6, -3.5], // Ground guest suite
      [-4.5, 5.2, 3.8], // Master bedroom
      [5.0, 5.2, 1.8],  // Upper family study
      [-3.5, 5.2, -3.8], // Bedroom 02
      [3.5, 5.2, -3.8]   // Bedroom 03
    ];

    lightPositions.forEach(([x, y, z]) => {
      const pLight = new THREE.PointLight(0xffbe85, 0.9, 14, 1.6);
      pLight.position.set(x, y, z);
      scene.add(pLight);
      intLights.push(pLight);
    });
    interiorLightsRef.current = intLights;

    // Ground Plinth (Subtle neutral site plinth around house)
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x212529,
      roughness: 0.95,
      metalness: 0.05
    });
    const groundPlane = new THREE.Mesh(groundGeo, groundMat);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -0.18;
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    // Subtle stone threshold apron
    const apronGeo = new THREE.BoxGeometry(22, 0.1, 16);
    const apronMat = new THREE.MeshStandardMaterial({
      color: 0x343a40,
      roughness: 0.9
    });
    const apron = new THREE.Mesh(apronGeo, apronMat);
    apron.position.set(0, -0.22, 0.5);
    apron.receiveShadow = true;
    scene.add(apron);

    // Build the Residence Model
    const model = buildResidenceModel();
    modelRef.current = model;
    scene.add(model.root);

    // Resize handler
    const updateSize = (w: number, h: number) => {
      if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    };

    const handleResize = () => {
      if (!containerRef.current) return;
      updateSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        updateSize(w, h);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Update airflow particles
      if (model.airflowParticles.visible) {
        model.updateAirflow(delta);
      }

      // Smooth camera interpolation towards target
      if (cameraRef.current) {
        curCameraPos.current.lerp(desCameraPos.current, 0.06);
        curTargetPos.current.lerp(desTargetPos.current, 0.06);

        cameraRef.current.position.copy(curCameraPos.current);
        cameraRef.current.lookAt(curTargetPos.current);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, []);

  // Mouse / Touch Orbit and Pan Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = e.button === 0;
    isPanning.current = e.button === 2 || e.shiftKey;
    prevMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current && !isPanning.current) return;

    const dx = e.clientX - prevMouse.current.x;
    const dy = e.clientY - prevMouse.current.y;
    prevMouse.current = { x: e.clientX, y: e.clientY };

    if (!cameraRef.current) return;

    if (isPanning.current) {
      // Pan camera and target
      const factor = 0.015;
      const right = new THREE.Vector3();
      cameraRef.current.getWorldDirection(right);
      right.cross(cameraRef.current.up).normalize();

      const up = cameraRef.current.up.clone();

      const move = right.multiplyScalar(-dx * factor).add(up.multiplyScalar(dy * factor));
      desCameraPos.current.add(move);
      desTargetPos.current.add(move);
    } else {
      // Orbit around target
      const offset = desCameraPos.current.clone().sub(desTargetPos.current);
      const radius = offset.length();

      let theta = Math.atan2(offset.x, offset.z);
      let phi = Math.acos(Math.max(-1, Math.min(1, offset.y / radius)));

      theta -= dx * 0.006;
      phi -= dy * 0.006;

      // Constrain vertical pitch so camera doesn't flip or go deep under ground
      phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.02, phi));

      offset.x = radius * Math.sin(phi) * Math.sin(theta);
      offset.y = radius * Math.cos(phi);
      offset.z = radius * Math.sin(phi) * Math.cos(theta);

      desCameraPos.current.copy(desTargetPos.current).add(offset);
    }

    if (onCameraChange) {
      onCameraChange(
        [desCameraPos.current.x, desCameraPos.current.y, desCameraPos.current.z],
        [desTargetPos.current.x, desTargetPos.current.y, desTargetPos.current.z]
      );
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    isPanning.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
    const offset = desCameraPos.current.clone().sub(desTargetPos.current);
    const newLength = THREE.MathUtils.clamp(offset.length() * zoomFactor, 2.5, 45.0);
    offset.setLength(newLength);
    desCameraPos.current.copy(desTargetPos.current).add(offset);

    if (onCameraChange) {
      onCameraChange(
        [desCameraPos.current.x, desCameraPos.current.y, desCameraPos.current.z],
        [desTargetPos.current.x, desTargetPos.current.y, desTargetPos.current.z]
      );
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
