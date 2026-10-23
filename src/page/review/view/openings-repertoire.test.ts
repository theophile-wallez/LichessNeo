import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { StorageKey } from '#shared/storage.ts';
import {
  boardMoves,
  clickOn,
  coachWords,
  type PracticeBoard,
  practiceBoard,
  shown,
  textsOf,
} from '#page/review/fixtures/fake-practice.ts';
import { isFavorite } from '#page/review/practice/progress.ts';
import { type Entry, keepRepertoire, storedRepertoire } from '#page/review/practice/repertoire.ts';
import { renderOpenings } from './openings-page.ts';

// The repertoire's page: the user's lines as a tree to unfold, star, prune and
// practice, and their Lichess studies, each chapter a line to practice.

const NOW = new Date(2026, 9, 23, 12).getTime();

const met = (moves: readonly string[], answers: readonly string[], level = 1): Entry => ({
  side: 'white',
  moves: [...moves],
  name: 'Italian Game',
  answers: [...answers],
  seen: 2,
  missed: 0,
  level,
  due: NOW + 1e9,
  last: NOW,
});

/** 1. e4 e5 2. Nf3 Nc6, then 3. Bc4 against 2… Nc6 and 3. Nc3 against 2… Nf6. */
const LINES: readonly Entry[] = [
  met([], ['e4']),
  met(['e4', 'e5'], ['Nf3']),
  met(['e4', 'e5', 'Nf3', 'Nc6'], ['Bc4']),
  met(['e4', 'e5', 'Nf3', 'Nf6'], ['Nc3']),
];

/** A study's export: one chapter from the start, played as Black, one from a position of its own. */
const STUDY_PGN = `[Event "Mine: Sicilian"]
[ChapterName "Sicilian"]
[ChapterURL "https://lichess.org/study/abcd1234/ch000001"]
[Orientation "black"]

1. e4 c5 2. Nf3 d6 *

[Event "Mine: Endgame"]
[ChapterName "Endgame"]
[FEN "8/8/8/4k3/8/8/4K3/8 w - - 0 1"]

1. Kd2 *
`;

const lichess = vi.fn<(url: string) => Promise<Response>>();

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
  vi.stubGlobal('fetch', lichess);
  keepRepertoire(LINES);
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  delete document.body.dataset.user;
  Reflect.deleteProperty(window, 'site');
});

function repertoire(): PracticeBoard {
  const board = practiceBoard();
  renderOpenings(board.session, board.facade);
  clickOn(board.session, '[data-ln-ext="practice-mode-repertoire"]');
  return board;
}

const rows = (board: PracticeBoard): string[] => textsOf(board.session, '.ln-ext-rtree__moves');

