import ArrowDataTransferHorizontalIcon from '@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon';
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon';
import ArrowLeft02Icon from '@hugeicons/core-free-icons/ArrowLeft02Icon';
import ArrowLeftDoubleIcon from '@hugeicons/core-free-icons/ArrowLeftDoubleIcon';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import ArrowRight02Icon from '@hugeicons/core-free-icons/ArrowRight02Icon';
import ArrowRightDoubleIcon from '@hugeicons/core-free-icons/ArrowRightDoubleIcon';
import ArrowTurnBackwardIcon from '@hugeicons/core-free-icons/ArrowTurnBackwardIcon';
import BookOpen01Icon from '@hugeicons/core-free-icons/BookOpen01Icon';
import ArrowUpRight01Icon from '@hugeicons/core-free-icons/ArrowUpRight01Icon';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import CloudCheckIcon from '@hugeicons/core-free-icons/CloudCheckIcon';
import CloudLoadingIcon from '@hugeicons/core-free-icons/CloudLoadingIcon';
import CloudUploadIcon from '@hugeicons/core-free-icons/CloudUploadIcon';
import CloudAlertIcon from '@hugeicons/core-free-icons/CloudAlertIcon';
import ComputerIcon from '@hugeicons/core-free-icons/ComputerIcon';
import FireIcon from '@hugeicons/core-free-icons/FireIcon';
import HelpCircleIcon from '@hugeicons/core-free-icons/HelpCircleIcon';
import Idea01Icon from '@hugeicons/core-free-icons/Idea01Icon';
import PauseIcon from '@hugeicons/core-free-icons/PauseIcon';
import PlayIcon from '@hugeicons/core-free-icons/PlayIcon';
import ReloadIcon from '@hugeicons/core-free-icons/ReloadIcon';
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
import Settings02Icon from '@hugeicons/core-free-icons/Settings02Icon';
import Share08Icon from '@hugeicons/core-free-icons/Share08Icon';
import StarIcon from '@hugeicons/core-free-icons/StarIcon';
import Target02Icon from '@hugeicons/core-free-icons/Target02Icon';
import Book02Icon from '@hugeicons/core-free-icons/Book02Icon';
import Calendar03Icon from '@hugeicons/core-free-icons/Calendar03Icon';
import ChessPawnIcon from '@hugeicons/core-free-icons/ChessPawnIcon';
import Compass01Icon from '@hugeicons/core-free-icons/Compass01Icon';
import CrownIcon from '@hugeicons/core-free-icons/CrownIcon';
import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
import GitBranchIcon from '@hugeicons/core-free-icons/GitBranchIcon';
import HelpSquareIcon from '@hugeicons/core-free-icons/HelpSquareIcon';
import RepeatIcon from '@hugeicons/core-free-icons/RepeatIcon';
import StopWatchIcon from '@hugeicons/core-free-icons/StopWatchIcon';
import Sword01Icon from '@hugeicons/core-free-icons/Sword01Icon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { hugeicon } from '#shared/hugeicons.ts';
import { html, type SafeHtml, trustedHtml } from '#shared/html.ts';
import { formatEval } from '#page/review/evaluation/format.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { hash } from '#page/review/coach/hash.ts';
import type { InterfaceStrings, ReviewLanguage, Ways } from '#page/review/i18n/types.ts';
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
  hint: HelpCircleIcon,
  arrow: ArrowRight02Icon,
  retry: ReloadIcon,
  book: BookOpen01Icon,
  back: ArrowTurnBackwardIcon,
  swap: ArrowDataTransferHorizontalIcon,
  computer: ComputerIcon,
  search: Search01Icon,
  fire: FireIcon,
  settings: Settings02Icon,
  cloud: CloudUploadIcon,
  cloudDone: CloudCheckIcon,
  cloudFailed: CloudAlertIcon,
  cloudBusy: CloudLoadingIcon,
  open: ArrowUpRight01Icon,
  target: Target02Icon,
  studies: Book02Icon,
  calendar: Calendar03Icon,
  games: ChessPawnIcon,
  plan: Compass01Icon,
  crown: CrownIcon,
  prune: Delete02Icon,
  branch: GitBranchIcon,
  quiz: HelpSquareIcon,
  review: RepeatIcon,
  blitz: StopWatchIcon,
  trap: Sword01Icon,
  tick: Tick02Icon,
} as const;

export type IconName = keyof typeof ICONS;

export const svgIcon = (name: IconName): SafeHtml =>
  hugeicon(ICONS[name], { className: 'ln-ext-i' });

export const BACK_ICON = hugeicon(ArrowLeft02Icon);
export const CLOSE_ICON = hugeicon(Cancel01Icon);
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

/**
 * The coach waiting for the engine, in one of its ways to say it: the same for
 * a move each time, another for the next move, the turn the game's own.
 */
export const thinkingWords = (ways: Ways, ply: number, gameId: string): string =>
  ways[(hash(gameId) + ply) % ways.length] ?? ways[0];

/** The coach waiting for the engine: the verdict's row, a spinner for its icon, lines for its comment. */
export const thinkingMarkup = (text: string): SafeHtml =>
  html`<div class="ln-ext-bubble__row"><span class="ln-ext-cls-icon ln-ext-bubble__spin" aria-hidden="true"></span>
      <p class="ln-ext-bubble__title">${text}</p></div>
    <div class="ln-ext-bubble__wait" aria-hidden="true"><span></span><span></span></div>`;
