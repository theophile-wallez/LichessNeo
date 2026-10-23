import { beforeEach, describe, expect, it } from 'vitest';
import {
  entry,
  type ExplorerRow,
  explorerBook,
  practiceBoard,
  practiceState,
} from '#page/review/fixtures/practice.ts';
import type { BookPosition } from './book.ts';
import { keepRepertoire } from './repertoire.ts';
import { type PracticeState, positionKey } from './state.ts';
import { openingAt, practiceStatus, takeBackPath, tally } from './status.ts';

// 1. e4 e5 2. Nf3 Nc6 3. Bc4, White practicing.
const ITALIAN = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'];

const ROWS: readonly (readonly ExplorerRow[])[] = [
  [
    ['e4', 'e2e4', 600],
    ['d4', 'd2d4', 400],
  ],
  [
    ['e5', 'e7e5', 70, 'Open Game'],
    ['c5', 'c7c5', 30, 'Sicilian Defense'],
  ],
  [
    ['Bb5', 'f1b5', 50],
    ['Nf3', 'g1f3', 40],
    ['Nc3', 'b1c3', 10],
  ],
  [['Nc6', 'b8c6', 100]],
  [['Bc5', 'f8c5', 100]],
];

/** The board along the Italian, at `moves`, with the explorer's books of its first `looked` positions. */
function setup(moves: number, looked = ROWS.length) {
  const board = practiceBoard(ITALIAN);
  const books = new Map<string, BookPosition>();
  for (const [i, rows] of ROWS.slice(0, looked).entries()) {
    const fen = board.analysis.nodeAtPath(board.paths[i] ?? '').fen;
    books.set(positionKey(fen), explorerBook(rows));
  }
  board.ctrl.userJump(board.paths[moves] ?? '');
  const at = (index: number): string => board.paths[index] ?? '';
  return { ...board, books, at };
}

const statusOf = (practice: PracticeState, analysis: ReturnType<typeof setup>['analysis']) =>
  practiceStatus(practice, analysis, () => null);

beforeEach(() => {
  keepRepertoire([]);
});

describe('on the user’s turn', () => {
  it('waits for the explorer, and has left once the board goes back past the start', () => {
    const { analysis, at } = setup(2, 2);
    expect(statusOf(practiceState(), analysis)).toEqual({ kind: 'looking' });
    expect(statusOf(practiceState({ start: at(3) }), analysis)).toEqual({ kind: 'left' });
  });

  it('asks for the move, with the user’s last and the book’s reply', () => {
    const { analysis, books, at } = setup(2);
    const status = statusOf(practiceState({ books }), analysis);
    expect(status).toMatchObject({
      kind: 'yours',
      played: { path: at(1), san: 'e4', rating: { kind: 'main' } },
      answer: { path: at(2), san: 'e5', count: { games: 70, of: 100 } },
      miss: null,
    });
  });

  it('asks for the first move with nothing played yet', () => {
    const { analysis, books } = setup(0);
    expect(statusOf(practiceState({ books }), analysis)).toMatchObject({
      kind: 'yours',
      played: null,
      answer: null,
    });
  });

  it('holds the move refused from the position, to find again', () => {
    const { analysis, books, at } = setup(2);
    const miss = {
      played: { path: `${at(2)}zz`, san: 'h4', rating: null },
      tries: 1,
      why: 'rare',
    } as const;
    expect(statusOf(practiceState({ books, miss }), analysis)).toMatchObject({
      kind: 'yours',
      miss,
    });
    const elsewhere = { ...miss, played: { ...miss.played, path: `${at(4)}zz` } };
    expect(statusOf(practiceState({ books, miss: elsewhere }), analysis)).toMatchObject({
      miss: null,
    });
  });

  it('ends where the line is long enough, or the book has no move', () => {
    const { analysis, books } = setup(2);
    expect(statusOf(practiceState({ books, length: 1 }), analysis)).toMatchObject({
      kind: 'end',
      reason: 'length',
      played: { san: 'e4' },
    });
    const empty = new Map([...books].map(([key]) => [key, explorerBook([])]));
    expect(statusOf(practiceState({ books: empty }), analysis)).toMatchObject({
      kind: 'end',
      reason: 'book',
    });
    const own = { kind: 'study', name: 'Mine', positions: new Map() } as const;
    expect(statusOf(practiceState({ own }), analysis)).toEqual({
      kind: 'end',
      played: null,
      reason: 'book',
    });
  });
});

