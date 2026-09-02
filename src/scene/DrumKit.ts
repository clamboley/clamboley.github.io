import {
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
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
  type Texture,
} from 'three';
import type { DrumSpec, DrumZone, Fill, KitElement, KitKey, Logo, ZoneSide } from '../kit.types.ts';
import { cylinderBetween, cymbalGeometry, merge } from './geometry.ts';
import {
  createKitMaterials,
  cymbalMaterial,
  headMaterial,
  shellMaterial,
  type KitMaterials,
} from './materials.ts';
import { drumHeadTexture, headMaskTexture, splitHeadTexture } from './textures.ts';

const HIT_PADDING = 0.09; // metres added around each element for aiming
const BEATER_REST = 0.55; // radians the kick beater sits back from the head
const BEATER_WINDUP = 0.12; // seconds of forward swing before a kick contact
const BEATER_RECOVER = 0.22; // seconds to swing back after the contact
const CYMBAL_PADDING = 0.03; // thinner margin around a cymbal's disc: its neighbours sit right below
const GLOW_LAMBDA = 7.7; // hover glow response
const FLASH_LAMBDA = 6.3; // stroke flash decay
const KICK_FRONT_OFFSET = 0.02; // the batter head sits this far inside the hoop
const TILTER_LENGTH = 0.11; // chrome rod through the cymbal's centre hole
const STAND_DROP = 0.25; // cymbal stand tube ends this far below the cymbal centre

type Reactive = MeshStandardMaterial | MeshPhysicalMaterial;

interface View {
  spec: DrumSpec;
  group: Group;
  reactive: Reactive[];
  /** The batter head, whose glow can be masked to one half. */
  head: MeshStandardMaterial | null;
  baseRotX: number;
  glow: number;
  flash: number;
  /** Destination whose colour and half currently light the piece. */
  lit: KitKey | null;
}

interface HeadBuild {
  reactive: Reactive[];
  /** Where a half-head proxy goes: the parent of the batter head and its height. */
  headParent: Object3D;
  headY: number;
}

/**
 * Procedural, config-driven kit built from physical pieces: shells with hoops,
 * lugs and rods, lathed cymbals, chrome stands, pedal. A piece carries one
 * destination on its whole head or two on its halves; it also stands in for
 * the full kit's voices it is told to, so every fill plays on every layout.
 * Reactions (hover glow, stroke flash / squash / cymbal wobble) are the same
 * whatever the geometry.
 */
export class DrumKit {
  readonly root = new Group();
  /** Invisible shapes used for aiming; larger than the visible parts. */
  readonly proxies: Mesh[] = [];

  private readonly views = new Map<string, View>();
  private readonly keyByProxy = new Map<Object3D, KitKey>();
  private readonly zoneOwner = new Map<KitKey, { view: View; zone: DrumZone }>();
  private readonly voiceOwner = new Map<KitKey, View>();
  private beater: { pivot: Group; queue: number[] } | null = null;
  private readonly materials: KitMaterials = createKitMaterials();
  private readonly masks: Record<ZoneSide, Texture> = {
    whole: headMaskTexture('whole'),
    left: headMaskTexture('left'),
    right: headMaskTexture('right'),
  };

  constructor(
    specs: readonly DrumSpec[],
    private readonly elements: Readonly<Record<KitKey, KitElement>>,
  ) {
    for (const spec of specs) this.build(spec);
    this.addTomMounts(specs);
  }

  /** Which destination an aimed object belongs to. */
  keyOf(object: Object3D): KitKey | null {
    return this.keyByProxy.get(object) ?? null;
  }

  /** World point of a destination's zone (where the keyboard focus looks). */
  /** The fill a strike on this destination plays: the piece may impose its own. */
  fillFor(key: KitKey): Fill {
    const fill = this.zoneOwner.get(key)?.view.spec.fill;
    if (fill !== undefined && typeof fill !== 'string') return fill;
    return this.elements[fill ?? key].fill;
  }

