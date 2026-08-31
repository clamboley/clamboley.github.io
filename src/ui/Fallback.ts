/**
 * No WebGL (or a device we don't trust with the scene): reveal the
 * semantic navigation that is otherwise hidden for crawlers and screen readers.
 */
export function showFallback(): void {
  document.body.classList.add('is-fallback');
}
