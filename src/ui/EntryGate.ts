/**
 * The veil over the stage on arrival: one round button that unlocks the
 * audio, ringed by the preload progress. Clicking early waits under the
 * ring; waiting first makes the entrance instantaneous.
 */
export class EntryGate {
  private readonly button: HTMLButtonElement;
  private readonly ring: SVGCircleElement;
  private readonly circumference: number;
  private open = true;
  private clicked = false;
  private progress = 0;
  private safety = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly onEnter: () => void,
  ) {
    this.button = this.find('.entry-button', HTMLButtonElement);
    this.ring = this.find('.entry-ring-fill', SVGCircleElement);
    this.circumference = 2 * Math.PI * this.ring.r.baseVal.value;
    this.ring.style.strokeDasharray = String(this.circumference);
    this.ring.style.strokeDashoffset = String(this.circumference);
    this.button.addEventListener('click', this.onClick);
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(): void {
    this.root.hidden = false;
    this.button.focus();
  }

  /** Share of the audio already fetched and decoded, in [0, 1]. */
  setProgress(share: number): void {
    this.progress = share;
    this.ring.style.strokeDashoffset = String(this.circumference * (1 - share));
    if (this.clicked && share >= 1) this.finish();
  }

  dispose(): void {
    this.button.removeEventListener('click', this.onClick);
    clearTimeout(this.safety);
  }

  private readonly onClick = (event: MouseEvent): void => {
    event.stopPropagation(); // the stage must not read the entrance as a stroke
    if (this.clicked) return;
    this.clicked = true;
    this.onEnter(); // the gesture the browser wants: the audio starts here
    if (this.progress >= 1) {
      this.finish();
      return;
    }
    this.root.classList.add('is-waiting');
    // a sample lost to the network must not lock the door: worst case, synthesis
    this.safety = window.setTimeout(() => {
      this.finish();
    }, 8000);
  };

  private finish(): void {
    if (!this.open) return;
    this.open = false;
    clearTimeout(this.safety);
    this.root.classList.remove('is-waiting');
    this.root.classList.add('is-leaving');
    window.setTimeout(() => {
      this.root.hidden = true;
    }, 600);
  }

  private find<T extends Element>(selector: string, kind: new () => T): T {
    const found = this.root.querySelector(selector);
    if (!(found instanceof kind)) throw new Error(`EntryGate: ${selector} missing`);
    return found;
  }
}
