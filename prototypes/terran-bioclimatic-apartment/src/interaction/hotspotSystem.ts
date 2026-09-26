import * as THREE from 'three';
import { ApartmentHotspot, APARTMENT_HOTSPOTS } from '../data/apartmentData';

export interface Hotspot3DObject {
  hotspot: ApartmentHotspot;
  group: THREE.Group;
  ring: THREE.Mesh;
  core: THREE.Mesh;
  baseY: number;
}

/**
 * Creates 3D interactive marker pins for architectural callouts
 */
export function buildHotspotsGroup(
  hotspots: ApartmentHotspot[] = APARTMENT_HOTSPOTS
): { hotspotsGroup: THREE.Group; hotspotObjects: Hotspot3DObject[] } {
  const hotspotsGroup = new THREE.Group();
  hotspotsGroup.name = 'hotspotsGroup';

  const hotspotObjects: Hotspot3DObject[] = [];

  const ringGeom = new THREE.RingGeometry(0.24, 0.32, 32);
  const coreGeom = new THREE.SphereGeometry(0.14, 16, 16);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xdf943f,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
  });

  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    depthTest: false,
  });

  for (const hs of hotspots) {
    const group = new THREE.Group();
    group.position.copy(hs.position);
    group.userData = { hotspotId: hs.id, hotspot: hs };

    const ring = new THREE.Mesh(ringGeom, ringMat.clone());
    const core = new THREE.Mesh(coreGeom, coreMat.clone());
    core.userData = { hotspotId: hs.id, hotspot: hs };
    ring.userData = { hotspotId: hs.id, hotspot: hs };

    group.add(ring);
    group.add(core);

    hotspotsGroup.add(group);

    hotspotObjects.push({
      hotspot: hs,
      group,
      ring,
      core,
      baseY: hs.position.y,
    });
  }

  return { hotspotsGroup, hotspotObjects };
}

/**
 * Updates hotspot marker orientation and floating animation in the render loop
 */
export function updateHotspots(
  hotspotObjects: Hotspot3DObject[],
  camera: THREE.Camera,
  time: number,
  selectedId: string | null
): void {
  for (const item of hotspotObjects) {
    // Face the camera (billboard)
    item.group.quaternion.copy(camera.quaternion);

    // Subtle floating breathing motion
    const hoverOffset = Math.sin(time * 2.5 + item.hotspot.position.x) * 0.08;
    item.group.position.y = item.baseY + hoverOffset;

    // Highlight selected hotspot
    const isSelected = item.hotspot.id === selectedId;
    const ringMat = item.ring.material as THREE.MeshBasicMaterial;
    const coreMat = item.core.material as THREE.MeshBasicMaterial;

    if (isSelected) {
      item.group.scale.setScalar(1.4 + Math.sin(time * 6) * 0.15);
      ringMat.color.setHex(0xffffff);
      coreMat.color.setHex(0xe85d04);
    } else {
      item.group.scale.setScalar(1.0);
      ringMat.color.setHex(0xdf943f);
      coreMat.color.setHex(0xffffff);
    }
  }
}
