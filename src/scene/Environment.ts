import {
  BackSide,
  CircleGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  type Texture,
  type WebGLRenderer,
} from 'three';

function lamp(color: number, power: number): MeshBasicMaterial {
  return new MeshBasicMaterial({ color: new Color(color).multiplyScalar(power) });
}

/**
 * Environment map for reflections: a dark hall with a lighting rig above
 * the kit, coloured back lights and a faint blue haze towards the audience.
 * Rendered once into a PMREM; costs no asset download.
 */
export function createStageEnvironment(renderer: WebGLRenderer): Texture {
  const scene = new Scene();
  scene.add(
    new Mesh(
      new SphereGeometry(40, 32, 16),
      new MeshBasicMaterial({ color: 0x030306, side: BackSide }),
    ),
  );

  // front-of-house rig: an arc of warm lamps above and in front of the drummer
  const par = new CircleGeometry(0.32, 20);
  for (let i = 0; i < 9; i++) {
    const a = -0.9 + (i / 8) * 1.8;
    const light = new Mesh(par, lamp(i % 4 === 1 ? 0xffb070 : 0xfff0d8, 6));
    light.position.set(Math.sin(a) * 4.5, 5.2, 2 + Math.cos(a) * 2.5);
    light.lookAt(0, 1, -0.5);
    scene.add(light);
  }
  // back truss: magenta and blue, seen in the cymbals
  for (const [x, color] of [
    [-3.5, 0xff2e9a],
    [3.5, 0x2e6bff],
    [-1.2, 0xff2e9a],
    [1.2, 0x2e6bff],
  ] as const) {
    const light = new Mesh(new CircleGeometry(0.45, 20), lamp(color, 4));
    light.position.set(x, 5.6, -6);
    light.lookAt(0, 1, -0.5);
    scene.add(light);
  }
  // soft haze over the crowd and a hint of stage floor
  const haze = new Mesh(new PlaneGeometry(30, 8), lamp(0x1a2050, 0.9));
  haze.position.set(0, 3, -16);
  scene.add(haze);
  const floor = new Mesh(new PlaneGeometry(40, 40), lamp(0x0a0a10, 1));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.2;
  scene.add(floor);

  const pmrem = new PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  return texture;
}
