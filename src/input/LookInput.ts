/** Pixels a finger may drift during a tap before it counts as a drag. */
export const TAP_SLOP = 8;

export type LookHandler = (nx: number, ny: number) => void;

/** Mouse move / touch drag → normalised gaze target in [-1, 1]. */
export class LookInput {
  private moved = false;
  private touchOrigin: { x: number; y: number; dragging: boolean } | null = null;

  constructor(
    private readonly onLook: LookHandler,
    private readonly onFirstMove: () => void,
  ) {
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });
  }

  dispose(): void {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    this.look(event.clientX, event.clientY);
  };

  private readonly onTouchStart = (event: TouchEvent): void => {
    const touch = event.touches[0];
    if (touch) this.touchOrigin = { x: touch.clientX, y: touch.clientY, dragging: false };
  };

  /** A finger has to travel a little before it steers: a tap must not move the view. */
  private readonly onTouchMove = (event: TouchEvent): void => {
    const touch = event.touches[0];
    const origin = this.touchOrigin;
    if (!touch || !origin) return;
    if (!origin.dragging) {
      if (Math.hypot(touch.clientX - origin.x, touch.clientY - origin.y) < TAP_SLOP) return;
      origin.dragging = true;
    }
    this.look(touch.clientX, touch.clientY);
  };

  private look(clientX: number, clientY: number): void {
    const nx = (clientX / window.innerWidth) * 2 - 1;
    const ny = -((clientY / window.innerHeight) * 2 - 1);
    this.onLook(nx, ny);
    if (!this.moved) {
      this.moved = true;
      this.onFirstMove();
    }
  }
}
