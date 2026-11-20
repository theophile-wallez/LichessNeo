import DashboardSpeed02Icon from '@hugeicons/core-free-icons/DashboardSpeed02Icon';
import { queryOne, setData, setText } from '#shared/dom.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import { isFrench } from '#shared/lang.ts';
import { hueOf, tierOf } from '#shared/review-engine/options.ts';
import { engineWords } from '#shared/review-engine/words.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { reviewEngine } from '#page/review/engine/review-engine.ts';
import type { Session } from '#page/review/session.ts';
import { syncGraphViews } from './graph-views.ts';
import { gameTimes } from './timing.ts';

// The buttons over the graph's corners, in the summary and the move-by-move
// review alike: its views on the left, the engine's settings on the right.
// Both are kept across renders and put back in their slots.

/** Where a panel's markup leaves the graph's buttons. */
export const graphButtonSlots = (): SafeHtml =>
  html`<div class="ln-ext-review__views-slot"></div><div class="ln-ext-review__engine-slot"></div>`;

const shapes = new WeakMap<HTMLElement, string>();

// The ring's circle runs 100 units round, so its dash is the share in percent.
const RING = html`<svg class="ln-ext-graph-engine__ring" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" pathLength="100"></circle><circle cx="10" cy="10" r="7.5" pathLength="100" stroke-dasharray="0 100"></circle></svg>`;

/** The analysis' share done, while it runs; null once the review is whole, or failed. */
const runningShare = ({ view }: Session): number | null =>
  view.review?.complete || view.error ? null : view.progress;

/**
 * The engine's button: the depth the settings pick, in its level's hue; while
 * the game is analysed, a ring that fills and the percentage before it.
 */
export function syncEngineButton(session: Session): void {
  const button = session.elements.graphEngine;
  const open = session.view.engine;
  const { depth } = reviewEngine();
  const share = runningShare(session);
  const percent = share === null ? null : Math.floor(share * 100);
  const { title, depth: depthWord } = engineWords(isFrench());
  setData(button, 'lnExtHue', hueOf(tierOf(depth)));
  button.classList.toggle('active', open);
  if (button.getAttribute('aria-expanded') !== String(open))
    button.setAttribute('aria-expanded', String(open));
  // Drawn again when it changes shape; the ring and its percentage fill in place.
  const shape = `${percent === null} ${depth}`;
  if (shapes.get(button) !== shape) {
    shapes.set(button, shape);
    setData(button, 'lnExtTip', title);
    setHtml(
      button,
      percent === null
        ? html`${hugeicon(DashboardSpeed02Icon)}<b>${depth}</b>`
        : html`${RING}<b></b><span>· ${depth}</span>`,
    );
  }
  const label = [title, ...(percent === null ? [] : [`${percent} %`]), `${depthWord} ${depth}`];
  if (button.getAttribute('aria-label') !== label.join(' · '))
    button.setAttribute('aria-label', label.join(' · '));
  if (percent !== null) fillRing(button, percent);
}

function fillRing(button: HTMLElement, percent: number): void {
  const fill = queryOne(button, '.ln-ext-graph-engine__ring circle:last-child', SVGCircleElement);
  if (fill?.getAttribute('stroke-dasharray') !== `${percent} 100`)
    fill?.setAttribute('stroke-dasharray', `${percent} 100`);
  const text = queryOne(button, 'b', HTMLElement);
  if (text) setText(text, `${percent}%`);
}

/** Puts the graph's buttons in `root`'s slots, as the game and the view say. */
export function fillGraphButtons(session: Session, analysis: Analysis, root: HTMLElement): void {
  const { elements, view, language } = session;
  queryOne(root, '.ln-ext-review__views-slot', HTMLElement)?.replaceWith(elements.graphViews);
  queryOne(root, '.ln-ext-review__engine-slot', HTMLElement)?.replaceWith(elements.graphEngine);
  const hasTimes = gameTimes(analysis, session.work).length > 0;
  syncGraphViews(
    elements.graphViews,
    { shown: hasTimes ? view.graph : 'advantage', hasTimes },
    language.ui,
  );
  syncEngineButton(session);
}
