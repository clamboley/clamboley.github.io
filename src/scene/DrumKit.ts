import {
  Color,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  type Object3D,
} from 'three';
import type { KitElement, KitKey } from '../kit.types.ts';
import { legacyColor } from './colors.ts';
import { cymbalTexture, drumHeadTexture } from './textures.ts';

const SHELL_COLOR = 0x6e1f2e; // burgundy sparkle
const HIT_PADDING = 0.09; // metres added around each element for aiming
const GLOW_LAMBDA = 7.7; // hover glow response
const FLASH_LAMBDA = 6.3; // stroke flash decay

interface ElementView {
  element: KitElement;
  group: Group;
  materials: MeshStandardMaterial[];
  baseRotX: number;
  glow: number;
  flash: number;
}

/** Builds the (temporary, procedural) kit from the config and animates its reactions. */
export class DrumKit {
  readonly root = new Group();
  /** Invisible spheres used for aiming; larger than the visible parts. */
  readonly proxies: Mesh[] = [];

  private readonly views = new Map<KitKey, ElementView>();
  private readonly keyByProxy = new Map<Object3D, KitKey>();

  constructor(elements: readonly KitElement[]) {
    for (const element of elements) this.build(element);
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

      const intensity = view.glow * 0.55 + view.flash * 1.7;
      for (const material of view.materials) material.emissiveIntensity = intensity;

      const s = 1 + view.glow * 0.035 + view.flash * 0.05;
      view.group.scale.set(s, s * (1 - view.flash * 0.1), s);

      const { kind } = view.element;
      if (kind === 'cymbal' || kind === 'hihat') {
        view.group.rotation.x = view.baseRotX + Math.sin(elapsed * 38) * view.flash * 0.07;
      }
    }
  }

  private build(element: KitElement): void {
    const { placement, kind } = element;
    const position = new Vector3(...placement.position);
    const group = new Group();
    group.position.copy(position);

    const materials =
      kind === 'drum' || kind === 'kick'
        ? this.buildDrum(element, group, position)
        : this.buildCymbal(element, group, position);

    this.root.add(group);
    this.views.set(element.key, {
      element,
      group,
      materials,
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

  private buildDrum(element: KitElement, group: Group, position: Vector3): MeshStandardMaterial[] {
    const { placement, logo, destination, kind, key } = element;
    const emissive = new Color(logo.color);
    const depth = placement.depth ?? 0.2;

    const shell = new MeshStandardMaterial({
      color: legacyColor(SHELL_COLOR),
      metalness: 0.55,
      roughness: 0.32,
      emissive,
      emissiveIntensity: 0,
    });
    const head = new MeshStandardMaterial({
      map: drumHeadTexture(logo, destination.label),
      roughness: 0.65,
      emissive,
      emissiveIntensity: 0,
    });
    const bottom = new MeshStandardMaterial({
      color: legacyColor(0xd8cfb8),
      roughness: 0.7,
      emissive,
      emissiveIntensity: 0,
    });

    const mesh = new Mesh(new CylinderGeometry(placement.radius, placement.radius, depth, 36), [
      shell,
      head,
      bottom,
    ]);
    if (kind === 'kick') mesh.rotation.x = Math.PI / 2; // batter head faces the drummer
    group.add(mesh);
    if (placement.tilt !== undefined) group.rotation.x = placement.tilt;

    const legTop = position.y - depth / 2;
    if (key === 'snare') this.addStand(position.x, position.z, legTop, 0.012);
    if (key === 'floor') {
      this.addStand(position.x - 0.12, position.z + 0.1, legTop, 0.01);
      this.addStand(position.x + 0.14, position.z + 0.08, legTop, 0.01);
    }
    return [shell, head, bottom];
  }

  private buildCymbal(
    element: KitElement,
    group: Group,
    position: Vector3,
  ): MeshStandardMaterial[] {
    const { placement, logo, destination, kind } = element;
    const emissive = new Color(logo.color);

    const top = new MeshStandardMaterial({
      map: cymbalTexture(logo, destination.label),
      metalness: 0.9,
      roughness: 0.3,
      emissive,
      emissiveIntensity: 0,
    });
    const side = new MeshStandardMaterial({
      color: legacyColor(0x9a7b30),
      metalness: 0.9,
      roughness: 0.35,
      emissive,
      emissiveIntensity: 0,
    });

    const mesh = new Mesh(new CylinderGeometry(placement.radius, placement.radius, 0.016, 40), [
      side,
      top,
      side,
    ]);
    group.add(mesh);

    if (kind === 'hihat') {
      const under = new Mesh(
        new CylinderGeometry(placement.radius * 0.97, placement.radius * 0.97, 0.014, 40),
        new MeshStandardMaterial({ color: legacyColor(0xa8863a), metalness: 0.9, roughness: 0.4 }),
      );
      under.position.y = -0.035;
      group.add(under);
      group.rotation.x = 0.14;
      this.addStand(position.x, position.z, position.y - 0.05, 0.011);
    } else {
      group.rotation.x = placement.tilt ?? 0.5;
      this.addStand(position.x * 0.92, position.z + 0.12, position.y - 0.06, 0.012);
    }
    return [top, side];
  }

  private addStand(x: number, z: number, height: number, radius: number): void {
    const stand = new Mesh(
      new CylinderGeometry(radius, radius * 1.25, height, 8),
      new MeshStandardMaterial({ color: legacyColor(0x23252e), metalness: 0.85, roughness: 0.35 }),
    );
    stand.position.set(x, height / 2, z);
    this.root.add(stand);
  }
}
