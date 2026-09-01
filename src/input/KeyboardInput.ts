import { KIT_BY_KEY } from '../kit.config.ts';
import type { KitKey } from '../kit.types.ts';

export interface KeyboardHandlers {
  /** A destination link took the focus: look at its element and aim it. */
  onFocus(key: KitKey): void;
  onBlur(): void;
  /** Enter (or a click) on the focused link: play it instead of navigating. */
  onActivate(key: KitKey): void;
}

function isKitKey(value: string | undefined): value is KitKey {
  return value !== undefined && value in KIT_BY_KEY;
}

/**
 * The visually hidden navigation doubles as the keyboard path: Tab moves the
 * focus (and the gaze) from element to element, Enter plays the fill, Escape
 * lets go. The pointer taking over releases the focus.
 */
export class KeyboardInput {
  private readonly unbind: (() => void)[] = [];

  constructor(root: ParentNode, handlers: KeyboardHandlers) {
    for (const link of root.querySelectorAll<HTMLAnchorElement>('a[data-key]')) {
      const key = link.dataset.key;
      if (!isKitKey(key)) continue;
      const onFocus = (): void => {
        handlers.onFocus(key);
      };
      const onBlur = (): void => {
        handlers.onBlur();
      };
      const onClick = (event: MouseEvent): void => {
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

  /** Drops the focus from a destination link (the pointer took over). */
  release(): void {
    const active = document.activeElement;
    if (active instanceof HTMLAnchorElement && isKitKey(active.dataset.key)) active.blur();
  }

  dispose(): void {
    for (const off of this.unbind) off();
    window.removeEventListener('keydown', this.onKeyDown);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.release();
  };
}
