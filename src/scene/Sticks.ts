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

/** Camera basis handed to the count-in so the pose follows the view. */
export interface CountFrame {
  /** Point straight ahead of the eyes where the sticks meet. */
  meet: Vector3;
  right: Vector3;
  up: Vector3;
  forward: Vector3;
}

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
  /** The built-in anchor; `anchor` itself may be overridden for the count-in. */
  baseAnchor: Vector3;
  restTip: Vector3;
  strikes: Strike[];
  /** Fixed pose (butt → tip), used while this stick is held still. */
  hold?: { butt: Vector3; tip: Vector3 } | undefined;
}

/** Elements a hand naturally owns; everything else alternates. */
const PREFERRED: Partial<Record<KitKey, Side>> = {
  // crossed position, as played on a right-handed kit: right hand over to
  // the hats, left hand on the snare (flams still alternate via the gap rule)
  hihat: 'right',
  snare: 'left',
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
  private readonly pivot = new Vector3();
  private readonly arcFrom = new Vector3();
  private readonly arcTo = new Vector3();
  private readonly axisV = new Vector3();

  constructor() {
    this.hands = [
      {
        side: 'left',
        stick: stickGroup(this.material),
        anchor: new Vector3(-0.3, 0.98, -0.22),
        baseAnchor: new Vector3(-0.3, 0.98, -0.22),
        restTip: new Vector3(-0.42, 1.02, -0.5),
        strikes: [],
      },
      {
        side: 'right',
        stick: stickGroup(this.material),
        anchor: new Vector3(0.24, 0.96, -0.2),
        baseAnchor: new Vector3(0.24, 0.96, -0.2),
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
   * Count-in in the middle of the visitor's field of view: the left stick
   * stands almost vertical in camera space, leaning right, centred on
   * `meet`; the right stick slaps its middle against it. Everything is
   * expressed in the camera basis so the gesture reads the same wherever
   * the visitor is looking.
   */
  countIn(times: readonly number[], frame: CountFrame): void {
    const { meet, right: r, up, forward } = frame;
    for (const hand of this.hands) hand.anchor.copy(hand.baseAnchor);
    const left = this.hand('left');
    left.strikes = [];
    left.hold = {
      butt: meet.clone().addScaledVector(r, -0.05).addScaledVector(up, -0.21),
      tip: meet.clone().addScaledVector(r, 0.05).addScaledVector(up, 0.21),
    };
    const right = this.hand('right');
    // the right stick passes just in front of the left one and stops a touch
    // higher, so the shafts rest against each other instead of interpenetrating
    const contact = meet.clone().addScaledVector(forward, -0.013).addScaledVector(up, 0.006);
    // axis the stick would naturally take from the resting hand, straightened
    // 20% towards vertical for a more upright strike
    const handAt = new Vector3()
      .copy(contact)
      .sub(right.restTip)
      .multiplyScalar(ARM_SHARE)
      .add(right.baseAnchor);
    const axis = new Vector3().subVectors(contact, handAt).normalize().lerp(up, 0.2).normalize();
    const hit = contact.clone().addScaledVector(axis, LENGTH / 2);
    // park the hand at the butt of that axis for the count, so the stick
    // actually takes it at impact (play() restores the anchor)
    right.anchor
      .copy(contact)
      .addScaledVector(axis, -LENGTH / 2)
      .sub(new Vector3().copy(hit).sub(right.restTip).multiplyScalar(ARM_SHARE));
    right.hold = undefined;
    right.strikes = times.map((at) => ({ at, key: 'snare', point: hit }));
    this.show();
  }

  /** Assigns the strokes to the hands and starts playing them. */
  play(strikes: readonly Strike[]): void {
    for (const hand of this.hands) {
      hand.strikes = [];
      hand.hold = undefined;
      hand.anchor.copy(hand.baseAnchor);
    }
    const sorted = [...strikes].sort((a, b) => a.at - b.at);
    const last: Record<Side, number> = { left: -Infinity, right: -Infinity };
    const take = (side: Side, strike: Strike): void => {
      this.hand(side).strikes.push(strike);
      last[side] = strike.at;
    };
    const single = (strike: Strike): void => {
      // the right hand leads; an element's own hand wins; too fast for the
      // same hand twice (a flam, a roll) and the other one takes over
      let side: Side = PREFERRED[strike.key] ?? 'right';
      const other: Side = side === 'left' ? 'right' : 'left';
      if (
        strike.at - last[side] < SAME_HAND_MIN_GAP &&
        strike.at - last[other] >= SAME_HAND_MIN_GAP
      ) {
        side = other;
      }
      take(side, strike);
    };
    let i = 0;
    while (i < sorted.length) {
      const first = sorted[i];
      if (!first) break;
      let j = i + 1;
      while (j < sorted.length && sorted[j]?.at === first.at) j++;
      const group = sorted.slice(i, j);
      const leftmost = group.reduce((a, b) => (b.point.x < a.point.x ? b : a));
      const rightmost = group.reduce((a, b) => (b.point.x > a.point.x ? b : a));
      if (group.length >= 2 && leftmost !== rightmost) {
        // both hands at once: the left hand takes the leftmost drum, uncrossed
        take('left', leftmost);
        take('right', rightmost);
      } else {
        for (const strike of group) single(strike);
      }
      i = j;
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

    // dense passages (a shuffle, a roll) get a shorter, shallower lift so
    // the stick articulates in time instead of arriving late and mushy
    const gap = next && previous ? next.at - previous.at : Infinity;
    const lift = Math.min(LIFT, Math.max(0.055, gap * 0.7));
    const share = Math.max(0.35, lift / LIFT);
    if (next && now >= next.at - lift) {
      // bring the raised stick over the target, then snap the wrist
      const u = (now - (next.at - lift)) / lift;
      if (previous && now < previous.at + REBOUND) this.reboundAt(previous, now);
      else this.tip.copy(this.hold);
      this.from.copy(this.tip);
      this.dir.subVectors(hand.anchor, next.point).setY(0).normalize();
      this.cocked
        .copy(next.point)
        .addScaledVector(UP, LIFT_HEIGHT * share)
        .addScaledVector(this.dir, COCK_PULLBACK * share);
      this.reach.copy(next.point);
      if (u < COCK) {
        this.tip.lerpVectors(this.from, this.cocked, MathUtils.smoothstep(u / COCK, 0, 1));
      } else {
        const v = (u - COCK) / (1 - COCK);
        this.wristArc(hand, next.point, v * v);
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

  /**
   * Snap phase as a wrist stroke: the hand stays put and the tip sweeps an
   * arc around it, instead of sliding down a straight chord.
   */
  private wristArc(hand: Hand, target: Vector3, u: number): void {
    this.pivot.copy(target).sub(hand.restTip).multiplyScalar(ARM_SHARE).add(hand.anchor);
    this.arcFrom.copy(this.cocked).sub(this.pivot);
    this.arcTo.copy(target).sub(this.pivot);
    const from = this.arcFrom.length();
    const to = this.arcTo.length();
    this.arcFrom.divideScalar(from);
    this.arcTo.divideScalar(to);
    const angle = Math.acos(MathUtils.clamp(this.arcFrom.dot(this.arcTo), -1, 1));
    if (angle < 1e-3) {
      this.tip.lerpVectors(this.cocked, target, u);
      return;
    }
    this.axisV.crossVectors(this.arcFrom, this.arcTo).normalize();
    this.tip
      .copy(this.arcFrom)
      .applyAxisAngle(this.axisV, angle * u)
      .multiplyScalar(from + (to - from) * u)
      .add(this.pivot);
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
