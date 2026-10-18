import { setStyleProperty } from '#shared/dom.ts';
import { type SafeHtml, setHtml } from '#shared/html.ts';

const ON = 'ln-ext-rchart__tip--on';

interface Beside {
  /** The x the tooltip points at. */
  readonly anchor: number;
  readonly width: number;
  /** Space between the anchor and the tooltip. */
  readonly gap: number;
  /** The x the tooltip must not pass on the right. */
  readonly limit: number;
}

/** The tooltip's left edge: right of the anchor, or left of it when there's no room. */
export function tipLeft({ anchor, width, gap, limit }: Beside): number {
  return anchor + gap + width > limit ? anchor - gap - width : anchor + gap;
}

interface Placement {
  readonly anchor: number;
  readonly gap: number;
  readonly limit: number;
  readonly top: number;
}

/** Fills the tooltip and shows it beside `anchor`; its width is only known once filled. */
export function showTip(tip: HTMLElement, markup: SafeHtml, placement: Placement): void {
  setHtml(tip, markup);
  tip.classList.toggle(ON, true);
  const left = tipLeft({ ...placement, width: tip.offsetWidth });
  setStyleProperty(tip, 'transform', `translate(${Math.round(left)}px, ${placement.top}px)`);
}

export function hideTip(tip: HTMLElement): void {
  tip.classList.toggle(ON, false);
}
