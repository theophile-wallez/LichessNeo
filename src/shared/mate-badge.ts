import CrownIcon from '@hugeicons/core-free-icons/CrownIcon';
import HashtagIcon from '@hugeicons/core-free-icons/HashtagIcon';
import type { BoardCell } from './chess/squares.ts';
import { html, type SafeHtml } from './html.ts';
import { hugeicon } from './hugeicons.ts';

// A checkmate on a board (styles/board/mate.css): the mated king's crown flies
// to the piece that gave the mate, and a red "#" takes its place on the king.
// Drawn in a layer the board's size, by the analysis board and the game over.

const CROWN = hugeicon(CrownIcon);
const HASHTAG = hugeicon(HashtagIcon);

export interface MateBadge {
  readonly king: BoardCell;
  /** Where the crown lands: null, with no piece giving the mate, draws no crown. */
  readonly by: BoardCell | null;
  /** "Checkmate", in the page's language, for screen readers. */
  readonly label: string;
}

export function mateBadgeMarkup({ king, by, label }: MateBadge): SafeHtml {
  const crown = by
    ? html`<span class="ln-ext-mate__crown" style="--ln-ext-by-column:${by.column};--ln-ext-by-row:${by.row}">${CROWN}</span>`
    : null;
  return html`<div class="ln-ext-mate" style="--ln-ext-king-column:${king.column};--ln-ext-king-row:${king.row}">${crown}<span class="ln-ext-mate__pip" role="img" aria-label="${label}">${HASHTAG}</span></div>`;
}
