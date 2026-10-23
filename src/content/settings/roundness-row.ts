import { html } from '#shared/html.ts';
import { postRoundness } from '#shared/protocol.ts';
import { queryOne } from '#shared/dom.ts';
import {
  DEFAULT_ROUNDNESS,
  ROUNDNESS_MAX,
  showRoundness,
  shownRoundness,
} from '#shared/roundness.ts';
import { message } from '#content/platform/runtime.ts';
import { buildSlider } from '#content/packs/slider-row.ts';
import { buildCardList } from './switch-list.ts';

// The setting of Lichess's Roundness, the corners of its boxes and ours: a
// card like the navigation's (navigation-row.ts) with a slider, which sets it
// as Lichess's Theme menu does, on the page as it's dragged and in the user's
// preferences (page/roundness), and follows that menu too.

function chooseRoundness(radius: number): void {
  showRoundness(radius);
  postRoundness(radius);
}

/** The card, kept in step with the page's roundness. */
export function buildRoundnessRow(): HTMLElement {
  const list =
    buildCardList(html`<div class="ln-ext-setting" data-ln-ext-setting="roundness" data-ln-ext-on="">
    <span class="ln-ext-setting__icon" aria-hidden="true"></span>
    <div class="ln-ext-setting__text">
      <h2 class="ln-ext-setting__title">${message('settingRoundness')}</h2>
      <p class="ln-ext-setting__body">${message('settingRoundnessBody')}</p>
    </div>
    <div class="ln-ext-roundness"></div>
  </div>`);
  const slider = buildSlider({
    label: message('settingRoundness'),
    setting: { read: shownRoundness, choose: chooseRoundness },
    min: 0,
    max: ROUNDNESS_MAX,
    step: 1,
    fallback: DEFAULT_ROUNDNESS,
    unit: 'px',
  });
  queryOne(list, '.ln-ext-roundness', HTMLElement)?.append(...slider.elements);
  // Lichess's own slider writes it on <html> too.
  new MutationObserver(() => slider.show(shownRoundness())).observe(document.documentElement, {
    attributeFilter: ['style'],
  });
  return list;
}
