import { html, type SafeHtml } from '#shared/html.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import { moveChip } from '#page/review/comment/markup.ts';
import type { JudgedMove, Review, Session } from '#page/review/session.ts';
import { bubbleTitle } from './markup.ts';
import { keyMoments } from './moments.ts';

// The coach's brief before the first move: the game's opening, how many key
// moments the review found and the move the game turned on. Next leads into
// the review.

const ERRORS: ReadonlySet<MoveClass> = new Set(['blunder', 'miss', 'mistake']);

/** The error that gave away the most, among the key moments; null for a game without one. */
export function turningMove(moments: readonly JudgedMove[]): JudgedMove | null {
  let turning: JudgedMove | null = null;
  for (const move of moments)
    if (ERRORS.has(move.moveClass) && move.loss > (turning?.loss ?? 0)) turning = move;
  return turning;
}

/** The move the game turned on, as its number and chip; a click goes to it, as a key moment's card does. */
const turningButton = (move: JudgedMove): SafeHtml =>
  html`<button class="lr-ext-brief__turn" data-lr-ext="moment" data-lr-ext-ply="${move.ply}"><b>${Math.ceil(move.ply / 2)}${move.ply % 2 === 1 ? '.' : '…'}</b>${moveChip(`${move.color.charAt(0)}:${move.san}`)}</button>`;

export function briefMarkup(session: Session, review: Review): SafeHtml {
  const { ui } = session.language;
  const { brief } = ui;
  const moments = keyMoments(review);
  const turning = turningMove(moments);
  const opening = session.view.openingName;
  const found =
    moments.length === 0
      ? html`${brief.calm}`
      : brief.moments(moments.length, turning && turningButton(turning));
  return html`${bubbleTitle(ui.intro)}
    <div class="lr-ext-bubble__body">
      <p class="lr-ext-bubble__sub">${opening === '' ? '' : html`${brief.opening(html`${opening}`)} `}${found}</p>
    </div>`;
}
