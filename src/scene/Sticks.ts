import {
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import type { KitKey } from '../kit.types.ts';
import { merge } from './geometry.ts';

const LENGTH = 0.41; // metres, a 5A stick
const LIFT = 0.16; // seconds between the start of the swing and the contact
const LIFT_HEIGHT = 0.16; // metres, apex of the swing above the target
const REBOUND = 0.11; // seconds, bounce after the contact
const REBOUND_HEIGHT = 0.05;
const RETURN = 0.5; // seconds to come back to rest after the last stroke
const SAME_HAND_MIN_GAP = 0.09; // seconds; faster than that, the other hand takes over
const FADE_LAMBDA = 22;
const UP = new Vector3(0, 1, 0);

export interface Strike {
  /** Absolute time on the audio clock. */
  at: number;
  key: KitKey;
  /** World point the tip lands on. */
  point: Vector3;
}

type Side = 'left' | 'right';

interface Hand {
  side: Side;
  stick: Group;
  /** Where the hand hovers between strokes. */
  anchor: Vector3;
  restTip: Vector3;
  strikes: Strike[];
}

/** Elements a hand naturally owns; everything else alternates. */
const PREFERRED: Partial<Record<KitKey, Side>> = {
  hihat: 'left',
  crash: 'left',
  ride: 'right',
  floor: 'right',
};

function stickGroup(material: MeshStandardMaterial): Group {
  const shaft = new CylinderGeometry(0.0052, 0.0078, LENGTH - 0.02, 12).translate(
    0,
    (LENGTH - 0.02) / 2,
    0,
  );
  const tip = new SphereGeometry(0.0065, 12, 8).scale(1, 1.4, 1).translate(0, LENGTH - 0.012, 0);
  const geometry = merge([shaft, tip]).rotateX(Math.PI / 2); // along +z, butt at the origin
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  const group = new Group();
  group.add(mesh);
  return group;
}

/**
 * First-person drumsticks: invisible at rest, they fade in on a click and
 * play the fill's timeline — swing, contact, rebound — on the audio clock.
 */
export class Sticks {
  readonly root = new Group();

  private readonly material = new MeshStandardMaterial({
    color: 0xd9c39a,
    roughness: 0.55,
    transparent: true,
    opacity: 0,
  });
  private readonly hands: Hand[];
  private opacityTarget = 0;

  // scratch vectors
  private readonly tip = new Vector3();
  private readonly from = new Vector3();
  private readonly hold = new Vector3();
  private readonly dir = new Vector3();

  constructor() {
    this.hands = [
      {
        side: 'left',
        stick: stickGroup(this.material),
        anchor: new Vector3(-0.3, 0.98, -0.22),
        restTip: new Vector3(-0.42, 1.02, -0.5),
        strikes: [],
      },
      {
        side: 'right',
        stick: stickGroup(this.material),
        anchor: new Vector3(0.24, 0.96, -0.2),
        restTip: new Vector3(0.02, 0.9, -0.55),
        strikes: [],
      },
    ];
    for (const hand of this.hands) {
      this.root.add(hand.stick);
      this.pose(hand, hand.restTip);
    }
    this.root.visible = false;
  }

  /** Assigns the strokes to the hands and starts playing them. */
  play(strikes: readonly Strike[]): void {
    for (const hand of this.hands) hand.strikes = [];
    const last: Record<Side, number> = { left: -Infinity, right: -Infinity };
    let alternate: Side = 'right';
    for (const strike of [...strikes].sort((a, b) => a.at - b.at)) {
      let side: Side = PREFERRED[strike.key] ?? alternate;
      const other: Side = side === 'left' ? 'right' : 'left';
      if (
        strike.at - last[side] < SAME_HAND_MIN_GAP &&
        strike.at - last[other] >= SAME_HAND_MIN_GAP
      ) {
        side = other;
      }
      this.hand(side).strikes.push(strike);
      last[side] = strike.at;
      alternate = side === 'left' ? 'right' : 'left';
    }
    this.show();
  }

  show(): void {
    this.root.visible = true;
    this.opacityTarget = 1;
  }

  hide(): void {
    this.opacityTarget = 0;
  }

  update(now: number, dt: number): void {
    this.material.opacity = MathUtils.damp(
      this.material.opacity,
      this.opacityTarget,
      FADE_LAMBDA,
      dt,
    );
    if (this.material.opacity < 0.01 && this.opacityTarget === 0) {
      this.root.visible = false;
      return;
    }
    for (const hand of this.hands) this.pose(hand, this.tipAt(hand, now));
  }

  private hand(side: Side): Hand {
    const hand = this.hands.find((h) => h.side === side);
    if (!hand) throw new Error(`No ${side} hand`);
    return hand;
  }

  /** Where the tip is at `now`, following the hand's strokes. */
  private tipAt(hand: Hand, now: number): Vector3 {
    const { strikes } = hand;
    let previous: Strike | undefined;
    let next: Strike | undefined;
    for (const strike of strikes) {
      if (strike.at <= now) previous = strike;
      else {
        next = strike;
        break;
      }
    }

    // where the hand waits after its previous stroke (or rests)
    if (previous) this.hold.copy(previous.point).addScaledVector(UP, REBOUND_HEIGHT);
    else this.hold.copy(hand.restTip);

    if (next && now >= next.at - LIFT) {
      const u = (now - (next.at - LIFT)) / LIFT;
      this.from.copy(
        previous && now < previous.at + REBOUND ? this.reboundAt(previous, now) : this.hold,
      );
      const ease = u * u;
      this.tip.lerpVectors(this.from, next.point, ease);
      this.tip.addScaledVector(UP, Math.sin(u * Math.PI) * LIFT_HEIGHT * (1 - ease * 0.5));
      return this.tip;
    }
    if (previous && now < previous.at + REBOUND) return this.reboundAt(previous, now);
    if (previous && !next) {
      const u = MathUtils.clamp((now - previous.at - REBOUND) / RETURN, 0, 1);
      return this.tip.lerpVectors(this.hold, hand.restTip, MathUtils.smoothstep(u, 0, 1));
    }
    return this.tip.copy(this.hold);
  }

  private reboundAt(strike: Strike, now: number): Vector3 {
    const v = (now - strike.at) / REBOUND;
    return this.tip
      .copy(strike.point)
      .addScaledVector(UP, Math.sin(v * Math.PI * 0.5) * REBOUND_HEIGHT);
  }

  /** Places the stick so its tip is at `tip`, its butt reaching back towards the hand. */
  private pose(hand: Hand, tip: Vector3): void {
    // the hand follows the tip part of the way (arm reach)
    const handPosition = this.dir.copy(tip).sub(hand.restTip).multiplyScalar(0.45).add(hand.anchor);
    const direction = handPosition.sub(tip).normalize(); // from tip back to the hand
    const butt = direction.multiplyScalar(LENGTH).add(tip);
    hand.stick.position.copy(butt);
    hand.stick.lookAt(tip);
  }
}
