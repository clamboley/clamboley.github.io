/** Identifiers of the eight interactive elements of the kit. */
export type KitKey = 'kick' | 'snare' | 'tom1' | 'tom2' | 'floor' | 'hihat' | 'crash' | 'ride';

/** Drives which geometry / material family is built for an element. */
export type KitKind = 'kick' | 'drum' | 'hihat' | 'cymbal';

/** Temporary synthesized voices (replaced by real samples at step 3). */
export type SynthVoice =
  | { type: 'kick' }
  | { type: 'snare' }
  | { type: 'tom'; pitch: number }
  | { type: 'hat' }
  | { type: 'crash' }
  | { type: 'ride' };

/** One stroke inside a fill, `t` in seconds from the start of the fill. */
export interface FillHit {
  t: number;
  key: KitKey;
  velocity: number;
}

/**
 * A fill: the audio played on click plus the stroke timeline that drives
 * the visuals (hands, flashes, camera shake, crowd energy).
 * `sample` is null while the audio is synthesized; it becomes the URL of the
 * recorded sample at step 3, and `hits` then comes from its timestamp JSON.
 */
export interface Fill {
  sample: string | null;
  hits: readonly FillHit[];
}

export interface Destination {
  label: string;
  url: string;
}

/** Placeholder logo: a glyph on a coloured disc (real logos later). */
export interface Logo {
  glyph: string;
  color: string;
}

/**
 * Placement in metres, drummer's point of view:
 * x to the right, y up, z towards the audience (negative in front of you).
 */
export interface Placement {
  position: readonly [number, number, number];
  radius: number;
  /** Shell depth (drums only). */
  depth?: number;
  /** Rotation around x, radians (positive = top face towards the drummer). */
  tilt?: number;
}

export interface KitElement {
  key: KitKey;
  kind: KitKind;
  destination: Destination;
  logo: Logo;
  placement: Placement;
  voice: SynthVoice;
  fill: Fill;
  /** Name of the hands / sticks animation clip (step 4). */
  animation: string;
}
