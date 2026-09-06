/**
 * Two rendering tiers, chosen from cheap device hints before the scene is
 * built. Pure functions, so the choice is unit tested; `readDeviceHints`
 * is the only browser-facing part.
 */
export type QualityTier = 'high' | 'low';

export interface QualityProfile {
  tier: QualityTier;
  pixelRatioMax: number;
  /** Individual people in the first rows. */
  people: number;
  /** Phones held up across the field. */
  pitLights: number;
  stars: number;
  /** How far the blocks of thirty go, metres. */
  pitDepth: number;
  shadowMapSize: number;
  antialias: boolean;
  /** Rows nearer than this (metres from the stage edge) get the 24k-triangle people. */
  detailDistance: number;
}

export interface DeviceHints {
  coarsePointer: boolean;
  width: number;
  height: number;
  /** Gigabytes, when the browser says. */
  deviceMemory: number | undefined;
  hardwareConcurrency: number | undefined;
  webgl2: boolean;
  saveData: boolean;
}

export const PROFILES: Readonly<Record<QualityTier, QualityProfile>> = {
  high: {
    tier: 'high',
    pixelRatioMax: 1.75,
    people: 170,
    pitLights: 9000,
    stars: 7000,
    pitDepth: 46,
    shadowMapSize: 1024,
    antialias: true,
    detailDistance: 2,
  },
  low: {
    tier: 'low',
    // capped low on purpose: every buffer (canvas, HDR chain, bloom mips)
    // scales with it, and iOS purges oversized WebGL surfaces in flashes
    pixelRatioMax: 1.0,
    people: 90,
    pitLights: 3000,
    stars: 2500,
    pitDepth: 24,
    shadowMapSize: 512,
    // the only anti-aliasing the post-processing chain allows: cheap where
    // the governor already shrank the picture, decisive on phone edges
    antialias: true,
    detailDistance: 1,
  },
};

/** Too weak for the scene at all: the styled navigation takes over. */
export function needsFallback(hints: DeviceHints): boolean {
  // memory alone is no reason any more: the adaptive budget copes with weak GPUs
  return !hints.webgl2 || hints.saveData;
}

export function pickTier(hints: DeviceHints): QualityTier {
  if (hints.coarsePointer) return 'low';
  // a phone held either way; a small desktop window is still a desktop
  if (Math.min(hints.width, hints.height) <= 500) return 'low';
  if (hints.deviceMemory !== undefined && hints.deviceMemory <= 4) return 'low';
  if (hints.hardwareConcurrency !== undefined && hints.hardwareConcurrency <= 2) return 'low';
  return 'high';
}

/** The profile to render with; `override` comes from `?quality=low|high`. */
export function resolveQuality(hints: DeviceHints, override: string | null): QualityProfile {
  const tier = override === 'low' || override === 'high' ? override : pickTier(hints);
  return PROFILES[tier];
}

interface NavigatorHints {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connection?: { saveData?: boolean };
}

function hasWebGL2(): boolean {
  try {
    return document.createElement('canvas').getContext('webgl2') !== null;
  } catch {
    return false;
  }
}

export function readDeviceHints(): DeviceHints {
  const nav = navigator as Navigator & NavigatorHints;
  return {
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    width: window.innerWidth,
    height: window.innerHeight,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    webgl2: hasWebGL2(),
    saveData: nav.connection?.saveData === true,
  };
}
