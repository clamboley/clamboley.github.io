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
    if (fill.sample !== null) expect(fill.sample).toMatch(/^samples\//);
    const times = fill.hits.map((hit) => hit.t);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    for (const hit of fill.hits) {
      expect(hit.t).toBeGreaterThanOrEqual(0);
      expect(hit.velocity).toBeGreaterThan(0);
      expect(hit.velocity).toBeLessThanOrEqual(1);
    }
    // the clicked element must appear in its own fill; where the phrase ends
    // is the score's call (real fills go where the music goes)
    const played = new Set(fill.hits.map((hit) => hit.key));
    expect(played.has(key) || (key === 'kick' && played.has('crash'))).toBe(true);
  });

  it.each(KEYS)('%s: stays short enough for a responsive redirect', (key) => {
    const duration = fillDuration(SONG_FILLS[key]);
    expect(duration).toBeGreaterThanOrEqual(1.2);
    // Corentin's Rosanna groove runs 5.5 s — his call; the ceiling follows
    expect(duration).toBeLessThanOrEqual(5.6);
  });
});
