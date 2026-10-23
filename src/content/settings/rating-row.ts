import StarIcon from '@hugeicons/core-free-icons/StarIcon';
import ViewOffSlashIcon from '@hugeicons/core-free-icons/ViewOffSlashIcon';
import { gameRatingColor } from '#shared/charts/colors.ts';
import { closestTo, queryOne } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { message } from '#content/platform/runtime.ts';
import { RatingPickSchema, type RatingPick, type Speed } from '#content/sidebar/top-rating.ts';
import { currentSettings, onSettings, saveSetting, type Settings } from './settings.ts';
import { buildCardList } from './switch-list.ts';

// The setting of the rating beside the player's name in the sidebar: a card
// like the switches' (section.ts), with a menu of the speeds, each with its
// glyph in its rating's color (styles/pages/setting-menu.css).

const SPEED_NAMES: Readonly<Record<Speed, string>> = {
  ultraBullet: 'speedUltraBullet',
  bullet: 'speedBullet',
  blitz: 'speedBlitz',
  rapid: 'speedRapid',
  classical: 'speedClassical',
  correspondence: 'speedCorrespondence',
};

function pickName(pick: RatingPick): string {
  if (pick === 'mostPlayed') return message('ratingMostPlayed');
  return message(pick === 'hidden' ? 'ratingHidden' : SPEED_NAMES[pick]);
}

// Chrome's customizable select draws an option's icon, and the picked one's in its button
// (`selectedcontent`); other browsers show the names alone.
function pickIcon(pick: RatingPick): SafeHtml {
  if (pick === 'hidden' || pick === 'mostPlayed') {
    const icon = hugeicon(pick === 'hidden' ? ViewOffSlashIcon : StarIcon);
    return html`<span class="ln-ext-setting__option-icon" data-ln-ext-pick="${pick}">${icon}</span>`;
  }
  const color = `--ln-ext-speed-color: ${gameRatingColor(pick)}`;
  return html`<span class="ln-ext-setting__option-icon" data-ln-ext-speed="${pick}" style="${color}"></span>`;
}

const SELECT = "[data-ln-ext-setting='sidebarRating'] .ln-ext-setting__select";

function ratingRowMarkup(): SafeHtml {
  const id = 'ln-ext-setting-sidebarRating';
  const options = RatingPickSchema.options.map(
    pick => html`<option value="${pick}">${pickIcon(pick)}<span>${pickName(pick)}</span></option>`,
  );
  return html`<div class="ln-ext-setting" data-ln-ext-setting="sidebarRating" data-ln-ext-on="">
    <span class="ln-ext-setting__icon" aria-hidden="true"></span>
    <div class="ln-ext-setting__text">
      <h2 class="ln-ext-setting__title" id="${id}">${message('settingSidebarRating')}</h2>
      <p class="ln-ext-setting__body">${message('settingSidebarRatingBody')}</p>
    </div>
    <select class="ln-ext-setting__select" aria-labelledby="${id}">
      <button type="button"><selectedcontent></selectedcontent></button>
      ${options}
    </select>
  </div>`;
}

function showRatingRow(section: HTMLElement, settings: Settings): void {
  const select = queryOne(section, SELECT, HTMLSelectElement);
  if (select && select.value !== settings.sidebarRating) select.value = settings.sidebarRating;
}

function onRatingChange(event: Event): void {
  const select = closestTo(event.target, SELECT, HTMLSelectElement);
  const pick = RatingPickSchema.safeParse(select?.value);
  if (pick.success) void saveSetting('sidebarRating', pick.data);
}

/** The card, kept in step with the settings. */
export function buildRatingRow(): HTMLElement {
  const list = buildCardList(ratingRowMarkup());
  list.addEventListener('change', onRatingChange);
  showRatingRow(list, currentSettings());
  onSettings(settings => showRatingRow(list, settings));
  return list;
}
