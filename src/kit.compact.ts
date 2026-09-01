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
    placement: { position: [0, 0.3, -0.62], radius: 0.27, depth: 0.32 },
    zones: [
      { key: 'floor', side: 'left' },
      { key: 'hihat', side: 'right' },
    ],
    playsFor: ['kick'],
  },
  {
    id: 'snare',
    kind: 'drum',
    placement: { position: [0, 0.86, -0.5], radius: 0.17, depth: 0.14, tilt: 0.32 },
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
    placement: { position: [0, 1.12, -0.74], radius: 0.165, depth: 0.22, tilt: 0.45 },
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
    placement: { position: [-0.36, 1.0, -0.52], radius: 0.15 },
    zones: [{ key: 'crash', side: 'whole' }],
    playsFor: ['hihat', 'crash'],
  },
  {
    id: 'ride',
    kind: 'cymbal',
    placement: { position: [0.36, 1.2, -0.68], radius: 0.23, tilt: 0.55 },
    zones: [{ key: 'ride', side: 'whole' }],
    playsFor: ['ride'],
  },
];
