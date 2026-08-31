import { MathUtils, PerspectiveCamera } from 'three';
import type { MotionPrefs } from '../util/motion.ts';
import { BASE_PITCH, EYE, gazeFromPointer } from './gaze.ts';

const LOOK_LAMBDA = 4.7; // how fast the gaze follows the mouse
const SHAKE_LAMBDA = 7.7;

/** Seated first-person camera: bounded yaw/pitch, breathing bob, stroke shake. */
export class PovCamera {
  readonly camera = new PerspectiveCamera(66, 1, 0.05, 60);

  private yaw = 0;
  private pitch = BASE_PITCH;
  private targetYaw = 0;
  private targetPitch = BASE_PITCH;
  private shakeAmount = 0;

  constructor(private readonly motion: MotionPrefs) {
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(EYE.x, EYE.y, EYE.z);
  }

  /** Pointer position normalised to [-1, 1] (x right, y up). */
  look(nx: number, ny: number): void {
    const gaze = gazeFromPointer(nx, ny);
    this.targetYaw = gaze.yaw;
    this.targetPitch = gaze.pitch;
  }

  shake(amount: number): void {
    this.shakeAmount = Math.min(1, this.shakeAmount + amount);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, elapsed: number): void {
    this.yaw = MathUtils.damp(this.yaw, this.targetYaw, LOOK_LAMBDA, dt);
    this.pitch = MathUtils.damp(this.pitch, this.targetPitch, LOOK_LAMBDA, dt);
    this.shakeAmount *= Math.exp(-SHAKE_LAMBDA * dt);

    const shake = this.shakeAmount * this.motion.scale;
    const bob = Math.sin(elapsed * 1.3) * 0.006 * this.motion.scale;
    this.camera.rotation.y = this.yaw + (Math.random() - 0.5) * shake * 0.05;
    this.camera.rotation.x = this.pitch + (Math.random() - 0.5) * shake * 0.05;
    this.camera.position.y = EYE.y + bob + (Math.random() - 0.5) * shake * 0.02;
  }
}