describe('after the user’s move', () => {
  it('replies from the book, or once the explorer has looked', () => {
    const { analysis, books, at } = setup(1);
    expect(statusOf(practiceState({ books }), analysis)).toMatchObject({
      kind: 'replying',
      played: { path: at(1), san: 'e4' },
      book: { games: 100 },
    });
    expect(statusOf(practiceState({ books: new Map() }), analysis)).toMatchObject({
      kind: 'replying',
      book: null,
    });
  });

  it('refuses a move too rare, and offers the user’s own in place of another', () => {
    const { analysis, books } = setup(3);
    expect(statusOf(practiceState({ books }), analysis)).toMatchObject({
      kind: 'replying',
      played: { san: 'Nf3', rating: { kind: 'popular' } },
    });
    const rare = setup(3);
    const rareBooks = new Map(rare.books);
    rareBooks.set(
      positionKey(rare.analysis.nodeAtPath(rare.at(2)).fen),
      explorerBook([
        ['Bb5', 'f1b5', 990],
        ['Nf3', 'g1f3', 10],
      ]),
    );
    expect(statusOf(practiceState({ books: rareBooks }), rare.analysis)).toMatchObject({
      kind: 'refused',
      why: 'rare',
    });
    keepRepertoire([entry({ moves: ['e4', 'e5'], answers: ['Bb5'] })]);
    expect(statusOf(practiceState({ books }), analysis)).toMatchObject({
      kind: 'deviated',
      pick: 'Bb5',
    });
  });

  it('ends where the line is long enough, or the book has no reply', () => {
    const { analysis, books, at } = setup(1);
    expect(statusOf(practiceState({ books, length: 1 }), analysis)).toMatchObject({
      kind: 'end',
      reason: 'length',
    });
    // Two master games went on from 1. e4: too few to reply from.
    const few = new Map(books);
    few.set(positionKey(analysis.nodeAtPath(at(1)).fen), explorerBook([['e5', 'e7e5', 2]]));
    expect(statusOf(practiceState({ books: few }), analysis)).toMatchObject({
      kind: 'end',
      reason: 'book',
    });
    const own = { kind: 'study', name: 'Mine', positions: new Map() } as const;
    expect(statusOf(practiceState({ own }), analysis)).toMatchObject({
      kind: 'end',
      reason: 'book',
    });
  });
});

describe('along the line', () => {
  it('names the opening by the last move that names one', () => {
    const { analysis, books, at } = setup(4);
    expect(openingAt(practiceState({ books }), analysis, at(4))).toBe('Open Game');
    expect(openingAt(practiceState({ books, start: at(2) }), analysis, at(4))).toBe('');
  });

  it('tallies the user’s moves in the book, and the main ones', () => {
    const { analysis, books, at } = setup(5);
    expect(tally(practiceState({ books }), analysis)).toEqual({ inBook: 2, main: 1 });
    const revealed = new Set([`${at(2)} Nf3`]);
    expect(tally(practiceState({ books, revealed }), analysis)).toEqual({ inBook: 1, main: 1 });
  });

  it('takes back to the user’s turn before their last move, or to the start', () => {
    const { analysis, at } = setup(4);
    expect(takeBackPath(practiceState(), analysis)).toBe(at(2));
    expect(takeBackPath(practiceState({ start: at(3) }), analysis)).toBe(at(3));
    const first = setup(1);
    expect(takeBackPath(practiceState(), first.analysis)).toBe('');
  });
});
