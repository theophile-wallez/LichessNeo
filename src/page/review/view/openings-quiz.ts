import { html, type SafeHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { pickBy } from '#page/review/coach/said.ts';
import { noteScore, bestOf } from '#page/review/practice/progress.ts';
import { freshQuiz } from '#page/review/practice/quiz.ts';
import type { Session } from '#page/review/session.ts';
import { loadMoves } from './openings-actions.ts';
import { pageCoach } from './openings-setup.ts';
import { navButton } from './practice-card.ts';
import { rainConfetti } from './practice-cheer.ts';

// The quiz on the practice page: an opening's position on the board, four
// names to pick from, and the next once picked; its score at the end, beside
// the best.

/** How long a right answer shows before the next question. */
const NEXT_MS = 1200;

/** The question on the board: its opening's moves, the board turned to the side that chose it. */
function showQuestion(session: Session, analysis: Analysis): void {
  const question = session.view.openings.quiz?.questions[session.view.openings.quiz.index];
  if (!question) return;
  loadMoves(analysis, question.opening.moves);
  if (analysis.orientation() !== question.opening.side) analysis.flip();
}

export function startQuiz(session: Session, analysis: Analysis): void {
  session.view.openings.quiz = freshQuiz(Math.random);
  showQuestion(session, analysis);
}

export function nextQuestion(session: Session, analysis: Analysis): void {
  const { quiz } = session.view.openings;
  if (!quiz || quiz.answered === null) return;
  quiz.index++;
  quiz.answered = null;
  if (quiz.index < quiz.questions.length) showQuestion(session, analysis);
  else {
    quiz.over = true;
    quiz.record = noteScore('quiz', quiz.score);
    if (quiz.record) rainConfetti();
  }
}

export function answerQuiz(session: Session, analysis: Analysis, button: HTMLElement): void {
  const { quiz } = session.view.openings;
  const question = quiz?.questions[quiz.index];
  const name = button.dataset.lnExtValue;
  if (!quiz || !question || quiz.answered !== null || !name) return;
  quiz.answered = name;
  if (name !== question.opening.name) return;
  quiz.score++;
  const index = quiz.index;
  setTimeout(() => {
    if (session.view.openings.quiz !== quiz || quiz.index !== index) return;
    nextQuestion(session, analysis);
    session.redraw(true);
  }, NEXT_MS);
}

/** A choice once answered: the right one, the wrong one picked, or neither. */
function choiceState(name: string, right: string, answered: string | null): string {
  if (answered === null) return '';
  if (name === right) return 'right';
  return name === answered ? 'wrong' : '';
}

export function quizMarkup(session: Session): SafeHtml {
  const { modes } = session.language.ui.practice;
  const { quiz } = session.view.openings;
  if (!quiz) return html``;
  const total = quiz.questions.length;
  if (quiz.over) {
    const words = `${modes.quizScore(quiz.score, total)} ${quiz.record ? pickBy(modes.newRecord, 'quiz') : modes.bestWas(bestOf('quiz'))}`;
    const button = html`${navButton('practice-mode-quiz', 'retry', modes.playAgain, true)}${navButton('practice-home', 'tick', modes.finish)}`;
    return pageCoach(session, { title: modes.quizDone, words, button });
  }
  const question = quiz.questions[quiz.index];
  if (!question) return html``;
  const right = question.opening.name;
  const { answered } = quiz;
  let words = pickBy(modes.quizWords, `quiz|${quiz.index}`);
  if (answered !== null)
    words = pickBy(
      answered === right ? modes.quizRight(right) : modes.quizWrong(right),
      `quiz|${quiz.index}`,
    );
  const choices = question.choices.map(name => {
    const state = choiceState(name, right, answered);
    return html`<button class="ln-ext-quiz__choice" data-ln-ext="practice-quiz" data-ln-ext-value="${name}"${state ? html` data-ln-ext-state="${state}"` : ''}${answered === null ? '' : html` disabled`}>${name}</button>`;
  });
  const next =
    answered !== null && answered !== right
      ? navButton('practice-quiz-next', 'arrow', modes.next, true)
      : undefined;
  return html`<div class="ln-ext-round" style="--ln-ext-round-done:${quiz.index / total}"><span class="ln-ext-round__bar"></span><span class="ln-ext-round__count">${quiz.index + 1}/${total}</span></div>
    ${pageCoach(session, { title: modes.quizTitle, words, ...(next ? { button: next } : {}) })}
    <div class="ln-ext-review__body ln-ext-openings"><div class="ln-ext-quiz">${choices}</div></div>`;
}
