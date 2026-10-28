import AnalyticsUpIcon from '@hugeicons/core-free-icons/AnalyticsUpIcon';
import { COLORS, type Color } from '#shared/chess/types.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import type { SideSummary } from './state.ts';

// The card's parts, in Lichess's own words: its request's button, the
// analysis' progress, and once it's in, each side's errors as Lichess counts
// them, with "Learn from your mistakes".

export interface CardWords {
  readonly title: string;
  readonly waiting: string;
  readonly accuracy: string;
  readonly acpl: string;
  readonly inaccuracy: string;
  readonly mistake: string;
  readonly blunder: string;
  readonly learn: string;
}

const ICON = hugeicon(AnalyticsUpIcon);

/** Lichess's request, under the label of its own button. */
export const requestMarkup = (label: string): SafeHtml =>
  html`<button type="button" class="ln-ext-sanalysis__request" data-ln-ext-server="request">${ICON}<span>${label}</span></button>`;

const headMarkup = (title: string, status: SafeHtml): SafeHtml =>
  html`<div class="ln-ext-sanalysis__head"><span class="ln-ext-sanalysis__title">${title}</span>${status}</div>`;

export function runningMarkup(
  words: CardWords,
  share: number,
  percent: Intl.NumberFormat,
): SafeHtml {
  const status = html`<span class="ln-ext-sanalysis__status">${words.waiting} · ${percent.format(share)}</span>`;
  return html`${headMarkup(words.title, status)}<div class="ln-ext-sanalysis__bar"><i style="--ln-ext-share:${share.toFixed(3)}"></i></div>`;
}

export const doneHeadMarkup = (words: CardWords): SafeHtml => headMarkup(words.title, html``);

const ERRORS = [
  ['inaccuracy', '?!'],
  ['mistake', '?'],
  ['blunder', '??'],
] as const;

function sideMarkup(color: Color, name: string, side: SideSummary, words: CardWords): SafeHtml {
  const counts = ERRORS.map(
    ([error, glyph]) =>
      html`<span class="ln-ext-sanalysis__count ln-ext-sanalysis__count--${error}${side[error] === 0 ? ' ln-ext-sanalysis__count--none' : ''}" data-ln-ext-tip="${words[error]}" aria-label="${words[error]}: ${side[error]}">${side[error]}<b>${glyph}</b></span>`,
  );
  const accuracy =
    side.accuracy === undefined
      ? html``
      : html`<span class="ln-ext-sanalysis__accuracy" data-ln-ext-tip="${words.accuracy}">${side.accuracy}%</span>`;
  return html`<div class="ln-ext-sanalysis__side"><span class="ln-ext-sanalysis__player"><i class="ln-ext-sanalysis__dot ln-ext-sanalysis__dot--${color}"></i><span class="ln-ext-sanalysis__name">${name}</span></span>${accuracy}${counts}<span class="ln-ext-sanalysis__acpl" data-ln-ext-tip="${words.acpl}">${side.acpl}</span></div>`;
}

export interface SummaryInput {
  readonly sides: Readonly<Record<Color, SideSummary>>;
  readonly names: Readonly<Record<Color, string>>;
  readonly words: CardWords;
}

/** Each side's errors, White's first, then the exercise on them. */
export function summaryMarkup({ sides, names, words }: SummaryInput): SafeHtml {
  const rows = COLORS.map(color => sideMarkup(color, names[color], sides[color], words));
  return html`<div class="ln-ext-sanalysis__sides">${rows}</div><button type="button" class="ln-ext-sanalysis__learn" data-ln-ext-server="learn">${words.learn}</button>`;
}
