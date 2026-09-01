/**
 * Pointer ↔ gaze mapping of the seated first-person camera. Pure, so the
 * ergonomics (every element reachable without pinning the pointer to the
 * screen border) can be unit tested against the kit config.
 */

/** Eye position of the drummer on the throne, metres. */
export const EYE = { x: 0, y: 1.35, z: 0.15 } as const;

export const BASE_PITCH = -0.3;
// the kit spans ~±50° of yaw and -45°…+10° of pitch from the throne: the edges of the
// screen must reach the hi-hat, the floor tom and the crashes without hunting for them
export const YAW_RANGE = 1.25;
export const PITCH_RANGE = 0.74;
export const PITCH_MIN = -1.05;
export const PITCH_MAX = 0.4;

/** Below 1: the gaze pulls ahead of the pointer away from the centre. */
const EASE_EXPONENT = 0.75;

export interface Gaze {
  /** Rotation around the vertical axis, radians, positive to the left. */
  yaw: number;
  /** Rotation around the horizontal axis, radians, positive upwards. */
  pitch: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Slightly faster than linear away from the centre. */
function ease(value: number): number {
  const v = clamp(value, -1, 1);
  return Math.sign(v) * Math.pow(Math.abs(v), EASE_EXPONENT);
}

function easeInverse(value: number): number {
  return Math.sign(value) * Math.pow(Math.abs(value), 1 / EASE_EXPONENT);
}

/** How far the pointer steers, per kit layout. */
export interface GazeRanges {
  yaw: number;
  pitch: number;
  basePitch: number;
}

export const FULL_RANGES: GazeRanges = {
  yaw: YAW_RANGE,
  pitch: PITCH_RANGE,
  basePitch: BASE_PITCH,
};
/** The compact kit sits within ±30° and a little lower: a short drag covers it. */
export const COMPACT_RANGES: GazeRanges = { yaw: 0.6, pitch: 0.5, basePitch: -0.62 };

/** Pointer position normalised to [-1, 1] (x right, y up) → gaze. */
export function gazeFromPointer(nx: number, ny: number, ranges: GazeRanges = FULL_RANGES): Gaze {
  return {
    yaw: -ease(nx) * ranges.yaw,
    pitch: clamp(ranges.basePitch + ease(ny) * ranges.pitch, PITCH_MIN, PITCH_MAX),
  };
}

/** Where the pointer has to be for the crosshair to rest on a gaze (unclamped). */
export function pointerFromGaze({ yaw, pitch }: Gaze): { nx: number; ny: number } {
  return {
    nx: easeInverse(-yaw / YAW_RANGE),
    ny: easeInverse((pitch - BASE_PITCH) / PITCH_RANGE),
  };
}

/** Gaze that puts a world point at the centre of the screen. */
export function gazeToward(x: number, y: number, z: number): Gaze {
  const dx = x - EYE.x;
  const dy = y - EYE.y;
  const dz = z - EYE.z;
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

/** Keeps a gaze inside what the seated drummer can reach. */
export function clampGaze({ yaw, pitch }: Gaze): Gaze {
  return { yaw: clamp(yaw, -YAW_RANGE, YAW_RANGE), pitch: clamp(pitch, PITCH_MIN, PITCH_MAX) };
}
