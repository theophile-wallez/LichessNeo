import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  answer,
  boardMoves,
  cardTitle,
  clickOn,
  coachWords,
  keyAfter,
  navButtons,
  type PracticeBoard,
  playMoves,
  practiceBoard,
  shown,
  step,
  textsOf,
} from '#page/review/fixtures/fake-practice.ts';
import { BLITZ_MS } from '#page/review/practice/blitz.ts';
import type { GameDrill } from '#page/review/practice/games.ts';
import { OPENINGS } from '#page/review/practice/openings.ts';
import { DAY_MS, type Entry, keepRepertoire } from '#page/review/practice/repertoire.ts';
import { renderOpenings } from './openings-page.ts';

// Practice's rounds: the daily review, the timed challenge and the drills of
// the user's games, a card after the other, and the round's sum at the end.

const NOW = new Date(2026, 9, 23, 12).getTime();

/** The position after 1. e4 e5, due, whose move the user knows as 2. Nf3. */
const DUE: Entry = {
  side: 'white',
  moves: ['e4', 'e5'],
  name: 'King’s Pawn Game',
  answers: ['Nf3'],
  seen: 2,
  missed: 0,
  level: 1,
  due: NOW - DAY_MS,
  last: NOW - 2 * DAY_MS,
};

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  // Every shuffle keeps its order: the challenge's first card is the first opening's.
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  keepRepertoire([]);
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  Reflect.deleteProperty(window, 'site');
});

function fromHome(): PracticeBoard {
  const board = practiceBoard();
  renderOpenings(board.session, board.facade);
  return board;
}

function reviewing(): PracticeBoard {
  keepRepertoire([DUE]);
  const board = fromHome();
  board.explorer.books.set(keyAfter(DUE.moves), answer([['Nf3', 'g1f3', 50]]));
  clickOn(board.session, '[data-ln-ext="practice-mode-review"]');
  step(board);
  return board;
}

describe('the daily review', () => {
  it('puts the due position on the board, named, the coach asking for its move', () => {
    const board = reviewing();
    expect(boardMoves(board)).toEqual(['e4', 'e5']);
    expect(cardTitle(board)).toBe('King’s Pawn Game');
    expect(coachWords(board.session)).toMatch(
      /Remember this one\?|been here before|What do you play/,
    );
    expect(textsOf(board.session, '.ln-ext-round__count')).toEqual(['1/1']);
    // A round's card has the settings of its own.
    expect(board.session.elements.panel.querySelector('.ln-ext-openings__settings')).toBeNull();
  });

  it('cheers the move found, then sums the round up by itself', () => {
    const board = reviewing();
    playMoves(board, ['Nf3']);
    step(board);
    expect(['Got it!', 'Yes!', 'Still sharp!', 'Remembered!']).toContain(cardTitle(board));
    expect(navButtons(board)).toEqual([]);
    vi.advanceTimersByTime(1400);
    expect(textsOf(board.session, '.ln-ext-bubble__title')).toEqual(['Review done!']);
    expect(coachWords(board.session)).toBe('1 of 1 at the first try.');
    clickOn(board.session, '[data-ln-ext="practice-stop"]');
    expect([board.session.view.round, board.session.view.practice]).toEqual([null, null]);
  });
});

function racing(): PracticeBoard {
  const board = fromHome();
  clickOn(board.session, '[data-ln-ext="practice-mode-blitz"]');
  step(board);
  return board;
}

/** The moves of the round's card at `index`. */
function cardMoves({ session }: PracticeBoard, index: number): readonly string[] | undefined {
  const { round } = session.view;
  return round?.kind === 'blitz' ? round.cards[index]?.moves : undefined;
}

describe('the timed challenge', () => {
  const [first] = OPENINGS;

  it('starts its clock at a minute, and names the opening to play', () => {
    const board = racing();
    const clock = shown(board.session, '.ln-ext-round__clock');
    expect(clock.style.getPropertyValue('--ln-ext-left')).toBe('60');
    expect(boardMoves(board)).toEqual(first?.moves.slice(0, -1));
    expect(cardTitle(board)).toBe(first?.name);
    expect(navButtons(board)).toEqual([]);
  });

  it('counts a move right and goes on at once to the next card', () => {
    const board = racing();
    playMoves(board, [first?.moves.at(-1) ?? '']);
    step(board);
    vi.advanceTimersByTime(250);
    step(board);
    expect(boardMoves(board)).toEqual(cardMoves(board, 1));
    expect(textsOf(board.session, '.ln-ext-round__score')).toEqual(['1']);
  });

  it('names the answer of a miss, and leaves it on the board for a glance', () => {
    const board = racing();
    playMoves(board, ['a3']);
    step(board);
    // The move's piece is drawn as a glyph.
    expect(cardTitle(board)).toBe('It was ♝c4!');
    expect(boardMoves(board).at(-1)).toBe('a3');
    vi.advanceTimersByTime(700);
    expect(boardMoves(board)).toEqual(cardMoves(board, 1));
  });

  it('stops at the minute, on the score', () => {
    const board = racing();
    vi.advanceTimersByTime(BLITZ_MS);
    expect(textsOf(board.session, '.ln-ext-bubble__title')).toEqual(['Time’s up!']);
    expect(['Not a move? Go again!', 'Too slow! Another go?']).toContain(coachWords(board.session));
    expect(textsOf(board.session, '.ln-ext-btn')).toEqual(['Play again', 'Done']);
  });
});

describe('the drills of the user’s games', () => {
  const DRILL: GameDrill = {
    side: 'white',
    moves: ['e4', 'e5'],
    habit: 'Qh5',
    times: 3,
    games: 4,
    better: ['Nf3'],
    name: 'King’s Pawn Game',
    why: 'book',
  };

  function drilling(): PracticeBoard {
    const board = fromHome();
    board.explorer.books.set(
      keyAfter(DRILL.moves),
      answer([
        ['Nf3', 'g1f3', 50],
        ['Qh5', 'd1h5', 5],
      ]),
    );
    board.session.view.openings.games = { state: 'done', value: [DRILL] };
    clickOn(board.session, '[data-ln-ext="practice-mode-games"]');
    return board;
  }

  it('lists each habit as a card', () => {
    const board = drilling();
    expect(textsOf(board.session, '.ln-ext-drill__why')).toEqual(['The masters play better']);
    expect(textsOf(board.session, '.ln-ext-drill__habit')).toEqual(['♛h5 · in 3 of 4 games']);
  });

  it('says what the user usually plays, and turns the habit down', () => {
    const board = drilling();
    clickOn(board.session, '[data-ln-ext="practice-drill"]');
    step(board);
    expect(coachWords(board.session)).toMatch(/You played h5 here in 3 of your 4 games\./);
    playMoves(board, ['Qh5']);
    step(board);
    expect(cardTitle(board)).toBe('♛h5, as usual');
    expect(coachWords(board.session)).toMatch(/h5 again! Find better\.|your habit, h5/);
  });
});
