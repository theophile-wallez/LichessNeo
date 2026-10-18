import { closestTo, queryOne } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { RatingPickSchema, type RatingPick, type Speed } from '#content/sidebar/top-rating.ts';
import { saveSetting, type Settings } from './settings.ts';

// The setting of the rating beside the player's name in the sidebar: a card
// like the switches' (section.ts), with a menu of the speeds.

const SPEED_NAMES: Readonly<Record<Speed, string>> = {
  ultraBullet: 'speedUltraBullet',
  bullet: 'speedBullet',
  blitz: 'speedBlitz',
  rapid: 'speedRapid',
  classical: 'speedClassical',
  correspondence: 'speedCorrespondence',
};

const pickName = (pick: RatingPick): string =>
  message(pick === 'mostPlayed' ? 'ratingMostPlayed' : SPEED_NAMES[pick]);

const SELECT = '.ln-ext-setting__select';

export function ratingRowMarkup(): SafeHtml {
  const id = 'ln-ext-setting-sidebarRating';
  const options = RatingPickSchema.options.map(
    pick => html`<option value="${pick}">${pickName(pick)}</option>`,
  );
  return html`<div class="ln-ext-setting" data-ln-ext-setting="sidebarRating" data-ln-ext-on="">
    <span class="ln-ext-setting__icon" aria-hidden="true"></span>
    <div class="ln-ext-setting__text">
      <h2 class="ln-ext-setting__title" id="${id}">${message('settingSidebarRating')}</h2>
      <p class="ln-ext-setting__body">${message('settingSidebarRatingBody')}</p>
    </div>
    <select class="ln-ext-setting__select" aria-labelledby="${id}">${options}</select>
  </div>`;
}

export function showRatingRow(section: HTMLElement, settings: Settings): void {
  const select = queryOne(section, SELECT, HTMLSelectElement);
  if (select && select.value !== settings.sidebarRating) select.value = settings.sidebarRating;
}

export function onRatingChange(event: Event): void {
  const select = closestTo(event.target, SELECT, HTMLSelectElement);
  const pick = RatingPickSchema.safeParse(select?.value);
  if (pick.success) void saveSetting('sidebarRating', pick.data);
}
