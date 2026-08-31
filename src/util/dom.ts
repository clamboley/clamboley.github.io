/** `document.getElementById` that fails loudly instead of returning null. */
export function mustGet(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element;
}

/** `parent.querySelector` that fails loudly instead of returning null. */
export function mustQuery(parent: ParentNode, selector: string): HTMLElement {
  const element = parent.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing element ${selector}`);
  return element;
}
