import { queryAll, queryOne } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { CLASS_COLORS, GRAPH_DOTS } from '#page/review/classes/classes.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { JudgedMove, Review } from '#page/review/session.ts';

// The game's key moments, as cards under the graph: the moves the graph marks
// (brilliant and great moves, inaccuracies, mistakes, misses, blunders), both
// sides', in order. A click goes to the move.

/** The moves worth a card, in the order they were played. */
export const keyMoments = (review: Pick<Review, 'draft'> | null): JudgedMove[] =>
  review?.draft.flatMap(move => (move && GRAPH_DOTS.has(move.moveClass) ? [move] : [])) ?? [];

/** "16. h5" for White, "16… h5" for Black. */
const moveLabel = ({ ply, san }: Pick<JudgedMove, 'ply' | 'san'>): string =>
  `${Math.ceil(ply / 2)}${ply % 2 === 1 ? '.' : '…'} ${san}`;

/**
 * The cards, the same whatever the move on the board, so a render keeps the strip (`showMoment`
 * marks the move's). The strip is drawn even with nothing in it yet: it holds its row's room
 * (`--ln-ext-review-moments`), so the coach below doesn't slide down as the cards come in.
 */
export function momentsMarkup(review: Review | null, language: ReviewLanguage): SafeHtml {
  const cards = keyMoments(review).map(
    move =>
      html`<button class="ln-ext-moment" data-ln-ext="moment" data-ln-ext-ply="${move.ply}" style="--ln-ext-class-color:${CLASS_COLORS[move.moveClass]}">
        <span class="ln-ext-moment__move">${classIcon(move.moveClass)}${moveLabel(move)}</span>
        <span class="ln-ext-moment__class">${language.classLabels[move.moveClass]}</span>
      </button>`,
  );
  return html`<div class="ln-ext-moments">${cards}</div>`;
}

const strip = (panel: HTMLElement): HTMLElement | null =>
  queryOne(panel, '.ln-ext-moments', HTMLElement);

/** Where the strip was scrolled to, read before a render replaces it. */
export const momentsScroll = (panel: HTMLElement): number => strip(panel)?.scrollLeft ?? 0;

/**
 * Marks the card of the move on the board, and centers it. A strip drawn
 * anew starts where the last one was, then glides there.
 */
export function showMoment(panel: HTMLElement, ply: number, from: number): void {
  const moments = strip(panel);
  if (!moments) return;
  let card: HTMLElement | null = null;
  for (const each of queryAll(moments, '.ln-ext-moment', HTMLElement)) {
    const on = each.dataset.lnExtPly === String(ply);
    each.classList.toggle('ln-ext-moment--on', on);
    if (on) card = each;
  }
  if (moments.scrollLeft !== from) moments.scrollLeft = from;
  if (!card) return;
  const box = moments.getBoundingClientRect();
  const cardBox = card.getBoundingClientRect();
  const left = from + cardBox.left - box.left - (box.width - cardBox.width) / 2;
  moments.scrollTo({ left, behavior: 'smooth' });
}
