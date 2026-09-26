import * as THREE from 'three';
import { MaterialSchemeId, MATERIAL_SCHEMES, MaterialScheme } from '../data/apartmentData';
import { getApartmentPBRTextures, TexturePalette } from '../utils/textureGenerator';

export interface ArchitecturalMaterials {
  rammedEarth: THREE.MeshStandardMaterial;
  secondaryEarth: THREE.MeshStandardMaterial;
  terracotta: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  basalt: THREE.MeshStandardMaterial;
  limePlaster: THREE.MeshStandardMaterial;
  pergolaWood: THREE.MeshStandardMaterial;
  windowFrameBronze: THREE.MeshStandardMaterial;
  architecturalGlass: THREE.MeshPhysicalMaterial;
  groundTerrain: THREE.MeshStandardMaterial;
  currentSchemeId: MaterialSchemeId;
}

/**
 * 1. Rammed Earth / CSEB Material Factory
 */
export function createRammedEarthMaterial(
  scheme: MaterialScheme,
  textures: TexturePalette
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(scheme.colors.wall),
    map: textures.rammedEarth.map,
    normalMap: textures.rammedEarth.normalMap,
    normalScale: new THREE.Vector2(1.1, 1.1),
    roughnessMap: textures.rammedEarth.roughnessMap,
    roughness: scheme.roughness.wall,
    aoMap: textures.rammedEarth.aoMap,
    aoMapIntensity: 1.0,
    metalness: 0.02,
  });
}

/**
 * 2. Secondary Earth Spandrel Material Factory
 */
export function createSecondaryEarthMaterial(
  scheme: MaterialScheme,
  textures: TexturePalette
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(scheme.colors.secondaryWall),
    map: textures.secondaryEarth.map,
    normalMap: textures.secondaryEarth.normalMap,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughnessMap: textures.secondaryEarth.roughnessMap,
    roughness: scheme.roughness.wall + 0.04,
    aoMap: textures.secondaryEarth.aoMap,
    aoMapIntensity: 1.0,
    metalness: 0.02,
  });
}

/**
 * 3. Artisanal Terracotta Jaali Material Factory
 */
export function createTerracottaMaterial(
  scheme: MaterialScheme,
  textures: TexturePalette
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(scheme.colors.terracotta),
    map: textures.terracotta.map,
    normalMap: textures.terracotta.normalMap,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughnessMap: textures.terracotta.roughnessMap,
    roughness: scheme.roughness.terracotta,
    aoMap: textures.terracotta.aoMap,
    aoMapIntensity: 1.1,
    metalness: 0.02,
  });
}

/**
 * 4. Architectural Cast-In-Place Concrete Material Factory
 */
export function createConcreteMaterial(
  scheme: MaterialScheme,
  textures: TexturePalette
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(scheme.colors.concrete),
    map: textures.concrete.map,
    normalMap: textures.concrete.normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: textures.concrete.roughnessMap,
    roughness: scheme.roughness.concrete,
    aoMap: textures.concrete.aoMap,
    aoMapIntensity: 1.0,
    metalness: 0.04,
  });
}

/**
 * 5. Basalt / Dense Geological Stone Material Factory
 */
export function createBasaltMaterial(
  scheme: MaterialScheme,
  textures: TexturePalette
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(scheme.colors.stone),
    map: textures.basalt.map,
    normalMap: textures.basalt.normalMap,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: textures.basalt.roughnessMap,
    roughness: scheme.roughness.stone,
    aoMap: textures.basalt.aoMap,
    aoMapIntensity: 1.0,
    metalness: 0.06,
  });
}

/**
 * 6. High-Albedo Calcite Lime Plaster Material Factory
 */
export function createLimePlasterMaterial(
  scheme: MaterialScheme,
  textures: TexturePalette
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(scheme.colors.roof),
    map: textures.limePlaster.map,
    normalMap: textures.limePlaster.normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughnessMap: textures.limePlaster.roughnessMap,
    roughness: scheme.roughness.roof,
    metalness: 0.01,
  });
}

/**
 * 7. Architectural Dark Bronze Framing Material Factory
 */
