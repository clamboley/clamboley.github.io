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
  },
  low: {
    tier: 'low',
    pixelRatioMax: 1.25,
    people: 90,
    pitLights: 3000,
    stars: 2500,
    pitDepth: 24,
    shadowMapSize: 512,
    antialias: false,
  },
};

/** Too weak for the scene at all: the styled navigation takes over. */
export function needsFallback(hints: DeviceHints): boolean {
  if (!hints.webgl2) return true;
  if (hints.saveData) return true;
  return hints.deviceMemory !== undefined && hints.deviceMemory <= 2;
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
