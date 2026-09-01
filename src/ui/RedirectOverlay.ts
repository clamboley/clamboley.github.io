import type { KitElement } from '../kit.types.ts';
import { mustQuery } from '../util/dom.ts';

/**
 * After the fill: the stage fades out behind a card naming the destination.
 * The visitor decides — go there, or come back to the drums (button, click
 * beside the card, or Escape). Nothing navigates on its own.
 */
export class RedirectOverlay {
  private readonly badge: HTMLElement;
  private readonly destination: HTMLElement;
  private readonly url: HTMLElement;
  private readonly go: HTMLAnchorElement;
  private readonly back: HTMLElement;

  constructor(
    private readonly root: HTMLElement,
    onReturn: () => void,
  ) {
    this.badge = mustQuery(root, '.redirect-badge');
    this.destination = mustQuery(root, '.redirect-destination');
    this.url = mustQuery(root, '.redirect-url');
    this.go = mustQuery(root, '.redirect-go');
    this.back = mustQuery(root, '.redirect-back');
    this.back.addEventListener('click', (event) => {
      event.stopPropagation();
      onReturn();
    });
    // a click on the dark backdrop, not on the card, is a way back too
    root.addEventListener('click', (event) => {
      event.stopPropagation();
      if (event.target === root) onReturn();
    });
  }

  show(element: KitElement): void {
    const { destination, logo } = element;
    this.badge.textContent = logo.glyph;
    this.badge.style.background = logo.color;
    this.destination.textContent = destination.label;
    const pending = destination.pending === true;
    this.go.classList.toggle('is-pending', pending);
    if (pending) {
      // nothing to open yet: the link is greyed out, the way back takes the focus
      this.url.textContent = 'bientôt';
      this.go.removeAttribute('href');
      this.go.setAttribute('aria-disabled', 'true');
    } else {
      this.url.textContent = destination.url.replace(/^mailto:/, '');
      this.go.href = destination.url;
      this.go.removeAttribute('aria-disabled');
    }
    this.root.classList.add('is-on');
    (pending ? this.back : this.go).focus();
  }

  hide(): void {
    this.root.classList.remove('is-on');
  }
}
