/**
 * Adaptive rendering budget: watches the frame rate once the scene has
 * settled and climbs down a ladder of savings — resolution first (a softer
 * picture is the cheapest thing to accept), then the detailed front rows,
 * then the far crowd — and back up when there is headroom. Pure
 * bookkeeping: the owner applies the levels it reports.
 */
export interface GovernorLevels {
  /** Multiplier on the base pixel ratio, 1 = full. */
  renderScale: number;
  /** Detailed (24k-triangle) people in the front rows, or their light version. */
  detail: boolean;
  /** Share of the crowd kept, nearest first, 1 = all. */
  crowdReach: number;
}

export const LADDER: readonly GovernorLevels[] = [
  { renderScale: 1, detail: true, crowdReach: 1 },
  { renderScale: 0.85, detail: true, crowdReach: 1 },
  { renderScale: 0.72, detail: true, crowdReach: 1 },
  { renderScale: 0.72, detail: false, crowdReach: 1 },
  { renderScale: 0.6, detail: false, crowdReach: 1 },
  { renderScale: 0.6, detail: false, crowdReach: 0.6 },
  { renderScale: 0.5, detail: false, crowdReach: 0.6 },
  { renderScale: 0.5, detail: false, crowdReach: 0.35 },
  { renderScale: 0.5, detail: false, crowdReach: 0.2 },
];

const WARM_UP = 3; // seconds before the first decision (assets settling)
const INTERVAL = 1.2; // seconds between decisions
const LOW = 45; // fps below which we step down
const HIGH = 58; // fps above which we step back up, after a while
const RECOVER_CHECKS = 3;

export class Governor {
  private rung: number;
  private elapsed = 0;
  private sinceDecision = 0;
  private frames = 0;
  private goodChecks = 0;

  constructor(
    private readonly apply: (levels: GovernorLevels, rung: number) => void,
    initialRung = 0,
  ) {
    this.rung = Math.min(Math.max(0, Math.floor(initialRung)), LADDER.length - 1);
  }

  get levels(): GovernorLevels {
    return LADDER[this.rung] ?? LADDER[0];
  }

  get currentRung(): number {
    return this.rung;
  }

  /** Call once per rendered frame with the wall-clock delta. */
  tick(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed < WARM_UP) return;
    this.sinceDecision += dt;
    this.frames++;
    if (this.sinceDecision < INTERVAL) return;
    const fps = this.frames / this.sinceDecision;
    this.frames = 0;
    this.sinceDecision = 0;
    this.decide(fps);
  }

  /** One decision from a measured frame rate; exposed for tests. */
  decide(fps: number): void {
    let next = this.rung;
    if (fps < LOW) {
      this.goodChecks = 0;
      next = Math.min(this.rung + 1, LADDER.length - 1);
    } else if (fps > HIGH) {
      this.goodChecks++;
      if (this.goodChecks >= RECOVER_CHECKS) {
        this.goodChecks = 0;
        next = Math.max(this.rung - 1, 0);
      }
    } else {
      this.goodChecks = 0;
    }
    if (next === this.rung) return;
    this.rung = next;
    this.apply(this.levels, this.rung);
  }
}
