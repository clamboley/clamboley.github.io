import { SONG_FILLS } from './audio/songFills.ts';
import type { DrumSpec, DrumSupport, KitElement, KitKey } from './kit.types.ts';

/**
 * Single source of truth for the kit: where each element sits, where it
 * leads, what it looks like and what it plays. Edit destinations here.
 */
export const KIT: readonly KitElement[] = [
  {
    key: 'kick',
    kind: 'kick',
    destination: { label: 'À propos', url: '/a-propos', pending: true },
    logo: { glyph: 'moi', color: '#8a63d2' },
    placement: { position: [0.02, 0.36, -1.06], radius: 0.3, depth: 0.42 },
    voice: { type: 'kick' },
    fill: SONG_FILLS.kick,
    animation: 'fill-kick',
  },
  {
    key: 'snare',
    kind: 'drum',
    destination: { label: 'Mes apps', url: '/apps', pending: true },
    logo: { glyph: '{ }', color: '#e0563a' },
    placement: { position: [-0.28, 0.82, -0.52], radius: 0.19, depth: 0.15, tilt: 0.1 },
    voice: { type: 'snare' },
    fill: SONG_FILLS.snare,
    animation: 'fill-snare',
  },
  {
    key: 'tom1',
    kind: 'drum',
    destination: { label: 'GitHub', url: 'https://github.com/clamboley' },
    logo: { glyph: 'GH', color: '#4078c0' },
    placement: { position: [-0.17, 1.07, -0.8], radius: 0.15, depth: 0.22, tilt: 0.45 },
    voice: { type: 'tom', pitch: 215 },
    fill: SONG_FILLS.tom1,
    animation: 'fill-tom1',
  },
  {
    key: 'tom2',
    kind: 'drum',
    destination: { label: 'LinkedIn', url: 'https://www.linkedin.com/in/corentinlamboley' },
    logo: { glyph: 'in', color: '#0a8ac2' },
    placement: { position: [0.18, 1.07, -0.81], radius: 0.165, depth: 0.24, tilt: 0.45 },
    voice: { type: 'tom', pitch: 165 },
    fill: SONG_FILLS.tom2,
    animation: 'fill-tom2',
  },
  {
    key: 'floor',
    kind: 'drum',
    destination: { label: 'Blog', url: '/blog', pending: true },
    logo: { glyph: 'B', color: '#3aa06a' },
    placement: { position: [0.57, 0.78, -0.46], radius: 0.21, depth: 0.34, tilt: 0.04 },
    voice: { type: 'tom', pitch: 112 },
    fill: SONG_FILLS.floor,
    animation: 'fill-floor',
  },
  {
    key: 'hihat',
    kind: 'hihat',
    destination: { label: 'CV', url: '/cv.pdf', pending: true },
    logo: { glyph: 'CV', color: '#c2a23a' },
    placement: { position: [-0.67, 1.03, -0.4], radius: 0.16 },
    voice: { type: 'hat' },
    fill: SONG_FILLS.hihat,
    animation: 'fill-hihat',
  },
  {
    key: 'crash',
    kind: 'cymbal',
    destination: { label: 'Contact', url: 'mailto:contact@example.com', pending: true },
    logo: { glyph: '@', color: '#c2603a' },
    placement: { position: [-0.6, 1.52, -0.86], radius: 0.26, tilt: 0.55 },
    voice: { type: 'crash' },
    fill: SONG_FILLS.crash,
    animation: 'fill-crash',
  },
  {
    key: 'ride',
    kind: 'cymbal',
    destination: { label: 'Musique', url: '/musique', pending: true },
    logo: { glyph: '♪', color: '#b03a8c' },
    placement: { position: [0.64, 1.44, -0.92], radius: 0.3, tilt: 0.48 },
    voice: { type: 'ride' },
    fill: SONG_FILLS.ride,
    animation: 'fill-ride',
  },
];

export const KIT_BY_KEY: Readonly<Record<KitKey, KitElement>> = Object.fromEntries(
  KIT.map((element) => [element.key, element]),
) as Record<KitKey, KitElement>;

const SUPPORT: Partial<Record<KitKey, DrumSupport>> = {
  snare: 'stand',
  tom1: 'mount',
  tom2: 'mount',
  floor: 'legs',
};

/** The full kit as physical pieces: one piece per element, whole head each. */
export const FULL_KIT: readonly DrumSpec[] = KIT.map((element) => ({
  id: element.key,
  kind: element.kind,
  placement: element.placement,
  zones: [{ key: element.key, side: 'whole' }],
  playsFor: [element.key],
  ...(SUPPORT[element.key] === undefined ? {} : { support: SUPPORT[element.key] }),
}));
