export type LookHandler = (nx: number, ny: number) => void;

/** Mouse move / touch drag → normalised gaze target in [-1, 1]. */
export class LookInput {
  private moved = false;

  constructor(
    private readonly onLook: LookHandler,
    private readonly onFirstMove: () => void,
  ) {
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });
  }

  dispose(): void {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('touchmove', this.onTouchMove);
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    this.look(event.clientX, event.clientY);
  };

  private readonly onTouchMove = (event: TouchEvent): void => {
    const touch = event.touches[0];
    if (touch) this.look(touch.clientX, touch.clientY);
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
