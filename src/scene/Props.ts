import { Group, Mesh, Vector3 } from 'three';
import { loadModel, type LoadedModel } from './assets.ts';

const STAGE_FRONT = -3.5; // z of the stage edge (see Stage.ts)
const PIT_FLOOR = -0.8;

function place(
  model: LoadedModel,
  width: number,
  x: number,
  y: number,
  z: number,
  yaw: number,
  shadow = false,
): Mesh {
  const mesh = new Mesh(model.geometry, model.material);
  const scale = width / model.size.x;
  mesh.scale.setScalar(scale);
  mesh.position.set(x, y - model.bounds.min.y * scale, z);
  mesh.rotation.y = yaw;
  mesh.castShadow = shadow;
  return mesh;
}

/** Generated stage furniture: wedges, truss, crowd barrier, PA at the sides. */
export class Props {
  readonly root = new Group();

  async loadStage(wedgeUrls: readonly string[], trussUrl: string): Promise<void> {
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
      if (model) this.root.add(place(model, 0.6, x, 0, STAGE_FRONT + 0.55, Math.PI + yaw, true));
    });
    const trussMesh = new Mesh(truss.geometry, truss.material);
    trussMesh.scale.setScalar(4.4 / truss.size.x);
    trussMesh.position.set(0, 5.2, -2.6);
    trussMesh.lookAt(new Vector3(0, 5.2, -1.6));
    this.root.add(trussMesh);
  }

  /** Barrier along the stage edge, in the pit. */
  async loadBarrier(url: string): Promise<void> {
    const barrier = await loadModel(url);
    for (let x = -7; x <= 7; x += 2.05) {
      this.root.add(place(barrier, 2, x, PIT_FLOOR, STAGE_FRONT - 1.2, 0));
    }
  }

  /** Line arrays hung at the stage sides, sub stacks on the floor. */
  async loadPa(lineArrayUrl: string, subsUrl: string): Promise<void> {
    const [lineArray, subs] = await Promise.all([loadModel(lineArrayUrl), loadModel(subsUrl)]);
    for (const side of [-1, 1]) {
      const array = new Mesh(lineArray.geometry, lineArray.material);
      array.scale.setScalar(3.6 / lineArray.size.y);
      array.position.set(side * 6.2, 2.6, STAGE_FRONT + 0.8);
      array.rotation.y = -side * 0.25;
      this.root.add(array);
      this.root.add(place(subs, 1.3, side * 6, PIT_FLOOR, STAGE_FRONT - 0.2, -side * 0.15));
    }
  }
}
