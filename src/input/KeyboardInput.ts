import { KIT_BY_KEY } from '../kit.config.ts';
import type { KitKey } from '../kit.types.ts';

export interface KeyboardHandlers {
  /** A destination link took the focus: look at its element and aim it. */
  onFocus(key: KitKey): void;
  onBlur(): void;
  /** Enter (or a click) on the focused link: play it instead of navigating. */
  onActivate(key: KitKey): void;
  /** Escape: open or close the plain list of destinations. */
  onEscape(): void;
}

function isKitKey(value: string | undefined): value is KitKey {
  return value !== undefined && value in KIT_BY_KEY;
}

/**
 * The visually hidden navigation doubles as the keyboard path: Tab cycles
 * the focus (and the gaze) through the elements of the kit, wrapping around
 * at both ends, Enter plays the fill, Escape brings up the plain list. The
 * pointer taking over releases the focus. While the list is open, the links
 * behave as ordinary links.
 */
export class KeyboardInput {
  private readonly links: HTMLAnchorElement[] = [];
  private readonly unbind: (() => void)[] = [];
  private menuOpen = false;

  constructor(
    root: ParentNode,
    private readonly handlers: KeyboardHandlers,
  ) {
    for (const link of root.querySelectorAll<HTMLAnchorElement>('a[data-key]')) {
      const key = link.dataset.key;
      if (!isKitKey(key)) continue;
      this.links.push(link);
      const onFocus = (): void => {
        if (!this.menuOpen) handlers.onFocus(key);
      };
      const onBlur = (): void => {
        if (!this.menuOpen) handlers.onBlur();
      };
      const onClick = (event: MouseEvent): void => {
        if (this.menuOpen) return; // a plain link while the list is open
        event.preventDefault();
        handlers.onActivate(key);
      };
      link.addEventListener('focus', onFocus);
      link.addEventListener('blur', onBlur);
      link.addEventListener('click', onClick);
      this.unbind.push(() => {
        link.removeEventListener('focus', onFocus);
        link.removeEventListener('blur', onBlur);
        link.removeEventListener('click', onClick);
      });
    }
    window.addEventListener('keydown', this.onKeyDown);
  }

  /** While the list of destinations is open, focus and Enter mean the usual thing. */
  setMenu(open: boolean): void {
    this.menuOpen = open;
  }

  /** Drops the focus from a destination link (the pointer took over). */
  release(): void {
    const active = document.activeElement;
    if (active instanceof HTMLAnchorElement && isKitKey(active.dataset.key)) active.blur();
  }

  /** Puts the focus on the first element of the kit. */
  focusFirst(): void {
    this.links[0]?.focus();
  }

  dispose(): void {
    for (const off of this.unbind) off();
    window.removeEventListener('keydown', this.onKeyDown);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.handlers.onEscape();
      return;
    }
    if (this.menuOpen) return;
    const active = document.activeElement;
    if (event.key === 'Enter') {
      // a pending destination has no href, so the browser would not click it:
      // click on our own for every element (default prevented, no double fire)
      if (active instanceof HTMLAnchorElement && isKitKey(active.dataset.key)) {
        event.preventDefault();
        active.click();
      }
      return;
    }
    if (event.key !== 'Tab') return;
    const index = active instanceof HTMLAnchorElement ? this.links.indexOf(active) : -1;
    // the kit is a loop: Tab past the last element lands on the first, and back
    if (index === -1) {
      if (this.links.length === 0) return;
      event.preventDefault();
      this.links[event.shiftKey ? this.links.length - 1 : 0]?.focus();
      return;
    }
    event.preventDefault();
    const next = (index + (event.shiftKey ? -1 : 1) + this.links.length) % this.links.length;
    this.links[next]?.focus();
  };
}
