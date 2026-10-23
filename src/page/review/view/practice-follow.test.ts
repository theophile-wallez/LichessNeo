import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  answer,
  cardTitle,
  clickOn,
  coachWords,
  keyAfter,
  type PracticeBoard,
  playMoves,
  practiceBoard,
  practicing,
  shown,
  step,
  textsOf,
  VERDICT_WAIT_MS,
} from '#page/review/fixtures/fake-practice.ts';
import { noteDay } from '#page/review/practice/progress.ts';
import { keepRepertoire } from '#page/review/practice/repertoire.ts';
import { renderOpenings } from './openings-page.ts';

// Practice following the board: the explorer looked up and given back, the
// cheers once a move earns one, the level of Lichess's players, the user's
// own games as the book.

const ALL_GROUPS = [400, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500];

/** Lichess's user API, for the signed-in user's ratings. */
const userApi = vi.fn<(url: string) => Promise<Response>>(() =>
  Promise.resolve(new Response(JSON.stringify({ perfs: { blitz: { games: 300, rating: 1700 } } }))),
);

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 9, 23, 12) });
  vi.stubGlobal('fetch', userApi);
  keepRepertoire([]);
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  delete document.body.dataset.user;
  Reflect.deleteProperty(window, 'site');
});

/** Practice whose line ends once the user has played 1. e4. */
function endingOnE4(): PracticeBoard {
  const board = practicing();
  board.explorer.books.set(keyAfter(['e4']), answer([]));
  playMoves(board, ['e4']);
  step(board);
  return board;
}

const cheered = (): number => document.querySelectorAll('main.analyse > .ln-ext-cheer').length;

describe('practice and the explorer', () => {
  it('thinks while the explorer looks, and says when it fails', () => {
    const board = practicing();
    board.explorer.books.delete(keyAfter(['e4', 'e5']));
    playMoves(board, ['e4']);
    step(board);
    vi.advanceTimersByTime(VERDICT_WAIT_MS);
    step(board);
    step(board);
    // The explorer hasn't answered for the position after 1… e5 yet.
    expect(board.session.elements.panel.querySelector('.ln-ext-bubble__spin')).not.toBeNull();
    board.explorer.failing = true;
    renderOpenings(board.session, board.facade);
    expect(cardTitle(board)).toBe('The opening explorer isn’t answering.');
  });

  it('opens it while practicing, and leaves it closed after, as it was', () => {
    const board = practiceBoard();
    board.explorer.enabled = false;
    renderOpenings(board.session, board.facade);
    clickOn(board.session, '[data-ln-ext="practice-start"]');
    expect(board.explorer.enabled).toBe(true);
    // Closed along the line, it opens again: it looks positions up only while open.
    board.explorer.enabled = false;
    step(board);
    expect(board.explorer.enabled).toBe(true);
    clickOn(board.session, '[data-ln-ext="practice-stop"]');
    expect(board.session.view.practice).toBeNull();
    expect(board.explorer.enabled).toBe(false);
  });

  it('stops practice once the board goes back past where it started', () => {
    const board = practiceBoard();
    playMoves(board, ['e4']);
    renderOpenings(board.session, board.facade);
    clickOn(board.session, '[data-ln-ext="practice-start"]');
    board.ctrl.userJump('');
    step(board);
    expect(board.session.view.practice).toBeNull();
    expect(textsOf(board.session, '.ln-ext-bubble__title')).toEqual(['Pick an opening']);
  });
});

describe('practice’s cheers', () => {
  it('cheers the daily goal met, with confetti that goes away', () => {
    vi.setSystemTime(new Date(2026, 10, 2, 12));
    for (let i = 0; i < 19; i++) noteDay(Date.now());
    const board = endingOnE4();
    expect(coachWords(board.session)).toMatch(/Daily goal met! See you tomorrow\./);
    expect(cheered()).toBe(1);
    vi.advanceTimersByTime(10_000);
    expect(cheered()).toBe(0);
  });

  it('cheers an opening known better', () => {
    const board = practicing();
    const named = 'King’s Pawn Game';
    board.explorer.books.set(keyAfter(['e4']), answer([['e5', 'e7e5', 500]], named));
    board.explorer.books.set(keyAfter(['e4', 'e5']), answer([['Nf3', 'g1f3', 400]], named));
    board.explorer.books.set(keyAfter(['e4', 'e5', 'Nf3']), answer([]));
    playMoves(board, ['e4']);
    step(board);
    vi.advanceTimersByTime(VERDICT_WAIT_MS);
    step(board);
    step(board);
    // The position 1. e4 left unnamed: nothing to cheer yet.
    expect(cheered()).toBe(0);
    playMoves(board, ['Nf3']);
    step(board);
    expect(coachWords(board.session)).toMatch(/King’s Pawn Game: learning!/);
    expect(cheered()).toBe(1);
  });

  it('cheers nothing on a move that earned nothing', () => {
    const board = endingOnE4();
    expect(coachWords(board.session)).not.toMatch(/Daily goal|learning/);
    expect(cheered()).toBe(0);
  });
});

describe('practice against Lichess’s players', () => {
  it('reads the user’s level, then their rating groups while a line goes', async () => {
    document.body.dataset.user = 'tester';
    const board = practiceBoard();
    board.explorer.db = 'lichess';
    board.explorer.ratings = [...ALL_GROUPS];
    renderOpenings(board.session, board.facade);
    clickOn(board.session, '.ln-ext-openings__settings');
    await vi.waitFor(() => {
      renderOpenings(board.session, board.facade);
      expect(textsOf(board.session, '[data-ln-ext="practice-level"]')).toEqual([
        'Everyone',
        'My level (1700)',
      ]);
    });
    expect(userApi).toHaveBeenCalledWith('/api/user/tester');
    clickOn(board.session, '[data-ln-ext="practice-start"]');
    expect(board.explorer.ratings).toEqual([1600, 1800]);
    clickOn(board.session, '[data-ln-ext="practice-stop"]');
    expect(board.explorer.ratings).toEqual(ALL_GROUPS);
  });

  it('leaves the groups alone for every level', () => {
    const board = practiceBoard();
    board.explorer.db = 'lichess';
    board.explorer.ratings = [...ALL_GROUPS];
    renderOpenings(board.session, board.facade);
    clickOn(board.session, '.ln-ext-openings__settings');
    clickOn(board.session, '[data-ln-ext="practice-level"][data-ln-ext-value="all"]');
    clickOn(board.session, '[data-ln-ext="practice-start"]');
    expect(board.explorer.ratings).toEqual(ALL_GROUPS);
  });
});

describe('practice from the user’s own games', () => {
  it('reads them as the side they play, and calls them theirs', () => {
    document.body.dataset.user = 'Tester';
    const board = practiceBoard();
    board.explorer.books.set(keyAfter([]), answer([['e4', 'e2e4', 3]]));
    renderOpenings(board.session, board.facade);
    clickOn(board.session, '.ln-ext-openings__settings');
    clickOn(board.session, '[data-ln-ext="practice-book"][data-ln-ext-value="player"]');
    clickOn(board.session, '[data-ln-ext="practice-color"][data-ln-ext-value="black"]');
    expect([board.explorer.color, board.ctrl.orientation]).toEqual(['black', 'black']);
    clickOn(board.session, '[data-ln-ext="practice-start"]');
    step(board);
    expect(coachWords(board.session)).toMatch(/your own moves/);
    expect(shown(board.session, '.ln-ext-openings__settings').textContent).toMatch(/^My games/);
  });
});
