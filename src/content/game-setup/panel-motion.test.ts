import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { syncPanelMotion } from './panel-motion.ts';
import { syncPicks } from './picks.ts';

// Heights the layout would give each panel: happy-dom lays nothing out.
const UNLIMITED = 112;
const REAL_TIME = 302;
const SIDE = 96;

const tabs = (active: number): string =>
  '<div class="tabs-horiz">' +
  ['Unlimited', 'Real time', 'Correspondence']
    .map((name, i) => `<button${i === active ? ' class="active"' : ''}>${name}</button>`)
    .join('') +
  '</div>';

const TIME = {
  unlimited: `${tabs(0)}<div class="time-panel">Take all the time you need</div>`,
  realTime:
    `${tabs(1)}<div class="time-panel"><div class="sliders-grid"></div>` +
    '<div class="presets"><button class="preset-btn">3+2</button></div></div>',
};

const SIDES =
  '<div class="config-group"><div class="label">Side</div><group class="radio color-picker color-cards">' +
  '<div><input id="color-white" name="color" type="radio" value="white" checked>' +
  '<label for="color-white"><span class="text">White</span></label></div></group></div>';

const find = (selector: string): HTMLElement => {
  const found = queryOne(document, selector, HTMLElement);
  if (!found) throw new Error(`no ${selector}`);
  return found;
};

const time = (): HTMLElement => find('.time-control-tabs');
const side = (): HTMLElement => find('[data-ln-ext-setup-part="side"]');

function heightOf(element: Element): number {
  if (element.matches('[data-ln-ext-setup-part="side"]')) return SIDE;
  if (!element.matches('.time-control-tabs')) return 0;
  return element.querySelector('.sliders-grid') ? REAL_TIME : UNLIMITED;
}

/** Lichess draws the time control anew in place, as a tab is picked. */
function pickTab(markup: string): void {
  time().innerHTML = markup;
  syncPicks();
  syncPanelMotion();
}

const keyframes = (element: Element): string[][] =>
  element.getAnimations().map(animation => {
    const effect = animation.effect;
    if (!(effect instanceof KeyframeEffect)) return [];
    return effect.getKeyframes().map(frame => String(frame['height'] ?? frame['opacity']));
  });

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return new DOMRect(0, 0, 500, heightOf(this));
  });
  document.body.innerHTML =
    '<dialog open><div class="game-setup"><div class="setup-content">' +
    `<div class="config-group time-control-tabs">${TIME.unlimited}</div>${SIDES}` +
    '</div></div></dialog>';
  syncPicks();
  syncPanelMotion();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('the panel under the setup’s tiles', () => {
  it('stays still as the setup opens', () => {
    expect(time().getAnimations()).toEqual([]);
    expect(time().dataset.lnExtResizing).toBeUndefined();
  });

  it('eases to a new tab’s height, its content fading in', () => {
    pickTab(TIME.realTime);
    expect(keyframes(time())).toEqual([[`${UNLIMITED}px`, `${REAL_TIME}px`]]);
    expect(time().dataset.lnExtResizing).toBe('');
    expect(keyframes(find('.time-panel'))).toEqual([['0', '1']]);
    expect(keyframes(find('.tabs-horiz'))).toEqual([]);
  });

  it('leaves the panel its own height once there', () => {
    pickTab(TIME.realTime);
    for (const animation of time().getAnimations()) animation.finish();
    expect(time().dataset.lnExtResizing).toBeUndefined();
    expect(time().style.height).toBe('');
  });

  it('starts the next change from where the last one came to rest', () => {
    pickTab(TIME.realTime);
    for (const animation of time().getAnimations()) animation.finish();
    syncPanelMotion();
    pickTab(TIME.unlimited);
    expect(keyframes(time())).toEqual([[`${REAL_TIME}px`, `${UNLIMITED}px`]]);
  });

  it('eases from the time control to the side, all of it fading in', () => {
    find('.ln-ext-setup__tile[data-ln-ext-part="side"]').click();
    syncPicks();
    syncPanelMotion();
    expect(keyframes(side())).toEqual([[`${UNLIMITED}px`, `${SIDE}px`]]);
    expect(keyframes(find('group.color-picker'))).toEqual([['0', '1']]);
  });

  it('stays still as the same tab draws anew', () => {
    pickTab(TIME.unlimited);
    expect(time().getAnimations()).toEqual([]);
  });
});
