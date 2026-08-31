import { BoxGeometry, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { floorMaterial } from './materials.ts';

const STAGE_DEPTH = 6; // metres, from the back wall to the front edge
const STAGE_HEIGHT = 0.8;

/** Stage platform above the pit, monitor wedges at the edge, dark pit floor. */
export function createStage(): Group {
  const root = new Group();

  const stage = new Mesh(new BoxGeometry(16, STAGE_HEIGHT, STAGE_DEPTH), floorMaterial());
  stage.position.set(0, -STAGE_HEIGHT / 2, 2.5 - STAGE_DEPTH / 2);
  stage.receiveShadow = true;
  root.add(stage);

  const pit = new Mesh(
    new PlaneGeometry(80, 80),
    new MeshStandardMaterial({ color: 0x050508, roughness: 0.9 }),
  );
  pit.rotation.x = -Math.PI / 2;
  pit.position.y = -STAGE_HEIGHT;
  root.add(pit);

  const wedgeMaterial = new MeshStandardMaterial({ color: 0x101014, roughness: 0.85 });
  const frontEdge = 2.5 - STAGE_DEPTH;
  for (const [x, yaw] of [
    [-1.6, 0.55],
    [1.6, -0.55],
  ] as const) {
    const wedge = new Mesh(new BoxGeometry(0.6, 0.38, 0.45), wedgeMaterial);
    wedge.position.set(x, 0.19, frontEdge + 0.5);
    wedge.rotation.y = yaw;
    wedge.rotation.x = 0.1;
    wedge.castShadow = true;
    root.add(wedge);
  }

  return root;
}
