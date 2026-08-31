import {
  BufferGeometry,
  CylinderGeometry,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const UP = new Vector3(0, 1, 0);

/** A cylinder whose axis runs from `a` to `b`. */
export function cylinderBetween(
  a: Vector3,
  b: Vector3,
  radius: number,
  segments = 10,
): BufferGeometry {
  const direction = new Vector3().subVectors(b, a);
  const length = direction.length();
  const geometry = new CylinderGeometry(radius, radius, length, segments);
  const quaternion = new Quaternion().setFromUnitVectors(UP, direction.normalize());
  const middle = new Vector3().addVectors(a, b).multiplyScalar(0.5);
  geometry.applyMatrix4(new Matrix4().compose(middle, quaternion, new Vector3(1, 1, 1)));
  return geometry;
}

/** Merges geometries into one draw call and disposes the parts. */
export function merge(geometries: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(geometries, false);
  for (const geometry of geometries) geometry.dispose();
  return merged;
}

/**
 * Cymbal profile: bell, bow and a thin edge, lathed, with planar UVs so a
 * round texture maps straight onto it.
 */
export function cymbalGeometry(radius: number): BufferGeometry {
  const bell = Math.min(0.065, radius * 0.3);
  const top: [number, number][] = [
    [0.008, 0.034],
    [bell * 0.6, 0.033],
    [bell, 0.022],
    [bell * 1.3, 0.013],
    [radius * 0.5, 0.0075],
    [radius * 0.85, 0.003],
    [radius, 0],
  ];
  const thickness = 0.0016;
  const points = [
    ...top.map(([x, y]) => new Vector2(x, y)),
    ...[...top].reverse().map(([x, y]) => new Vector2(x, y - thickness)),
  ];
  const geometry = new LatheGeometry(points, 72);
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < position.count; i++) {
    uv.setXY(i, 0.5 + position.getX(i) / (2 * radius), 0.5 - position.getZ(i) / (2 * radius));
  }
  uv.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}
