import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
  type MeshPhysicalMaterial,
  type MeshStandardMaterial,
  type Object3D,
} from 'three';
import type { KitElement, KitKey } from '../kit.types.ts';
import { cylinderBetween, cymbalGeometry, merge } from './geometry.ts';
import {
  createKitMaterials,
  cymbalMaterial,
  headMaterial,
  shellMaterial,
  type KitMaterials,
} from './materials.ts';

const HIT_PADDING = 0.09; // metres added around each element for aiming
const GLOW_LAMBDA = 7.7; // hover glow response
const FLASH_LAMBDA = 6.3; // stroke flash decay
const KICK_FRONT_OFFSET = 0.02; // the batter head sits this far inside the hoop
const TILTER_LENGTH = 0.11; // chrome rod through the cymbal's centre hole
const STAND_DROP = 0.25; // cymbal stand tube ends this far below the cymbal centre

type Reactive = MeshStandardMaterial | MeshPhysicalMaterial;

interface ElementView {
  element: KitElement;
  group: Group;
  reactive: Reactive[];
  baseRotX: number;
  glow: number;
  flash: number;
}

/**
 * Procedural, config-driven kit: shells with hoops, lugs and rods, lathed
 * cymbals, chrome stands, pedal. Keeps the same reactions (hover glow,
 * stroke flash / squash / cymbal wobble) whatever the geometry.
 */
export class DrumKit {
  readonly root = new Group();
  /** Invisible spheres used for aiming; larger than the visible parts. */
  readonly proxies: Mesh[] = [];

  private readonly views = new Map<KitKey, ElementView>();
  private readonly keyByProxy = new Map<Object3D, KitKey>();
  private readonly materials: KitMaterials = createKitMaterials();

  constructor(elements: readonly KitElement[]) {
    for (const element of elements) this.build(element);
    this.addTomMounts(elements);
  }

  /** Which element an aimed object belongs to. */
  keyOf(object: Object3D): KitKey | null {
    return this.keyByProxy.get(object) ?? null;
  }

  /** A stroke lands on this element. */
  hit(key: KitKey, velocity: number): void {
    const view = this.views.get(key);
    if (view) view.flash = Math.max(view.flash, 0.7 + 0.3 * velocity);
  }

  update(dt: number, elapsed: number, hovered: KitKey | null): void {
    for (const view of this.views.values()) {
      view.glow = MathUtils.damp(view.glow, view.element.key === hovered ? 1 : 0, GLOW_LAMBDA, dt);
      view.flash *= Math.exp(-FLASH_LAMBDA * dt);

      const intensity = view.glow * 0.35 + view.flash * 2.2;
      for (const material of view.reactive) material.emissiveIntensity = intensity;

      const s = 1 + view.glow * 0.03 + view.flash * 0.04;
      view.group.scale.set(s, s * (1 - view.flash * 0.08), s);

      const { kind } = view.element;
      if (kind === 'cymbal' || kind === 'hihat') {
        view.group.rotation.x = view.baseRotX + Math.sin(elapsed * 38) * view.flash * 0.06;
      }
    }
  }

  private build(element: KitElement): void {
    const { placement, kind } = element;
    const position = new Vector3(...placement.position);
    const group = new Group();
    group.position.copy(position);

    let reactive: Reactive[];
    switch (kind) {
      case 'kick':
        reactive = this.buildKick(element, group, position);
        break;
      case 'drum':
        reactive = this.buildDrum(element, group, position);
        break;
      case 'hihat':
        reactive = this.buildHiHat(element, group, position);
        break;
      case 'cymbal':
        reactive = this.buildCymbal(element, group, position);
        break;
    }

    this.root.add(group);
    this.views.set(element.key, {
      element,
      group,
      reactive,
      baseRotX: group.rotation.x,
      glow: 0,
      flash: 0,
    });

    const proxy = new Mesh(
      new SphereGeometry(placement.radius + HIT_PADDING, 10, 10),
      new MeshBasicMaterial({ visible: false }),
    );
    proxy.position.copy(position);
    this.root.add(proxy);
    this.proxies.push(proxy);
    this.keyByProxy.set(proxy, element.key);
  }

