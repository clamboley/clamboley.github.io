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
import { loadModel, type LoadedModel } from './assets.ts';
import { merge } from './geometry.ts';
import { glowSpriteTexture } from './textures.ts';

const BASE_ENERGY = 0.45;
const ENERGY_LAMBDA = 0.6; // return to base energy
const PIT_FLOOR = -0.8; // the audience stands below the stage
const ARMS_SHARE = 0.28;
const SWAP_LAMBDA = 2.5; // capsules → generated people cross-fade

interface Person {
  x: number;
  /** Floor level under the feet. */
  y: number;
  z: number;
  /** Height, metres. */
  height: number;
  phase: number;
  yaw: number;
  arms: boolean;
}

interface Variant {
  mesh: InstancedMesh;
  material: MeshStandardMaterial;
  people: Person[];
  /** Model units → metres for a 1 m tall person, and where its feet sit. */
  unitHeight: number;
  feetOffset: number;
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

/**
 * The audience: instanced silhouettes from the first frame, cross-faded to
 * generated people once their models arrive; phones as glowing sprites.
 */
export class Crowd {
  readonly root = new Group();

  private readonly people: Person[] = [];
  private readonly silhouetteMaterial = new MeshStandardMaterial({
    color: 0x0a0b12,
    roughness: 1,
    transparent: true,
  });
  private readonly plain: InstancedMesh;
  private readonly arms: InstancedMesh;
  private readonly variants: Variant[] = [];
  private readonly phones: PointsMaterial;
  private readonly dummy = new Object3D();
  private energy = BASE_ENERGY;
  /** 0 = silhouettes, 1 = generated people. */
  private swap = 0;
  private swapTarget = 0;

  constructor(
    count: number,
    private readonly motion: MotionPrefs,
  ) {
    const random = seededRandom(1979);
    for (let i = 0; i < count; i++) {
      const z = -4 - random() * 11;
      this.people.push({
        x: (random() - 0.5) * 16,
        y: PIT_FLOOR + (-z - 4) * 0.04, // gentle rake so the back rows show
        z,
        height: 1.6 + random() * 0.3,
        phase: random() * Math.PI * 2,
        yaw: (random() - 0.5) * 0.6,
        arms: random() < ARMS_SHARE,
      });
    }

    const plainPeople = this.people.filter((p) => !p.arms);
    const armsPeople = this.people.filter((p) => p.arms);
    this.plain = new InstancedMesh(silhouette(false), this.silhouetteMaterial, plainPeople.length);
    this.arms = new InstancedMesh(silhouette(true), this.silhouetteMaterial, armsPeople.length);
    for (const mesh of [this.plain, this.arms]) {
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      this.root.add(mesh);
    }
    this.plain.userData.people = plainPeople;
    this.arms.userData.people = armsPeople;

    const phoneCount = Math.floor(count * 0.28);
    const positions = new Float32Array(phoneCount * 3);
    for (let i = 0; i < phoneCount; i++) {
      const person = this.people[Math.floor(random() * this.people.length)];
      if (!person) continue;
      positions[i * 3] = person.x + (random() - 0.5) * 0.3;
      positions[i * 3 + 1] = person.y + person.height * (0.92 + random() * 0.2);
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

  /** Swaps the silhouettes for generated people, dealt round-robin across the variants. */
  async loadPeople(urls: readonly string[]): Promise<void> {
    const models = await Promise.all(urls.map((url) => loadModel(url)));
    models.forEach((model, index) => {
      this.addVariant(model, index, models.length);
    });
    this.swapTarget = 1;
  }

  /** The crowd reacts to a stroke. */
  boost(amount: number): void {
    this.energy = Math.min(1, this.energy + amount);
  }

  update(dt: number, elapsed: number): void {
    this.energy = MathUtils.damp(this.energy, BASE_ENERGY, ENERGY_LAMBDA, dt);
    this.swap = MathUtils.damp(this.swap, this.swapTarget, SWAP_LAMBDA, dt);
    const bob = 0.04 * this.energy * this.motion.scale;
    const sway = 0.12 * this.energy * this.motion.scale;

    const silhouettesVisible = this.swap < 0.995;
    this.plain.visible = this.arms.visible = silhouettesVisible;
    this.silhouetteMaterial.opacity = 1 - this.swap;
    if (silhouettesVisible) {
      this.placeSilhouettes(this.plain, elapsed, bob, 0);
      this.placeSilhouettes(this.arms, elapsed, bob, sway);
    }
    for (const variant of this.variants) {
      variant.material.opacity = this.swap;
      variant.material.transparent = this.swap < 0.995;
      this.placeVariant(variant, elapsed, bob, sway);
    }

    const flicker = this.motion.scale;
    this.phones.opacity = 0.7 + Math.sin(elapsed * 2.7) * 0.2 * flicker;
    this.phones.size = 0.08 + Math.sin(elapsed * 3.3) * 0.02 * flicker;
  }

  private addVariant(model: LoadedModel, index: number, total: number): void {
    const people = this.people.filter((_, i) => i % total === index);
    const mesh = new InstancedMesh(model.geometry, model.material, people.length);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    model.material.envMapIntensity = 0.35;
    this.root.add(mesh);
    this.variants.push({
      mesh,
      material: model.material,
      people,
      unitHeight: model.size.y,
      feetOffset: -model.bounds.min.y,
    });
  }

  private placeSilhouettes(mesh: InstancedMesh, elapsed: number, bob: number, sway: number): void {
    const people = mesh.userData.people as Person[];
    people.forEach((person, i) => {
      const wave = Math.sin(elapsed * 2.1 + person.phase);
      const scale = person.height / 1.3;
      this.dummy.position.set(person.x, person.y + wave * bob, person.z);
      this.dummy.scale.setScalar(scale);
      this.dummy.rotation.set(0, person.yaw, wave * sway);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  private placeVariant(variant: Variant, elapsed: number, bob: number, sway: number): void {
    const { mesh, people, unitHeight, feetOffset } = variant;
    people.forEach((person, i) => {
      const wave = Math.sin(elapsed * 2.1 + person.phase);
      const scale = person.height / unitHeight;
      this.dummy.position.set(person.x, person.y + feetOffset * scale + wave * bob, person.z);
      this.dummy.scale.setScalar(scale);
      this.dummy.rotation.set(0, person.yaw, wave * sway * 0.5);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
}
