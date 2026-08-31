import { describe, expect, it } from 'vitest';
import { KIT } from '../kit.config.ts';
import { PITCH_MAX, PITCH_MIN, gazeFromPointer, gazeToward, pointerFromGaze } from './gaze.ts';

/** Fraction of the half-screen beyond which aiming gets tiresome. */
const COMFORT = 0.8;

describe('gaze', () => {
  it('looks straight ahead, slightly down, from the centre of the screen', () => {
    const gaze = gazeFromPointer(0, 0);
    expect(gaze.yaw).toBeCloseTo(0, 12);
    expect(gaze.pitch).toBeLessThan(0);
  });

  it('turns left when the pointer goes left and up when it goes up', () => {
    expect(gazeFromPointer(-0.5, 0).yaw).toBeGreaterThan(0);
    expect(gazeFromPointer(0, 0.5).pitch).toBeGreaterThan(gazeFromPointer(0, 0).pitch);
  });

  it('stays seated: pitch is bounded', () => {
    expect(gazeFromPointer(0, 1).pitch).toBeLessThanOrEqual(PITCH_MAX);
    expect(gazeFromPointer(0, -1).pitch).toBeGreaterThanOrEqual(PITCH_MIN);
  });

  it('pointerFromGaze inverts gazeFromPointer', () => {
    for (const [nx, ny] of [
      [0.3, -0.2],
      [-0.9, 0.4],
      [0.05, 0.05],
    ]) {
      const back = pointerFromGaze(gazeFromPointer(nx, ny));
      expect(back.nx).toBeCloseTo(nx, 6);
      expect(back.ny).toBeCloseTo(ny, 6);
    }
  });

  it.each(KIT.map((e) => [e.key, e.placement.position] as const))(
    '%s is aimed at within %d%% of the screen',
    (_key, [x, y, z]) => {
      const { nx, ny } = pointerFromGaze(gazeToward(x, y, z));
      expect(Math.abs(nx)).toBeLessThanOrEqual(COMFORT);
      expect(Math.abs(ny)).toBeLessThanOrEqual(COMFORT);
    },
  );
});
