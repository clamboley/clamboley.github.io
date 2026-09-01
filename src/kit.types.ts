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
  /** Played with the foot (pedal hi-hat): the sound plays, no stick strikes. */
  foot?: boolean;
  /** Sticking from the score; without it the sticks pick a hand themselves. */
  hand?: 'left' | 'right';
  /** Ride bell: struck with the stick's shoulder, not the tip. */
  bell?: boolean;
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
  /** Not built yet: shown greyed out, nothing to open. */
  pending?: boolean;
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
  /** Rotation around the vertical axis, radians (a kick turned to face the drummer). */
  yaw?: number;
  /** Rotation around the depth axis, radians (positive = the cymbal leans to the drummer's left). */
  roll?: number;
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

/** A zone of a piece that leads somewhere: its whole head, or one half of it. */
export type ZoneSide = 'whole' | 'left' | 'right';

export interface DrumZone {
  key: KitKey;
  side: ZoneSide;
}

/** How a drum is held up: on a stand, on its legs, or mounted on the kick. */
export type DrumSupport = 'stand' | 'legs' | 'mount';

/**
 * A physical piece of a kit: what is built and where. It carries one or two
 * destination zones, and stands in for the full kit's voices listed in
 * `playsFor` (strokes on those keys land on it).
 */
export interface DrumSpec {
  id: string;
  kind: KitKind;
  placement: Placement;
  zones: readonly DrumZone[];
  playsFor: readonly KitKey[];
  support?: DrumSupport;
  /** The fill this piece plays, whichever of its zones is struck: another element's key, a fill of its own, or (default) the zone's own. */
  fill?: KitKey | Fill;
}
