import { describe, expect, it } from 'vitest';
import { KIT, KIT_BY_KEY } from './kit.config.ts';

describe('kit config', () => {
  it('has eight elements with unique keys, destinations and animations', () => {
    expect(KIT).toHaveLength(8);
    const unique = (values: string[]) => new Set(values).size === values.length;
    expect(unique(KIT.map((e) => e.key))).toBe(true);
    expect(unique(KIT.map((e) => e.destination.url))).toBe(true);
    expect(unique(KIT.map((e) => e.destination.label))).toBe(true);
    expect(unique(KIT.map((e) => e.animation))).toBe(true);
  });

  it('indexes every element by key', () => {
    for (const element of KIT) expect(KIT_BY_KEY[element.key]).toBe(element);
  });

  it('gives drums a shell depth and keeps every element in front of the drummer', () => {
    for (const element of KIT) {
      const [, y, z] = element.placement.position;
      expect(z).toBeLessThan(0);
      expect(y).toBeGreaterThan(0);
      expect(element.placement.radius).toBeGreaterThan(0);
      if (element.kind === 'drum' || element.kind === 'kick') {
        expect(element.placement.depth).toBeGreaterThan(0);
      }
    }
  });

  it('only uses absolute, mailto or root-relative destination URLs', () => {
    for (const { destination } of KIT) {
      expect(destination.url).toMatch(/^(https?:\/\/|mailto:|\/)/);
    }
  });

  it('keeps a URL on pending destinations, for the day they exist', () => {
    for (const { destination } of KIT) {
      if (destination.pending === true) expect(destination.url.length).toBeGreaterThan(1);
    }
    expect(KIT.filter((e) => e.destination.pending !== true).length).toBeGreaterThanOrEqual(2);
  });
});
