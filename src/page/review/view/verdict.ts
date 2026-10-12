import { html, type SafeHtml } from '#shared/html.ts';
import { isError } from '#page/review/classes/classes.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import {
  type ClockNote,
  clockNote,
  clockSentence,
  type MoveTiming,
  spentTime,
} from '#page/review/coach/clock.ts';
import type { CoachContext } from '#page/review/coach/context.ts';
import { explanation } from '#page/review/coach/explanation.ts';
import { findings, type Theme, themesOf } from '#page/review/coach/fact.ts';
import { type CommentPart, commentMarkup, streamFor } from '#page/review/comment/markup.ts';
import { verdictTitle } from '#page/review/comment/title.ts';
import { forColor } from '#page/review/evaluation/score.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';
import { evalChip } from './markup.ts';

// The bubble for a judged move: its icon, the verdict and how the score
// moved, then the coach's comment, typed out, and the tags: the tactic, the
// chances an error gave away. The move's time is the card's (`timeTag`), the
// coach's advice on it in its tooltip.

const coachContext = (session: Session, gameId: string): CoachContext => ({
  gameId,
  coach: session.coach.id,
  language: session.language,
});

/**
 * A book move's opening: its own, or else the game's, named on the move that
 * reaches it. The export names only the game's last book position.
 */
export const openingOf = (session: Session, move: JudgedMove): string =>
  move.opening ?? (move.ply === session.work.bookPly ? session.view.openingName : '');

export interface VerdictInput {
  readonly move: JudgedMove;
  readonly gameId: string;
  /** Explain's sentences, in place of the comment; none for the comment. */
  readonly hint: readonly CommentPart[];
  /** The move's time, for a game's move with clocks. */
  readonly timing: MoveTiming | null;
}

/** A judged move, and what the coach says of it. */
export interface CoachComment {
  readonly move: JudgedMove;
  readonly parts: readonly CommentPart[];
  readonly themes: readonly Theme[];
  readonly timing: MoveTiming | null;
  /** What the coach makes of the move's time, in the time's tooltip. */
  readonly advice: Advice | null;
}

export interface Advice {
  readonly note: ClockNote;
  readonly text: string;
}

/** The coach's comment on a move, or Explain's hint in its place. */
export function commentOn(session: Session, input: VerdictInput): CoachComment {
  const { move, gameId, hint, timing } = input;
  const { language } = session;
  const themes = themesOf(findings(move, language.facts));
  const note = timing && clockNote(move.moveClass, timing);
  const advice =
    timing && note
      ? { note, text: clockSentence({ note, timing, mover: move.color }, language.ui.clock) }
      : null;
  const parts =
    hint.length > 0
      ? hint
      : explanation(move, coachContext(session, gameId), openingOf(session, move));
  return { move, parts, themes, timing, advice };
}

/** Keeps the typing going through the renders of one comment; a new comment starts it over. */
export function followComment(session: Session, { parts }: CoachComment): void {
  session.stream.state = streamFor(session.stream.state, parts);
}

/** The share of the mover's winning chances an error gave away, rounded. */
function chancesLost(move: JudgedMove): number {
  const before = forColor(move.before.whiteWinChance, move.color);
  const after = forColor(move.after.whiteWinChance, move.color);
  return Math.round(before - after);
}

/** The move's time, which the card shows over the coach's head; none without clocks. */
export function timeTag(session: Session, { timing, advice }: CoachComment): SafeHtml | '' {
  if (!timing) return '';
  const { ui, typography } = session.language;
  const spent = spentTime(timing.spent, ui.clock);
  if (!advice) return html`<span class="lr-ext-tag lr-ext-tag--time">${spent}</span>`;
  return html`<span class="lr-ext-tag lr-ext-tag--time lr-ext-tag--${advice.note}" data-lr-ext-tip="${typography(advice.text)}">${spent}</span>`;
}

function tagsMarkup(session: Session, { move, themes }: CoachComment): SafeHtml {
  const { ui } = session.language;
  const tags = themes.map(
    theme => html`<span class="lr-ext-tag lr-ext-tag--${theme}">${ui.themes[theme]}</span>`,
  );
  // A verdict from mate distances isn't about winning chances, which stay the same.
  const lost = isError(move.moveClass) && !move.slower ? chancesLost(move) : 0;
  if (lost > 0) tags.push(html`<span class="lr-ext-tag lr-ext-tag--cost">${ui.cost(lost)}</span>`);
  return tags.length > 0 ? html`<div class="lr-ext-bubble__tags">${tags}</div>` : html``;
}

/** How the score moved: before, then after the move. */
const scoreChange = (move: JudgedMove): SafeHtml =>
  html`<span class="lr-ext-bubble__evals">${evalChip(move.before)}<span class="lr-ext-bubble__to">→</span>${evalChip(move.after)}</span>`;

/**
 * The verdict's bubble, its comment typed out as far as the typing has got.
 * The verdict stays on top; the comment, its tags and `actions` scroll under it.
 */
export function verdictMarkup(
  session: Session,
  comment: CoachComment,
  actions: SafeHtml = html``,
): SafeHtml {
  const { language, stream } = session;
  const { move, parts } = comment;
  const said = commentMarkup(parts, { stream: stream.state, language });
  return html`<div class="lr-ext-bubble__row">${classIcon(move.moveClass)}
      <p class="lr-ext-bubble__title">${verdictTitle(move.moveClass, move.san, language)}</p>
      ${scoreChange(move)}</div>
    <div class="lr-ext-bubble__body"><p class="lr-ext-bubble__sub">${said}</p>
      ${tagsMarkup(session, comment)}${actions}</div>`;
}
