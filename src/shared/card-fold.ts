// The game over's card folds down to its buttons (page/game-over/card-fold.ts): on
// the game's page `main` carries the mark, on its analysis <html> does
// (page/review/view/render.ts).

/** The box a folded card hides its coach in. */
export const FOLDED_CARD =
  ':is(html.ln-ext-review-folded, main[data-ln-ext-card-folded]) .ln-ext-end__top';

/** The chevron that brings the card back. */
export const UNFOLD_CHEVRON = '.ln-ext-end__fold--unfold';