export function createBronzeMetalMaterial(
  scheme: MaterialScheme,
  textures: TexturePalette
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(scheme.colors.metal),
    map: textures.bronze.map,
    normalMap: textures.bronze.normalMap,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughnessMap: textures.bronze.roughnessMap,
    roughness: 0.38,
    metalness: 0.88,
  });
}

/**
 * 8. Photorealistic Low-Iron Double Glazing Physical Material Factory
 */
export function createArchitecturalGlassMaterial(
  textures: TexturePalette
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xf6fafd),
    roughness: 0.06,
    roughnessMap: textures.glass.roughnessMap,
    normalMap: textures.glass.normalMap,
    normalScale: new THREE.Vector2(0.12, 0.12),
    metalness: 0.04,
    transmission: 0.92,
    ior: 1.52,
    thickness: 0.35,
    attenuationColor: new THREE.Color(0xd8eff7),
    attenuationDistance: 2.2,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * 9. Architectural Pergola Timber Material Factory
 */
export function createPergolaWoodMaterial(
  scheme: MaterialScheme,
  textures: TexturePalette
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(scheme.colors.wood),
    map: textures.wood.map,
    normalMap: textures.wood.normalMap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: textures.wood.roughnessMap,
    roughness: scheme.roughness.wood,
    metalness: 0.02,
  });
}

/**
 * 10. Natural Ground Earth Terrain Material Factory
 */
export function createTerrainMaterial(
  textures: TexturePalette
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xbfa588),
    map: textures.groundTerrain.map,
    normalMap: textures.groundTerrain.normalMap,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: textures.groundTerrain.roughnessMap,
    roughness: 0.92,
    metalness: 0.02,
  });
}

/**
 * Creates the complete collection of photorealistic PBR materials for the building
 */
export function createApartmentMaterials(
  initialSchemeId: MaterialSchemeId = 'terracotta-earth'
): ArchitecturalMaterials {
  const textures = getApartmentPBRTextures();
  const scheme = MATERIAL_SCHEMES[initialSchemeId];

  return {
    rammedEarth: createRammedEarthMaterial(scheme, textures),
    secondaryEarth: createSecondaryEarthMaterial(scheme, textures),
    terracotta: createTerracottaMaterial(scheme, textures),
    concrete: createConcreteMaterial(scheme, textures),
    basalt: createBasaltMaterial(scheme, textures),
    limePlaster: createLimePlasterMaterial(scheme, textures),
    pergolaWood: createPergolaWoodMaterial(scheme, textures),
    windowFrameBronze: createBronzeMetalMaterial(scheme, textures),
    architecturalGlass: createArchitecturalGlassMaterial(textures),
    groundTerrain: createTerrainMaterial(textures),
    currentSchemeId: initialSchemeId,
  };
}

/**
 * In-place dynamic update of existing material parameters during scheme transitions
 */
export function updateMaterialsForScheme(
  materials: ArchitecturalMaterials,
  schemeId: MaterialSchemeId
): void {
  const scheme = MATERIAL_SCHEMES[schemeId];
  if (!scheme) return;

  materials.currentSchemeId = schemeId;

  // Primary Rammed Earth
  materials.rammedEarth.color.set(scheme.colors.wall);
  materials.rammedEarth.roughness = scheme.roughness.wall;
  materials.rammedEarth.needsUpdate = true;

  // Secondary Earth
  materials.secondaryEarth.color.set(scheme.colors.secondaryWall);
  materials.secondaryEarth.roughness = scheme.roughness.wall + 0.04;
  materials.secondaryEarth.needsUpdate = true;

  // Terracotta
  materials.terracotta.color.set(scheme.colors.terracotta);
  materials.terracotta.roughness = scheme.roughness.terracotta;
  materials.terracotta.needsUpdate = true;

  // Concrete
  materials.concrete.color.set(scheme.colors.concrete);
  materials.concrete.roughness = scheme.roughness.concrete;
  materials.concrete.needsUpdate = true;

  // Basalt
  materials.basalt.color.set(scheme.colors.stone);
  materials.basalt.roughness = scheme.roughness.stone;
  materials.basalt.needsUpdate = true;

  // Lime Plaster
  materials.limePlaster.color.set(scheme.colors.roof);
  materials.limePlaster.roughness = scheme.roughness.roof;
  materials.limePlaster.needsUpdate = true;

  // Timber
  materials.pergolaWood.color.set(scheme.colors.wood);
  materials.pergolaWood.roughness = scheme.roughness.wood;
  materials.pergolaWood.needsUpdate = true;

  // Dark Bronze
  materials.windowFrameBronze.color.set(scheme.colors.metal);
  materials.windowFrameBronze.needsUpdate = true;
}

