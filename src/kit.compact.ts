import type { DrumSpec } from './kit.types.ts';

/**
 * The phone kit, for a screen held upright: five pieces gathered in front of
 * the drummer, the three drum heads split in two so that all eight
 * destinations stay within reach. Strokes of the full-kit fills land on the
 * piece that stands in for their voice (`playsFor`).
 */
export const COMPACT_KIT: readonly DrumSpec[] = [
  {
    id: 'kick',
    kind: 'kick',
    // the full kit's kick, snare and high tom shifted 17 cm right so the high
    // tom sits in the middle of the view; the kick turns to face the eye
    placement: { position: [0.25, 0.36, -1.06], radius: 0.3, depth: 0.42, yaw: -0.18 },
    zones: [
      { key: 'floor', side: 'left' },
      { key: 'hihat', side: 'right' },
    ],
    playsFor: ['kick'],
  },
  {
    id: 'snare',
    kind: 'drum',
    placement: { position: [-0.17, 0.82, -0.52], radius: 0.19, depth: 0.15, tilt: 0.1 },
    zones: [
      { key: 'kick', side: 'left' },
      { key: 'snare', side: 'right' },
    ],
    playsFor: ['snare'],
    support: 'stand',
  },
  {
    id: 'tom',
    kind: 'drum',
    placement: { position: [0, 1.07, -0.8], radius: 0.15, depth: 0.22, tilt: 0.45 },
    zones: [
      { key: 'tom1', side: 'left' },
      { key: 'tom2', side: 'right' },
    ],
    playsFor: ['tom1', 'tom2', 'floor'],
    support: 'mount',
  },
  {
    id: 'hihat',
    kind: 'hihat',
    // raised and brought over the left edge of the snare, as drummers set it
    placement: { position: [-0.38, 1.05, -0.45], radius: 0.16 },
    zones: [{ key: 'crash', side: 'whole' }],
    playsFor: ['hihat', 'crash'],
  },
  {
    id: 'ride',
    kind: 'cymbal',
    // between where the mid and floor toms would be, low and nearly flat, a big
    // one leaning a little towards the drummer and to his left: jazz
    placement: { position: [0.43, 0.98, -0.62], radius: 0.31, tilt: 0.22, roll: 0.2 },
    zones: [{ key: 'ride', side: 'whole' }],
    playsFor: ['ride'],
  },
];
