import type { Fill, FillHit, KitKey } from '../kit.types.ts';

/** One stroke of a fill: [beat, element, velocity], beats at the song's tempo. */
type Stroke = readonly [number, KitKey, number];

function fill(bpm: number, strokes: readonly Stroke[]): Fill {
  const beat = 60 / bpm;
  const hits: FillHit[] = strokes
    .map(([b, key, velocity]) => ({ t: Math.round(b * beat * 1000) / 1000, key, velocity }))
    .sort((a, b) => a.t - b.t);
  return { sample: null, hits };
}

/**
 * One signature fill per element — rhythmic homages to famous drum moments,
 * re-written by ear for this kit's voices. Each fill ends with an accent on
 * the clicked element (the kick, which cannot accent itself, ends on the
 * crash), and stays short enough for the redirect to feel responsive.
 */
export const SONG_FILLS: Readonly<Record<KitKey, Fill>> = {
  // À propos — the heavy, wide-open groove of "When the Levee Breaks"
  kick: fill(80, [
    [0, 'kick', 0.95],
    [0.5, 'kick', 0.8],
    [1, 'snare', 1],
    [1.75, 'kick', 0.85],
    [2, 'kick', 0.9],
    [2.25, 'snare', 1],
    [2.75, 'crash', 1],
    [2.75, 'kick', 0.95],
  ]),
  // Mes apps — "Smells Like Teen Spirit", from Corentin's MuseScore score
  snare: {
    sample: 'samples/fills/snare.wav',
    hits: [
      { t: 0, key: 'snare', velocity: 0.63 },
      { t: 0.013, key: 'snare', velocity: 0.63 },
      { t: 0.119, key: 'kick', velocity: 0.63 },
      { t: 0.238, key: 'hihat', velocity: 0.63 },
      { t: 0.356, key: 'hihat', velocity: 0.63 },
      { t: 0.356, key: 'kick', velocity: 0.63 },
      { t: 0.416, key: 'snare', velocity: 0.63 },
      { t: 0.488, key: 'snare', velocity: 0.63 },
      { t: 0.594, key: 'kick', velocity: 0.63 },
      { t: 0.712, key: 'hihat', velocity: 0.63 },
      { t: 0.831, key: 'hihat', velocity: 0.63 },
      { t: 0.831, key: 'kick', velocity: 0.63 },
      { t: 0.891, key: 'snare', velocity: 0.63 },
      { t: 0.963, key: 'snare', velocity: 0.63 },
      { t: 1.069, key: 'kick', velocity: 0.63 },
      { t: 1.188, key: 'hihat', velocity: 0.63 },
      { t: 1.306, key: 'hihat', velocity: 0.63 },
      { t: 1.306, key: 'kick', velocity: 0.63 },
      { t: 1.366, key: 'snare', velocity: 0.63 },
      { t: 1.438, key: 'snare', velocity: 0.63 },
    ],
  },
  // GitHub — the "In the Air Tonight" break, from Corentin's MuseScore score
  tom1: {
    sample: 'samples/fills/high-tom.wav',
    hits: [
      { t: 0, key: 'tom1', velocity: 0.63 },
      { t: 0.1, key: 'tom1', velocity: 0.63 },
      { t: 0.2, key: 'kick', velocity: 0.63 },
      { t: 0.3, key: 'tom1', velocity: 0.63 },
      { t: 0.3, key: 'tom1', velocity: 0.63 },
      { t: 0.4, key: 'tom1', velocity: 0.63 },
      { t: 0.4, key: 'tom1', velocity: 0.63 },
      { t: 0.5, key: 'kick', velocity: 0.63 },
      { t: 0.6, key: 'tom1', velocity: 0.63 },
      { t: 0.7, key: 'tom1', velocity: 0.63 },
      { t: 0.8, key: 'kick', velocity: 0.63 },
      { t: 0.9, key: 'floor', velocity: 0.63 },
      { t: 0.9, key: 'tom1', velocity: 0.63 },
      { t: 1, key: 'floor', velocity: 0.63 },
      { t: 1, key: 'tom1', velocity: 0.63 },
      { t: 1.1, key: 'kick', velocity: 0.63 },
      { t: 1.2, key: 'floor', velocity: 0.63 },
      { t: 1.4, key: 'floor', velocity: 0.63 },
    ],
  },
  // LinkedIn — the rolling tom pattern under the intro of "Sober"
  tom2: fill(74, [
    [0, 'kick', 0.9],
    [0.25, 'tom2', 0.55],
    [0.5, 'tom2', 0.5],
    [0.75, 'kick', 0.85],
    [1, 'tom2', 0.85],
    [1.25, 'tom2', 0.55],
    [1.5, 'kick', 0.85],
    [1.75, 'tom2', 0.9],
    [2, 'floor', 0.85],
    [2.25, 'tom2', 1],
  ]),
  // Blog — the drum break of "In the Air Tonight"
  floor: fill(96, [
    [0, 'snare', 0.7],
    [0.25, 'snare', 0.75],
    [0.5, 'tom1', 0.8],
    [0.75, 'tom1', 0.8],
    [1, 'tom2', 0.85],
    [1.25, 'tom2', 0.85],
    [1.5, 'floor', 0.9],
    [1.75, 'floor', 0.95],
    [2.25, 'floor', 1],
    [2.25, 'crash', 0.85],
    [2.25, 'kick', 1],
  ]),
  // CV — the "Rosanna" half-time shuffle, from Corentin's MuseScore score
  hihat: {
    sample: 'samples/fills/hi-hat.wav',
    hits: [
      { t: 0, key: 'hihat', velocity: 0.63 },
      { t: 0, key: 'kick', velocity: 0.63 },
      { t: 0.21, key: 'snare', velocity: 0.2 },
      { t: 0.42, key: 'hihat', velocity: 0.63 },
      { t: 0.63, key: 'hihat', velocity: 0.63 },
      { t: 0.84, key: 'snare', velocity: 0.2 },
      { t: 1.05, key: 'hihat', velocity: 0.63 },
      { t: 1.05, key: 'kick', velocity: 0.63 },
      { t: 1.26, key: 'hihat', velocity: 0.76 },
      { t: 1.26, key: 'snare', velocity: 0.76 },
      { t: 1.47, key: 'snare', velocity: 0.2 },
      { t: 1.68, key: 'hihat', velocity: 0.63 },
      { t: 1.89, key: 'hihat', velocity: 0.63 },
      { t: 1.89, key: 'kick', velocity: 0.63 },
      { t: 2.1, key: 'snare', velocity: 0.2 },
      { t: 2.31, key: 'hihat', velocity: 0.63 },
      { t: 2.52, key: 'hihat', velocity: 0.63 },
      { t: 2.73, key: 'snare', velocity: 0.2 },
      { t: 2.94, key: 'hihat', velocity: 0.63 },
      { t: 2.94, key: 'kick', velocity: 0.63 },
      { t: 3.15, key: 'hihat', velocity: 0.63 },
      { t: 3.36, key: 'snare', velocity: 0.2 },
      { t: 3.57, key: 'hihat', velocity: 0.63 },
      { t: 3.78, key: 'hihat', velocity: 0.76 },
      { t: 3.78, key: 'kick', velocity: 0.76 },
      { t: 3.78, key: 'snare', velocity: 0.76 },
      { t: 3.99, key: 'snare', velocity: 0.2 },
      { t: 4.2, key: 'hihat', velocity: 0.63 },
      { t: 4.41, key: 'hihat', velocity: 0.63 },
      { t: 4.62, key: 'snare', velocity: 0.2 },
      { t: 4.83, key: 'hihat', velocity: 0.63 },
      { t: 4.83, key: 'kick', velocity: 0.63 },
      { t: 5.04, key: 'crash', velocity: 0.63 },
      { t: 5.04, key: 'kick', velocity: 0.63 },
    ],
  },
  // Contact — the tumbling snare roll of "Wipe Out"
  crash: fill(158, [
    [0, 'snare', 0.55],
    [0.25, 'snare', 0.6],
    [0.5, 'snare', 0.65],
    [0.75, 'snare', 0.7],
    [1, 'snare', 0.75],
    [1.25, 'snare', 0.8],
    [1.5, 'snare', 0.85],
    [1.75, 'snare', 0.9],
    [2, 'floor', 0.9],
    [2.25, 'floor', 0.95],
    [2.5, 'kick', 0.9],
    [2.75, 'crash', 1],
    [2.75, 'kick', 0.95],
  ]),
  // Musique — one 5/4 bar of ride from "Take Five"
  ride: fill(176, [
    [0, 'ride', 0.9],
    [1, 'ride', 0.75],
    [1.67, 'ride', 0.55],
    [2, 'ride', 0.9],
    [2, 'hihat', 0.4],
    [2.5, 'snare', 0.45],
    [3, 'ride', 0.75],
    [3.67, 'ride', 0.55],
    [4, 'ride', 0.9],
    [4, 'hihat', 0.4],
    [5, 'ride', 1],
    [5, 'kick', 0.9],
  ]),
};
