import { Group, Mesh, Vector3 } from 'three';
import { loadModel } from './assets.ts';

const PIT_FLOOR = -0.8;
const STAND_WIDTH = 9; // metres per generated tier block
const ARC_RADIUS = 18;
const ARC_CENTRE = new Vector3(0, 0, -1);

/** Tiers of seats around the pit, one generated block repeated in an arc. */
export class Venue {
  readonly root = new Group();

  async load(standUrl: string): Promise<void> {
    const stand = await loadModel(standUrl);
    const scale = STAND_WIDTH / stand.size.x;
    const angles = [-0.95, -0.5, 0, 0.5, 0.95];
    for (const angle of angles) {
      const mesh = new Mesh(stand.geometry, stand.material);
      mesh.scale.setScalar(scale);
      mesh.position.set(
        ARC_CENTRE.x + Math.sin(angle) * ARC_RADIUS,
        PIT_FLOOR - stand.bounds.min.y * scale,
        ARC_CENTRE.z - Math.cos(angle) * ARC_RADIUS,
      );
      mesh.lookAt(new Vector3(ARC_CENTRE.x, mesh.position.y, ARC_CENTRE.z));
      this.root.add(mesh);
    }
  }
}
