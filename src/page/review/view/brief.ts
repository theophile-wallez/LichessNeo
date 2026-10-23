import { html, type SafeHtml } from '#shared/html.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import { findings, type Theme, themesOf } from '#page/review/coach/fact.ts';
import { moveChip } from '#page/review/comment/markup.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { JudgedMove, Review, Session } from '#page/review/session.ts';
import { bubbleTitle } from './markup.ts';
import { keyMoments, moveNumber } from './moments.ts';

// The coach's brief before the first move: the game's opening, how many key
// moments the review found, the move the game turned on and the tactic that
// came back in the errors. Next leads into the review.

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
  html`<button class="ln-ext-brief__turn" data-ln-ext="moment" data-ln-ext-ply="${move.ply}"><b>${moveNumber(move)}</b>${moveChip(`${move.color.charAt(0)}:${move.san}`)}</button>`;

// A tactic is a theme of the game once it comes back.
const RECURRING = 2;

/** The tactic most often behind the reader's errors, or everyone's when watching. */
function recurringTheme(review: Review, language: ReviewLanguage): SafeHtml | null {
  const { viewer } = language;
  const counts = new Map<Theme, number>();
  for (const move of review.moves) {
    if (!move || !ERRORS.has(move.moveClass) || (viewer !== null && move.color !== viewer))
      continue;
    for (const theme of new Set(themesOf(findings(move, language))))
      counts.set(theme, (counts.get(theme) ?? 0) + 1);
  }
  const [top] = [...counts].toSorted(([, first], [, second]) => second - first);
  if (!top || top[1] < RECURRING) return null;
  return language.ui.brief.theme(language.ui.themes[top[0]], top[1], viewer !== null);
}

export function briefMarkup(session: Session, review: Review): SafeHtml {
  const { ui } = session.language;
  const { brief } = ui;
  const moments = keyMoments(review);
  const turning = turningMove(moments);
  const opening = session.view.openingName;
  const theme = moments.length === 0 ? null : recurringTheme(review, session.language);
  const found =
    moments.length === 0
      ? html`${brief.calm}`
      : brief.moments(moments.length, turning && turningButton(turning));
  return html`${bubbleTitle(ui.intro)}
    <div class="ln-ext-bubble__body">
      <p class="ln-ext-bubble__sub">${opening === '' ? '' : html`${brief.opening(html`${opening}`)} `}${found}${theme ? html` ${theme}` : ''}</p>
    </div>`;
}
