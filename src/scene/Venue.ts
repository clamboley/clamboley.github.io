import { Group, Mesh, Vector3 } from 'three';
import { loadModel } from './assets.ts';

const PIT_FLOOR = -0.8;
const ARC_CENTRE = new Vector3(0, 0, -1);

interface Ring {
  radius: number;
  /** Floor level of the tier block. */
  base: number;
  /** Width of one block, metres; blocks are laid edge to edge along the arc. */
  width: number;
  /** Half-angle covered, radians. */
  spread: number;
}

/** Lower and upper tiers: the same generated stepped block laid along two arcs. */
const RINGS: Ring[] = [
  { radius: 21, base: PIT_FLOOR, width: 8, spread: 1.55 },
  { radius: 27, base: PIT_FLOOR + 5.5, width: 10, spread: 1.5 },
];

/** The arena bowl around the pit, one generated tier block repeated in arcs. */
export class Venue {
  readonly root = new Group();

  async load(tiersUrl: string): Promise<void> {
    const stand = await loadModel(tiersUrl);
    stand.material.envMapIntensity = 0.3;
    for (const ring of RINGS) {
      const scale = ring.width / stand.size.x;
      const step = ring.width / ring.radius;
      const count = Math.floor((2 * ring.spread) / step) + 1;
      for (let i = 0; i < count; i++) {
        const angle = -ring.spread + i * step;
        const mesh = new Mesh(stand.geometry, stand.material);
        mesh.scale.setScalar(scale);
        mesh.position.set(
          ARC_CENTRE.x + Math.sin(angle) * ring.radius,
          ring.base - stand.bounds.min.y * scale,
          ARC_CENTRE.z - Math.cos(angle) * ring.radius,
        );
        mesh.lookAt(new Vector3(ARC_CENTRE.x, mesh.position.y, ARC_CENTRE.z));
        this.root.add(mesh);
      }
    }
  }
}
