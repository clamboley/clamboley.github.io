import { Group, Mesh, Vector3 } from 'three';
import { loadModel } from './assets.ts';

const STAGE_FRONT = -3.5; // z of the stage edge (see Stage.ts)

/** Generated stage furniture: monitor wedges at the edge, a lighting truss above. */
export class Props {
  readonly root = new Group();

  async load(wedgeUrls: readonly string[], trussUrl: string): Promise<void> {
    const [wedges, truss] = await Promise.all([
      Promise.all(wedgeUrls.map((url) => loadModel(url))),
      loadModel(trussUrl),
    ]);

    const spots: [number, number][] = [
      [-1.7, 0.5],
      [1.7, -0.5],
      [-0.4, 0.15],
    ];
    spots.forEach(([x, yaw], i) => {
      const model = wedges[i % wedges.length];
      if (!model) return;
      const mesh = new Mesh(model.geometry, model.material);
      const scale = 0.6 / Math.max(model.size.x, model.size.z);
      mesh.scale.setScalar(scale);
      mesh.position.set(x, -model.bounds.min.y * scale, STAGE_FRONT + 0.55);
      mesh.rotation.y = Math.PI + yaw; // facing the drummer
      mesh.castShadow = true;
      this.root.add(mesh);
    });

    const trussMesh = new Mesh(truss.geometry, truss.material);
    const trussScale = 4.4 / truss.size.x;
    trussMesh.scale.setScalar(trussScale);
    trussMesh.position.set(0, 5.2, -2.6);
    trussMesh.lookAt(new Vector3(0, 5.2, -2.6 + 1)); // long axis stays on x
    this.root.add(trussMesh);
  }
}
