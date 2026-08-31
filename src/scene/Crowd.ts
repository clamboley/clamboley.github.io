import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MathUtils,
  MeshStandardMaterial,
  Object3D,
  Points,
  PointsMaterial,
} from 'three';
import type { MotionPrefs } from '../util/motion.ts';
import { seededRandom } from '../util/random.ts';
import { legacyColor } from './colors.ts';

const BASE_ENERGY = 0.45;
const ENERGY_LAMBDA = 0.6; // return to base energy

/** Instanced silhouettes in the dark plus a sprinkle of phone lights. */
export class Crowd {
  readonly root = new Group();

  private readonly mesh: InstancedMesh;
  private readonly phones: PointsMaterial;
  private readonly x: Float32Array;
  private readonly z: Float32Array;
  private readonly height: Float32Array;
  private readonly phase: Float32Array;
  private readonly dummy = new Object3D();
  private energy = BASE_ENERGY;

  constructor(
    private readonly count: number,
    private readonly motion: MotionPrefs,
  ) {
    const random = seededRandom(1979);
    this.x = new Float32Array(count);
    this.z = new Float32Array(count);
    this.height = new Float32Array(count);
    this.phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.x[i] = (random() - 0.5) * 15;
      this.z[i] = -3.6 - random() * 10.5;
      this.height[i] = 1.35 + random() * 0.55;
      this.phase[i] = random() * Math.PI * 2;
    }

    this.mesh = new InstancedMesh(
      new BoxGeometry(0.34, 1, 0.26),
      new MeshStandardMaterial({ color: legacyColor(0x0d0e18), roughness: 0.95 }),
      count,
    );
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.root.add(this.mesh);

    const phoneCount = Math.floor(count * 0.3);
    const positions = new Float32Array(phoneCount * 3);
    for (let i = 0; i < phoneCount; i++) {
      const j = Math.floor(random() * count);
      positions[i * 3] = (this.x[j] ?? 0) + (random() - 0.5) * 0.3;
      positions[i * 3 + 1] = -0.55 + (this.height[j] ?? 1.5) + 0.25 + random() * 0.25;
      positions[i * 3 + 2] = this.z[j] ?? -6;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.phones = new PointsMaterial({
      color: legacyColor(0xffe6b8),
      size: 0.06,
      transparent: true,
      opacity: 0.85,
    });
    this.root.add(new Points(geometry, this.phones));
  }

  /** The crowd reacts to a stroke. */
  boost(amount: number): void {
    this.energy = Math.min(1, this.energy + amount);
  }

  update(dt: number, elapsed: number): void {
    this.energy = MathUtils.damp(this.energy, BASE_ENERGY, ENERGY_LAMBDA, dt);
    const bobAmplitude = 0.035 * this.energy * this.motion.scale;

    for (let i = 0; i < this.count; i++) {
      const height = this.height[i] ?? 1.5;
      const phase = this.phase[i] ?? 0;
      const bob = Math.sin(elapsed * 2.1 + phase) * bobAmplitude;
      this.dummy.position.set(this.x[i] ?? 0, -0.55 + height / 2 + bob, this.z[i] ?? -6);
      this.dummy.scale.set(1, height, 1);
      this.dummy.rotation.y = Math.sin(phase) * 0.3;
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    const flicker = this.motion.scale;
    this.phones.opacity = 0.65 + Math.sin(elapsed * 2.7) * 0.2 * flicker;
    this.phones.size = 0.05 + Math.sin(elapsed * 3.3) * 0.012 * flicker;
  }
}
