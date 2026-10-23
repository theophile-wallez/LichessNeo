import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import {
  answer,
  boardMoves as sans,
  cardTitle as title,
  clickOn,
  coachWords,
  keyAfter,
  navButtons as buttons,
  type PracticeBoard,
  playMoves,
  practicing,
  step,
  textsOf,
  VERDICT_WAIT_MS,
} from '#page/review/fixtures/fake-practice.ts';
import { keepRepertoire, storedRepertoire } from '#page/review/practice/repertoire.ts';
import { renderOpenings } from './openings-page.ts';
import { practiceMarks } from './practice-bubble.ts';
import { MISS_MS } from './retry.ts';

// The practice card on a line: the coach's verdict on the user's move, its
// words typed out, the book's reply, and the buttons under it.

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 9, 23, 12) });
  keepRepertoire([]);
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  Reflect.deleteProperty(window, 'site');
});

describe('the practice card, before the user’s first move', () => {
  it('names the side, and says who it answers like, word by word', () => {
    const board = practicing();
    expect(title(board)).toBe('You play White');
    expect(coachWords(board.session)).toMatch(/like the masters/);
    const words = queryAll(board.session.elements.panel, '.ln-ext-w', HTMLElement);
    expect(words.some(word => word.classList.contains('ln-ext-w--off'))).toBe(true);
    expect(buttons(board)).toEqual(['Hint', 'Play Black']);
    expect(textsOf(board.session, '.ln-ext-review__back')).toEqual(['']);
  });

  it('turns the board to the other side, whose first move the book then plays', () => {
    const board = practicing();
    clickOn(board.session, '[data-ln-ext="practice-side"]');
    expect([board.session.view.practice?.side, board.ctrl.orientation]).toEqual(['black', 'black']);
    step(board);
    vi.advanceTimersByTime(VERDICT_WAIT_MS);
    step(board);
    expect(sans(board)).toHaveLength(1);
  });

  it('gives a hint at a time: the piece, then its square, marked on the board', () => {
    const board = practicing();
    clickOn(board.session, '[data-ln-ext="hint"]');
    expect(textsOf(board.session, '.ln-ext-bubble__hint')).toEqual(['The move is a pawn.']);
    expect(buttons(board)).toEqual(['Another hint', 'Play Black']);
    expect(practiceMarks(board.session, board.facade)).toEqual([]);
    clickOn(board.session, '[data-ln-ext="hint"]');
    expect(coachWords(board.session)).toBe(
      'The move is a pawn. It starts on e2, marked on the board.',
    );
    expect(practiceMarks(board.session, board.facade)).not.toEqual([]);
    expect(buttons(board)).toEqual(['Solution', 'Play Black']);
  });
});

describe('the practice card on a book move', () => {
  it('rates the move, then the book replies once it has waited for the engine', () => {
    const board = practicing();
    playMoves(board, ['e4']);
    step(board);
    expect(title(board)).toBe('e4 is the main move');
    expect(coachWords(board.session)).toMatch(/67% of master games/);
    expect(buttons(board)).toEqual([]);
    vi.advanceTimersByTime(VERDICT_WAIT_MS - 1);
    step(board);
    expect(sans(board)).toEqual(['e4']);
    vi.advanceTimersByTime(1);
    step(board);
    expect(sans(board)).toEqual(['e4', 'e5']);
    step(board);
    expect(coachWords(board.session)).toMatch(/e5/);
    expect(buttons(board)).toEqual(['Hint', 'Take back']);
  });

  it('lists the line under the card, each move with how common it is', () => {
    const board = practicing();
    playMoves(board, ['e4']);
    step(board);
    const [move] = queryAll(board.session.elements.panel, '.ln-ext-oline__move', HTMLElement);
    expect(move?.dataset.lnExtKind).toBe('main');
    expect(move?.dataset.lnExtTip).toBe('Main move · 67%');
    expect(textsOf(board.session, '.ln-ext-oline__num')).toEqual(['1.']);
    expect(textsOf(board.session, '.ln-ext-oline__move small')).toEqual(['67%']);
  });

  it('shows its streak once two moves in a row were found', () => {
    const board = practicing();
    const { practice } = board.session.view;
    if (!practice) throw new Error('no practice');
    practice.streak = 3;
    renderOpenings(board.session, board.facade);
    expect(textsOf(board.session, '.ln-ext-bubble__streak')).toEqual(['3']);
  });
});

/** The engine's record of a position White wins 55% of the time. */
const eval55 = { cp: 20, whiteWinChance: 55, secondLineWinChance: null, best: 'e2e4' };

/** 1. a4, which hardly a master plays, taken back after a moment. */
function refused(): PracticeBoard {
  const board = practicing();
  playMoves(board, ['a4']);
  step(board);
  return board;
}

