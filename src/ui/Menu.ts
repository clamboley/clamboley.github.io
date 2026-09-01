/**
 * The plain list of destinations, laid over the scene on Escape. It is the
 * same navigation that crawlers and the fallback see; here its links behave
 * as ordinary links.
 */
export class Menu {
  private open = false;

  constructor(
    private readonly nav: HTMLElement,
    private readonly onClose: () => void,
  ) {
    nav.addEventListener('click', this.onClick);
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    document.body.classList.add('is-menu');
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    document.body.classList.remove('is-menu');
  }

  dispose(): void {
    this.nav.removeEventListener('click', this.onClick);
  }

  /** A click on the backdrop, not on a link, closes the list. */
  private readonly onClick = (event: MouseEvent): void => {
    if (!this.open) return;
    event.stopPropagation(); // the scene must not read this as a click on a drum
    if (event.target instanceof Element && event.target.closest('a')) return;
    this.onClose();
  };
}
