import { html, type SafeHtml, trustedHtml } from '#shared/html.ts';
import { formatEval } from '#page/review/evaluation/format.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { Mode } from '#page/review/session.ts';

// Markup the panel's modes share: icons, the header, the score chip.

const ICON_PATHS = {
  first: '<path d="M5 4h3v16H5zM20 4v16L9 12z"/>',
  prev: '<path d="M15.6 3.5 7.1 12l8.5 8.5 2.3-2.3-6.2-6.2 6.2-6.2z"/>',
  play: '<path d="M7 3.5v17L20.5 12z"/>',
  pause: '<path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/>',
  next: '<path d="M8.4 3.5 16.9 12l-8.5 8.5-2.3-2.3 6.2-6.2-6.2-6.2z"/>',
  last: '<path d="M16 4h3v16h-3zM4 4v16l11-8z"/>',
  star: '<path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zm0 2a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15zm0 2.2-1.6 3.6-3.9.4 2.9 2.6-.8 3.9 3.4-2 3.4 2-.8-3.9 2.9-2.6-3.9-.4z"/>',
  bulb: '<path d="M12 2a7 7 0 0 0-4 12.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26A7 7 0 0 0 12 2zM9 19.5h6V21a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z"/>',
  arrow: '<path d="M3 10.5h13.1l-5.3-5.3L13 3l9 9-9 9-2.2-2.2 5.3-5.3H3z"/>',
  retry:
    '<path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z"/>',
};

export type IconName = keyof typeof ICON_PATHS;

export const svgIcon = (name: IconName): SafeHtml =>
  html`<svg class="cdc-i" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd">${trustedHtml(ICON_PATHS[name])}</svg>`;

// Icons drawn at one size, because the font's "←" is a sliver next to its "✕".
const strokeIcon = (path: string): SafeHtml =>
  html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const BACK_ICON = strokeIcon('M19 12H5M11 5l-7 7 7 7');
const CLOSE_ICON = strokeIcon('M6 6l12 12M18 6 6 18');
export const CHEVRON_ICON = strokeIcon('M6 9l6 6 6-6');

/** The panel's header; `back` is the mode its back button returns to, null for none. */
export function header(title: string, back: Mode | null, language: ReviewLanguage): SafeHtml {
  const { ui } = language;
  const backButton =
    back === null
      ? trustedHtml('<span></span>')
      : html`<button class="cdc-review__back" data-cdc="${back}" aria-label="${ui.back}">${BACK_ICON}</button>`;
  return html`<div class="cdc-review__head">
      ${backButton}
      <div class="cdc-review__title"><span class="cdc-review__star">★</span>${title}</div>
      <button class="cdc-review__close" data-cdc="normal" data-cdc-tip="${ui.close}" aria-label="${ui.close}">${CLOSE_ICON}</button>
    </div>`;
}

function blackIsBetter(record: PositionRecord | null | undefined): boolean {
  if (!record) return false;
  // Mate 0: the side to move is mated, which only the win probability tells.
  if ('mate' in record) return record.mate < 0 || (record.mate === 0 && record.whiteWinChance < 50);
  return record.cp < 0;
}

/** The score, dark when Black is better. */
export const evalChip = (record: PositionRecord | null | undefined): SafeHtml =>
  html`<span class="cdc-bubble__eval${blackIsBetter(record) ? ' cdc-bubble__eval--black' : ''}">${formatEval(record)}</span>`;

export const bubbleTitle = (text: string): SafeHtml =>
  html`<p class="cdc-bubble__title">${text}</p>`;