  aimPoint(key: KitKey): Vector3 {
    const owner = this.zoneOwner.get(key);
    if (!owner) return new Vector3(0, 1, -1);
    const { view, zone } = owner;
    const { placement, kind } = view.spec;
    const x = this.sideOffset(zone.side, placement.radius);
    const depth = placement.depth ?? 0.2;
    const local =
      kind === 'kick'
        ? new Vector3(x, 0, depth / 2)
        : kind === 'drum'
          ? new Vector3(x, depth / 2, 0)
          : new Vector3(0, 0, 0);
    view.group.updateWorldMatrix(true, false);
    return view.group.localToWorld(local);
  }

  /** World point a stick lands on for a voice; null for the kick (played by the foot). */
  strikePoint(key: KitKey, spot: 'head' | 'bell' = 'head'): Vector3 | null {
    const view = this.voiceOwner.get(key);
    if (!view || view.spec.kind === 'kick') return null;
    const { placement, kind } = view.spec;
    // strokes land in the middle of the head whatever its zones: drummers aim
    // for the centre, split logos or not
    const local =
      kind === 'drum'
        ? new Vector3(0, (placement.depth ?? 0.2) / 2 + 0.004, placement.radius * 0.35)
        : spot === 'bell'
          ? new Vector3(0, 0.03, 0.01)
          : new Vector3(0, 0.012, placement.radius * 0.55);
    view.group.updateWorldMatrix(true, false);
    return view.group.localToWorld(local);
  }

  /** A stroke lands on a voice. */
  hit(key: KitKey, velocity: number): void {
    const view = this.voiceOwner.get(key);
    if (view) view.flash = Math.max(view.flash, 0.7 + 0.3 * velocity);
  }

  update(dt: number, elapsed: number, hovered: KitKey | null): void {
    for (const view of this.views.values()) {
      const zone = hovered === null ? undefined : view.spec.zones.find((z) => z.key === hovered);
      if (zone && view.lit !== zone.key) this.light(view, zone);
      view.glow = MathUtils.damp(view.glow, zone ? 1 : 0, GLOW_LAMBDA, dt);
      view.flash *= Math.exp(-FLASH_LAMBDA * dt);

      const intensity = view.glow * 0.35 + view.flash * 2.2;
      for (const material of view.reactive) material.emissiveIntensity = intensity;

      const s = 1 + view.glow * 0.03 + view.flash * 0.04;
      view.group.scale.set(s, s * (1 - view.flash * 0.08), s);

      const { kind } = view.spec;
      if (kind === 'cymbal' || kind === 'hihat') {
        view.group.rotation.x = view.baseRotX + Math.sin(elapsed * 38) * view.flash * 0.06;
      }
    }
  }

