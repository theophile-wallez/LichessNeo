import { closestTo, createElement, setData, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { placeTooltip, splitShortcut } from './tooltip-layout.ts';

// Styled tooltips on the page's buttons (styles/theme/tooltips-and-tabs.css),
// instead of the browser's slow, unstyled `title`. On hover the title moves to
// `data-lr-ext-tip`, so the native one never shows. Snabbdom only sets the title
// again if it changes, and the next hover moves it again.

// The board editor's analysis link is one of its tools (content/pages/editor-tools.ts); a
// chat line's reply and report are Lichess's own `action` tags; an opening's popularity, its
// results' parts and its way back to its parent say what they are in a title; a theme's
// settings in the user menu say what each does.
const TARGETS = [
  'main :is(button:is([title], [data-lr-ext-tip]), a.tv-channel[data-lr-ext-tip]):not(#lr-ext-review *)',
  'main .board-editor__tools .actions > a[data-lr-ext-tip]',
  'main .mchat__messages > li > action:is([title], [data-lr-ext-tip])',
  'main .lr-ext-medal[data-lr-ext-tip]',
  'main.opening .opening__next__popularity > span:is([title], [data-lr-ext-tip])',
  'main.opening .result-bar > span:is([title], [data-lr-ext-tip])',
  'main.opening h1.opening__title > a:is([title], [data-lr-ext-tip])',
  '#dasher_app .lr-ext-src-options > button[data-lr-ext-tip]',
].join(', ');
// Lichess's home start buttons carry an English title that only repeats their label:
// adopted, so the browser's doesn't show either, but never shown.
const NO_TIP = 'main.lobby .lobby__start__button';
const ON = 'lr-ext-tooltip--on';
// A short wait before the first one, none when going from button to button.
const FIRST_DELAY_MS = 250;
const CHAIN_MS = 400;

function hoverTarget(event: MouseEvent): HTMLElement | null {
  const target = closestTo(event.target, TARGETS, HTMLElement);
  // TV's channels only need theirs while their names are hidden (styles/tv.css).
  if (target?.matches('a.tv-channel') && !matchMedia('(max-width: 1259.98px)').matches) return null;
  return target;
}

function adoptTitle(target: HTMLElement): void {
  if (!target.title) return;
  setData(target, 'lrExtTip', target.title);
  if (!target.hasAttribute('aria-label')) target.setAttribute('aria-label', target.title);
  target.removeAttribute('title');
}

export class Tooltip {
  readonly #element = createElement('div', {
    className: 'lr-ext-tooltip',
    attrs: { 'aria-hidden': 'true' },
  });
  #target: HTMLElement | null = null;
  #timer = 0;
  #hiddenAt = 0;

  hide(): void {
    clearTimeout(this.#timer);
    if (this.#target && this.#element.classList.contains(ON)) this.#hiddenAt = Date.now();
    this.#target = null;
    this.#element.classList.toggle(ON, false);
  }

  hover(event: MouseEvent): void {
    const target = hoverTarget(event);
    if (target === this.#target) return;
    this.hide();
    if (!target) return;
    adoptTitle(target);
    if (!target.dataset.lrExtTip || target.matches(NO_TIP)) return;
    this.#target = target;
    const delay = Date.now() - this.#hiddenAt < CHAIN_MS ? 0 : FIRST_DELAY_MS;
    this.#timer = setTimeout(() => this.#show(target), delay);
  }

  /** Snabbdom replaced the button under the pointer. */
  dropDetached(): void {
    if (this.#target && !this.#target.isConnected) this.hide();
  }

  #show(target: HTMLElement): void {
    const tooltip = this.#element;
    const { label, key } = splitShortcut(target.dataset.lrExtTip ?? '');
    tooltip.textContent = label;
    if (key !== null) tooltip.append(createElement('kbd', { text: key }));
    if (!tooltip.isConnected) document.body.append(tooltip);
    const place = placeTooltip(
      target.getBoundingClientRect(),
      tooltip.getBoundingClientRect(),
      innerWidth,
    );
    setData(tooltip, 'side', place.side);
    tooltip.style.top = `${place.top}px`;
    tooltip.style.left = `${place.left}px`;
    setStyleProperty(tooltip, '--lr-ext-tooltip-arrow', `${place.arrow}px`);
    tooltip.classList.toggle(ON, true);
  }
}

/** Shows `tip` for the buttons hovered, and hides it on a press, a scroll or leaving the window. */
export function listenForTooltips(tip: Tooltip): void {
  const hide = (): void => tip.hide();
  document.addEventListener('mouseover', event => tip.hover(event), true);
  document.addEventListener('mouseout', event => {
    if (!event.relatedTarget) hide();
  });
  document.addEventListener('pointerdown', hide, true);
  document.addEventListener('scroll', hide, true);
}

export const tooltip: Feature = {
  name: 'tooltip',
  start: () => {
    const tip = new Tooltip();
    listenForTooltips(tip);
    onEveryTick('tooltip', () => tip.dropDetached());
  },
};
