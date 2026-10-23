import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { BOOK_PLIES, judgeAt } from '#page/review/live/judging.ts';
import type { Session } from '#page/review/session.ts';
import { avatarMarkup, takeReaction } from './coach-avatar.ts';
import { bubbleTitle, svgIcon, thinkingMarkup, thinkingWords } from './markup.ts';
import { canPractice } from './practice.ts';
import { type CoachComment, commentOn, followComment, verdictMarkup } from './verdict.ts';

// The free analysis board: the coach judges the move on the board, over
// Lichess's own engine lines and move list, and offers to practice the
// opening from there, on the practice page (view/openings-page.ts).

/** The practice page's button, while the board is in the opening: none where practice can't run. */
function practiceButton(session: Session, analysis: Analysis): SafeHtml | null {
  if (!canPractice(analysis) || analysis.node.ply >= BOOK_PLIES) return null;
  return html`<div class="ln-ext-bubble__actions"><button class="ln-ext-bubble__line ln-ext-bubble__practice" data-ln-ext="openings">${svgIcon('book')}${session.language.ui.practice.start}</button></div>`;
}

function liveBubble(session: Session, analysis: Analysis, comment: CoachComment | null): SafeHtml {
  const { live, language } = session;
  if (live.error) return bubbleTitle(live.error);
  if (!analysis.path) {
    const { title, sub } = language.ui.liveIntro;
    const practice = practiceButton(session, analysis);
    if (!practice) return html`${bubbleTitle(title)}<p class="ln-ext-bubble__sub">${sub}</p>`;
    return html`${bubbleTitle(title)}<div class="ln-ext-bubble__body"><p class="ln-ext-bubble__sub">${sub}</p>${practice}</div>`;
  }
  if (!comment)
    return thinkingMarkup(thinkingWords(language.ui.thinking, analysis.node.ply, analysis.gameId));
  return verdictMarkup(session, comment, practiceButton(session, analysis) ?? html``);
}

export function renderLive(session: Session, analysis: Analysis): void {
  const { live, language } = session;
  const move = judgeAt(live, analysis, analysis.path);
  const comment =
    move && !live.error
      ? commentOn(session, {
          move,
          gameId: analysis.gameId,
          hint: [],
          timing: null,
          turning: false,
        })
      : null;
  if (comment) followComment(session, comment);
  const bubble = liveBubble(session, analysis, comment);
  const moveClass = live.error ? null : (move?.moveClass ?? null);
  // While the engine judges the move, the coach thinks it over, as its words say.
  const judging = !live.error && Boolean(analysis.path) && !comment;
  const avatar = avatarMarkup({
    coachId: session.coach.id,
    moveClass,
    react: takeReaction(session.coach, moveClass, analysis.path),
    label: language.ui.coach,
    idle: judging ? 'thinking' : 'neutral',
  });
  setHtml(
    session.elements.panel,
    html`<div class="ln-ext-coach">${avatar}<div class="ln-ext-bubble">${bubble}</div></div>`,
  );
}
