import { createElement, queryOne } from '#shared/dom.ts';

// The review's own elements, made once and kept: renders refill them, and
// they're put back where they belong if Lichess redraws their parent.

export interface ReviewElements {
  readonly panel: HTMLElement;
  readonly graphBox: HTMLElement;
  /** The move-by-move graph's views, kept for their pick to slide. */
  readonly graphViews: HTMLElement;
  /** The move-by-move panel's Explain / Best / Next, kept for their buttons to ease. */
  readonly nav: HTMLElement;
  readonly controls: HTMLElement;
  readonly bar: HTMLElement;
  readonly barFill: HTMLElement;
  readonly barLabel: HTMLElement;
  readonly overlay: HTMLElement;
  readonly opening: HTMLElement;
  readonly tip: HTMLElement;
}

export function createElements(): ReviewElements {
  const bar = createElement('div', { id: 'ln-ext-evalbar' });
  const barFill = createElement('div', { className: 'ln-ext-evalbar__fill' });
  const barLabel = createElement('span', { className: 'ln-ext-evalbar__label' });
  bar.append(barFill, barLabel);
  return {
    // Focusable, to keep the focus of a button its redraw replaced.
    panel: createElement('div', { id: 'ln-ext-review', attrs: { tabindex: '-1' } }),
    graphBox: createElement('div', { id: 'ln-ext-review-graph' }),
    graphViews: createElement('div', { className: 'ln-ext-graph-views' }),
    nav: createElement('div', { className: 'ln-ext-review__nav' }),
    controls: createElement('div', { id: 'ln-ext-review-controls' }),
    bar,
    barFill,
    barLabel,
    overlay: createElement('div', { id: 'ln-ext-board-overlay' }),
    opening: createElement('div', { id: 'ln-ext-opening' }),
    // Put on <body>, because the panel's rows scroll and would clip it.
    tip: createElement('div', { id: 'ln-ext-tip', attrs: { role: 'tooltip' } }),
  };
}

// The move-by-move review draws the graph inside its panel (view/moves-panel.ts).
const isInPanel = ({ panel }: ReviewElements, element: HTMLElement): boolean =>
  element !== panel && panel.contains(element);

/** Puts the elements in the analysis page; false when it has no board yet. */
export function attach(elements: ReviewElements): boolean {
  const main = queryOne(document, 'main.analyse', HTMLElement);
  const board = main && queryOne(main, '.analyse__board', HTMLElement);
  if (!main || !board) return false;
  for (const element of [elements.panel, elements.graphBox, elements.controls, elements.bar])
    if (element.parentNode !== main && !isInPanel(elements, element)) main.append(element);
  if (elements.overlay.parentNode !== board) board.append(elements.overlay);
  return true;
}
