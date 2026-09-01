import { mustQuery } from '../util/dom.ts';

/** Crosshair, destination tooltip and the initial hint. No buttons, no menu. */
export class Hud {
  private readonly crosshair: HTMLElement;
  private readonly tooltip: HTMLElement;
  private readonly tooltipName: HTMLElement;
  private readonly tooltipCta: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly hintText: HTMLElement;

  constructor(root: HTMLElement) {
    this.crosshair = mustQuery(root, '.crosshair');
    this.tooltip = mustQuery(root, '.tooltip');
    this.tooltipName = mustQuery(this.tooltip, '.tooltip-name');
    this.tooltipCta = mustQuery(this.tooltip, '.tooltip-cta');
    this.hint = mustQuery(root, '.hint');
    this.hintText = mustQuery(this.hint, '.hint-text');
  }

  /** Name of the aimed destination, or null when nothing is aimed. */
  setTarget(label: string | null): void {
    const on = label !== null;
    if (on) this.tooltipName.textContent = label;
    this.tooltip.classList.toggle('is-on', on);
    this.crosshair.classList.toggle('is-hot', on);
    document.body.classList.toggle('is-aiming', on);
  }

  /** How to play the aimed element: click, tap or Enter. */
  setCta(text: string): void {
    this.tooltipCta.textContent = text;
  }

  /** The opening hint, worded for the device (mouse, touch, keyboard). */
  setHint(text: string): void {
    this.hintText.textContent = text;
  }

  hideHint(): void {
    this.hint.classList.add('is-hidden');
  }
}