describe('the practice card on a move refused', () => {
  it('says no at once, then takes the move back for another try', () => {
    const board = refused();
    expect(title(board)).toBe('a4 is a rare move');
    expect(coachWords(board.session)).toMatch(/not that one|Not in my book|try another/);
    vi.advanceTimersByTime(MISS_MS);
    expect(sans(board)).toEqual([]);
    step(board);
    expect(['Try again', 'One more go', 'Have another look']).toContain(title(board));
    expect(coachWords(board.session)).toMatch(/a4.*(rare one|Hardly anyone).*0\.1%/);
    expect(coachWords(board.session)).toMatch(/masters/);
    expect(buttons(board)).toEqual(['Hint', 'Solution', 'Play Black']);
  });

  it('ends the streak, and keeps the position to review at once', () => {
    const board = practicing();
    const { practice } = board.session.view;
    if (!practice) throw new Error('no practice');
    practice.streak = 2;
    playMoves(board, ['a4']);
    step(board);
    expect([practice.misses, practice.streak]).toEqual([1, 0]);
    expect(storedRepertoire()).toMatchObject([{ moves: [], missed: 1, due: Date.now() }]);
  });

  it('says why once the engine has punished it, the move to find left unnamed', () => {
    const board = practicing();
    const { live } = board.session;
    // Every move judged off the masters' book, 1. a4 losing 15 points to 1… e5.
    live.noBook = true;
    live.evals.set(board.ctrl.node.fen, eval55);
    playMoves(board, ['a4']);
    live.evals.set(board.ctrl.node.fen, { ...eval55, whiteWinChance: 40, best: 'e7e5' });
    step(board);
    vi.advanceTimersByTime(MISS_MS);
    step(board);
    expect(coachWords(board.session)).toMatch(
      /After a4, e5! and Black is a bit better\.|a4 runs into e5: Black is a bit better\./,
    );
    expect(coachWords(board.session)).not.toMatch(/e4/);
  });

  it('plays the solution when asked, and names it the book’s move', () => {
    const board = refused();
    vi.advanceTimersByTime(MISS_MS);
    step(board);
    clickOn(board.session, '[data-ln-ext="practice-reveal"]');
    expect(sans(board)).toEqual(['e4']);
    step(board);
    expect(title(board)).toBe('e4 is the book move');
  });
});

function deviated(): PracticeBoard {
  keepRepertoire([
    {
      side: 'white',
      moves: [],
      name: '',
      answers: ['d4'],
      seen: 1,
      missed: 0,
      level: 1,
      due: Date.now() + 1e9,
      last: Date.now(),
    },
  ]);
  const board = practicing();
  playMoves(board, ['e4']);
  step(board);
  return board;
}

describe('the practice card on a move that isn’t the user’s own', () => {
  it('asks whether to take it back or make it theirs', () => {
    const board = deviated();
    expect(title(board)).toBe('e4 isn’t your move');
    expect(coachWords(board.session)).toMatch(/Take it back, or make e4 yours\./);
    expect(buttons(board)).toEqual(['Make it mine', 'Take back']);
  });

  it('makes it the repertoire’s move once adopted', () => {
    const board = deviated();
    clickOn(board.session, '[data-ln-ext="practice-adopt"]');
    expect(storedRepertoire()[0]?.answers).toEqual(['e4', 'd4']);
  });

  it('goes back to the user’s turn once taken back', () => {
    const board = deviated();
    clickOn(board.session, '[data-ln-ext="practice-back"]');
    expect(sans(board)).toEqual([]);
  });
});

function ended(): PracticeBoard {
  const board = practicing();
  board.explorer.books.set(keyAfter(['e4']), answer([]));
  playMoves(board, ['e4']);
  step(board);
  return board;
}

describe('the practice card at the book’s end', () => {
  it('sums the line up, and leads on', () => {
    const board = ended();
    expect(['End of the book', 'Out of theory']).toContain(title(board));
    expect(coachWords(board.session)).toMatch(/The main move\. Nice!/);
    expect(buttons(board)).toEqual(['Start over', 'Vs computer']);
  });

  it('starts over from where the line started', () => {
    const board = ended();
    clickOn(board.session, '[data-ln-ext="practice-again"]');
    expect(sans(board)).toEqual([]);
    expect(board.session.view.practice?.scored.size).toBe(0);
  });

  it('hands the board over to Lichess’s computer', () => {
    const board = ended();
    clickOn(board.session, '[data-ln-ext="practice-computer"]');
    expect(board.session.view.practice).toBeNull();
    expect(board.modes).toEqual(['live']);
    expect(board.computer).toEqual([true]);
  });
});
