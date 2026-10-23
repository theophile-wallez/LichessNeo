import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import {
  boardMoves,
  clickOn,
  coachWords,
  type PracticeBoard,
  practiceBoard,
  textsOf,
} from '#page/review/fixtures/fake-practice.ts';
import { OPENINGS } from '#page/review/practice/openings.ts';
import { QUIZ_QUESTIONS } from '#page/review/practice/quiz.ts';
import { renderOpenings } from './openings-page.ts';

// The quiz on the practice page: an opening on the board, four names, the
// next question once one is right, the score and the best at the end.

/** How long a right answer shows before the next question (view/openings-quiz.ts). */
const NEXT_MS = 1200;

beforeEach(() => {
  vi.useFakeTimers();
  // Every shuffle keeps its order: the questions are the first openings, the right name first.
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  Reflect.deleteProperty(window, 'site');
});

function quiz(): PracticeBoard {
  const board = practiceBoard();
  // The board as the user left it, turned to Black.
  board.ctrl.orientation = 'black';
  renderOpenings(board.session, board.facade);
  clickOn(board.session, '[data-ln-ext="practice-mode-quiz"]');
  return board;
}

const choices = ({ session }: PracticeBoard): HTMLButtonElement[] =>
  queryAll(session.elements.panel, '.ln-ext-quiz__choice', HTMLButtonElement);

describe('the quiz', () => {
  it('puts the first opening on the board, turned to its side, and four names to pick', () => {
    const board = quiz();
    const [first] = OPENINGS;
    expect(boardMoves(board)).toEqual(first?.moves);
    expect(board.ctrl.orientation).toBe(first?.side);
    expect(textsOf(board.session, '.ln-ext-bubble__title')).toEqual(['Which opening is this?']);
    expect(textsOf(board.session, '.ln-ext-round__count')).toEqual([`1/${QUIZ_QUESTIONS}`]);
    expect(choices(board).map(choice => choice.textContent)[0]).toBe(first?.name);
    expect(choices(board)).toHaveLength(4);
  });

  it('marks a right answer, then goes on to the next question by itself', () => {
    const board = quiz();
    choices(board)[0]?.click();
    expect(choices(board).map(choice => choice.dataset.lnExtState ?? '')).toEqual([
      'right',
      '',
      '',
      '',
    ]);
    expect(choices(board).every(choice => choice.disabled)).toBe(true);
    expect(coachWords(board.session)).toMatch(new RegExp(OPENINGS[0]?.name ?? ''));
    vi.advanceTimersByTime(NEXT_MS);
    expect(textsOf(board.session, '.ln-ext-round__count')).toEqual([`2/${QUIZ_QUESTIONS}`]);
    expect(boardMoves(board)).toEqual(OPENINGS[1]?.moves);
    expect(board.session.view.openings.quiz?.score).toBe(1);
  });

  it('shows the right name after a wrong one, and waits for Next', () => {
    const board = quiz();
    choices(board)[2]?.click();
    expect(choices(board).map(choice => choice.dataset.lnExtState ?? '')).toEqual([
      'right',
      '',
      'wrong',
      '',
    ]);
    vi.advanceTimersByTime(NEXT_MS);
    expect(textsOf(board.session, '.ln-ext-round__count')).toEqual([`1/${QUIZ_QUESTIONS}`]);
    clickOn(board.session, '[data-ln-ext="practice-quiz-next"]');
    expect(textsOf(board.session, '.ln-ext-round__count')).toEqual([`2/${QUIZ_QUESTIONS}`]);
    expect(board.session.view.openings.quiz?.score).toBe(0);
  });

  it('ends on the score, a record cheered with confetti', () => {
    const board = quiz();
    for (let i = 0; i < QUIZ_QUESTIONS; i++) {
      choices(board)[0]?.click();
      vi.advanceTimersByTime(NEXT_MS);
    }
    expect(textsOf(board.session, '.ln-ext-bubble__title')).toEqual(['Quiz done!']);
    expect(coachWords(board.session)).toMatch(/^10 of 10 right\. (New record!|Your best ever!)$/);
    expect(document.querySelectorAll('main.analyse > .ln-ext-cheer')).toHaveLength(1);
    expect(textsOf(board.session, '.ln-ext-btn')).toEqual(['Play again', 'Done']);
    clickOn(board.session, '[data-ln-ext="practice-mode-quiz"]');
    expect(textsOf(board.session, '.ln-ext-round__count')).toEqual([`1/${QUIZ_QUESTIONS}`]);
  });

  it('leads back to the home', () => {
    const board = quiz();
    clickOn(board.session, '[data-ln-ext="practice-home"]');
    expect(board.session.view.openings.quiz).toBeNull();
    expect(board.session.elements.panel.querySelector('.ln-ext-modes')).not.toBeNull();
  });
});
