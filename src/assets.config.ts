/** Generated assets (TRELLIS.2, see tools/gen), relative to the public folder. */
export const assets = {
  /** One GLB per crowd variant; instances are dealt round-robin across them. */
  crowd: [
    'models/crowd/fan-arms-up-s1.glb',
    'models/crowd/fan-arms-up-s2.glb',
    'models/crowd/fan-phone-s1.glb',
    'models/crowd/fan-phone-s2.glb',
    'models/crowd/fan-side-s1.glb',
    'models/crowd/fan-side-s2.glb',
  ],
  props: {
    wedges: ['models/props/wedge-1.glb', 'models/props/wedge-2.glb'],
    truss: 'models/props/truss-1.glb',
  },
  /** Tiers of seats repeated in an arc behind the pit. */
  venue: { stand: 'models/venue/stand-1.glb' },
} as const;