  /* ---------- drums ---------- */

  private buildDrum(element: KitElement, group: Group, position: Vector3): Reactive[] {
    const { placement, logo, destination, key } = element;
    const r = placement.radius;
    const depth = placement.depth ?? 0.2;
    const lugs = key === 'snare' ? 10 : key === 'floor' ? 8 : 6;

    const shell = shellMaterial(logo.color);
    const head = headMaterial(logo, destination.label, logo.color);
    group.add(this.shellMesh(r, depth, shell, head));
    group.add(this.hardwareMesh(r, depth, lugs, this.materials.chrome));
    if (placement.tilt !== undefined) group.rotation.x = placement.tilt;

    const legTop = position.y - depth / 2 - 0.02;
    if (key === 'snare') this.addStand(position.x, position.z + 0.02, legTop, 0.36);
    if (key === 'floor') {
      // floor tom legs: three angled rods
      const legs: BufferGeometry[] = [];
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        const top = new Vector3(
          position.x + Math.cos(a) * (r + 0.02),
          position.y - depth * 0.1,
          position.z + Math.sin(a) * (r + 0.02),
        );
        const foot = new Vector3(
          position.x + Math.cos(a) * (r + 0.1),
          0.01,
          position.z + Math.sin(a) * (r + 0.1),
        );
        legs.push(cylinderBetween(top, foot, 0.006));
      }
      this.addStatic(merge(legs), this.materials.chrome);
    }
    return [shell, head];
  }

  private buildKick(element: KitElement, group: Group, position: Vector3): Reactive[] {
    const { placement, logo, destination } = element;
    const r = placement.radius;
    const depth = placement.depth ?? 0.4;

    const shell = shellMaterial(logo.color);
    const head = headMaterial(logo, destination.label, logo.color);
    // built upright, then laid on its side so the batter head faces the drummer
    const drum = new Group();
    drum.add(this.shellMesh(r, depth, shell, head, KICK_FRONT_OFFSET));
    // wooden hoops instead of chrome
    const hoops = merge([
      new TorusGeometry(r + 0.006, 0.012, 8, 72).rotateX(Math.PI / 2).translate(0, depth / 2, 0),
      new TorusGeometry(r + 0.006, 0.012, 8, 72).rotateX(Math.PI / 2).translate(0, -depth / 2, 0),
    ]);
    drum.add(this.shadowed(new Mesh(hoops, this.materials.blackGloss)));
    drum.add(this.hardwareMesh(r, depth, 8, this.materials.chrome, true));
    drum.rotation.x = Math.PI / 2;
    group.add(drum);

    // spurs on the audience side, pedal on the drummer's side (world-aligned parts)
    const spurs: BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      spurs.push(
        cylinderBetween(
          new Vector3(
            position.x + side * (r - 0.02),
            position.y - r * 0.45,
            position.z - depth * 0.35,
          ),
          new Vector3(position.x + side * (r + 0.12), 0.01, position.z - depth * 0.35 - 0.1),
          0.007,
        ),
      );
    }
    this.addStatic(merge(spurs), this.materials.chrome);
    this.addPedal(position, depth);
    return [shell, head];
  }

  /** Open shell with both heads; `inset` sinks the batter head below the hoop. */
  private shellMesh(r: number, depth: number, shell: Material, head: Material, inset = 0): Group {
    const group = new Group();
    const body = new Mesh(new CylinderGeometry(r, r, depth - 0.016, 64, 1, true), shell);
    group.add(this.shadowed(body));
    const top = new Mesh(new CircleGeometry(r * 0.995, 64), head);
    top.rotation.x = -Math.PI / 2;
    top.position.y = depth / 2 - inset;
    top.receiveShadow = true;
    group.add(top);
    const bottom = new Mesh(new CircleGeometry(r * 0.995, 64), this.materials.resonant);
    bottom.rotation.x = Math.PI / 2;
    bottom.position.y = -depth / 2 + inset;
    group.add(bottom);
    return group;
  }

  /** Hoops, lugs and tension rods merged into a single chrome mesh. */
  private hardwareMesh(
    r: number,
    depth: number,
    lugs: number,
    material: Material,
    kick = false,
  ): Mesh {
    const parts: BufferGeometry[] = [];
    const half = depth / 2;
    if (!kick) {
      for (const y of [half, -half]) {
        parts.push(
          new TorusGeometry(r + 0.004, 0.0065, 8, 72).rotateX(Math.PI / 2).translate(0, y, 0),
        );
      }
    }
    const rodLength = kick ? 0.06 : 0.05;
    const lugInset = Math.min(0.045, depth * 0.3);
    for (let i = 0; i < lugs; i++) {
      const a = (i / lugs) * Math.PI * 2 + Math.PI / lugs;
      const x = Math.cos(a) * (r + 0.013);
      const z = Math.sin(a) * (r + 0.013);
      const single = depth < 0.2; // shallow drums: one lug shared by both rods
      const lugYs = single ? [0] : [half - lugInset, -half + lugInset];
      for (const y of lugYs) {
        parts.push(
          new BoxGeometry(0.016, single ? 0.045 : 0.03, 0.015).rotateY(-a).translate(x, y, z),
        );
      }
      for (const y of [half - rodLength / 2 + 0.006, -half + rodLength / 2 - 0.006]) {
        parts.push(new CylinderGeometry(0.0028, 0.0028, rodLength, 6).translate(x, y, z));
      }
    }
    return this.shadowed(new Mesh(merge(parts), material));
  }

  private addPedal(kick: Vector3, depth: number): void {
    const headZ = kick.z + depth / 2 - KICK_FRONT_OFFSET;
    const board = new BoxGeometry(0.085, 0.008, 0.26)
      .rotateX(0.22)
      .translate(kick.x, 0.035, headZ + 0.2);
    const base = new BoxGeometry(0.16, 0.012, 0.06).translate(kick.x, 0.006, headZ + 0.05);
    const post = new CylinderGeometry(0.006, 0.006, 0.16).translate(
      kick.x + 0.06,
      0.09,
      headZ + 0.03,
    );
    const axle = new CylinderGeometry(0.006, 0.006, 0.14)
      .rotateZ(Math.PI / 2)
      .translate(kick.x, 0.17, headZ + 0.03);
    this.addStatic(merge([board, base, post, axle]), this.materials.chrome);
    const rod = cylinderBetween(
      new Vector3(kick.x, 0.17, headZ + 0.03),
      new Vector3(kick.x, kick.y - 0.05, headZ + 0.028),
      0.004,
    );
    this.addStatic(rod, this.materials.chrome);
    const beater = new Mesh(new SphereGeometry(0.026, 16, 12), this.materials.felt);
    beater.position.set(kick.x, kick.y - 0.05, headZ + 0.028);
    this.root.add(this.shadowed(beater));
  }

  /* ---------- cymbals ---------- */

  private buildCymbal(element: KitElement, group: Group, position: Vector3): Reactive[] {
    const { placement, logo, destination } = element;
    const material = cymbalMaterial(logo, destination.label, logo.color);
    group.add(this.shadowed(new Mesh(cymbalGeometry(placement.radius), material)));
    // felt, wing nut and the tilter sleeve on top of the stand
    const nut = merge([
      new CylinderGeometry(0.014, 0.014, 0.012, 16).translate(0, 0.045, 0),
      new CylinderGeometry(0.02, 0.02, 0.01, 16).translate(0, -0.006, 0),
    ]);
    group.add(new Mesh(nut, this.materials.felt));
    group.add(
      new Mesh(new CylinderGeometry(0.005, 0.005, TILTER_LENGTH, 8), this.materials.chrome),
    );
    const tilt = placement.tilt ?? 0.5;
    group.rotation.x = tilt;

    // straight stand under the centre, ending well below the lowest point of the tilted
    // cymbal, then a short neck up to the tilter along the cymbal's axis
    const tubeTop = new Vector3(position.x, position.y - STAND_DROP, position.z);
    const normal = new Vector3(0, 1, 0).applyAxisAngle(new Vector3(1, 0, 0), tilt);
    const tilterBase = position.clone().addScaledVector(normal, -TILTER_LENGTH / 2);
    this.addStand(position.x, position.z, position.y - STAND_DROP, 0.42);
    this.addStatic(cylinderBetween(tubeTop, tilterBase, 0.008), this.materials.chrome);
    return [material];
  }

  private buildHiHat(element: KitElement, group: Group, position: Vector3): Reactive[] {
    const { placement, logo, destination } = element;
    const r = placement.radius;
    const material = cymbalMaterial(logo, destination.label, logo.color);
    group.add(this.shadowed(new Mesh(cymbalGeometry(r), material)));
    const bottom = new Mesh(cymbalGeometry(r * 0.98), material);
    bottom.rotation.x = Math.PI;
    bottom.position.y = -0.03;
    group.add(this.shadowed(bottom));
    const clutch = merge([
      new CylinderGeometry(0.012, 0.012, 0.03, 16).translate(0, 0.05, 0),
      new CylinderGeometry(0.018, 0.018, 0.008, 16).translate(0, 0.034, 0),
    ]);
    group.add(new Mesh(clutch, this.materials.chrome));
    // level, so the stand's rod exits through the centre of both cymbals
    group.rotation.x = 0;

    this.addStand(position.x, position.z, position.y - 0.05, 0.4, 0.005, 0.2);
    return [material];
  }

  /* ---------- hardware helpers ---------- */

  /** Tripod stand: tube, three legs, rubber feet. */
  private addStand(
    x: number,
    z: number,
    height: number,
    spread: number,
    rodRadius = 0.011,
    rodExtra = 0,
  ): void {
    const parts: BufferGeometry[] = [];
    parts.push(
      new CylinderGeometry(rodRadius, rodRadius * 1.1, height + rodExtra, 12).translate(
        x,
        (height + rodExtra) / 2,
        z,
      ),
    );
    parts.push(new CylinderGeometry(0.02, 0.02, 0.05, 12).translate(x, 0.3, z));
    const feet: BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      const foot = new Vector3(x + Math.cos(a) * spread, 0.012, z + Math.sin(a) * spread);
      parts.push(cylinderBetween(new Vector3(x, 0.3, z), foot, 0.006));
      feet.push(new CylinderGeometry(0.012, 0.014, 0.024, 8).translate(foot.x, 0.012, foot.z));
    }
    this.addStatic(merge(parts), this.materials.chrome);
    this.addStatic(merge(feet), this.materials.rubber);
  }

  /** Rack toms hang from the kick on angled rods. */
  private addTomMounts(elements: readonly KitElement[]): void {
    const kick = elements.find((e) => e.kind === 'kick');
    if (!kick) return;
    const [kx, ky, kz] = kick.placement.position;
    const rods: BufferGeometry[] = [];
    for (const key of ['tom1', 'tom2'] as const) {
      const tom = elements.find((e) => e.key === key);
      if (!tom) continue;
      const [tx, ty, tz] = tom.placement.position;
      const base = new Vector3(
        kx + Math.sign(tx) * 0.08,
        ky + kick.placement.radius - 0.02,
        kz + 0.05,
      );
      const mid = new Vector3(base.x, ty - 0.12, base.z);
      rods.push(
        cylinderBetween(base, mid, 0.009),
        cylinderBetween(mid, new Vector3(tx, ty - 0.02, tz), 0.009),
      );
    }
    this.addStatic(merge(rods), this.materials.chrome);
  }

  private addStatic(geometry: BufferGeometry, material: Material): void {
    this.root.add(this.shadowed(new Mesh(geometry, material)));
  }

  private shadowed<T extends Mesh>(mesh: T): T {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}
