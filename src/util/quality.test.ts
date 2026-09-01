import { describe, expect, it } from 'vitest';
import { PROFILES, needsFallback, pickTier, resolveQuality, type DeviceHints } from './quality.ts';

const desktop: DeviceHints = {
  coarsePointer: false,
  width: 1920,
  height: 1080,
  deviceMemory: 8,
  hardwareConcurrency: 8,
  webgl2: true,
  saveData: false,
};

describe('quality tiers', () => {
  it('renders a capable desktop at the high tier', () => {
    expect(pickTier(desktop)).toBe('high');
    expect(needsFallback(desktop)).toBe(false);
  });

  it('drops phones and small screens to the low tier', () => {
    expect(pickTier({ ...desktop, coarsePointer: true })).toBe('low');
    expect(pickTier({ ...desktop, width: 390, height: 844 })).toBe('low');
    expect(pickTier({ ...desktop, deviceMemory: 4 })).toBe('low');
    expect(pickTier({ ...desktop, hardwareConcurrency: 2 })).toBe('low');
  });

  it('keeps a small desktop window and a 4-core laptop at the high tier', () => {
    expect(pickTier({ ...desktop, width: 1280, height: 720 })).toBe('high');
    expect(pickTier({ ...desktop, hardwareConcurrency: 4 })).toBe('high');
  });

  it('does not guess from missing hints', () => {
    expect(pickTier({ ...desktop, deviceMemory: undefined, hardwareConcurrency: undefined })).toBe(
      'high',
    );
    expect(needsFallback({ ...desktop, deviceMemory: undefined })).toBe(false);
  });

  it('falls back without WebGL2, on save-data or on tiny memory', () => {
    expect(needsFallback({ ...desktop, webgl2: false })).toBe(true);
    expect(needsFallback({ ...desktop, saveData: true })).toBe(true);
    expect(needsFallback({ ...desktop, deviceMemory: 2 })).toBe(true);
  });

  it('lets the query string override the tier', () => {
    expect(resolveQuality(desktop, 'low')).toBe(PROFILES.low);
    expect(resolveQuality({ ...desktop, coarsePointer: true }, 'high')).toBe(PROFILES.high);
    expect(resolveQuality(desktop, 'nonsense')).toBe(PROFILES.high);
  });

  it('keeps the low tier strictly lighter than the high one', () => {
    for (const k of [
      'pixelRatioMax',
      'people',
      'pitLights',
      'stars',
      'pitDepth',
      'shadowMapSize',
      'detailDistance',
    ] as const) {
      expect(PROFILES.low[k]).toBeLessThan(PROFILES.high[k]);
    }
  });
});