/**
 * Semantic mesh categorization predicates for robust GLTF asset integration
 */
export function isRammedEarthMesh(mesh: THREE.Mesh): boolean {
  const name = mesh.name.toLowerCase();
  const matName = (Array.isArray(mesh.material) ? mesh.material[0]?.name : mesh.material?.name)?.toLowerCase() || '';
  return name.includes('earth') || name.includes('wall') || matName.includes('earth') || matName.includes('wall');
}

export function isTerracottaMesh(mesh: THREE.Mesh): boolean {
  const name = mesh.name.toLowerCase();
  const matName = (Array.isArray(mesh.material) ? mesh.material[0]?.name : mesh.material?.name)?.toLowerCase() || '';
  return name.includes('jaali') || name.includes('terracotta') || name.includes('brise') || matName.includes('terracotta');
}

export function isConcreteMesh(mesh: THREE.Mesh): boolean {
  const name = mesh.name.toLowerCase();
  const matName = (Array.isArray(mesh.material) ? mesh.material[0]?.name : mesh.material?.name)?.toLowerCase() || '';
  return name.includes('slab') || name.includes('concrete') || name.includes('cantilever') || name.includes('column') || matName.includes('concrete');
}

export function isStoneMesh(mesh: THREE.Mesh): boolean {
  const name = mesh.name.toLowerCase();
  const matName = (Array.isArray(mesh.material) ? mesh.material[0]?.name : mesh.material?.name)?.toLowerCase() || '';
  return name.includes('stone') || name.includes('basalt') || name.includes('plinth') || name.includes('floor') || matName.includes('stone') || matName.includes('basalt');
}

export function isGlassMesh(mesh: THREE.Mesh): boolean {
  const name = mesh.name.toLowerCase();
  const matName = (Array.isArray(mesh.material) ? mesh.material[0]?.name : mesh.material?.name)?.toLowerCase() || '';
  return name.includes('glass') || name.includes('glazing') || name.includes('window') || matName.includes('glass');
}

export function isBronzeMesh(mesh: THREE.Mesh): boolean {
  const name = mesh.name.toLowerCase();
  const matName = (Array.isArray(mesh.material) ? mesh.material[0]?.name : mesh.material?.name)?.toLowerCase() || '';
  return name.includes('frame') || name.includes('bronze') || name.includes('metal') || name.includes('mullion') || matName.includes('bronze') || matName.includes('metal');
}

export function isWoodMesh(mesh: THREE.Mesh): boolean {
  const name = mesh.name.toLowerCase();
  const matName = (Array.isArray(mesh.material) ? mesh.material[0]?.name : mesh.material?.name)?.toLowerCase() || '';
  return name.includes('wood') || name.includes('timber') || name.includes('pergola') || matName.includes('wood') || matName.includes('timber');
}

/**
 * Traverses an Object3D hierarchy and applies a material to matching meshes
 */
export function applyMaterialToMeshes(
  root: THREE.Object3D,
  material: THREE.Material,
  predicate?: (mesh: THREE.Mesh) => boolean
): void {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (!predicate || predicate(child)) {
        child.material = material;
      }
    }
  });
}

/**
 * Disposes all allocated materials
 */
export function disposeApartmentMaterials(materials: ArchitecturalMaterials): void {
  materials.rammedEarth.dispose();
  materials.secondaryEarth.dispose();
  materials.terracotta.dispose();
  materials.concrete.dispose();
  materials.basalt.dispose();
  materials.limePlaster.dispose();
  materials.pergolaWood.dispose();
  materials.windowFrameBronze.dispose();
  materials.architecturalGlass.dispose();
  materials.groundTerrain.dispose();
}