describe('the repertoire’s tree', () => {
  it('runs single moves into one row, and opens the first level on its branches', () => {
    const board = repertoire();
    expect(textsOf(board.session, '.ln-ext-bubble__title')).toEqual(['My repertoire']);
    // Pieces are drawn as glyphs.
    expect(rows(board)).toEqual(['1.e4e52.♞f3', '2…♞c63.♝c4', '2…♞f63.♞c3']);
    const user = queryAll(board.session.elements.panel, '.ln-ext-rtree__move b', HTMLElement);
    expect(user.map(move => move.textContent)).toEqual(['e4', '♞f3', '♝c4', '♞c3']);
  });

  it('folds a row’s branches away, and unfolds them again', () => {
    const board = repertoire();
    clickOn(board.session, '[data-ln-ext="practice-tree-toggle"]');
    expect(rows(board)).toEqual(['1.e4e52.♞f3']);
    expect(shown(board.session, '.ln-ext-rtree__toggle').getAttribute('aria-expanded')).toBe(
      'false',
    );
    clickOn(board.session, '[data-ln-ext="practice-tree-toggle"]');
    expect(rows(board)).toHaveLength(3);
  });

  it('stars a line for the home, and unstars it', () => {
    const board = repertoire();
    clickOn(board.session, '[data-ln-ext="practice-star"]');
    expect(isFavorite('white|e4 e5 Nf3')).toBe(true);
    expect(shown(board.session, '[data-ln-ext="practice-star"]').dataset.lnExtTip).toBe('Unstar');
    clickOn(board.session, '[data-ln-ext="practice-star"]');
    expect(isFavorite('white|e4 e5 Nf3')).toBe(false);
  });

  it('removes a branch and what follows it at the second click only', () => {
    const board = repertoire();
    const prune = '[data-ln-ext="practice-prune"][data-ln-ext-value="Nf6"]';
    clickOn(board.session, prune);
    expect(shown(board.session, prune).dataset.lnExtTip).toBe(
      'Remove this line and everything after it?',
    );
    expect(storedRepertoire()).toHaveLength(4);
    clickOn(board.session, prune);
    expect(storedRepertoire().map(entry => entry.moves.join(' '))).toEqual([
      '',
      'e4 e5',
      'e4 e5 Nf3 Nc6',
    ]);
    expect(rows(board)).toEqual(['1.e4e52.♞f3♞c63.♝c4']);
  });

  it('practices a row on the repertoire’s own lines', () => {
    const board = repertoire();
    const play = queryAll(
      board.session.elements.panel,
      '[data-ln-ext="practice-tree-line"]',
      HTMLElement,
    );
    play[1]?.click();
    expect(boardMoves(board)).toEqual(['e4', 'e5', 'Nf3']);
    expect(board.session.view.practice?.own?.kind).toBe('repertoire');
    expect(board.session.view.practice?.opening).toBe('Italian Game');
  });

  it('asks to practice first while it’s empty', () => {
    keepRepertoire([]);
    const board = repertoire();
    expect(textsOf(board.session, '.ln-ext-openings__note')).toEqual([
      'Practice a few lines: the positions you meet show up here.',
    ]);
  });
});

async function studies(): Promise<PracticeBoard> {
  document.body.dataset.user = 'tester';
  lichess.mockImplementation(url => {
    if (url.startsWith('/api/study/by/'))
      return Promise.resolve(
        new Response(
          '{"id":"abcd1234","name":"My Sicilian"}\n{"id":"ours0001","name":"Lichess Neo · White repertoire"}',
        ),
      );
    if (url.startsWith('/study/abcd1234.pgn')) return Promise.resolve(new Response(STUDY_PGN));
    return Promise.reject(new Error(`unexpected ${url}`));
  });
  const board = repertoire();
  clickOn(board.session, '[data-ln-ext="practice-tab"][data-ln-ext-value="studies"]');
  expect(textsOf(board.session, '.ln-ext-openings__note')).toEqual(['Reading your studies…']);
  await vi.waitFor(() => {
    expect(board.session.view.openings.studies.state).toBe('done');
  });
  return board;
}

describe('the repertoire’s studies', () => {
  it('lists the user’s studies, the ones keeping practice’s copy aside', async () => {
    const board = await studies();
    expect(textsOf(board.session, '.ln-ext-studies__study')).toEqual(['My Sicilian']);
    expect(lichess).toHaveBeenCalledWith('/api/study/by/tester', { cache: 'no-store' });
  });

  it('unfolds a study on the chapters practice can play, and practices one as its side', async () => {
    const board = await studies();
    clickOn(board.session, '[data-ln-ext="practice-study"]');
    await vi.waitFor(() => {
      expect(textsOf(board.session, '.ln-ext-studies__chapter')).toEqual(['SicilianAs Black']);
    });
    clickOn(board.session, '[data-ln-ext="practice-chapter"]');
    expect(board.session.view.practice).toMatchObject({ side: 'black', opening: 'Sicilian' });
    expect(board.session.view.practice?.own?.kind).toBe('study');
    expect(board.ctrl.orientation).toBe('black');
  });

  it('keeps the tab picked on its kept bar', async () => {
    const board = await studies();
    const picked = shown(board.session, '[data-ln-ext="practice-tab"].active');
    expect(picked.dataset.lnExtValue).toBe('studies');
    expect(coachWords(board.session)).toBe(
      'Train on a study of yours: its moves are the ones to find.',
    );
    expect(localStorage.getItem(StorageKey.practiceSync)).toBeNull();
  });
});
