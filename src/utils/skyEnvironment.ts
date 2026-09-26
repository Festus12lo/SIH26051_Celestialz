import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import type { EnvironmentPresetId } from '../components/simulation/EnvironmentSimulationPanel';

export interface SkyController {
  sky: Sky;
  stars: THREE.Points;
  update: (
    envId: EnvironmentPresetId,
    sunLight?: THREE.DirectionalLight | null,
    ambientLight?: THREE.AmbientLight | THREE.HemisphereLight | null,
    groundMesh?: THREE.Mesh | null
  ) => void;
  dispose: () => void;
}

export function createSkyEnvironment(scene: THREE.Scene): SkyController {
  // 1. Physically-Based Rayleigh/Mie Atmospheric Sky
  const sky = new Sky();
  // Scale box to 2000 so faces are at distance 1000 from origin, perfectly within camera.far = 3000
  sky.scale.setScalar(2000);
  scene.add(sky);

  // 2. Starfield for Night Ops
  const starGeo = new THREE.BufferGeometry();
  const starCount = 1800;
  const starPositions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    // Generate stars on a hemisphere radius 920-960 (inside sky box, well within camera frustum)
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 920 + Math.random() * 40;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = Math.abs(r * Math.cos(phi)) + 30; // upper hemisphere
    const z = r * Math.sin(phi) * Math.sin(theta);

    starPositions[i * 3] = x;
    starPositions[i * 3 + 1] = y;
    starPositions[i * 3 + 2] = z;
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2.2,
    transparent: true,
    opacity: 0,
    sizeAttenuation: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  const sun = new THREE.Vector3();

  const update = (
    envId: EnvironmentPresetId,
    sunLight?: THREE.DirectionalLight | null,
    ambientLight?: THREE.AmbientLight | THREE.HemisphereLight | null,
    groundMesh?: THREE.Mesh | null
  ) => {
    const uniforms = sky.material.uniforms;

    if (envId === 'daylight') {
      // Crisp clear blue daylight sky
      uniforms['turbidity'].value = 2.4;
      uniforms['rayleigh'].value = 1.8;
      uniforms['mieCoefficient'].value = 0.005;
      uniforms['mieDirectionalG'].value = 0.8;
      if (uniforms['cloudCoverage']) uniforms['cloudCoverage'].value = 0.28;
      if (uniforms['cloudDensity']) uniforms['cloudDensity'].value = 0.35;

      const elevation = 58;
      const azimuth = 180;
      const phi = THREE.MathUtils.degToRad(90 - elevation);
      const theta = THREE.MathUtils.degToRad(azimuth);
      sun.setFromSphericalCoords(1, phi, theta);
      uniforms['sunPosition'].value.copy(sun);

      starMat.opacity = 0;
      scene.fog = new THREE.FogExp2('#93c5fd', 0.0035);

      if (sunLight) {
        sunLight.color.set('#ffffff');
        sunLight.intensity = 2.4;
        sunLight.position.set(sun.x * 35, Math.max(12, sun.y * 35), sun.z * 35);
      }
      if (ambientLight) {
        ambientLight.color.set('#bae6fd');
        ambientLight.intensity = 0.7;
      }
      if (groundMesh && groundMesh.material) {
        (groundMesh.material as THREE.MeshStandardMaterial).color.set('#2f382a'); // lush terrain
      }
    } else if (envId === 'desert') {
      // Arid golden-orange desert sky with intense solar glare
      uniforms['turbidity'].value = 12.0;
      uniforms['rayleigh'].value = 3.6;
      uniforms['mieCoefficient'].value = 0.045;
      uniforms['mieDirectionalG'].value = 0.75;
      if (uniforms['cloudCoverage']) uniforms['cloudCoverage'].value = 0.05;
      if (uniforms['cloudDensity']) uniforms['cloudDensity'].value = 0.1;

      const elevation = 75;
      const azimuth = 195;
      const phi = THREE.MathUtils.degToRad(90 - elevation);
      const theta = THREE.MathUtils.degToRad(azimuth);
      sun.setFromSphericalCoords(1, phi, theta);
      uniforms['sunPosition'].value.copy(sun);

      starMat.opacity = 0;
      scene.fog = new THREE.FogExp2('#fed7aa', 0.005);

      if (sunLight) {
        sunLight.color.set('#fff1d6');
        sunLight.intensity = 3.2;
        sunLight.position.set(sun.x * 35, Math.max(12, sun.y * 35), sun.z * 35);
      }
      if (ambientLight) {
        ambientLight.color.set('#fde68a');
        ambientLight.intensity = 0.85;
      }
      if (groundMesh && groundMesh.material) {
        (groundMesh.material as THREE.MeshStandardMaterial).color.set('#b4874d'); // desert sand
      }
    } else if (envId === 'arctic') {
      // Cold frosty cyan-white polar sky with low winter sun
      uniforms['turbidity'].value = 1.1;
      uniforms['rayleigh'].value = 0.7;
      uniforms['mieCoefficient'].value = 0.003;
      uniforms['mieDirectionalG'].value = 0.95;
      if (uniforms['cloudCoverage']) uniforms['cloudCoverage'].value = 0.5;
      if (uniforms['cloudDensity']) uniforms['cloudDensity'].value = 0.65;

      const elevation = 16;
      const azimuth = 160;
      const phi = THREE.MathUtils.degToRad(90 - elevation);
      const theta = THREE.MathUtils.degToRad(azimuth);
      sun.setFromSphericalCoords(1, phi, theta);
      uniforms['sunPosition'].value.copy(sun);

      starMat.opacity = 0;
      scene.fog = new THREE.FogExp2('#cbd5e1', 0.006);

      if (sunLight) {
        sunLight.color.set('#e0f2fe');
        sunLight.intensity = 1.9;
        sunLight.position.set(sun.x * 40, Math.max(6, sun.y * 40), sun.z * 40);
      }
      if (ambientLight) {
        ambientLight.color.set('#93c5fd');
        ambientLight.intensity = 0.6;
      }
      if (groundMesh && groundMesh.material) {
        (groundMesh.material as THREE.MeshStandardMaterial).color.set('#dbeafe'); // snow & ice
      }
    } else if (envId === 'disaster') {
      // Dark stormy overcast sky with heavy cloud cover
      uniforms['turbidity'].value = 30.0;
      uniforms['rayleigh'].value = 0.35;
      uniforms['mieCoefficient'].value = 0.11;
      uniforms['mieDirectionalG'].value = 0.55;
      if (uniforms['cloudCoverage']) uniforms['cloudCoverage'].value = 0.92;
      if (uniforms['cloudDensity']) uniforms['cloudDensity'].value = 0.9;

      const elevation = 32;
      const azimuth = 215;
      const phi = THREE.MathUtils.degToRad(90 - elevation);
      const theta = THREE.MathUtils.degToRad(azimuth);
      sun.setFromSphericalCoords(1, phi, theta);
      uniforms['sunPosition'].value.copy(sun);

      starMat.opacity = 0;
      scene.fog = new THREE.FogExp2('#334155', 0.010);

      if (sunLight) {
        sunLight.color.set('#94a3b8');
        sunLight.intensity = 1.1;
        sunLight.position.set(sun.x * 35, Math.max(10, sun.y * 35), sun.z * 35);
      }
      if (ambientLight) {
        ambientLight.color.set('#475569');
        ambientLight.intensity = 0.45;
      }
      if (groundMesh && groundMesh.material) {
        (groundMesh.material as THREE.MeshStandardMaterial).color.set('#1e242d'); // wet dark ground
      }
    } else if (envId === 'night') {
      // Starry celestial night sky with moon glow
      uniforms['turbidity'].value = 1.0;
      uniforms['rayleigh'].value = 0.08;
      uniforms['mieCoefficient'].value = 0.001;
      uniforms['mieDirectionalG'].value = 0.9;
      if (uniforms['cloudCoverage']) uniforms['cloudCoverage'].value = 0.1;
      if (uniforms['cloudDensity']) uniforms['cloudDensity'].value = 0.15;

      const elevation = -15; // below horizon
      const azimuth = 180;
      const phi = THREE.MathUtils.degToRad(90 - elevation);
      const theta = THREE.MathUtils.degToRad(azimuth);
      sun.setFromSphericalCoords(1, phi, theta);
      uniforms['sunPosition'].value.copy(sun);

      starMat.opacity = 0.95; // light up the stars
      scene.fog = new THREE.FogExp2('#030712', 0.008);

      if (sunLight) {
        // Soft blue moonlight from above
        sunLight.color.set('#60a5fa');
        sunLight.intensity = 0.45;
        sunLight.position.set(-6, 20, -8);
      }
      if (ambientLight) {
        ambientLight.color.set('#1e293b');
        ambientLight.intensity = 0.3;
      }
      if (groundMesh && groundMesh.material) {
        (groundMesh.material as THREE.MeshStandardMaterial).color.set('#0b0f17'); // dark midnight ground
      }
    }
  };

  const dispose = () => {
    scene.remove(sky);
    scene.remove(stars);
    sky.geometry.dispose();
    (sky.material as THREE.Material).dispose();
    starGeo.dispose();
    starMat.dispose();
  };

  return { sky, stars, update, dispose };
}
