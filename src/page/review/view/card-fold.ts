import { queryOne } from '#shared/dom.ts';
import { focusOtherChevron, storeCardFolded } from '#page/game-over/card-fold.ts';
import type { Session } from '#page/review/session.ts';

// The closed panel's card folds down to its buttons (page/game-over/card-fold.ts),
// so Lichess's analysis gets the room back: <html>'s ln-ext-review-folded class
// (view/render.ts) is the mark, which also eases the panel's row (card-fold.css).

export function foldCard(session: Session, folded: boolean): void {
  const { view, elements } = session;
  const focused = queryOne(elements.panel, '.ln-ext-end__fold:focus', HTMLElement) !== null;
  view.cardFolded = folded;
  storeCardFolded(folded);
  session.redraw();
  if (focused) focusOtherChevron(elements.panel, folded);
}
