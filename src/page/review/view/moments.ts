import { queryOne } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { CLASS_COLORS, GRAPH_DOTS } from '#page/review/classes/classes.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { JudgedMove, Review } from '#page/review/session.ts';

// The game's key moments, as cards under the graph: the moves the graph marks
// (brilliant and great moves, inaccuracies, mistakes, misses, blunders), both
// sides', in order. A click goes to the move.

/** The moves worth a card, in the order they were played. */
export const keyMoments = (review: Pick<Review, 'draft'>): JudgedMove[] =>
  review.draft.flatMap(move => (move && GRAPH_DOTS.has(move.moveClass) ? [move] : []));

/** "16. h5" for White, "16… h5" for Black. */
export const moveLabel = ({ ply, san }: Pick<JudgedMove, 'ply' | 'san'>): string =>
  `${Math.ceil(ply / 2)}${ply % 2 === 1 ? '.' : '…'} ${san}`;

export function momentsMarkup(review: Review, ply: number, language: ReviewLanguage): SafeHtml {
  const cards = keyMoments(review).map(
    move =>
      html`<button class="cdc-moment${move.ply === ply ? ' cdc-moment--on' : ''}" data-cdc="moment" data-cdc-ply="${move.ply}" style="--cdc-class-color:${CLASS_COLORS[move.moveClass]}">
        <span class="cdc-moment__move">${classIcon(move.moveClass)}${moveLabel(move)}</span>
        <span class="cdc-moment__class">${language.classLabels[move.moveClass]}</span>
      </button>`,
  );
  return cards.length > 0 ? html`<div class="cdc-moments">${cards}</div>` : html``;
}

const strip = (panel: HTMLElement): HTMLElement | null =>
  queryOne(panel, '.cdc-moments', HTMLElement);

/** Where the strip was scrolled to, read before a render replaces it. */
export const momentsScroll = (panel: HTMLElement): number => strip(panel)?.scrollLeft ?? 0;

/**
 * Centers the card of the move on the board. The strip is new on every render: it starts
 * where the last one was, then glides there.
 */
export function showMoment(panel: HTMLElement, from: number): void {
  const moments = strip(panel);
  if (!moments) return;
  moments.scrollLeft = from;
  const card = queryOne(moments, '.cdc-moment--on', HTMLElement);
  if (!card) return;
  const box = moments.getBoundingClientRect();
  const cardBox = card.getBoundingClientRect();
  const left = from + cardBox.left - box.left - (box.width - cardBox.width) / 2;
  moments.scrollTo({ left, behavior: 'smooth' });
}
