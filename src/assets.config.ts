/** Generated assets (TRELLIS.2, see tools/gen), relative to the public folder. */
export interface CrowdVariant {
  /** Detailed model for the front rows. */
  hi: string;
  /** Lighter model for the rows further back. */
  lo: string;
}

const fan = (name: string): CrowdVariant => ({
  hi: `models/crowd/${name}.glb`,
  lo: `models/crowd/${name}.lo.glb`,
});

export const assets = {
  /** One entry per crowd variant; people are dealt round-robin across them. */
  crowd: [
    fan('fan-arms-up-s1'),
    fan('fan-arms-up-s2'),
    fan('fan-phone-s1'),
    fan('fan-phone-s2'),
    fan('fan-side-s1'),
    fan('fan-side-s2'),
  ],
  /** Rows nearer than this (metres from the stage edge) get the detailed model. */
  crowdDetailDistance: 2.5,
  props: {
    wedges: ['models/props/stage-monitor-s1.lo.glb', 'models/props/stage-monitor-s2.lo.glb'],
    truss: 'models/props/truss-par-s1.lo.glb',
  },
  /** Tiers of seats repeated in an arc behind the pit. */
  venue: { stand: 'models/venue/stand-section-s1.lo.glb' },
} as const;
