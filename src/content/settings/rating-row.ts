import StarIcon from '@hugeicons/core-free-icons/StarIcon';
import ViewOffSlashIcon from '@hugeicons/core-free-icons/ViewOffSlashIcon';
import { gameRatingColor } from '#shared/charts/colors.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { message } from '#content/platform/runtime.ts';
import { RatingPickSchema, type RatingPick, type Speed } from '#content/sidebar/top-rating.ts';
import { buildSelectRow } from './select-row.ts';

// The setting of the rating beside the player's name in the sidebar: a menu
// of the speeds (select-row.ts), each with its glyph in its rating's color.

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

function pickIcon(pick: RatingPick): SafeHtml {
  if (pick === 'hidden' || pick === 'mostPlayed') {
    const icon = hugeicon(pick === 'hidden' ? ViewOffSlashIcon : StarIcon);
    return html`<span class="ln-ext-setting__option-icon" data-ln-ext-pick="${pick}">${icon}</span>`;
  }
  const color = `--ln-ext-speed-color: ${gameRatingColor(pick)}`;
  return html`<span class="ln-ext-setting__option-icon" data-ln-ext-speed="${pick}" style="${color}"></span>`;
}

/** The card, kept in step with the settings. */
export const buildRatingRow = (): HTMLElement =>
  buildSelectRow({
    key: 'sidebarRating',
    title: message('settingSidebarRating'),
    body: message('settingSidebarRatingBody'),
    options: RatingPickSchema.options.map(pick => ({
      value: pick,
      label: pickName(pick),
      icon: pickIcon(pick),
    })),
  });
