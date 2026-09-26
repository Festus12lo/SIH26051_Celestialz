import * as THREE from 'three';

/**
 * Custom GLSL Thermal Shader Material
 *
 * Implements a deterministic false-color thermal gradient mapping:
 * Deep Navy -> Blue -> Cyan -> Green -> Yellow -> Orange -> Crimson Red
 *
 * Simulates passive building envelope thermal behavior based on:
 * - Surface normal alignment with sun vector (incident solar radiation)
 * - Roof / parapet exposure vs ground coupling
 * - Balcony and reveal overhang shading factor
 * - Atrium buoyancy convective cool zone
 * - Thermal mass inertia (dampened temperature swing)
 */

const thermalVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const thermalFragmentShader = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform float uThermalIntensity;
  uniform float uSunExposure;
  uniform float uThermalMassFactor;
  uniform float uAmbientCooling;
  uniform float uTime;

  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  // Deterministic 7-stop thermal ramp
  vec3 getThermalColor(float t) {
    float clampedT = clamp(t, 0.0, 1.0);

    vec3 c0 = vec3(0.04, 0.06, 0.22); // Deep Navy (Coldest / Ground / Plinth)
    vec3 c1 = vec3(0.08, 0.25, 0.70); // Cobalt Blue
    vec3 c2 = vec3(0.05, 0.65, 0.75); // Cyan (Atrium airflow zone)
    vec3 c3 = vec3(0.20, 0.75, 0.35); // Green (Comfort zone 22-25°C)
    vec3 c4 = vec3(0.92, 0.85, 0.20); // Warm Yellow
    vec3 c5 = vec3(0.95, 0.45, 0.10); // Amber Orange
    vec3 c6 = vec3(0.85, 0.08, 0.12); // Crimson Red (Exposed Roof / Unshaded Sun)

    if (clampedT < 0.16) {
      return mix(c0, c1, clampedT / 0.16);
    } else if (clampedT < 0.33) {
      return mix(c1, c2, (clampedT - 0.16) / 0.17);
    } else if (clampedT < 0.50) {
      return mix(c2, c3, (clampedT - 0.33) / 0.17);
    } else if (clampedT < 0.66) {
      return mix(c3, c4, (clampedT - 0.50) / 0.16);
    } else if (clampedT < 0.83) {
      return mix(c4, c5, (clampedT - 0.66) / 0.17);
    } else {
      return mix(c5, c6, (clampedT - 0.83) / 0.17);
    }
  }

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 L = normalize(uSunDirection);

    // Direct solar incidence (Lambertian cosine)
    float nDotL = max(0.0, dot(N, L));

    // Elevation factor: Roof & upper floors are naturally hotter; ground plinth is cooled by ground sink
    float heightRatio = clamp((vWorldPosition.y - 0.0) / 10.5, 0.0, 1.0);

    // Atrium core proximity: Points near center (x ≈ 0, z ≈ 0) benefit from convective stack cooling
    float distFromCore = length(vWorldPosition.xz);
    float atriumCooling = smoothstep(5.0, 1.2, distFromCore) * 0.32;

    // Self-shading heuristic: Underside surfaces (pointing down) or horizontal balconies casting shade
    float undersideFactor = smoothstep(0.1, -0.6, N.y) * 0.35;

    // High albedo roof suppression: Roof surfaces receive high sun but have reflective lime wash
    float roofReflectance = (vWorldPosition.y > 9.5 && N.y > 0.7) ? 0.22 : 0.0;

    // Calculate normalized thermal heat absorption metric (0.0 to 1.0)
    float baseTemp = 0.22; // Subterranean ground sink baseline
    float solarGain = nDotL * 0.48 * uSunExposure;
    float verticalStackHeat = heightRatio * 0.28;
    float thermalMassDamping = (1.0 - uThermalMassFactor * 0.35);

    float heatMetric = (baseTemp + (solarGain + verticalStackHeat) * thermalMassDamping)
                     - atriumCooling 
                     - undersideFactor 
                     - roofReflectance;

    // Modulate with thermal intensity control
    heatMetric = clamp(heatMetric * uThermalIntensity, 0.02, 0.98);

    vec3 color = getThermalColor(heatMetric);

    // Add subtle architectural edge contouring to maintain geometry legibility in thermal view
    vec3 V = vec3(0.0, 0.0, 1.0); // Viewer approximation
    float edgeGlow = pow(1.0 - max(0.0, abs(dot(N, vec3(0.0, 1.0, 0.0)))), 4.0) * 0.08;
    color += vec3(edgeGlow);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface ThermalUniforms {
  uSunDirection: { value: THREE.Vector3 };
  uThermalIntensity: { value: number };
  uSunExposure: { value: number };
  uThermalMassFactor: { value: number };
  uAmbientCooling: { value: number };
  uTime: { value: number };
  [uniform: string]: THREE.IUniform;
}

export function createThermalMaterial(
  sunDirection: THREE.Vector3 = new THREE.Vector3(0.5, 0.8, 0.3).normalize(),
  thermalIntensity = 1.0,
  thermalMassFactor = 0.75
): THREE.ShaderMaterial {
  const uniforms: ThermalUniforms = {
    uSunDirection: { value: sunDirection.clone() },
    uThermalIntensity: { value: thermalIntensity },
    uSunExposure: { value: 0.85 },
    uThermalMassFactor: { value: thermalMassFactor },
    uAmbientCooling: { value: 0.25 },
    uTime: { value: 0.0 },
  };

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: thermalVertexShader,
    fragmentShader: thermalFragmentShader,
    side: THREE.DoubleSide,
  });
}
