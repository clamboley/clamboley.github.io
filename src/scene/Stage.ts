import { BoxGeometry, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { legacyColor } from './colors.ts';

/** Reflective stage floor and a pair of monitor wedges. */
export function createStage(): Group {
  const root = new Group();

  const floor = new Mesh(
    new PlaneGeometry(60, 60),
    new MeshStandardMaterial({ color: legacyColor(0x0b0a12), metalness: 0.6, roughness: 0.35 }),
  );
  floor.rotation.x = -Math.PI / 2;
  root.add(floor);

  const wedgeMaterial = new MeshStandardMaterial({ color: legacyColor(0x14141c), roughness: 0.8 });
  for (const [x, z, yaw] of [
    [-1.5, -1.9, 0.5],
    [1.5, -1.9, -0.5],
  ] as const) {
    const wedge = new Mesh(new BoxGeometry(0.55, 0.35, 0.4), wedgeMaterial);
    wedge.position.set(x, 0.17, z);
    wedge.rotation.y = yaw;
    root.add(wedge);
  }

  return root;
}
