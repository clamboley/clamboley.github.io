import { Box3, Mesh, MeshStandardMaterial, Vector3, type BufferGeometry } from 'three';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface LoadedModel {
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
  /** Bounding box of the geometry, in model units. */
  bounds: Box3;
  size: Vector3;
}

let loader: GLTFLoader | undefined;

function getLoader(): GLTFLoader {
  if (!loader) {
    loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}

/**
 * Loads a single-mesh GLB (what TRELLIS.2 + gltf-transform produce) and hands
 * back its geometry and PBR material, ready to be instanced.
 */
export async function loadModel(url: string): Promise<LoadedModel> {
  const gltf = await getLoader().loadAsync(url);
  let mesh: Mesh | undefined;
  gltf.scene.traverse((object) => {
    if (!mesh && object instanceof Mesh) mesh = object;
  });
  if (!mesh) throw new Error(`No mesh in ${url}`);
  mesh.updateWorldMatrix(true, false);
  const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  if (!(material instanceof MeshStandardMaterial)) throw new Error(`Unexpected material in ${url}`);
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox ?? new Box3();
  return { geometry, material, bounds, size: bounds.getSize(new Vector3()) };
}
