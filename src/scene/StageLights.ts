import {
  AdditiveBlending,
  AmbientLight,
  ConeGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  SpotLight,
  Vector3,
  type Color,
} from 'three';
import type { MotionPrefs } from '../util/motion.ts';
import { legacyColor } from './colors.ts';

const SPOT_INTENSITY = 220; // candela (physically based lights)
const BEAM_OPACITY = 0.045;

interface Spot {
  light: SpotLight;
  beam: MeshBasicMaterial;
  phase: number;
}

/** Warm key on the kit, cold wash on the crowd, two coloured back spots with fake beams. */
export class StageLights {
  readonly root = new Group();
  private readonly spots: Spot[] = [];

  constructor(private readonly motion: MotionPrefs) {
    this.root.add(new AmbientLight(legacyColor(0x191430), 0.9));

    const key = new PointLight(legacyColor(0xffd9b0), 14, 0, 2);
    key.position.set(0.4, 2.6, 0.9);
    this.root.add(key);

    const crowdWash = new PointLight(legacyColor(0x2c2c58), 60, 0, 2);
    crowdWash.position.set(0, 4, -8);
    this.root.add(crowdWash);

    this.addSpot(legacyColor(0xd23a8c), -3.2, 0);
    this.addSpot(legacyColor(0x3a5cd2), 3.2, 2.4);
  }

  update(elapsed: number): void {
    const breathe = this.motion.scale;
    for (const spot of this.spots) {
      const wave = Math.sin(elapsed * 1.7 + spot.phase);
      spot.light.intensity = SPOT_INTENSITY * (1 + wave * 0.28 * breathe);
      spot.beam.opacity = BEAM_OPACITY + wave * 0.02 * breathe;
    }
  }

  private addSpot(color: Color, x: number, phase: number): void {
    const light = new SpotLight(color, SPOT_INTENSITY, 0, 0.5, 0.55, 2);
    light.position.set(x, 6.2, -6.5);
    light.target.position.set(0, 0.9, -0.7);
    this.root.add(light, light.target);

    // fake volumetric beam
    const direction = new Vector3().subVectors(light.position, light.target.position);
    const length = direction.length();
    const material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: BEAM_OPACITY,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    });
    const beam = new Mesh(new ConeGeometry(2.4, length, 24, 1, true), material);
    beam.position.copy(light.position).add(light.target.position).multiplyScalar(0.5);
    beam.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
    this.root.add(beam);

    this.spots.push({ light, beam: material, phase });
  }
}
