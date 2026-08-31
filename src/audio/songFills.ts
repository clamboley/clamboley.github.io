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
  // À propos — a bass-drum-driven fill, from Corentin's MuseScore score
  // (MIDI says 160 bpm, the audio export runs at 90: converted with --tempo 90)
  // sticking from Corentin, encoded with --sticking
  kick: {
    sample: 'samples/fills/grosse-caisse.wav',
    hits: [
      { t: 0, key: 'kick', velocity: 0.44 },
      { t: 0.111, key: 'kick', velocity: 0.44 },
      { t: 0.222, key: 'snare', velocity: 0.28, hand: 'right' },
      { t: 0.333, key: 'snare', velocity: 0.76, hand: 'left' },
      { t: 0.444, key: 'kick', velocity: 0.44 },
      { t: 0.556, key: 'kick', velocity: 0.44 },
      { t: 0.667, key: 'floor', velocity: 0.76, hand: 'right' },
      { t: 0.778, key: 'snare', velocity: 0.28, hand: 'left' },
      { t: 0.889, key: 'kick', velocity: 0.44 },
      { t: 1, key: 'kick', velocity: 0.44 },
      { t: 1.111, key: 'snare', velocity: 0.28, hand: 'right' },
      { t: 1.222, key: 'tom2', velocity: 0.76, hand: 'left' },
      { t: 1.333, key: 'kick', velocity: 0.44 },
      { t: 1.444, key: 'kick', velocity: 0.44 },
      { t: 1.556, key: 'snare', velocity: 0.28, hand: 'right' },
      { t: 1.667, key: 'floor', velocity: 0.76, hand: 'left' },
      { t: 1.778, key: 'kick', velocity: 0.44 },
      { t: 1.889, key: 'kick', velocity: 0.44 },
      { t: 2, key: 'floor', velocity: 0.76, hand: 'right' },
      { t: 2.111, key: 'snare', velocity: 0.28, hand: 'left' },
      { t: 2.222, key: 'kick', velocity: 0.44 },
      { t: 2.333, key: 'kick', velocity: 0.44 },
      { t: 2.444, key: 'snare', velocity: 0.28, hand: 'right' },
      { t: 2.556, key: 'snare', velocity: 0.76, hand: 'left' },
      { t: 2.667, key: 'crash', velocity: 0.63, hand: 'right' },
      { t: 2.667, key: 'kick', velocity: 0.44 },
    ],
  },
  // Mes apps — "Smells Like Teen Spirit", from Corentin's MuseScore score
  // (MIDI says 126 bpm, the audio export runs at 113: converted with --tempo 113)
  snare: {
    sample: 'samples/fills/snare.wav',
    hits: [
      { t: 0, key: 'snare', velocity: 0.63 },
      { t: 0.014, key: 'snare', velocity: 0.63 },
      { t: 0.133, key: 'kick', velocity: 0.63 },
      { t: 0.265, key: 'hihat', velocity: 0.63 },
      { t: 0.398, key: 'hihat', velocity: 0.63, foot: true },
      { t: 0.398, key: 'kick', velocity: 0.63 },
      { t: 0.465, key: 'snare', velocity: 0.63 },
      { t: 0.545, key: 'snare', velocity: 0.63 },
      { t: 0.664, key: 'kick', velocity: 0.63 },
      { t: 0.796, key: 'hihat', velocity: 0.63 },
      { t: 0.929, key: 'hihat', velocity: 0.63, foot: true },
      { t: 0.929, key: 'kick', velocity: 0.63 },
      { t: 0.996, key: 'snare', velocity: 0.63 },
      { t: 1.076, key: 'snare', velocity: 0.63 },
      { t: 1.195, key: 'kick', velocity: 0.63 },
      { t: 1.327, key: 'hihat', velocity: 0.63 },
      { t: 1.46, key: 'hihat', velocity: 0.63, foot: true },
      { t: 1.46, key: 'kick', velocity: 0.63 },
      { t: 1.527, key: 'snare', velocity: 0.63 },
      { t: 1.607, key: 'snare', velocity: 0.63 },
    ],
  },
  // GitHub — the "In the Air Tonight" break, from Corentin's MuseScore score
  // (MIDI says 150 bpm, the audio export runs at 96: converted with --tempo 96)
  // sticking from Corentin, encoded with --sticking
  tom1: {
    sample: 'samples/fills/high-tom.wav',
    hits: [
      { t: 0, key: 'tom1', velocity: 0.63, hand: 'right' },
      { t: 0.156, key: 'tom1', velocity: 0.63, hand: 'right' },
      { t: 0.313, key: 'kick', velocity: 0.63 },
      { t: 0.469, key: 'tom1', velocity: 0.63, hand: 'left' },
      { t: 0.469, key: 'tom2', velocity: 0.63, hand: 'right' },
      { t: 0.625, key: 'tom1', velocity: 0.63, hand: 'left' },
      { t: 0.625, key: 'tom2', velocity: 0.63, hand: 'right' },
      { t: 0.781, key: 'kick', velocity: 0.63 },
      { t: 0.938, key: 'tom2', velocity: 0.63, hand: 'right' },
      { t: 1.094, key: 'tom2', velocity: 0.63, hand: 'right' },
      { t: 1.25, key: 'kick', velocity: 0.63 },
      { t: 1.406, key: 'floor', velocity: 0.63, hand: 'right' },
      { t: 1.406, key: 'tom2', velocity: 0.63, hand: 'left' },
      { t: 1.563, key: 'floor', velocity: 0.63, hand: 'right' },
      { t: 1.563, key: 'tom2', velocity: 0.63, hand: 'left' },
      { t: 1.719, key: 'kick', velocity: 0.63 },
      { t: 1.875, key: 'floor', velocity: 0.63, hand: 'right' },
      { t: 2.188, key: 'floor', velocity: 0.63, hand: 'right' },
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
  // Blog — a floor-tom fill, from Corentin's MuseScore score
  // (MIDI says 57 bpm, the audio export runs at 125: converted with --tempo 125; sticking pending)
  floor: {
    sample: 'samples/fills/floor-tom.wav',
    hits: [
      { t: 0, key: 'floor', velocity: 0.63 },
      { t: 0, key: 'hihat', velocity: 0.63 },
      { t: 0.24, key: 'kick', velocity: 0.63 },
      { t: 0.48, key: 'kick', velocity: 0.63 },
      { t: 0.72, key: 'floor', velocity: 0.63 },
      { t: 0.96, key: 'hihat', velocity: 0.63 },
      { t: 1.2, key: 'kick', velocity: 0.63 },
      { t: 1.44, key: 'kick', velocity: 0.63 },
      { t: 1.68, key: 'floor', velocity: 0.63 },
      { t: 1.92, key: 'snare', velocity: 0.76 },
    ],
  },
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
  // Contact — Corentin's first drum fill, from his MuseScore score
  // (MIDI says 167 bpm, the audio export runs at 86: converted with --tempo 86)
  // sticking from Corentin, encoded with --sticking
  crash: {
    sample: 'samples/fills/crash.wav',
    hits: [
      { t: 0, key: 'snare', velocity: 0.63, hand: 'right' },
      { t: 0.349, key: 'tom2', velocity: 0.63, hand: 'right' },
      { t: 0.698, key: 'snare', velocity: 0.63, hand: 'right' },
      { t: 0.872, key: 'snare', velocity: 0.63, hand: 'left' },
      { t: 1.047, key: 'floor', velocity: 0.63, hand: 'right' },
      { t: 1.395, key: 'crash', velocity: 0.63, hand: 'right' },
      { t: 1.395, key: 'kick', velocity: 0.63 },
    ],
  },
  // Musique — "Take Five", from Corentin's MuseScore score
  // (MIDI says 90 bpm, the audio export runs at 149: converted with --tempo 149)
  ride: {
    sample: 'samples/fills/ride.wav',
    hits: [
      { t: 0, key: 'kick', velocity: 0.63 },
      { t: 0, key: 'ride', velocity: 0.63 },
      { t: 0.268, key: 'snare', velocity: 0.33 },
      { t: 0.403, key: 'hihat', velocity: 0.63, foot: true },
      { t: 0.403, key: 'ride', velocity: 0.63 },
      { t: 0.671, key: 'ride', velocity: 0.63 },
      { t: 0.805, key: 'ride', velocity: 0.63 },
      { t: 1.074, key: 'snare', velocity: 0.33 },
      { t: 1.208, key: 'hihat', velocity: 0.63, foot: true },
      { t: 1.208, key: 'ride', velocity: 0.63 },
      { t: 1.208, key: 'snare', velocity: 0.33 },
      { t: 1.477, key: 'ride', velocity: 0.63 },
      { t: 1.611, key: 'ride', velocity: 0.63 },
      { t: 1.745, key: 'snare', velocity: 0.33 },
      { t: 1.879, key: 'snare', velocity: 0.33 },
      { t: 2.013, key: 'kick', velocity: 0.63 },
      { t: 2.013, key: 'ride', velocity: 0.63 },
      { t: 2.282, key: 'snare', velocity: 0.33 },
      { t: 2.416, key: 'hihat', velocity: 0.63, foot: true },
      { t: 2.416, key: 'ride', velocity: 0.63 },
      { t: 2.685, key: 'ride', velocity: 0.63 },
      { t: 2.819, key: 'ride', velocity: 0.63 },
      { t: 3.087, key: 'snare', velocity: 0.33 },
      { t: 3.221, key: 'hihat', velocity: 0.63, foot: true },
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
