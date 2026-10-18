import type { Color } from '#shared/chess/types.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import {
  CLASS_COLORS,
  MOVE_CLASSES,
  type MoveClass,
  SUMMARY_ROWS,
} from '#page/review/classes/classes.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { Review } from '#page/review/session.ts';
import { CHEVRON_ICON } from './markup.ts';

// The summary's moves: a row per class, its icon and name, a bar the two
// sides share in their colors, and each side's count, which goes to its moves.

export interface MovesInput {
  readonly review: Review | null;
  readonly allRows: boolean;
  readonly language: ReviewLanguage;
  /** The sides from left to right, as their cards are. */
  readonly order: readonly Color[];
}

// A count goes to its moves once they're all judged at full depth: until
// then it's the draft's, which may not match the moves it would go to.
function count({ review, language }: MovesInput, color: Color, moveClass: MoveClass): SafeHtml {
  const value = review?.counts[color][moveClass] ?? 0;
  const tip = language.countTip(color, moveClass, value);
  const shown =
    review?.complete && value > 0
      ? html`<button class="ln-ext-t-jump" data-ln-ext="jump" data-ln-ext-color="${color}" data-ln-ext-class="${moveClass}" aria-label="${tip}">${value}</button>`
      : value;
  return html`<span class="ln-ext-t-num ${sideClass(color)}">${shown}</span>`;
}

const sideClass = (color: Color): string => `ln-ext-side-${color === 'white' ? 'w' : 'b'}`;

function row(input: MovesInput, moveClass: MoveClass): SafeHtml {
  const { review, order, language } = input;
  const valueOf = (color: Color): number => review?.counts[color][moveClass] ?? 0;
  const none = valueOf('white') + valueOf('black') === 0;
  // Shares of the bar; an empty row keeps an even, faint track.
  const parts = order.map(
    color =>
      html`<span class="${sideClass(color)}" style="flex:${none ? 1 : valueOf(color)}"></span>`,
  );
  const [left = 'white', right = 'black'] = order;
  return html`<div class="ln-ext-sum-move${none ? ' ln-ext-sum-move--none' : ''}" style="--ln-ext-class-color:${CLASS_COLORS[moveClass]}">
      ${classIcon(moveClass)}
      <span class="ln-ext-sum-move__label">${language.classLabels[moveClass]}</span>
      <span class="ln-ext-sum-split">${parts}</span>
      <span class="ln-ext-sum-move__counts">${count(input, left, moveClass)}<i>·</i>${count(input, right, moveClass)}</span>
    </div>`;
}

function shownClasses({ review, allRows }: MovesInput): MoveClass[] {
  const brilliant =
    (review?.counts.white.brilliant ?? 0) > 0 || (review?.counts.black.brilliant ?? 0) > 0;
  return MOVE_CLASSES.filter(
    moveClass => allRows || SUMMARY_ROWS.has(moveClass) || (moveClass === 'brilliant' && brilliant),
  );
}

export function movesMarkup(input: MovesInput): SafeHtml {
  const { review, allRows, language } = input;
  const loading = !review?.complete;
  const label = allRows ? language.ui.less : language.ui.more;
  return html`<h2 class="ln-ext-sum-h">${language.ui.moves}</h2>
    <div class="ln-ext-sum-moves${loading ? ' ln-ext-sum-moves--loading' : ''}">
      ${shownClasses(input).map(moveClass => row(input, moveClass))}
      <button class="ln-ext-review__more${allRows ? ' ln-ext-review__more--open' : ''}" data-ln-ext="rows" data-ln-ext-tip="${label}" aria-label="${label}" aria-expanded="${String(allRows)}">${CHEVRON_ICON}</button>
    </div>`;
}
