import { MathUtils, PerspectiveCamera } from 'three';
import type { MotionPrefs } from '../util/motion.ts';

const EYE_HEIGHT = 1.35;
const BASE_PITCH = -0.3;
const YAW_RANGE = 0.85;
const PITCH_RANGE = 0.42;
const PITCH_MIN = -0.72;
const PITCH_MAX = 0.14;
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
    this.camera.position.set(0, EYE_HEIGHT, 0.15);
  }

  /** Pointer position normalised to [-1, 1] (x right, y up). */
  look(nx: number, ny: number): void {
    this.targetYaw = -nx * YAW_RANGE;
    this.targetPitch = MathUtils.clamp(BASE_PITCH + ny * PITCH_RANGE, PITCH_MIN, PITCH_MAX);
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
    this.camera.position.y = EYE_HEIGHT + bob + (Math.random() - 0.5) * shake * 0.02;
  }
}
