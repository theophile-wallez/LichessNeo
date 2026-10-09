import type { Color } from '#shared/chess/types.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { gameOverTexts } from '#page/game-over/texts.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import { moveChip } from '#page/review/comment/markup.ts';
import type { JudgedMove, Review, Session } from '#page/review/session.ts';
import { bubbleTitle } from './markup.ts';
import { keyMoments } from './moments.ts';

// The coach's brief before the first move: the game's opening, how many key
// moments the review found and the move the game turned on, then the errors
// of the side at the board's bottom (the viewer's, if they played) and the way
// into the review.

const ERRORS: readonly MoveClass[] = ['blunder', 'miss', 'mistake'];

/** The error that gave away the most, among the key moments; null for a game without one. */
export function turningMove(moments: readonly JudgedMove[]): JudgedMove | null {
  let turning: JudgedMove | null = null;
  for (const move of moments)
    if (ERRORS.includes(move.moveClass) && move.loss > (turning?.loss ?? 0)) turning = move;
  return turning;
}

const moveName = (move: JudgedMove): SafeHtml =>
  html`<b>${Math.ceil(move.ply / 2)}${move.ply % 2 === 1 ? '.' : '…'}</b>${moveChip(`${move.color.charAt(0)}:${move.san}`)}`;

function errorChips(review: Review, color: Color): SafeHtml[] {
  const counts = review.counts[color];
  const texts = gameOverTexts();
  return ERRORS.flatMap(moveClass => {
    const count = counts[moveClass] ?? 0;
    return count > 0
      ? [
          html`<span class="lr-ext-brief__chip">${classIcon(moveClass)}<b>${count}</b>${texts.countLabel(moveClass, count)}</span>`,
        ]
      : [];
  });
}

export function briefMarkup(session: Session, analysis: Analysis, review: Review): SafeHtml {
  const { ui } = session.language;
  const { brief } = ui;
  const moments = keyMoments(review);
  const turning = turningMove(moments);
  const opening = session.view.openingName;
  const found =
    moments.length === 0
      ? html`${brief.calm}`
      : brief.moments(moments.length, turning && moveName(turning));
  const color = analysis.viewerColor() ?? analysis.orientation();
  return html`${bubbleTitle(ui.intro)}
    <div class="lr-ext-bubble__body">
      <p class="lr-ext-bubble__sub">${opening === '' ? '' : html`${brief.opening(html`${opening}`)} `}${found}</p>
      <div class="lr-ext-brief">${errorChips(review, color)}<button class="lr-ext-btn lr-ext-btn--green lr-ext-brief__start" data-lr-ext="next">${brief.start} →</button></div>
    </div>`;
}
