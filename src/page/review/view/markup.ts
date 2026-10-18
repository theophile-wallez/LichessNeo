import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon';
import ArrowLeft02Icon from '@hugeicons/core-free-icons/ArrowLeft02Icon';
import ArrowLeftDoubleIcon from '@hugeicons/core-free-icons/ArrowLeftDoubleIcon';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import ArrowRight02Icon from '@hugeicons/core-free-icons/ArrowRight02Icon';
import ArrowRightDoubleIcon from '@hugeicons/core-free-icons/ArrowRightDoubleIcon';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import Idea01Icon from '@hugeicons/core-free-icons/Idea01Icon';
import PauseIcon from '@hugeicons/core-free-icons/PauseIcon';
import PlayIcon from '@hugeicons/core-free-icons/PlayIcon';
import ReloadIcon from '@hugeicons/core-free-icons/ReloadIcon';
import Share08Icon from '@hugeicons/core-free-icons/Share08Icon';
import StarIcon from '@hugeicons/core-free-icons/StarIcon';
import { hugeicon } from '#shared/hugeicons.ts';
import { html, type SafeHtml, trustedHtml } from '#shared/html.ts';
import { formatEval } from '#page/review/evaluation/format.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import type { InterfaceStrings, ReviewLanguage } from '#page/review/i18n/types.ts';
import type { Mode } from '#page/review/session.ts';

// Markup the panel's modes share: icons, the header, the score chip.

const ICONS = {
  first: ArrowLeftDoubleIcon,
  prev: ArrowLeft01Icon,
  play: PlayIcon,
  pause: PauseIcon,
  next: ArrowRight01Icon,
  last: ArrowRightDoubleIcon,
  star: StarIcon,
  bulb: Idea01Icon,
  arrow: ArrowRight02Icon,
  retry: ReloadIcon,
} as const;

export type IconName = keyof typeof ICONS;

export const svgIcon = (name: IconName): SafeHtml =>
  hugeicon(ICONS[name], { className: 'ln-ext-i' });

const BACK_ICON = hugeicon(ArrowLeft02Icon);
const CLOSE_ICON = hugeicon(Cancel01Icon);
export const CHEVRON_ICON = hugeicon(ArrowDown01Icon);
const SHARE_ICON = hugeicon(Share08Icon);

/**
 * The panel's header; `back` is the mode its back button returns to, null for none. `action`
 * goes before the close button: the new game's link (view/new-game.ts).
 */
export function header(
  title: string,
  back: Mode | null,
  language: ReviewLanguage,
  action: SafeHtml | '' = '',
): SafeHtml {
  const { ui } = language;
  const backButton =
    back === null
      ? trustedHtml('<span></span>')
      : html`<button class="ln-ext-review__back" data-ln-ext="${back}" aria-label="${ui.back}">${BACK_ICON}</button>`;
  return html`<div class="ln-ext-review__head">
      ${backButton}
      <div class="ln-ext-review__title">${title}</div>
      <div class="ln-ext-review__actions">${action}<button class="ln-ext-review__close" data-ln-ext="normal" data-ln-ext-tip="${ui.close}" aria-label="${ui.close}">${CLOSE_ICON}</button></div>
    </div>`;
}

/** The header's button that opens the game's crosstable and export over the panel, or closes them. */
export const shareButton = (open: boolean, ui: InterfaceStrings): SafeHtml =>
  html`<button class="ln-ext-review__share${open ? ' active' : ''}" data-ln-ext="share" data-ln-ext-tip="${ui.share}" aria-label="${ui.share}" aria-pressed="${String(open)}">${SHARE_ICON}</button>`;

function blackIsBetter(record: PositionRecord | null | undefined): boolean {
  if (!record) return false;
  // Mate 0: the side to move is mated, which only the win probability tells.
  if ('mate' in record) return record.mate < 0 || (record.mate === 0 && record.whiteWinChance < 50);
  return record.cp < 0;
}

/** The score, dark when Black is better. */
export const evalChip = (record: PositionRecord | null | undefined): SafeHtml =>
  html`<span class="ln-ext-bubble__eval${blackIsBetter(record) ? ' ln-ext-bubble__eval--black' : ''}">${formatEval(record)}</span>`;

export const bubbleTitle = (text: string): SafeHtml =>
  html`<p class="ln-ext-bubble__title">${text}</p>`;

/** The coach waiting for the engine: the verdict's row, a spinner for its icon, lines for its comment. */
export const thinkingMarkup = (text: string): SafeHtml =>
  html`<div class="ln-ext-bubble__row"><span class="ln-ext-cls-icon ln-ext-bubble__spin" aria-hidden="true"></span>
      <p class="ln-ext-bubble__title">${text}</p></div>
    <div class="ln-ext-bubble__wait" aria-hidden="true"><span></span><span></span></div>`;
