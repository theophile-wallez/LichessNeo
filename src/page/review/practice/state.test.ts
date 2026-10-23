import { afterEach, describe, expect, it } from 'vitest';
import { Analysis } from '#page/lichess/analysis.ts';
import { fakeController } from '#page/review/fixtures/fake-lichess.ts';
import { explorerBook, practiceBoard, practiceState } from '#page/review/fixtures/practice.ts';
import { START_FEN } from '#shared/chess/fen.ts';
import { treeBook } from './book-tree.ts';
import { parseMovetext } from './pgn-tree.ts';
import { keepDepth } from './progress.ts';
import {
  bookAt,
  bookBefore,
  bookDb,
  deeper,
  depthFor,
  FIRST_DEPTH,
  inLine,
  lineLength,
  moveKey,
  movesTo,
  positionKey,
  sanAt,
  yourMoves,
} from './state.ts';

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const { analysis, paths } = practiceBoard(['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4']);
const path = (moves: number): string => paths[moves] ?? '';

afterEach(() => {
  localStorage.clear();
});

describe('keys', () => {
  it('key a position by its pieces and the side to move, a move by its position', () => {
    expect(positionKey(AFTER_E4)).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b');
    expect(moveKey(path(1), 'e5')).toBe(`${path(1)} e5`);
  });
});

describe('the book of a line', () => {
  const books = new Map([[positionKey(START_FEN), explorerBook([['e4', 'e2e4', 10]])]]);

  it('is what the explorer found, unless the line has a book of its own', () => {
    const practice = practiceState({ books });
    expect(bookAt(practice, START_FEN)?.moves[0]?.san).toBe('e4');
    expect(bookBefore(practice, analysis, path(1))?.games).toBe(10);
    expect(bookAt(practice, AFTER_E4)).toBeNull();
    const positions = treeBook(parseMovetext('1. d4'));
    const own = practiceState({ books, own: { kind: 'study', name: 'Mine', positions } });
    expect(bookAt(own, START_FEN)?.moves.map(move => move.san)).toEqual(['d4']);
  });

  it('is of the explorer’s database, the masters’ by default, or a game a move', () => {
    expect(bookDb(practiceState())).toBe('masters');
    expect(bookDb(practiceState({ source: { db: 'lichess', player: '', color: 'white' } }))).toBe(
      'lichess',
    );
    const own = { kind: 'trap', name: 'Trap', positions: new Map() } as const;
    expect(
      bookDb(practiceState({ own, source: { db: 'player', player: 'me', color: 'white' } })),
    ).toBe('own');
  });
});

describe('the line', () => {
  it('goes on from where practice started', () => {
    const practice = practiceState({ start: path(2) });
    expect(inLine(practice, path(3))).toBe(true);
    expect(inLine(practice, path(2))).toBe(false);
    expect(inLine(practice, path(1))).toBe(false);
  });

  it('reads its moves from the standard start', () => {
    expect(sanAt(analysis, path(3))).toBe('Nf3');
    expect(sanAt(analysis, '')).toBe('');
    expect(movesTo(analysis, path(3))).toEqual(['e4', 'e5', 'Nf3']);
    expect(movesTo(analysis, '')).toEqual([]);
    const elsewhere = new Analysis(
      fakeController({ id: 'synthetic', positions: [{ ply: 1, fen: AFTER_E4 }] }),
    );
    expect(movesTo(elsewhere, '')).toBeNull();
  });

  it('counts the user’s moves along it', () => {
    expect(yourMoves(practiceState(), analysis, path(5))).toBe(3);
    expect(yourMoves(practiceState({ side: 'black' }), analysis, path(5))).toBe(2);
    expect(yourMoves(practiceState({ start: path(2) }), analysis, path(5))).toBe(2);
  });
});

describe('its length', () => {
  it('is the line’s own, the settings’, or as deep as the opening has grown', () => {
    expect(lineLength(practiceState({ length: 1, settings: { length: 10 } }))).toBe(1);
    expect(lineLength(practiceState({ settings: { length: 10 } }))).toBe(10);
    expect(lineLength(practiceState({ settings: { length: 0 } }))).toBe(0);
    expect(lineLength(practiceState({ depth: 8 }))).toBe(8);
  });

  it('grows by steps, an opening’s family at once, to the book’s end', () => {
    expect(depthFor('Italian Game: Evans Gambit')).toBe(FIRST_DEPTH);
    keepDepth('Italian Game', 6);
    expect(depthFor('Italian Game: Evans Gambit')).toBe(6);
    expect(depthFor('Ruy Lopez')).toBe(FIRST_DEPTH);
    const steps = [FIRST_DEPTH];
    for (let depth = deeper(FIRST_DEPTH); depth !== null; depth = deeper(depth)) steps.push(depth);
    expect(steps).toEqual([4, 6, 8, 10, 12, 15, 0]);
    expect(deeper(5)).toBeNull();
  });
});
