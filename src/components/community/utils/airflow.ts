import * as THREE from 'three';

/**
 * Procedural Natural Buoyancy & Stack Effect Particle Simulation
 * Represents natural convective air movement:
 * - Cool air intake at ground level (blue/cyan)
 * - Rising vertical convective draft through the central 3.0 × 3.0 m atrium
 * - Warm air discharge at high-level roof clerestory (amber)
 * - West breeze accelerating through the terracotta jaali screen
 */
export class BioclimaticAirflowSystem {
  public group: THREE.Group = new THREE.Group();
  private particleCount = 280;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private colors: Float32Array;
  private velocities: Float32Array;
  private lifetimes: Float32Array;

  constructor() {
    this.group.name = 'airflowSystem';
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.lifetimes = new Float32Array(this.particleCount);

    this.geometry = new THREE.BufferGeometry();

    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i, Math.random());
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    // Circular glowing particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(100, 210, 255, 0.8)');
      grad.addColorStop(1, 'rgba(100, 210, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 0.35,
      map: texture,
      transparent: true,
      opacity: 0.75,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(this.geometry, this.material);
    this.group.add(points);
  }

  private resetParticle(i: number, progress = 0): void {
    const isAtriumStack = i < 180; // 65% in central atrium buoyancy stack
    const idx = i * 3;

    if (isAtriumStack) {
      // Spawn at bottom of 3.0 x 3.0 m atrium
      const spread = 2.4;
      this.positions[idx] = (Math.random() - 0.5) * spread;
      this.positions[idx + 1] = 0.5 + progress * 10.0;
      this.positions[idx + 2] = (Math.random() - 0.5) * spread;

      // Upward convective velocity
      this.velocities[idx] = (Math.random() - 0.5) * 0.008;
      this.velocities[idx + 1] = 0.045 + Math.random() * 0.025;
      this.velocities[idx + 2] = (Math.random() - 0.5) * 0.008;

      // Color starts cyan at bottom, transitions to warm amber near top exhaust
      const heightT = this.positions[idx + 1] / 11.0;
      this.colors[idx] = 0.2 + heightT * 0.7; // Red
      this.colors[idx + 1] = 0.75 - heightT * 0.35; // Green
      this.colors[idx + 2] = 0.95 - heightT * 0.75; // Blue
    } else {
      // West Jaali Screen breeze (incoming from -X West into building core)
      this.positions[idx] = -8.5 + progress * 4.0;
      this.positions[idx + 1] = 3.5 + Math.random() * 5.5;
      this.positions[idx + 2] = (Math.random() - 0.5) * 6.0;

      // Inward horizontal draft
      this.velocities[idx] = 0.035 + Math.random() * 0.02;
      this.velocities[idx + 1] = 0.005;
      this.velocities[idx + 2] = (Math.random() - 0.5) * 0.01;

      // Fresh cool breeze cyan
      this.colors[idx] = 0.3;
      this.colors[idx + 1] = 0.85;
      this.colors[idx + 2] = 0.95;
    }

    this.lifetimes[i] = 1.0 - progress;
  }

  public update(): void {
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.geometry.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;

      this.positions[idx] += this.velocities[idx];
      this.positions[idx + 1] += this.velocities[idx + 1];
      this.positions[idx + 2] += this.velocities[idx + 2];

      const isAtrium = i < 180;
      if (isAtrium) {
        // As air reaches top (+10.5m), it expands outward through clerestory exhaust slots
        if (this.positions[idx + 1] > 10.0) {
          this.velocities[idx] += (this.positions[idx] > 0 ? 0.002 : -0.002);
          this.velocities[idx + 2] += (this.positions[idx + 2] > 0 ? 0.002 : -0.002);
        }

        // Color update according to elevation
        const hT = Math.min(1.0, this.positions[idx + 1] / 11.0);
        this.colors[idx] = 0.2 + hT * 0.75;
        this.colors[idx + 1] = 0.8 - hT * 0.35;
        this.colors[idx + 2] = 0.95 - hT * 0.75;

        // Reset if past top
        if (this.positions[idx + 1] > 11.5) {
          this.resetParticle(i, 0);
        }
      } else {
        // Reset if penetrated into atrium
        if (this.positions[idx] > -0.5) {
          this.resetParticle(i, 0);
        }
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
