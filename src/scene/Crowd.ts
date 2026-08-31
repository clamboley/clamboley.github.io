import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MathUtils,
  MeshStandardMaterial,
  Object3D,
  Points,
  PointsMaterial,
  SphereGeometry,
} from 'three';
import type { MotionPrefs } from '../util/motion.ts';
import { seededRandom } from '../util/random.ts';
import { merge } from './geometry.ts';
import { glowSpriteTexture } from './textures.ts';

const BASE_ENERGY = 0.45;
const ENERGY_LAMBDA = 0.6; // return to base energy
const PIT_FLOOR = -0.8; // the audience stands below the stage
const ARMS_SHARE = 0.28;

interface Person {
  x: number;
  y: number;
  z: number;
  scale: number;
  phase: number;
  yaw: number;
}

function silhouette(arms: boolean): BufferGeometry {
  const parts = [
    new CapsuleGeometry(0.17, 0.72, 4, 10).translate(0, 0.54, 0),
    new SphereGeometry(0.105, 10, 8).translate(0, 1.13, 0),
  ];
  if (arms) {
    parts.push(
      new CapsuleGeometry(0.04, 0.5, 3, 6).rotateZ(-0.32).translate(0.27, 1.18, 0),
      new CapsuleGeometry(0.04, 0.5, 3, 6).rotateZ(0.32).translate(-0.27, 1.18, 0),
    );
  }
  return merge(parts);
}

/** Instanced silhouettes in the haze, some with their arms up, and a sprinkle of phones. */
export class Crowd {
  readonly root = new Group();

  private readonly plain: InstancedMesh;
  private readonly arms: InstancedMesh;
  private readonly plainPeople: Person[] = [];
  private readonly armsPeople: Person[] = [];
  private readonly phones: PointsMaterial;
  private readonly dummy = new Object3D();
  private energy = BASE_ENERGY;

  constructor(
    count: number,
    private readonly motion: MotionPrefs,
  ) {
    const random = seededRandom(1979);
    const people: Person[] = [];
    for (let i = 0; i < count; i++) {
      const z = -4 - random() * 11;
      people.push({
        x: (random() - 0.5) * 16,
        y: PIT_FLOOR + (-z - 4) * 0.04, // gentle rake so the back rows show
        z,
        scale: 1.25 + random() * 0.35,
        phase: random() * Math.PI * 2,
        yaw: (random() - 0.5) * 0.6,
      });
    }
    for (const person of people) {
      (random() < ARMS_SHARE ? this.armsPeople : this.plainPeople).push(person);
    }

    const material = new MeshStandardMaterial({ color: 0x0a0b12, roughness: 1 });
    this.plain = new InstancedMesh(silhouette(false), material, this.plainPeople.length);
    this.arms = new InstancedMesh(silhouette(true), material, this.armsPeople.length);
    for (const mesh of [this.plain, this.arms]) {
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      this.root.add(mesh);
    }

    const phoneCount = Math.floor(count * 0.28);
    const positions = new Float32Array(phoneCount * 3);
    for (let i = 0; i < phoneCount; i++) {
      const person = people[Math.floor(random() * people.length)];
      if (!person) continue;
      positions[i * 3] = person.x + (random() - 0.5) * 0.3;
      positions[i * 3 + 1] = person.y + person.scale * (1.2 + random() * 0.25);
      positions[i * 3 + 2] = person.z + 0.2;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.phones = new PointsMaterial({
      map: glowSpriteTexture(),
      color: 0xfff1d6,
      size: 0.085,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.root.add(new Points(geometry, this.phones));
  }

  /** The crowd reacts to a stroke. */
  boost(amount: number): void {
    this.energy = Math.min(1, this.energy + amount);
  }

  update(dt: number, elapsed: number): void {
    this.energy = MathUtils.damp(this.energy, BASE_ENERGY, ENERGY_LAMBDA, dt);
    const bob = 0.04 * this.energy * this.motion.scale;
    this.place(this.plain, this.plainPeople, elapsed, bob, 0);
    this.place(this.arms, this.armsPeople, elapsed, bob, 0.12 * this.energy * this.motion.scale);

    const flicker = this.motion.scale;
    this.phones.opacity = 0.7 + Math.sin(elapsed * 2.7) * 0.2 * flicker;
    this.phones.size = 0.1 + Math.sin(elapsed * 3.3) * 0.02 * flicker;
  }

  private place(
    mesh: InstancedMesh,
    people: Person[],
    elapsed: number,
    bob: number,
    sway: number,
  ): void {
    people.forEach((person, i) => {
      const wave = Math.sin(elapsed * 2.1 + person.phase);
      this.dummy.position.set(person.x, person.y + wave * bob, person.z);
      this.dummy.scale.setScalar(person.scale);
      this.dummy.rotation.set(0, person.yaw, wave * sway);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
}
