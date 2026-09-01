/**
 * No WebGL, or a device we don't trust with the scene: the semantic
 * navigation, otherwise hidden for crawlers and screen readers, becomes the
 * page, laid over a photo of the kit.
 */
export function showFallback(options: { offer3d: boolean; reason: string }): void {
  document.body.classList.add('is-fallback');
  const offer = document.querySelector<HTMLElement>('.fallback-3d');
  if (offer) offer.hidden = !options.offer3d;
  const why = document.querySelector<HTMLElement>('.fallback-why');
  if (why) why.textContent = options.reason;
}
