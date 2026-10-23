import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import {
  boardMoves,
  cardTitle,
  clickOn,
  coachWords,
  navButtons,
  type PracticeBoard,
  playMoves,
  practiceBoard,
  step,
  textsOf,
  VERDICT_WAIT_MS,
} from '#page/review/fixtures/fake-practice.ts';
import { renderOpenings } from './openings-page.ts';

// The traps' page and its rounds, and the page of the user's games, with
// what Lichess answers for them.

/** A batch of one puzzle: the queen's early raid, 4… Nf6?? punished by 5. Qxf7#. */
const MATE_BATCH = {
  puzzles: [
    {
      game: { pgn: 'e4 e5 Bc4 Nc6 Qh5 Nf6' },
      puzzle: { id: 'mate1', rating: 1200, solution: ['h5f7'], themes: ['mateIn1'], initialPly: 5 },
    },
  ],
};

const lichess = vi.fn<(url: string) => Promise<Response>>();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', lichess);
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  delete document.body.dataset.user;
  Reflect.deleteProperty(window, 'site');
});

function trapsPage(): PracticeBoard {
  const board = practiceBoard();
  renderOpenings(board.session, board.facade);
  clickOn(board.session, '[data-ln-ext="practice-mode-traps"]');
  return board;
}

/** Picks the traps of the page's opening card at `index` (each fetches its own batch once). */
async function pickTraps(board: PracticeBoard, index: number): Promise<void> {
  const cards = queryAll(
    board.session.elements.panel,
    '[data-ln-ext="practice-trap"]',
    HTMLElement,
  );
  cards[index]?.click();
  await vi.waitFor(() => {
    expect(board.session.view.openings.traps?.state).not.toBe('loading');
  });
}

describe('the traps’ page', () => {
  it('offers the side’s openings, each a card of its traps', () => {
    const board = trapsPage();
    expect(textsOf(board.session, '.ln-ext-bubble__title')).toEqual(['Traps']);
    expect(coachWords(board.session)).toBe(
      'Pick an opening: its real games’ mistakes are yours to punish.',
    );
    const cards = queryAll(board.session.elements.panel, '.ln-ext-opening-card', HTMLElement);
    expect(cards.length).toBeGreaterThan(3);
    expect(cards.every(card => card.dataset.lnExt === 'practice-trap')).toBe(true);
  });

  it('asks Lichess for the opening’s early puzzles, and says when it can’t answer', async () => {
    lichess.mockResolvedValue(new Response('', { status: 429 }));
    const board = trapsPage();
    await pickTraps(board, 0);
    expect(lichess.mock.calls[0]?.[0]).toBe(
      '/api/puzzle/batch/Italian_Game?nb=50&color=white&difficulty=normal',
    );
    expect(textsOf(board.session, '.ln-ext-bubble__title')).toEqual(['Italian Game']);
    expect(coachWords(board.session)).toBe('Lichess needs a breather: try again in a few minutes.');
  });

  it('says so when the opening has no trap', async () => {
    lichess.mockResolvedValue(new Response(JSON.stringify({ puzzles: [] })));
    const board = trapsPage();
    await pickTraps(board, 1);
    expect(coachWords(board.session)).toBe('No trap found for this opening.');
  });
});

async function trapped(): Promise<PracticeBoard> {
  lichess.mockResolvedValue(new Response(JSON.stringify(MATE_BATCH)));
  const board = trapsPage();
  await pickTraps(board, 2);
  step(board);
  return board;
}

describe('a round of traps', () => {
  it('stops the board before the game’s mistake, which the book then plays', async () => {
    const board = await trapped();
    expect(boardMoves(board)).toEqual(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5']);
    expect(cardTitle(board)).toBe('Trap ahead');
    vi.advanceTimersByTime(VERDICT_WAIT_MS);
    step(board);
    expect(boardMoves(board).at(-1)).toBe('Nf6');
    step(board);
    expect(cardTitle(board)).toBe('Punish it!');
    expect(coachWords(board.session)).toMatch(/Make them pay!|punish it!/);
  });

  it('cheers the punishment, and leads to the next trap', async () => {
    const board = await trapped();
    vi.advanceTimersByTime(VERDICT_WAIT_MS);
    step(board);
    playMoves(board, ['Qxf7']);
    step(board);
    expect(['Trap punished!', 'Got them!', 'Ouch, for them!']).toContain(cardTitle(board));
    expect(navButtons(board)).toEqual(['Next trap', 'Done']);
    clickOn(board.session, '[data-ln-ext="practice-next"]');
    expect(textsOf(board.session, '.ln-ext-bubble__sub')).toEqual([
      '1 of 1 punished at the first try.',
    ]);
  });

  it('gives the theme away once a move misses', async () => {
    const board = await trapped();
    vi.advanceTimersByTime(VERDICT_WAIT_MS);
    step(board);
    playMoves(board, ['a3']);
    step(board);
    vi.advanceTimersByTime(2000);
    step(board);
    expect(coachWords(board.session)).toMatch(/Mate in one!/);
  });
});

describe('the user’s games’ page', () => {
  it('reads their games, and says when it can’t', async () => {
    document.body.dataset.user = 'tester';
    lichess.mockRejectedValue(new Error('offline'));
    const board = practiceBoard();
    renderOpenings(board.session, board.facade);
    clickOn(board.session, '[data-ln-ext="practice-mode-games"]');
    expect(coachWords(board.session)).toBe('Reading your games…');
    await vi.waitFor(() => {
      expect(coachWords(board.session)).toBe('Your games didn’t load: try again later.');
    });
  });

  it('cheers a player without a habit to fix', () => {
    const board = practiceBoard();
    board.session.view.openings.games = { state: 'done', value: [] };
    renderOpenings(board.session, board.facade);
    clickOn(board.session, '[data-ln-ext="practice-mode-games"]');
    expect(coachWords(board.session)).toBe('No habit to fix in your last games. Well done!');
  });
});
