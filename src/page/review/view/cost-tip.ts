import { closestTo } from '#shared/dom.ts';
import { MOVE_CLASSES } from '#page/review/classes/classes.ts';
import type { Session } from '#page/review/session.ts';
import { hideTip, showTip } from './tooltip.ts';

// The move list's cost bars (move-list.ts) are drawn by CSS, at the end of
// each move's cell: pointing at one names the move's class and what it gave away.

// Where review/move-list.css draws the bar, from the cell's right edge.
const BAR_RIGHT = 12;
const BAR_WIDTH = 40;
// A little room around it, so a pointer just off the bar still counts.
const SLACK = 6;

const COSTED = 'main.analyse .tview2 move[data-cdc-cost]';

function onPointer(session: Session, event: PointerEvent): void {
  const move = closestTo(event.target, COSTED, HTMLElement);
  const box = move?.getBoundingClientRect();
  const left = box ? box.right - BAR_RIGHT - BAR_WIDTH : 0;
  if (!move || !box || event.clientX < left - SLACK) {
    if (session.tipFor?.matches(COSTED)) hideTip(session);
    return;
  }
  if (session.tipFor === move) return;
  const { classLabels, ui } = session.language;
  const moveClass = MOVE_CLASSES.find(each => each === move.dataset.cdcCls);
  const cost = ui.cost(Number(move.dataset.cdcCost));
  const text = moveClass ? `${classLabels[moveClass]} · ${cost}` : cost;
  showTip(session, move, {
    text,
    anchor: { left, top: box.top + box.height / 2 - 2, width: BAR_WIDTH },
  });
}

export function watchCostTips(session: Session): void {
  document.addEventListener('pointermove', event => onPointer(session, event), { passive: true });
}
