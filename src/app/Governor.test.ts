import { describe, expect, it } from 'vitest';
import { Governor, LADDER } from './Governor.ts';

describe('Governor', () => {
  it('climbs down the ladder while the frame rate is low, one rung per decision', () => {
    const applied: number[] = [];
    const governor = new Governor((_, rung) => applied.push(rung));
    for (let i = 0; i < 20; i++) governor.decide(20);
    expect(applied).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(governor.levels).toEqual(LADDER[LADDER.length - 1]);
  });

  it('gives up resolution before the front-row detail, and detail before the far crowd', () => {
    const scales = LADDER.map((l) => l.renderScale);
    expect(scales[0]).toBe(1);
    expect(LADDER.findIndex((l) => !l.detail)).toBeGreaterThan(1);
    expect(LADDER.findIndex((l) => l.crowdReach < 1)).toBeGreaterThan(
      LADDER.findIndex((l) => !l.detail),
    );
  });

  it('only climbs back up after a few good checks in a row', () => {
    const applied: number[] = [];
    const governor = new Governor((_, rung) => applied.push(rung), 3);
    governor.decide(60);
    governor.decide(60);
    expect(applied).toEqual([]);
    governor.decide(60);
    expect(applied).toEqual([2]);
    governor.decide(50); // fine, but not headroom: stays
    governor.decide(60);
    governor.decide(60);
    expect(applied).toEqual([2]);
  });

  it('waits for the warm-up before deciding from ticks', () => {
    const applied: number[] = [];
    const governor = new Governor((_, rung) => applied.push(rung));
    for (let i = 0; i < 100; i++) governor.tick(0.05); // 20 fps for 5 s
    expect(applied.length).toBeGreaterThan(0);
    expect(applied[0]).toBe(1);
  });
});
