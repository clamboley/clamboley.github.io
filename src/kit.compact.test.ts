import { describe, expect, it } from 'vitest';
import { COMPACT_KIT } from './kit.compact.ts';
import { FULL_KIT, KIT } from './kit.config.ts';
import type { KitKey } from './kit.types.ts';

const KEYS: KitKey[] = ['kick', 'snare', 'tom1', 'tom2', 'floor', 'hihat', 'crash', 'ride'];

describe('kits as physical pieces', () => {
  it.each([
    ['full', FULL_KIT],
    ['compact', COMPACT_KIT],
  ])('%s: every destination sits on exactly one zone', (_, kit) => {
    const zoned = kit.flatMap((piece) => piece.zones.map((zone) => zone.key));
    expect([...zoned].sort()).toEqual([...KEYS].sort());
  });

  it.each([
    ['full', FULL_KIT],
    ['compact', COMPACT_KIT],
  ])('%s: every voice of the fills lands on some piece', (_, kit) => {
    const voices = new Set(kit.flatMap((piece) => piece.playsFor));
    for (const key of KEYS) expect(voices.has(key)).toBe(true);
  });

  it('splits a head into a left and a right half, never anything else', () => {
    for (const piece of COMPACT_KIT) {
      if (piece.zones.length === 1) expect(piece.zones[0]?.side).toBe('whole');
      else expect(piece.zones.map((z) => z.side).sort()).toEqual(['left', 'right']);
      expect(piece.zones.length).toBeLessThanOrEqual(2);
    }
  });

  it('keeps the compact kit narrow and in front of the drummer', () => {
    for (const piece of COMPACT_KIT) {
      const [x, y, z] = piece.placement.position;
      expect(Math.abs(x)).toBeLessThan(0.6);
      expect(y).toBeGreaterThan(0);
      expect(z).toBeLessThan(0);
    }
    expect(FULL_KIT).toHaveLength(KIT.length);
  });
});
