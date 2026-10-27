import { setData } from '#shared/dom.ts';
import { setReviewArrows, setReviewDrawing } from '#page/board/review-arrows.ts';
import { MODES, type Session } from '#page/review/session.ts';

// The free board's coach, switched off in the settings while the board is open:
// what the review put on the page goes, and Lichess's panel shows again, as on a
// board opened with it off. Its styles all hang on <html>'s classes, so the marks
// it left on Lichess's move list show nothing. Switched on, the next render puts
// it all back.

const ROOT_CLASSES = [
  'ln-ext-review',
  ...MODES.map(mode => `ln-ext-review-${mode}`),
  'ln-ext-review-sheet',
  'ln-ext-review-folded',
  'ln-ext-evalbar-on',
  'ln-ext-opening-on',
];

export function switchOff(session: Session): void {
  const { view, elements } = session;
  if (view.switchedOff) return;
  view.switchedOff = true;
  const { panel, modes, graphBox, controls, bar, overlay, opening, tip } = elements;
  for (const element of [panel, modes, graphBox, controls, bar, overlay, opening, tip])
    element.remove();
  const root = document.documentElement;
  for (const name of ROOT_CLASSES) root.classList.toggle(name, false);
  setData(root, 'lnExtCls', null);
  setReviewArrows([]);
  setReviewDrawing([]);
  // Drawn afresh when it comes back.
  view.lastKey = '';
  view.overlay = '';
  overlay.replaceChildren();
  setData(opening, 'lnExtOpening', null);
}

export function switchOn(session: Session): void {
  if (!session.view.switchedOff) return;
  session.view.switchedOff = false;
  session.redraw(true);
}
