import { describe, expect, it } from 'vitest';
import type { KitKey } from '../kit.types.ts';
import { fillDuration } from './fills.ts';
import { SONG_FILLS } from './songFills.ts';

const KEYS: KitKey[] = ['kick', 'snare', 'tom1', 'tom2', 'floor', 'hihat', 'crash', 'ride'];

describe('SONG_FILLS', () => {
  it('covers every element with a distinct fill', () => {
    const seen = new Set(KEYS.map((key) => JSON.stringify(SONG_FILLS[key].hits)));
    expect(seen.size).toBe(KEYS.length);
  });

  it.each(KEYS)('%s: hits are ordered, in range, and land on the target', (key) => {
    const fill = SONG_FILLS[key];
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

  it.each(KEYS)('%s: stays short enough for a responsive redirect', (key) => {
    const duration = fillDuration(SONG_FILLS[key]);
    expect(duration).toBeGreaterThanOrEqual(1.2);
    expect(duration).toBeLessThanOrEqual(2.6);
  });
});
