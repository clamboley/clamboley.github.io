import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Vector2,
} from 'three';
import { seededRandom } from '../util/random.ts';
import { glowSpriteTexture } from './textures.ts';

const PIT_FLOOR = -0.8;
/** Centre of the bowl, on the pit floor. */
const CENTRE_Z = -1;
const ARC = 5.3; // radians covered by the tiers; the gap is behind the stage
const TIERS = 3;
const ROWS_PER_TIER = 10;
const ROW_RISE = 0.45;
const ROW_DEPTH = 0.85;
const TIER_GAP = 2.2; // walkway between tiers, metres
const FIRST_RADIUS = 21;
const CEILING_HEIGHT = 24;

export interface Rig {
  /** Lamp positions on the ceiling rigs, world space. */
  lamps: { x: number; y: number; z: number }[];
}

/** Steps profile of the stands: (radius, height) pairs from the pit floor up. */
function tierProfile(): Vector2[] {
  const points: Vector2[] = [];
  let radius = FIRST_RADIUS;
  let height = PIT_FLOOR;
  points.push(new Vector2(radius, height - 1.5), new Vector2(radius, height));
  for (let tier = 0; tier < TIERS; tier++) {
    for (let row = 0; row < ROWS_PER_TIER; row++) {
      height += ROW_RISE;
      points.push(new Vector2(radius, height));
      radius += ROW_DEPTH;
      points.push(new Vector2(radius, height));
    }
    height += 1.2; // balcony front of the next tier
    points.push(new Vector2(radius, height));
    radius += TIER_GAP;
    points.push(new Vector2(radius, height));
  }
  points.push(new Vector2(radius, height + 3));
  return points;
}

/** Phones held up in the stands: points scattered on the treads. */
function standLights(count: number, random: () => number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const tier = Math.min(TIERS - 1, Math.floor(random() * random() * TIERS)); // fewer up high
    const row = Math.floor(random() * ROWS_PER_TIER);
    const radius =
      FIRST_RADIUS +
      tier * (ROWS_PER_TIER * ROW_DEPTH + TIER_GAP) +
      row * ROW_DEPTH +
      random() * ROW_DEPTH;
    const height =
      PIT_FLOOR +
      tier * (ROWS_PER_TIER * ROW_RISE + 1.2) +
      (row + 1) * ROW_RISE +
      1.4 +
      random() * 0.4;
    const angle = (random() - 0.5) * ARC;
    positions[i * 3] = Math.sin(angle) * radius;
    positions[i * 3 + 1] = height;
    positions[i * 3 + 2] = CENTRE_Z - Math.cos(angle) * radius;
  }
  return positions;
}

export function lightsMaterial(size: number, opacity: number): PointsMaterial {
  return new PointsMaterial({
    map: glowSpriteTexture(),
    color: 0xffe9c8,
    size,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

export function pointsFrom(positions: Float32Array, material: PointsMaterial): Points {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  return new Points(geometry, material);
}

/**
 * The arena: continuous stepped stands around the pit, a dark ceiling with
 * lighting rigs, the lighting desk at the far end — all procedural, and
 * mostly read through the thousands of phones held up in the dark.
 */
export class Venue {
  readonly root = new Group();
  readonly rig: Rig = { lamps: [] };
  private readonly standLights: PointsMaterial;

  constructor() {
    const random = seededRandom(2049);

    const stands = new Mesh(
      new LatheGeometry(tierProfile(), 96, Math.PI - ARC / 2, ARC),
      new MeshStandardMaterial({ color: 0x0d0e15, roughness: 0.95, flatShading: true }),
    );
    stands.position.z = CENTRE_Z;
    stands.rotation.y = Math.PI; // the arc opens towards the stage
    this.root.add(stands);

    this.standLights = lightsMaterial(0.16, 0.85);
    this.root.add(pointsFrom(standLights(5200, random), this.standLights));

    // ceiling and its trusses
    const ceiling = new Mesh(
      new CircleGeometry(60, 48),
      new MeshStandardMaterial({ color: 0x0b0b12, roughness: 1 }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, CEILING_HEIGHT, CENTRE_Z);
    this.root.add(ceiling);

    const trussMaterial = new MeshStandardMaterial({
      color: 0x15161c,
      roughness: 0.8,
      metalness: 0.4,
    });
    const lampGeometry = new CircleGeometry(0.22, 12);
    for (const z of [-7, -13, -19]) {
      const truss = new Mesh(new BoxGeometry(30, 0.5, 0.5), trussMaterial);
      truss.position.set(0, CEILING_HEIGHT - 2.2, z);
      this.root.add(truss);
      for (let x = -12; x <= 12; x += 3) {
        this.rig.lamps.push({ x, y: CEILING_HEIGHT - 2.6, z });
      }
    }
    // the fixtures themselves: small bright discs facing down, bloom does the rest
    const lampMaterial = new MeshBasicMaterial({ color: new Color(0xfff2dc).multiplyScalar(2.5) });
    for (const lamp of this.rig.lamps) {
      const disc = new Mesh(lampGeometry, lampMaterial);
      disc.position.set(lamp.x, lamp.y, lamp.z);
      disc.rotation.x = -Math.PI / 2;
      this.root.add(disc);
    }

    // lighting desk at the back: a bank of white lamps above a dim LED wall
    const desk = new Group();
    desk.position.set(0, 6.5, CENTRE_Z - FIRST_RADIUS - 2);
    const wall = new Mesh(
      new PlaneGeometry(9, 3.5),
      new MeshBasicMaterial({ color: new Color(0x1a2a6e).multiplyScalar(0.6) }),
    );
    desk.add(wall);
    const deskLamp = new MeshBasicMaterial({ color: new Color(0xffe6c0).multiplyScalar(3) });
    for (let x = -3.5; x <= 3.5; x += 1) {
      const lamp = new Mesh(new CircleGeometry(0.18, 12), deskLamp);
      lamp.position.set(x, 2.3, 0.05);
      desk.add(lamp);
    }
    this.root.add(desk);
  }

  update(elapsed: number): void {
    this.standLights.opacity = 0.78 + Math.sin(elapsed * 1.9) * 0.08;
  }
}
