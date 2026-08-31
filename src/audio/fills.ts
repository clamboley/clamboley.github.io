import type { Fill, FillHit, KitKey } from '../kit.types.ts';

/** Sixteenth note at ~140 bpm, in seconds. */
export const SIXTEENTH = 0.107;

/** Time kept after the last stroke before the redirect starts (cymbal tail). */
export const FILL_TAIL = 0.45;

/**
 * Temporary deterministic fill, one per element (same phrase as the
 * prototype, ending on the clicked element). Replaced by the recorded
 * samples' timestamp JSON at step 3.
 */
export function defaultFill(target: KitKey): Fill {
  const q = SIXTEENTH;
  const hits: FillHit[] = [
    { t: 0, key: 'snare', velocity: 0.85 },
    { t: q, key: 'snare', velocity: 0.55 },
    { t: 2 * q, key: 'tom1', velocity: 0.8 },
    { t: 3 * q, key: 'tom2', velocity: 0.65 },
    { t: 4 * q, key: 'tom2', velocity: 0.55 },
    { t: 5 * q, key: 'floor', velocity: 0.9 },
    { t: 6 * q, key: 'kick', velocity: 0.95 },
    { t: 7 * q, key: 'kick', velocity: 1 },
    { t: 7 * q, key: target === 'kick' ? 'crash' : target, velocity: 1 },
  ];
  if (target !== 'crash' && target !== 'ride') {
    hits.push({ t: 7 * q, key: 'crash', velocity: 0.75 });
  }
  return { sample: null, hits };
}

/** Total duration of a fill, in seconds, including the tail. */
export function fillDuration(fill: Fill): number {
  let last = 0;
  for (const hit of fill.hits) last = Math.max(last, hit.t);
  return last + FILL_TAIL;
}
