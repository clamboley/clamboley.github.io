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
  // (MIDI says 150 bpm, the audio export runs at 96: converted with --tempo 96)
  tom1: {
    sample: 'samples/fills/high-tom.wav',
    hits: [
      { t: 0, key: 'tom1', velocity: 0.63 },
      { t: 0.156, key: 'tom1', velocity: 0.63 },
      { t: 0.313, key: 'kick', velocity: 0.63 },
      { t: 0.469, key: 'tom1', velocity: 0.63 },
      { t: 0.469, key: 'tom2', velocity: 0.63 },
      { t: 0.625, key: 'tom1', velocity: 0.63 },
      { t: 0.625, key: 'tom2', velocity: 0.63 },
      { t: 0.781, key: 'kick', velocity: 0.63 },
      { t: 0.938, key: 'tom2', velocity: 0.63 },
      { t: 1.094, key: 'tom2', velocity: 0.63 },
      { t: 1.25, key: 'kick', velocity: 0.63 },
      { t: 1.406, key: 'floor', velocity: 0.63 },
      { t: 1.406, key: 'tom2', velocity: 0.63 },
      { t: 1.563, key: 'floor', velocity: 0.63 },
      { t: 1.563, key: 'tom2', velocity: 0.63 },
      { t: 1.719, key: 'kick', velocity: 0.63 },
      { t: 1.875, key: 'floor', velocity: 0.63 },
      { t: 2.188, key: 'floor', velocity: 0.63 },
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
  // (MIDI says 95 bpm, the audio export runs at 151: converted with --tempo 151)
  hihat: {
    sample: 'samples/fills/hi-hat.wav',
    hits: [
      { t: 0, key: 'hihat', velocity: 0.63 },
      { t: 0, key: 'kick', velocity: 0.63 },
      { t: 0.132, key: 'snare', velocity: 0.2 },
      { t: 0.265, key: 'hihat', velocity: 0.63 },
      { t: 0.397, key: 'hihat', velocity: 0.63 },
      { t: 0.53, key: 'snare', velocity: 0.2 },
      { t: 0.662, key: 'hihat', velocity: 0.63 },
      { t: 0.662, key: 'kick', velocity: 0.63 },
      { t: 0.795, key: 'hihat', velocity: 0.76 },
      { t: 0.795, key: 'snare', velocity: 0.76 },
      { t: 0.927, key: 'snare', velocity: 0.2 },
      { t: 1.06, key: 'hihat', velocity: 0.63 },
      { t: 1.192, key: 'hihat', velocity: 0.63 },
      { t: 1.192, key: 'kick', velocity: 0.63 },
      { t: 1.325, key: 'snare', velocity: 0.2 },
      { t: 1.457, key: 'hihat', velocity: 0.63 },
      { t: 1.589, key: 'hihat', velocity: 0.63 },
      { t: 1.722, key: 'snare', velocity: 0.2 },
      { t: 1.854, key: 'hihat', velocity: 0.63 },
      { t: 1.854, key: 'kick', velocity: 0.63 },
      { t: 1.987, key: 'hihat', velocity: 0.63 },
      { t: 2.119, key: 'snare', velocity: 0.2 },
      { t: 2.252, key: 'hihat', velocity: 0.63 },
      { t: 2.384, key: 'hihat', velocity: 0.76 },
      { t: 2.384, key: 'kick', velocity: 0.76 },
      { t: 2.384, key: 'snare', velocity: 0.76 },
      { t: 2.517, key: 'snare', velocity: 0.2 },
      { t: 2.649, key: 'hihat', velocity: 0.63 },
      { t: 2.781, key: 'hihat', velocity: 0.63 },
      { t: 2.914, key: 'snare', velocity: 0.2 },
      { t: 3.046, key: 'hihat', velocity: 0.63 },
      { t: 3.046, key: 'kick', velocity: 0.63 },
      { t: 3.179, key: 'crash', velocity: 0.63 },
      { t: 3.179, key: 'kick', velocity: 0.63 },
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
  // Musique — "Take Five", from Corentin's MuseScore score
  // (MIDI says 90 bpm, the audio export runs at 149: converted with --tempo 149)
  ride: {
    sample: 'samples/fills/ride.wav',
    hits: [
      { t: 0, key: 'kick', velocity: 0.63 },
      { t: 0, key: 'ride', velocity: 0.63 },
      { t: 0.268, key: 'snare', velocity: 0.33 },
      { t: 0.403, key: 'hihat', velocity: 0.63 },
      { t: 0.403, key: 'ride', velocity: 0.63 },
      { t: 0.671, key: 'ride', velocity: 0.63 },
      { t: 0.805, key: 'ride', velocity: 0.63 },
      { t: 1.074, key: 'snare', velocity: 0.33 },
      { t: 1.208, key: 'hihat', velocity: 0.63 },
      { t: 1.208, key: 'ride', velocity: 0.63 },
      { t: 1.208, key: 'snare', velocity: 0.33 },
      { t: 1.477, key: 'ride', velocity: 0.63 },
      { t: 1.611, key: 'ride', velocity: 0.63 },
      { t: 1.745, key: 'snare', velocity: 0.33 },
      { t: 1.879, key: 'snare', velocity: 0.33 },
      { t: 2.013, key: 'kick', velocity: 0.63 },
      { t: 2.013, key: 'ride', velocity: 0.63 },
      { t: 2.282, key: 'snare', velocity: 0.33 },
      { t: 2.416, key: 'hihat', velocity: 0.63 },
      { t: 2.416, key: 'ride', velocity: 0.63 },
      { t: 2.685, key: 'ride', velocity: 0.63 },
      { t: 2.819, key: 'ride', velocity: 0.63 },
      { t: 3.087, key: 'snare', velocity: 0.33 },
      { t: 3.221, key: 'hihat', velocity: 0.63 },
      { t: 3.221, key: 'ride', velocity: 0.63 },
      { t: 3.221, key: 'snare', velocity: 0.33 },
      { t: 3.49, key: 'ride', velocity: 0.63 },
      { t: 3.624, key: 'ride', velocity: 0.63 },
      { t: 3.758, key: 'snare', velocity: 0.33 },
      { t: 3.893, key: 'snare', velocity: 0.33 },
      { t: 4.027, key: 'kick', velocity: 0.76 },
      { t: 4.027, key: 'ride', velocity: 0.63 },
    ],
  },
};
