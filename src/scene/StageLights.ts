import { Group, HemisphereLight, PointLight, SpotLight, Vector3 } from 'three';
import type { MotionPrefs } from '../util/motion.ts';
import { Beam } from './Beams.ts';

const KIT_CENTRE = new Vector3(0, 0.85, -0.7);

interface Rim {
  light: SpotLight;
  beam: Beam;
  base: number;
  phase: number;
}

interface Sweep {
  beam: Beam;
  from: Vector3;
  to: Vector3;
  phase: number;
}

/**
 * Warm key on the kit (the only shadow caster), magenta/blue back lights
 * with beams through the haze, sweeping movers, cold wash on the crowd.
 */
export class StageLights {
  readonly root = new Group();
  private readonly rims: Rim[] = [];
  private readonly sweeps: Sweep[] = [];

  constructor(private readonly motion: MotionPrefs) {
    this.root.add(new HemisphereLight(0x2a2440, 0x05050a, 0.18));

    const key = new SpotLight(0xffd6a8, 42, 0, 0.62, 0.7, 2);
    key.position.set(0.7, 3.3, 1.1);
    key.target.position.copy(KIT_CENTRE);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.01;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 8;
    this.root.add(key, key.target);

    this.addRim(0xff2e9a, -3.4, 0);
    this.addRim(0x2e6bff, 3.4, 2.1);

    // movers on the truss, slowly crossing the stage
    for (const [x, color, phase] of [
      [-1.6, 0xff4fb0, 0.8],
      [1.6, 0x4f8cff, 3.1],
    ] as const) {
      const beam = new Beam(color, 9, 0.45, 0.1);
      const from = new Vector3(x, 6.4, -3.6);
      const to = new Vector3(-x * 1.8, 0, -5.5);
      beam.aim(from, to);
      this.root.add(beam.mesh);
      this.sweeps.push({ beam, from, to, phase });
    }

    const wash = new PointLight(0x2438a8, 32, 0, 2);
    wash.position.set(0, 4.5, -9);
    this.root.add(wash);

    // house light: a faint cold glow so the tiers read as a bowl, not as cut-outs
    const house = new PointLight(0x4a56b8, 900, 0, 2);
    house.position.set(0, 14, -12);
    this.root.add(house);
  }

  update(elapsed: number): void {
    const breathe = this.motion.scale;
    for (const rim of this.rims) {
      const wave = Math.sin(elapsed * 1.5 + rim.phase);
      rim.light.intensity = rim.base * (1 + wave * 0.25 * breathe);
      rim.beam.opacity = 0.11 + wave * 0.03 * breathe;
      rim.beam.time = elapsed;
    }
    for (const sweep of this.sweeps) {
      const swing = Math.sin(elapsed * 0.35 + sweep.phase) * 1.4 * breathe;
      sweep.beam.aim(sweep.from, new Vector3(sweep.to.x + swing, sweep.to.y, sweep.to.z));
      sweep.beam.time = elapsed;
    }
  }

  private addRim(color: number, x: number, phase: number): void {
    const base = 55;
    const light = new SpotLight(color, base, 0, 0.3, 0.6, 2);
    light.position.set(x, 6.4, -6.6);
    light.target.position.set(0, 1.1, -0.8);
    this.root.add(light, light.target);

    const beam = new Beam(color, 10, 0.7, 0.11);
    beam.aim(light.position, new Vector3(-x * 0.45, 0, -2.2));
    this.root.add(beam.mesh);
    this.rims.push({ light, beam, base, phase });
  }
}
