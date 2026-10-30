import { queryOne } from '#shared/dom.ts';

// A tab bar's highlight, one piece that slides to the tab picked, as the
// extension's (content/ui/tab-bars.ts): the bar holds it, and its CSS places it
// by --tab-x and --tab-w.

export class SlidingPill {
  readonly #bar: HTMLElement;
  readonly #picked: string;

  /** `picked` selects the bar's tab picked. */
  constructor(bar: HTMLElement, picked: string) {
    this.#bar = bar;
    this.#picked = picked;
    // The pill follows its tab's box, which a resize changes.
    new ResizeObserver(() => this.#place()).observe(bar);
  }

  /** Slides the pill to the tab picked now. */
  follow(): void {
    // Measured once the frame's writes are done: measured now, the page would be laid out twice.
    requestAnimationFrame(() => this.#place());
  }

  #place(): void {
    const tab = queryOne(this.#bar, this.#picked, HTMLElement);
    if (!tab) return;
    this.#bar.style.setProperty('--tab-x', `${tab.offsetLeft}px`);
    this.#bar.style.setProperty('--tab-w', `${tab.offsetWidth}px`);
  }
}
