/** Multipliers for camera bob / shake / flicker, honouring `prefers-reduced-motion`. */
export interface MotionPrefs {
  reduced: boolean;
  /** 1 normally, a fraction when reduced motion is requested. */
  scale: number;
}

export function readMotionPrefs(): MotionPrefs {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return { reduced, scale: reduced ? 0.2 : 1 };
}
