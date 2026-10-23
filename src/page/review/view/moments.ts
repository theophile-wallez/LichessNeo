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

/**
 * "16." for White, "16…" for Black, as Lichess numbers the move: from its
 * position's ply, which a game from a position doesn't start at 0.
 */
export function moveNumber({ position }: Pick<JudgedMove, 'position'>): string {
  const { ply } = position;
  return `${Math.ceil(ply / 2)}${ply % 2 === 1 ? '.' : '…'}`;
}

/**
 * The cards, the same whatever the move on the board, so a render keeps the strip (`showMoment`
 * marks the move's). The strip is drawn even with nothing in it yet: it holds its row's room
 * (`--ln-ext-review-moments`), so the coach below doesn't slide down as the cards come in.
 */
export function momentsMarkup(review: Review | null, language: ReviewLanguage): SafeHtml {
  const cards = keyMoments(review).map(
    move =>
      html`<button class="ln-ext-moment" data-ln-ext="moment" data-ln-ext-ply="${move.ply}" style="--ln-ext-class-color:${CLASS_COLORS[move.moveClass]}">
        <span class="ln-ext-moment__move">${classIcon(move.moveClass)}${moveNumber(move)} ${move.san}</span>
        <span class="ln-ext-moment__class">${language.classLabels[move.moveClass]}</span>
      </button>`,
  );
  return html`<div class="ln-ext-moments">${cards}</div>`;
}

const strip = (panel: HTMLElement): HTMLElement | null =>
  queryOne(panel, '.ln-ext-moments', HTMLElement);

// Per panel: the strip on show, where it was last scrolled to (off its scroll
// events, not its layout), and the card last centered.
interface StripState {
  strip: HTMLElement | null;
  left: number;
  centered: string | null;
}

const strips = new WeakMap<HTMLElement, StripState>();

function stateOf(panel: HTMLElement): StripState {
  const known = strips.get(panel);
  if (known) return known;
  const state: StripState = { strip: null, left: 0, centered: null };
  strips.set(panel, state);
  return state;
}

/** Glides the strip to center `card`, read in the next frame, when the browser lays the panel out. */
function center(moments: HTMLElement, card: HTMLElement): void {
  requestAnimationFrame(() => {
    if (!card.isConnected) return;
    const box = moments.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const left = moments.scrollLeft + cardBox.left - box.left - (box.width - cardBox.width) / 2;
    moments.scrollTo({ left, behavior: 'smooth' });
  });
}

/**
 * Marks the card of the move on the board, and centers it once it changes. A
 * strip drawn anew starts where the last one was, then glides there. Nothing
 * here reads the layout the render just changed: a step costs no layout of its own.
 */
export function showMoment(panel: HTMLElement, ply: number): void {
  const moments = strip(panel);
  if (!moments) return;
  const state = stateOf(panel);
  const fresh = state.strip !== moments;
  if (fresh) {
    state.strip = moments;
    moments.scrollLeft = state.left;
    moments.addEventListener('scroll', () => (state.left = moments.scrollLeft), { passive: true });
  }
  let card: HTMLElement | null = null;
  for (const each of queryAll(moments, '.ln-ext-moment', HTMLElement)) {
    const on = each.dataset.lnExtPly === String(ply);
    each.classList.toggle('ln-ext-moment--on', on);
    if (on) card = each;
  }
  const centered = card?.dataset.lnExtPly ?? null;
  if (card && (fresh || centered !== state.centered)) center(moments, card);
  state.centered = centered;
}
