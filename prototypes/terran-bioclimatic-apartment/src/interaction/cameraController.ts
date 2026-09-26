import * as THREE from 'three';

export interface CameraLimits {
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
}

export class ArchitecturalCameraController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  // Spherical coordinates representation
  public target: THREE.Vector3 = new THREE.Vector3(0, 4.8, 0);
  public currentTarget: THREE.Vector3 = new THREE.Vector3(0, 4.8, 0);

  private spherical: THREE.Spherical = new THREE.Spherical(28, Math.PI / 3, Math.PI / 4);
  private targetSpherical: THREE.Spherical = new THREE.Spherical(28, Math.PI / 3, Math.PI / 4);

  public damping = 0.08;
  public limits: CameraLimits = {
    minDistance: 4.0,
    maxDistance: 35.0,
    minPolarAngle: 0.05,
    maxPolarAngle: Math.PI / 2 + 0.05, // Prevent going deep below ground plane
  };

  private isPointerDown = false;
  private isPanning = false;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private isTransitioningPreset = false;
  private presetTargetPos: THREE.Vector3 = new THREE.Vector3();
  private presetTargetLook: THREE.Vector3 = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Initialize spherical coordinates from camera's current position
    const offset = new THREE.Vector3().subVectors(camera.position, this.target);
    this.spherical.setFromVector3(offset);
    this.targetSpherical.copy(this.spherical);

    this.bindEvents();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
  }

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.isPointerDown = true;
    this.isTransitioningPreset = false;
    this.pointerStartX = e.clientX;
    this.pointerStartY = e.clientY;

    // Pan mode if Right Click (button 2) or Shift key held
    this.isPanning = e.button === 2 || e.shiftKey;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isPointerDown) return;

    const deltaX = e.clientX - this.pointerStartX;
    const deltaY = e.clientY - this.pointerStartY;
    this.pointerStartX = e.clientX;
    this.pointerStartY = e.clientY;

    if (this.isPanning) {
      // Pan target horizontally and vertically relative to camera orientation
      const panSpeed = 0.0018 * this.targetSpherical.radius;
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();

      this.target.addScaledVector(right, -deltaX * panSpeed);
      this.target.addScaledVector(up, deltaY * panSpeed);
      // Keep target within reasonable bounds
      this.target.y = Math.max(0.5, Math.min(15.0, this.target.y));
    } else {
      // Orbit
      const orbitSpeed = 0.005;
      this.targetSpherical.theta -= deltaX * orbitSpeed;
      this.targetSpherical.phi -= deltaY * orbitSpeed;
      this.targetSpherical.phi = Math.max(
        this.limits.minPolarAngle,
        Math.min(this.limits.maxPolarAngle, this.targetSpherical.phi)
      );
    }
  };

  private onPointerUp = (): void => {
    this.isPointerDown = false;
    this.isPanning = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.isTransitioningPreset = false;
    const zoomFactor = 0.0015;
    const delta = e.deltaY * zoomFactor * this.targetSpherical.radius;
    this.targetSpherical.radius = Math.max(
      this.limits.minDistance,
      Math.min(this.limits.maxDistance, this.targetSpherical.radius + delta)
    );
  };

  public setPreset(position: THREE.Vector3, target: THREE.Vector3, fov?: number): void {
    this.isTransitioningPreset = true;
    this.presetTargetPos.copy(position);
    this.presetTargetLook.copy(target);
    this.target.copy(target);

    const offset = new THREE.Vector3().subVectors(position, target);
    this.targetSpherical.setFromVector3(offset);
    this.targetSpherical.radius = Math.max(
      this.limits.minDistance,
      Math.min(this.limits.maxDistance, this.targetSpherical.radius)
    );

    if (fov && this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  public update(): void {
    if (this.isTransitioningPreset) {
      // Interpolate camera directly towards preset
      this.camera.position.lerp(this.presetTargetPos, 0.08);
      this.currentTarget.lerp(this.presetTargetLook, 0.08);
      this.camera.lookAt(this.currentTarget);

      if (this.camera.position.distanceTo(this.presetTargetPos) < 0.08) {
        this.isTransitioningPreset = false;
        const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);
        this.spherical.setFromVector3(offset);
        this.targetSpherical.copy(this.spherical);
      }
      return;
    }

    // Damped spherical interpolation for orbit/zoom
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * this.damping;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * this.damping;
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * this.damping;

    this.currentTarget.lerp(this.target, this.damping);

    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.currentTarget).add(offset);
    this.camera.lookAt(this.currentTarget);
  }
}
