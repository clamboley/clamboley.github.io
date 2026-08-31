import { describe, expect, it } from 'vitest';
import type { KitKey } from '../kit.types.ts';
import { FILL_TAIL, defaultFill, fillDuration } from './fills.ts';

const KEYS: KitKey[] = ['kick', 'snare', 'tom1', 'tom2', 'floor', 'hihat', 'crash', 'ride'];

describe('defaultFill', () => {
  it('is deterministic', () => {
    expect(defaultFill('snare')).toEqual(defaultFill('snare'));
  });

  it.each(KEYS)('%s: hits are ordered, in range, and land on the target', (key) => {
    const fill = defaultFill(key);
    expect(fill.sample).toBeNull();
    const times = fill.hits.map((hit) => hit.t);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    for (const hit of fill.hits) {
      expect(hit.t).toBeGreaterThanOrEqual(0);
      expect(hit.velocity).toBeGreaterThan(0);
      expect(hit.velocity).toBeLessThanOrEqual(1);
    }
    const last = Math.max(...times);
    const finalKeys = fill.hits.filter((hit) => hit.t === last).map((hit) => hit.key);
    // the kick cannot be the accent of its own fill: it ends on the crash
    expect(finalKeys).toContain(key === 'kick' ? 'crash' : key);
  });

  it.each(KEYS)('%s: lasts between 0.8 and 1.2 s, tail included', (key) => {
    const duration = fillDuration(defaultFill(key));
    expect(duration).toBeGreaterThanOrEqual(0.8);
    expect(duration).toBeLessThanOrEqual(1.2);
  });

  it('fillDuration adds the tail after the last hit', () => {
    expect(fillDuration({ sample: null, hits: [] })).toBe(FILL_TAIL);
    expect(fillDuration({ sample: null, hits: [{ t: 0.5, key: 'snare', velocity: 1 }] })).toBe(
      0.5 + FILL_TAIL,
    );
  });
});
