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
import type { CrowdVariant } from '../assets.config.ts';
import type { MotionPrefs } from '../util/motion.ts';
import { seededRandom } from '../util/random.ts';
import { loadModel, type LoadedModel } from './assets.ts';
import { merge } from './geometry.ts';
import { glowSpriteTexture } from './textures.ts';

const BASE_ENERGY = 0.45;
const ENERGY_LAMBDA = 0.6; // return to base energy
const PIT_FLOOR = -0.8; // the audience stands below the stage
const PIT_FRONT = -4; // z of the first row
const BLOCK_DETAIL_DEPTH = 14; // blocks nearer than this use the detailed model
const BLOCK_HEIGHT = 2.3; // metres, a block of thirty people with their arms up
const BLOCK_WIDTH = 4.2; // metres, six people shoulder to shoulder
const BLOCK_DEPTH = 2.6;
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

  private readonly individualDepth: number;
  private readonly blocks = new Group();
  /** Far blocks meshes and their full instance counts, for `setReach`. */
  private readonly farBlocks: { mesh: InstancedMesh; total: number }[] = [];
  private reach = 1;
  /** Detailed front-row meshes and their light twins, for `setDetail`. */
  private readonly detailPairs: { hi: InstancedMesh; lo: InstancedMesh }[] = [];
  private detail = true;

  /** How far the blocks of people go, metres. */
  private readonly pitDepth: number;

  constructor(
    count: number,
    individualDepth: number,
    private readonly motion: MotionPrefs,
    field: { pitLights: number; pitDepth: number },
  ) {
    const random = seededRandom(1979);
    this.individualDepth = individualDepth;
    this.pitDepth = field.pitDepth;
    const pitLights = field.pitLights;
    for (let i = 0; i < count; i++) {
      const z = PIT_FRONT - random() * individualDepth;
      this.people.push({
        x: (random() - 0.5) * 22,
        y: PIT_FLOOR + (-z - 4) * 0.04, // gentle rake so the back rows show
        z,
        height: 1.6 + random() * 0.3,
        phase: random() * Math.PI * 2,
        yaw: (random() - 0.5) * 0.6,
        arms: random() < ARMS_SHARE,
      });
    }

    // nearest first: trimming an instance count then drops the farthest people
    this.people.sort((a, b) => b.z - a.z);
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

    const near = Math.floor(count * 0.28);
    const positions = new Float32Array((near + pitLights) * 3);
    for (let i = 0; i < near; i++) {
      const person = this.people[Math.floor(random() * this.people.length)];
      if (!person) continue;
      positions[i * 3] = person.x + (random() - 0.5) * 0.3;
      positions[i * 3 + 1] = person.y + person.height * (0.92 + random() * 0.2);
      positions[i * 3 + 2] = person.z + 0.2;
    }
    for (let i = near; i < near + pitLights; i++) {
      const depth = Math.pow(random(), 0.8) * (this.pitDepth + 30); // thinning with distance
      const z = PIT_FRONT - 1 - depth;
      const halfWidth = 13 + depth * 0.55; // the field widens
      positions[i * 3] = (random() - 0.5) * 2 * halfWidth;
      positions[i * 3 + 1] = PIT_FLOOR + (-z - 4) * 0.04 + 1.7 + random() * 0.6;
      positions[i * 3 + 2] = z;
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
    this.root.add(this.blocks);
  }

  /** Detailed people in the front rows, or their 6k-triangle twins. */
  setDetail(on: boolean): void {
    this.detail = on;
    for (const { hi, lo } of this.detailPairs) {
      hi.visible = on;
      lo.visible = !on;
    }
  }

  /** Keeps only the nearest share of the crowd, people and far blocks alike (a weak GPU's relief). */
  setReach(share: number): void {
    this.reach = share;
    for (const { mesh, total } of this.farBlocks) {
      mesh.count = Math.max(1, Math.round(total * share));
    }
    for (const variant of this.variants) {
      variant.mesh.count = Math.max(1, Math.round(variant.people.length * share));
    }
  }

  /**
   * Blocks of thirty people fill the pit beyond the individual rows and along
   * the sides, instanced per variant, every block turned towards the stage.
   */
  async loadBlocks(variants: readonly CrowdVariant[], base = ''): Promise<void> {
    const models = await Promise.all(
      variants.map(async (variant) => ({
        hi: await loadModel(base + variant.hi),
        lo: await loadModel(base + variant.lo),
      })),
    );
    const random = seededRandom(7);
    const slots: { x: number; z: number }[] = [];
    const rowStep = BLOCK_DEPTH * 0.85;
    for (let z = PIT_FRONT - 1.2; z > PIT_FRONT - this.pitDepth + 0.5; z -= rowStep) {
      const halfWidth = 13.5 + (-z - PIT_FRONT) * 0.55;
      const offset = (slots.length % 2) * BLOCK_WIDTH * 0.5;
      for (let x = -halfWidth + offset; x <= halfWidth; x += BLOCK_WIDTH * 0.92) {
        // the individual people own the middle of the first rows
        if (z > PIT_FRONT - this.individualDepth - 0.5 && Math.abs(x) < 10.5) continue;
        slots.push({ x: x + (random() - 0.5) * 0.6, z: z + (random() - 0.5) * 0.5 });
      }
    }
    const place = (model: LoadedModel, mine: { x: number; z: number }[]): InstancedMesh | null => {
      if (mine.length === 0) return null;
      const mesh = new InstancedMesh(model.geometry, model.material, mine.length);
      model.material.envMapIntensity = 0.3;
      const scale = BLOCK_HEIGHT / model.size.y;
      mine.forEach((slot, i) => {
        const floor = PIT_FLOOR + (-slot.z - 4) * 0.04;
        this.dummy.position.set(slot.x, floor - model.bounds.min.y * scale, slot.z);
        this.dummy.scale.setScalar(scale * (0.95 + random() * 0.1));
        // face the drummer, with a little scatter
        this.dummy.rotation.set(
          0,
          Math.atan2(-slot.x, -slot.z + 0.15) + Math.PI + (random() - 0.5) * 0.25,
          0,
        );
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      this.blocks.add(mesh);
      return mesh;
    };
    models.forEach((model, index) => {
      const mine = slots.filter((_, i) => i % models.length === index);
      const nearBlock = (slot: { z: number }) => slot.z > PIT_FRONT - BLOCK_DETAIL_DEPTH;
      const nearSlots = mine.filter(nearBlock);
      const nearHi = place(model.hi, nearSlots);
      const nearLo = place(model.lo, nearSlots);
      if (nearHi && nearLo) {
        nearHi.visible = this.detail;
        nearLo.visible = !this.detail;
        this.detailPairs.push({ hi: nearHi, lo: nearLo });
      }
      const far = place(
        model.lo,
        mine.filter((slot) => !nearBlock(slot)),
      );
      // rows were generated front to back: trimming the count drops the farthest
      if (far) this.farBlocks.push({ mesh: far, total: far.count });
      if (far && this.reach < 1) far.count = Math.max(1, Math.round(far.count * this.reach));
    });
  }

  /**
   * Swaps the silhouettes for generated people, dealt round-robin across the
   * variants; the front rows get the detailed model, the rest the light one.
   */
  async loadPeople(
    variants: readonly CrowdVariant[],
    detailDistance: number,
    base = '',
  ): Promise<void> {
    const models = await Promise.all(
      variants.map(async (variant) => ({
        hi: await loadModel(base + variant.hi),
        lo: await loadModel(base + variant.lo),
      })),
    );
    const near = (person: Person) => person.z > PIT_FRONT - detailDistance;
    models.forEach((model, index) => {
      const people = this.people.filter((_, i) => i % models.length === index);
      const front = people.filter(near);
      const hi = this.addVariant(model.hi, front);
      // the same front rows with the light model, shown when the budget says so
      const lo = this.addVariant(model.lo, front);
      if (hi && lo) {
        lo.visible = this.detail ? false : true;
        hi.visible = this.detail;
        this.detailPairs.push({ hi, lo });
      }
      this.addVariant(
        model.lo,
        people.filter((person) => !near(person)),
      );
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
      if (!variant.mesh.visible) continue;
      variant.material.opacity = this.swap;
      variant.material.transparent = this.swap < 0.995;
      this.placeVariant(variant, elapsed, bob, sway);
    }

    const flicker = this.motion.scale;
    this.phones.opacity = 0.7 + Math.sin(elapsed * 2.7) * 0.2 * flicker;
    this.phones.size = 0.08 + Math.sin(elapsed * 3.3) * 0.02 * flicker;
  }

  private addVariant(model: LoadedModel, people: Person[]): InstancedMesh | null {
    if (people.length === 0) return null;
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
    if (this.reach < 1) mesh.count = Math.max(1, Math.round(people.length * this.reach));
    return mesh;
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