  /** Frees GPU resources when a layout is swapped out. */
  dispose(): void {
    this.beater = null;
    this.root.traverse((object) => {
      const mesh = object as Partial<Mesh>;
      if (mesh.isMesh !== true || !mesh.geometry || !mesh.material) return;
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) material.dispose();
    });
    for (const mask of Object.values(this.masks)) mask.dispose();
  }

  /** The whole piece glows in the zone's colour, the head only on that zone's half. */
  private light(view: View, zone: DrumZone): void {
    view.lit = zone.key;
    const { color } = this.elements[zone.key].logo;
    for (const material of view.reactive) material.emissive.set(color);
    if (view.head) view.head.emissiveMap = this.masks[zone.side];
  }

  private sideOffset(side: ZoneSide, radius: number): number {
    return side === 'left' ? -radius * 0.42 : side === 'right' ? radius * 0.42 : 0;
  }

  private build(spec: DrumSpec): void {
    const { placement, kind } = spec;
    const first = spec.zones[0];
    if (!first) throw new Error(`Piece ${spec.id} has no destination`);
    const position = new Vector3(...placement.position);
    const group = new Group();
    group.position.copy(position);
    if (placement.yaw !== undefined) group.rotation.y = placement.yaw;

    let reactive: Reactive[];
    let head: MeshStandardMaterial | null = null;
    switch (kind) {
      case 'kick':
      case 'drum': {
        head = this.headFor(spec);
        const built =
          kind === 'kick'
            ? this.buildKick(spec, group, position, head, this.elements[first.key].logo.color)
            : this.buildDrum(spec, group, position, head, this.elements[first.key].logo.color);
        reactive = built.reactive;
        if (spec.zones.length > 1) {
          this.addHalfProxies(built.headParent, built.headY, placement.radius, spec.zones);
        }
        break;
      }
      case 'hihat':
        reactive = this.buildHiHat(spec, group, position, this.elements[first.key]);
        break;
      case 'cymbal':
        reactive = this.buildCymbal(spec, group, position, this.elements[first.key]);
        break;
    }

    this.root.add(group);
    const view: View = {
      spec,
      group,
      reactive,
      head,
      baseRotX: group.rotation.x,
      glow: 0,
      flash: 0,
      lit: null,
    };
    this.views.set(spec.id, view);
    for (const zone of spec.zones) this.zoneOwner.set(zone.key, { view, zone });
    for (const key of spec.playsFor) this.voiceOwner.set(key, view);

    if (spec.zones.length === 1) {
      const proxy =
        kind === 'cymbal' || kind === 'hihat'
          ? this.cymbalProxy(group, placement.radius, kind === 'hihat')
          : new Mesh(
              new SphereGeometry(placement.radius + HIT_PADDING, 10, 10),
              new MeshBasicMaterial({ visible: false }),
            );
      if (proxy.parent === null) {
        proxy.position.copy(position);
        this.root.add(proxy);
      }
      this.proxies.push(proxy);
      this.keyByProxy.set(proxy, first.key);
    }
  }

  /**
   * A cymbal is aimed through a flat puck around its disc, inside its own
   * frame so it follows the tilt: a sphere would swallow whatever sits
   * below the cymbal (the snare under the hi-hat, the kick under the ride).
   */
  private cymbalProxy(group: Group, radius: number, hihat: boolean): Mesh {
    const r = radius + CYMBAL_PADDING;
    const proxy = new Mesh(
      new CylinderGeometry(r, r, hihat ? 0.12 : 0.07, 24),
      new MeshBasicMaterial({ visible: false }),
    );
    proxy.position.y = hihat ? -0.015 : 0;
    group.add(proxy);
    return proxy;
  }

  /** The batter head's material: one logo, or two with a seam between them. */
  private headFor(spec: DrumSpec): MeshStandardMaterial {
    const left = spec.zones.find((z) => z.side === 'left');
    const right = spec.zones.find((z) => z.side === 'right');
    const first = spec.zones[0];
    const print = (key: KitKey): { logo: Logo; label: string } | null => {
      const { logo, destination } = this.elements[key];
      // a destination that does not exist yet stays unadvertised: plain head
      return destination.pending === true ? null : { logo, label: destination.label };
    };
    const map =
      left && right
        ? splitHeadTexture(print(left.key), print(right.key), 0)
        : drumHeadTexture(print(first?.key ?? 'snare'));
    const material = headMaterial(map, this.elements[first?.key ?? 'snare'].logo.color);
    material.emissiveMap = this.masks.whole; // present from the start: no recompile on hover
    return material;
  }

  /** Two flat half-discs over a split head, one aiming target per destination. */
  private addHalfProxies(parent: Object3D, y: number, r: number, zones: readonly DrumZone[]): void {
    for (const zone of zones) {
      if (zone.side === 'whole') continue;
      const start = zone.side === 'left' ? Math.PI / 2 : -Math.PI / 2;
      const proxy = new Mesh(
        new CircleGeometry(r + HIT_PADDING * 0.6, 24, start, Math.PI),
        new MeshBasicMaterial({ visible: false, side: DoubleSide }),
      );
      proxy.rotation.x = -Math.PI / 2;
      proxy.position.y = y + 0.012;
      parent.add(proxy);
      this.proxies.push(proxy);
      this.keyByProxy.set(proxy, zone.key);
    }
  }

  /* ---------- drums ---------- */

  private buildDrum(
    spec: DrumSpec,
    group: Group,
    position: Vector3,
    head: MeshStandardMaterial,
    color: string,
  ): HeadBuild {
    const { placement, support } = spec;
    const r = placement.radius;
    const depth = placement.depth ?? 0.2;
    const lugs = support === 'stand' ? 10 : support === 'legs' ? 8 : 6;

    const shell = shellMaterial(color);
    group.add(this.shellMesh(r, depth, shell, head));
    group.add(this.hardwareMesh(r, depth, lugs, this.materials.chrome));
    if (placement.tilt !== undefined) group.rotation.x = placement.tilt;

    const legTop = position.y - depth / 2 - 0.02;
    if (support === 'stand') this.addStand(position.x, position.z + 0.02, legTop, 0.36);
    if (support === 'legs') {
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
    return { reactive: [shell, head], headParent: group, headY: depth / 2 };
  }

  private buildKick(
    spec: DrumSpec,
    group: Group,
    position: Vector3,
    head: MeshStandardMaterial,
    color: string,
  ): HeadBuild {
    const { placement } = spec;
    const r = placement.radius;
    const depth = placement.depth ?? 0.4;

    const shell = shellMaterial(color);
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

    // spurs on the audience side, pedal on the drummer's side, in the kick's own
    // frame so that a turned kick keeps them
    const floor = -position.y;
    const spurs: BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      spurs.push(
        cylinderBetween(
          new Vector3(side * (r - 0.02), -r * 0.45, -depth * 0.35),
          new Vector3(side * (r + 0.12), floor + 0.01, -depth * 0.35 - 0.1),
          0.007,
        ),
      );
    }
    group.add(this.shadowed(new Mesh(merge(spurs), this.materials.chrome)));
    this.addPedal(group, floor, depth);
    return { reactive: [shell, head], headParent: drum, headY: depth / 2 - KICK_FRONT_OFFSET };
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

  /** Board, post and beater in the kick's frame; `floor` is the stage in local y. */
  private addPedal(group: Group, floor: number, depth: number): void {
    const headZ = depth / 2 - KICK_FRONT_OFFSET;
    const board = new BoxGeometry(0.085, 0.008, 0.26)
      .rotateX(0.22)
      .translate(0, floor + 0.035, headZ + 0.2);
    const base = new BoxGeometry(0.16, 0.012, 0.06).translate(0, floor + 0.006, headZ + 0.05);
    const post = new CylinderGeometry(0.006, 0.006, 0.16).translate(
      0.06,
      floor + 0.09,
      headZ + 0.03,
    );
    const axle = new CylinderGeometry(0.006, 0.006, 0.14)
      .rotateZ(Math.PI / 2)
      .translate(0, floor + 0.17, headZ + 0.03);
    group.add(this.shadowed(new Mesh(merge([board, base, post, axle]), this.materials.chrome)));

    // the beater swings around the axle: built touching the head, parked back
    const pivot = new Group();
    pivot.position.set(0, floor + 0.17, headZ + 0.03);
    const tip = new Vector3(0, -0.05 - (floor + 0.17), -0.002);
    const rod = cylinderBetween(new Vector3(0, 0, 0), tip, 0.004);
    pivot.add(this.shadowed(new Mesh(rod, this.materials.chrome)));
    const beater = new Mesh(new SphereGeometry(0.026, 16, 12), this.materials.felt);
    beater.position.copy(tip);
    pivot.add(this.shadowed(beater));
    pivot.rotation.x = BEATER_REST;
    group.add(pivot);
    this.beater = { pivot, queue: [] };
  }

  /** Kick contacts to come, on the audio clock: the beater winds up ahead of each. */
  scheduleKicks(times: readonly number[]): void {
    if (this.beater === null || times.length === 0) return;
    this.beater.queue.push(...times);
    this.beater.queue.sort((a, b) => a - b);
  }

  /** Swing towards the next contact, rebound after the last one. */
  updateBeater(now: number): void {
    const b = this.beater;
    if (b === null) return;
    while (b.queue.length > 0 && (b.queue.at(0) ?? Infinity) < now - BEATER_RECOVER) {
      b.queue.shift();
    }
    let angle = BEATER_REST;
    const last = b.queue.filter((t) => t <= now).at(-1);
    if (last !== undefined) {
      const u = Math.min(1, (now - last) / BEATER_RECOVER);
      angle = BEATER_REST * u * (2 - u); // eased rebound towards the rest pose
    }
    const next = b.queue.find((t) => t > now);
    if (next !== undefined && next - now < BEATER_WINDUP) {
      const v = 1 - (next - now) / BEATER_WINDUP;
      angle = Math.min(angle, BEATER_REST * (1 - v * v)); // accelerating swing in
    }
    b.pivot.rotation.x = angle;
  }

  /* ---------- cymbals ---------- */

  private buildCymbal(
    spec: DrumSpec,
    group: Group,
    position: Vector3,
    zone: KitElement,
  ): Reactive[] {
    const { placement } = spec;
    const { logo, destination } = zone;
    const material = cymbalMaterial(
      destination.pending === true ? null : { logo, label: destination.label },
      logo.color,
    );
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
    const roll = placement.roll ?? 0;
    group.rotation.x = tilt;
    group.rotation.z = roll;

    // straight stand under the centre, ending well below the lowest point of the tilted
    // cymbal, then a short neck up to the tilter along the cymbal's axis
    const tubeTop = new Vector3(position.x, position.y - STAND_DROP, position.z);
    const normal = new Vector3(0, 1, 0)
      .applyAxisAngle(new Vector3(0, 0, 1), roll)
      .applyAxisAngle(new Vector3(1, 0, 0), tilt);
    const tilterBase = position.clone().addScaledVector(normal, -TILTER_LENGTH / 2);
    this.addStand(position.x, position.z, position.y - STAND_DROP, 0.42);
    this.addStatic(cylinderBetween(tubeTop, tilterBase, 0.008), this.materials.chrome);
    return [material];
  }

  private buildHiHat(
    spec: DrumSpec,
    group: Group,
    position: Vector3,
    zone: KitElement,
  ): Reactive[] {
    const { placement } = spec;
    const { logo, destination } = zone;
    const r = placement.radius;
    const material = cymbalMaterial(
      destination.pending === true ? null : { logo, label: destination.label },
      logo.color,
    );
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
  private addTomMounts(specs: readonly DrumSpec[]): void {
    const kick = specs.find((s) => s.kind === 'kick');
    if (!kick) return;
    const [kx, ky, kz] = kick.placement.position;
    const rods: BufferGeometry[] = [];
    for (const tom of specs.filter((s) => s.support === 'mount')) {
      const [tx, ty, tz] = tom.placement.position;
      const base = new Vector3(
        kx + Math.sign(tx || 1) * 0.08,
        ky + kick.placement.radius - 0.02,
        kz + 0.05,
      );
      const mid = new Vector3(base.x, ty - 0.12, base.z);
      rods.push(
        cylinderBetween(base, mid, 0.009),
        cylinderBetween(mid, new Vector3(tx, ty - 0.02, tz), 0.009),
      );
    }
    if (rods.length > 0) this.addStatic(merge(rods), this.materials.chrome);
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
