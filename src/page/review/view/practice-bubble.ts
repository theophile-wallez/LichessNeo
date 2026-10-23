import { html, type SafeHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { classIcon } from '#page/review/classes/icon-svg.ts';
import { isError, type MoveClass } from '#page/review/classes/classes.ts';
import { commentMarkup, streamFor, streamOn } from '#page/review/comment/markup.ts';
import { lossClass } from '#page/review/judge/judge.ts';
import { judgeAt } from '#page/review/live/judging.ts';
import type { Played } from '#page/review/practice/state.ts';
import { dubious, ratingAt, refuses } from '#page/review/practice/verdict.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';
import { avatarMarkup, takeReaction } from './coach-avatar.ts';
import { bubbleTitle, evalChip, svgIcon, thinkingMarkup, thinkingWords } from './markup.ts';
import { buttons } from './practice-buttons.ts';
import type { Card } from './practice-card.ts';
import { roundStrip, roundSum } from './practice-round-view.ts';
import { titleOf, verdictOf } from './practice-title.ts';
import type { RetryHint } from './retry-hint.ts';
import { practiceCard } from './practice-card.ts';

// The coach's card while practicing an opening: its verdict on the user's
// move, what it says of the line, typed out, and practice's buttons; over a
// round's card, the round's strip, and its sum once over.

function bubble(
  session: Session,
  card: Card,
  played: Played | null,
  moveClass: MoveClass | null,
): SafeHtml {
  const { language, stream } = session;
  const record = session.live.evals.get(card.spoken.analysis.node.fen);
  const icon = moveClass ? classIcon(moveClass) : '';
  const said = commentMarkup(card.parts, { stream: stream.state, language });
  const text =
    card.hints > 0
      ? html`<p class="ln-ext-bubble__sub ln-ext-bubble__hint">${svgIcon('hint')}<span>${said}</span></p>`
      : html`<p class="ln-ext-bubble__sub">${said}</p>`;
  const { streak } = card.spoken.practice;
  const chip =
    streak >= 2
      ? html`<span class="ln-ext-bubble__streak" data-ln-ext-tip="${language.ui.practice.streak(streak)}">${svgIcon('fire')}${streak}</span>`
      : '';
  // The engine's numbers would give a trap away; the challenge has no time for them.
  const kind = session.view.round?.kind;
  const evals = record && kind !== 'blitz' && kind !== 'trap';
  return html`<div class="ln-ext-bubble__row">${icon}
      <p class="ln-ext-bubble__title">${titleOf(card, played)}</p>${chip}
      ${evals ? html`<span class="ln-ext-bubble__evals">${evalChip(record)}</span>` : ''}</div>
    <div class="ln-ext-bubble__body">${text}</div>`;
}

/** While the explorer looks the position up, or once it has failed to. */
function lookingMarkup(session: Session, ply: number, failed: boolean): SafeHtml {
  const { ui } = session.language;
  if (!failed) return thinkingMarkup(thinkingWords(ui.thinking, ply, ''));
  return html`<p class="ln-ext-bubble__title">${ui.practice.failed}</p>`;
}

/**
 * The move on the board as its badge shows it: a book move, unless the engine
 * finds it an error, as the card says, and none on a refused move that isn't.
 */
export function practiceBoardMove(session: Session, analysis: Analysis): JudgedMove | null {
  const { practice } = session.view;
  const judged = judgeAt(session.live, analysis, analysis.path);
  if (!practice || !judged || isError(judged.moveClass)) return judged;
  const rating = ratingAt(practice, analysis, analysis.path);
  if (!rating) return judged;
  if (!practice.own && dubious(rating, judged.loss, practice.settings.lines)) {
    const moveClass = lossClass(judged.loss);
    return isError(moveClass) ? { ...judged, moveClass } : null;
  }
  return refuses(rating) ? null : { ...judged, moveClass: 'book' };
}

/** The practice square a hint gives away, rung on the board. */
export const practiceMarks = (session: Session, analysis: Analysis): RetryHint['marks'] =>
  practiceCard(session, analysis)?.hint?.marks ?? [];

const nav = (row: readonly SafeHtml[]): SafeHtml =>
  html`<div class="ln-ext-review__nav ln-ext-review__nav--practice">${row}</div>`;

/** The round's sum, once over: the coach cheers, the buttons lead on. */
function sumCoach(session: Session): SafeHtml {
  const { round } = session.view;
  if (!round) return html``;
  const { language } = session;
  const sum = roundSum(session, round);
  const parts = sum.words.map(text => ({ text, droppable: false }));
  session.stream.state = streamFor(session.stream.state, parts);
  const avatar = avatarMarkup({
    coachId: session.coach.id,
    moveClass: round.clean > round.played / 2 ? 'best' : null,
    react: takeReaction(session.coach, 'best', `sum|${round.kind}`),
    label: language.ui.coach,
    idle: 'neutral',
  });
  const words = commentMarkup(parts, { stream: session.stream.state, language });
  return html`<div class="ln-ext-coach">${avatar}<div class="ln-ext-bubble">${bubbleTitle(sum.title)}<div class="ln-ext-bubble__body"><p class="ln-ext-bubble__sub">${words}</p></div></div></div>${nav(sum.buttons)}`;
}

/** The coach's card on the line, and practice's buttons under it. */
export function practiceCoach(session: Session, analysis: Analysis, card: Card): SafeHtml {
  const { language, view } = session;
  const { round } = view;
  if (round?.over) return sumCoach(session);
  const waiting = card.status.kind === 'looking';
  const failed = waiting && Boolean(analysis.explorer?.failing);
  const { played, moveClass } = verdictOf(card);
  session.stream.state = streamOn(session.stream.state, card.parts, language);
  const content = waiting
    ? lookingMarkup(session, analysis.node.ply, failed)
    : bubble(session, card, played, moveClass);
  const avatar = avatarMarkup({
    coachId: session.coach.id,
    moveClass,
    react: takeReaction(session.coach, moveClass, played?.path ?? ''),
    label: language.ui.coach,
    idle: waiting && !failed ? 'thinking' : 'neutral',
  });
  return html`${round ? roundStrip(round) : ''}<div class="ln-ext-coach">${avatar}<div class="ln-ext-bubble ln-ext-bubble--practice">${content}</div></div>
    ${nav(buttons(card))}`;
}
