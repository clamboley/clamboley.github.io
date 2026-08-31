import type { KitElement } from '../kit.types.ts';
import { mustQuery } from '../util/dom.ts';

/** Delay between the start of the fade and the navigation, in ms. */
const NAVIGATE_DELAY_MS = 900;

/**
 * Fades the stage out towards the destination. In development (or with
 * `?stay`) it offers a way back instead of leaving the page.
 */
export class RedirectOverlay {
  private readonly badge: HTMLElement;
  private readonly destination: HTMLElement;
  private readonly url: HTMLElement;
  private readonly back: HTMLElement;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly root: HTMLElement,
    onReturn: () => void,
  ) {
    this.badge = mustQuery(root, '.redirect-badge');
    this.destination = mustQuery(root, '.redirect-destination');
    this.url = mustQuery(root, '.redirect-url');
    this.back = mustQuery(root, '.redirect-back');
    this.back.addEventListener('click', (event) => {
      event.stopPropagation();
      onReturn();
    });
  }

  show(element: KitElement, options: { stay: boolean }): void {
    const { destination, logo } = element;
    this.badge.textContent = logo.glyph;
    this.badge.style.background = logo.color;
    this.destination.textContent = destination.label;
    this.url.textContent = destination.url;

    // mailto: never unloads the page, so always offer the way back for it
    const stay = options.stay || destination.url.startsWith('mailto:');
    this.root.classList.toggle('is-staying', stay);
    this.root.classList.add('is-on');

    if (stay) {
      this.back.focus();
      if (destination.url.startsWith('mailto:')) window.location.assign(destination.url);
      return;
    }
    this.timer = setTimeout(() => {
      window.location.assign(destination.url);
    }, NAVIGATE_DELAY_MS);
  }

  hide(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.root.classList.remove('is-on');
  }
}
