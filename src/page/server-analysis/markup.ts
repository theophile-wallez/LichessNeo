import CloudIcon from '@hugeicons/core-free-icons/CloudIcon';
import LaptopIcon from '@hugeicons/core-free-icons/LaptopIcon';
import Settings02Icon from '@hugeicons/core-free-icons/Settings02Icon';
import { COLORS, type Color } from '#shared/chess/types.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import type { SideSummary } from './state.ts';

// The card's parts, in Lichess's own words: its request's button and its
// analysis on the device's, the analysis' progress, and once it's in, each
// side's errors as Lichess counts them, with "Learn from your mistakes".

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

const SERVER_ICON = hugeicon(CloudIcon);
const DEVICE_ICON = hugeicon(LaptopIcon);
const EDITOR_ICON = hugeicon(Settings02Icon);

export interface RequestLabels {
  readonly server: string;
  /** Lichess's analysis on the device, when it offers one. */
  readonly local: string | null;
}

/** Lichess's request, and its analysis on the device, under the labels of its own buttons. */
export function requestMarkup({ server, local }: RequestLabels): SafeHtml {
  const device =
    local === null
      ? html``
      : html`<button type="button" class="ln-ext-sanalysis__request" data-ln-ext-server="local">${DEVICE_ICON}<span>${local}</span></button>`;
  return html`<div class="ln-ext-sanalysis__requests"><button type="button" class="ln-ext-sanalysis__request" data-ln-ext-server="request">${SERVER_ICON}<span>${server}</span></button>${device}</div>`;
}

const headMarkup = (title: string, status: SafeHtml): SafeHtml =>
  html`<div class="ln-ext-sanalysis__head"><span class="ln-ext-sanalysis__title">${title}</span>${status}</div>`;

/** The cog that opens Lichess's editor again: the analysis on the device, at other settings. */
const editorMarkup = (label: string): SafeHtml =>
  html`<button type="button" class="ln-ext-sanalysis__editor" data-ln-ext-server="local" data-ln-ext-tip="${label}" aria-label="${label}">${EDITOR_ICON}</button>`;

export function runningMarkup(
  words: CardWords,
  share: number,
  percent: Intl.NumberFormat,
): SafeHtml {
  const status = html`<span class="ln-ext-sanalysis__status">${words.waiting} · ${percent.format(share)}</span>`;
  return html`${headMarkup(words.title, status)}<div class="ln-ext-sanalysis__bar"><i style="--ln-ext-share:${share.toFixed(3)}"></i></div>`;
}

/** The head once the analysis is in, with the editor's cog when Lichess offers it (its label). */
export const doneHeadMarkup = (words: CardWords, editor: string | null): SafeHtml =>
  headMarkup(words.title, editor === null ? html`` : editorMarkup(editor));

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
