import { CylinderGeometry, Group, MathUtils, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import type { KitKey } from '../kit.types.ts';

const LENGTH = 0.41; // metres, a 5A stick
const LIFT = 0.17; // seconds between the start of the swing and the contact
const LIFT_HEIGHT = 0.16; // metres, the raised tip above the target before the wrist snaps
const COCK = 0.65; // share of LIFT spent bringing the raised stick over the target; the rest is the snap
const COCK_PULLBACK = 0.06; // metres, raised tip held slightly towards the hand so the stick tilts up
const REBOUND = 0.11; // seconds, bounce after the contact
const REBOUND_HEIGHT = 0.05;
const RETURN = 0.5; // seconds to come back to rest after the last stroke
const SAME_HAND_MIN_GAP = 0.09; // seconds; faster than that, the other hand takes over
const ARM_SHARE = 0.45; // how far the hand travels towards what it reaches for
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
  /** Fixed pose (butt → tip), used while this stick is held still. */
  hold?: { butt: Vector3; tip: Vector3 } | undefined;
}

/** Elements a hand naturally owns; everything else alternates. */
const PREFERRED: Partial<Record<KitKey, Side>> = {
  hihat: 'left',
  crash: 'left',
  ride: 'right',
  floor: 'right',
};

function stickGroup(material: MeshStandardMaterial): Group {
  // one tapered cylinder for the whole stick: a simple silhouette that reads
  // well at arm's length without a separate tip mesh
  const geometry = new CylinderGeometry(0.0045, 0.0078, LENGTH, 12, 1)
    .translate(0, LENGTH / 2, 0)
    .rotateX(Math.PI / 2); // along +z, butt at the origin
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  const group = new Group();
  group.add(mesh);
  return group;
}

/**
 * First-person drumsticks: invisible at rest, they fade in on a click and
 * play the fill's timeline on the audio clock. A stroke brings the raised
 * stick over the target, snaps the wrist, rebounds.
 */
export class Sticks {
  readonly root = new Group();

  // matte and fairly dark: an inch from the camera under the key light, glossy
  // pale wood blows past the bloom threshold and washes the whole frame out
  private readonly material = new MeshStandardMaterial({
    color: 0xc4a878,
    roughness: 0.7,
    envMapIntensity: 0.3,
    transparent: true,
    opacity: 0,
  });
  private readonly hands: Hand[];
  private opacityTarget = 0;

  // scratch vectors
  private readonly tip = new Vector3();
  /** Point the hand is reaching for; the tip moves relative to it. */
  private readonly reach = new Vector3();
  private readonly from = new Vector3();
  private readonly hold = new Vector3();
  private readonly cocked = new Vector3();
  private readonly dir = new Vector3();
  private readonly butt = new Vector3();

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
      this.pose(hand, hand.restTip, hand.restTip);
    }
    this.root.visible = false;
  }

  /**
   * Count-in around `meet` (kept in the middle of the gaze): the left stick
   * stands almost vertical, leaning right; the right stick strikes it.
   */
  countIn(times: readonly number[], meet: Vector3): void {
    const left = this.hand('left');
    left.strikes = [];
    left.hold = {
      butt: meet.clone().add(new Vector3(-0.1, -0.3, 0.03)),
      tip: meet.clone().add(new Vector3(0.04, 0.18, -0.01)),
    };
    const right = this.hand('right');
    const hit = meet.clone().add(new Vector3(0.015, 0.05, 0));
    right.hold = undefined;
    right.strikes = times.map((at) => ({ at, key: 'snare', point: hit }));
    this.show();
  }

  /** Assigns the strokes to the hands and starts playing them. */
  play(strikes: readonly Strike[]): void {
    for (const hand of this.hands) {
      hand.strikes = [];
      hand.hold = undefined;
    }
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
    for (const hand of this.hands) {
      if (hand.hold) {
        this.poseFixed(hand, hand.hold.butt, hand.hold.tip);
        continue;
      }
      this.follow(hand, now);
      this.pose(hand, this.tip, this.reach);
    }
  }

  private hand(side: Side): Hand {
    const hand = this.hands.find((h) => h.side === side);
    if (!hand) throw new Error(`No ${side} hand`);
    return hand;
  }

  /** Sets `tip` and `reach` for `now`, following the hand's strokes. */
  private follow(hand: Hand, now: number): void {
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

    // where the tip waits after its previous stroke (or rests)
    if (previous) this.hold.copy(previous.point).addScaledVector(UP, REBOUND_HEIGHT);
    else this.hold.copy(hand.restTip);

    if (next && now >= next.at - LIFT) {
      // bring the raised stick over the target, then snap the wrist
      const u = (now - (next.at - LIFT)) / LIFT;
      if (previous && now < previous.at + REBOUND) this.reboundAt(previous, now);
      else this.tip.copy(this.hold);
      this.from.copy(this.tip);
      this.dir.subVectors(hand.anchor, next.point).setY(0).normalize();
      this.cocked
        .copy(next.point)
        .addScaledVector(UP, LIFT_HEIGHT)
        .addScaledVector(this.dir, COCK_PULLBACK);
      this.reach.copy(next.point);
      if (u < COCK) {
        this.tip.lerpVectors(this.from, this.cocked, MathUtils.smoothstep(u / COCK, 0, 1));
      } else {
        const v = (u - COCK) / (1 - COCK);
        this.tip.lerpVectors(this.cocked, next.point, v * v);
      }
      return;
    }
    if (previous && now < previous.at + REBOUND) {
      this.reach.copy(previous.point);
      this.reboundAt(previous, now);
      return;
    }
    if (previous && !next) {
      const u = MathUtils.smoothstep(
        MathUtils.clamp((now - previous.at - REBOUND) / RETURN, 0, 1),
        0,
        1,
      );
      this.reach.lerpVectors(previous.point, hand.restTip, u);
      this.tip.lerpVectors(this.hold, hand.restTip, u);
      return;
    }
    this.reach.copy(previous ? previous.point : hand.restTip);
    this.tip.copy(this.hold);
  }

  private reboundAt(strike: Strike, now: number): void {
    const v = (now - strike.at) / REBOUND;
    this.tip.copy(strike.point).addScaledVector(UP, Math.sin(v * Math.PI * 0.5) * REBOUND_HEIGHT);
  }

  /** Places the stick exactly from butt to tip (held still). */
  private poseFixed(hand: Hand, butt: Vector3, tip: Vector3): void {
    hand.stick.position.copy(butt);
    hand.stick.lookAt(tip);
  }

  /**
   * Places the stick with its tip at `tip`. The hand goes part of the way
   * towards `reach` (the arm), so a stroke reads as the wrist snapping the
   * tip down rather than the whole arm thrusting.
   */
  private pose(hand: Hand, tip: Vector3, reach: Vector3): void {
    const handPosition = this.dir
      .copy(reach)
      .sub(hand.restTip)
      .multiplyScalar(ARM_SHARE)
      .add(hand.anchor);
    this.butt.subVectors(handPosition, tip).normalize().multiplyScalar(LENGTH).add(tip);
    hand.stick.position.copy(this.butt);
    hand.stick.lookAt(tip);
  }
}
