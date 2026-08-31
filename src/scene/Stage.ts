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
    new PlaneGeometry(600, 600),
    new MeshStandardMaterial({ color: 0x050508, roughness: 0.9 }),
  );
  pit.rotation.x = -Math.PI / 2;
  pit.position.y = -STAGE_HEIGHT;
  root.add(pit);

  return root;
}
