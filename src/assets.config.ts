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
  /** One entry per person variant; the near rows are dealt round-robin across them. */
  crowd: [
    fan('fan-arms-up-s1'),
    fan('fan-phone-s1'),
    fan('fan-m-fists-s1'),
    fan('fan-w-arms-s1'),
    fan('fan-m-clap-s2'),
    fan('fan-w-horns-s1'),
    fan('fan-m-cap-s1'),
    fan('fan-m-shoulders-s1'),
    fan('fan-w-cup-s1'),
    fan('fan-m-point-s1'),
    fan('fan-m-glasses-s2'),
    fan('fan-m-onearm-s1'),
  ],
  /** Festival lighting tower out in the field; undefined until generated. */
  tower: 'models/props/tower-truss-s1.lo.glb' as string | undefined,
  /** Rows nearer than this (metres from the stage edge) get the detailed model. */
  crowdDetailDistance: 2.5,
  /** Individual people stop here; beyond, blocks of thirty fill the pit. */
  crowdIndividualDepth: 6,
  crowdBlocks: [
    { hi: 'models/venue/crowd-block-s1.glb', lo: 'models/venue/crowd-block-s1.lo.glb' },
    { hi: 'models/venue/crowd-block-s2.glb', lo: 'models/venue/crowd-block-s2.lo.glb' },
  ] as CrowdVariant[],
  props: {
    wedges: ['models/props/stage-monitor-s1.lo.glb', 'models/props/stage-monitor-s2.lo.glb'],
    truss: 'models/props/truss-par-s1.lo.glb',
    barrier: 'models/props/barrier-s1.lo.glb',
    lineArray: 'models/props/line-array-s2.lo.glb',
    subs: 'models/props/sub-stack-s1.lo.glb',
  },
} as const;
