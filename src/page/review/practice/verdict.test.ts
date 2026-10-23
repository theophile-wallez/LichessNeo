import { beforeEach, describe, expect, it } from 'vitest';
import {
  entry,
  explorerBook,
  practiceBoard,
  practiceState,
} from '#page/review/fixtures/practice.ts';
import { START_FEN } from '#shared/chess/fen.ts';
import { rateMove } from './book.ts';
import { treeBook } from './book-tree.ts';
import { parseMovetext } from './pgn-tree.ts';
import { keepRepertoire } from './repertoire.ts';
import { type PracticeState, positionKey } from './state.ts';
import { dubious, moveVerdict, ratingAt, refuses, targetAt } from './verdict.ts';

// White's first moves in the masters' games: 1000 of them.
const FIRST_MOVES = explorerBook([
  ['e4', 'e2e4', 500],
  ['d4', 'd2d4', 400],
  ['c4', 'c2c4', 80],
  ['b3', 'b2b3', 15],
  ['a3', 'a2a3', 5],
]);
const BOOKS = new Map([[positionKey(START_FEN), FIRST_MOVES]]);

/** The verdict on White's first move `uci`, the engine finding it loses `loss`. */
function verdictOn(uci: string, practice: PracticeState, loss: number | null = null) {
  const { analysis, paths } = practiceBoard([uci]);
  return moveVerdict(practice, analysis, paths[1] ?? '', () => loss);
}

beforeEach(() => {
  keepRepertoire([]);
});

describe('the book’s verdict', () => {
  const practice = practiceState({ books: BOOKS });

  it('takes a move of the book, and refuses one too rare or out of it', () => {
    expect(verdictOn('e2e4', practice)).toEqual({ kind: 'ok' });
    expect(verdictOn('c2c4', practice)).toEqual({ kind: 'ok' });
    expect(verdictOn('b2b3', practice)).toEqual({ kind: 'refused', why: 'rare' });
    expect(verdictOn('h2h4', practice)).toEqual({ kind: 'refused', why: 'rare' });
  });

  it('refuses a book move the engine finds worse, more readily on the main lines', () => {
    expect(verdictOn('c2c4', practice, 3)).toEqual({ kind: 'refused', why: 'dubious' });
    const allLines = practiceState({ books: BOOKS, settings: { lines: 'all' } });
    expect(verdictOn('c2c4', allLines, 3)).toEqual({ kind: 'ok' });
    expect(verdictOn('c2c4', allLines, 5)).toEqual({ kind: 'refused', why: 'dubious' });
    // The main move always stands: there's a move to find.
    expect(verdictOn('e2e4', practice, 20)).toEqual({ kind: 'ok' });
  });

  it('takes any move where the position wasn’t looked up', () => {
    expect(verdictOn('h2h4', practiceState())).toEqual({ kind: 'ok' });
    const { analysis, paths } = practiceBoard(['h2h4']);
    expect(ratingAt(practiceState(), analysis, paths[1] ?? '')).toBeNull();
  });

  it('rates which moves to refuse, and which are dubious', () => {
    expect(refuses(null)).toBe(false);
    expect(refuses(rateMove(FIRST_MOVES, 'a3'))).toBe(true);
    expect(refuses(rateMove(FIRST_MOVES, 'Nf3'))).toBe(true);
    expect(dubious(rateMove(FIRST_MOVES, 'd4'), 2, 'main')).toBe(true);
    expect(dubious(rateMove(FIRST_MOVES, 'd4'), null, 'main')).toBe(false);
    expect(dubious(rateMove(FIRST_MOVES, 'Nf3'), 50, 'all')).toBe(false);
    expect(dubious(null, 50, 'all')).toBe(false);
  });
});

describe('a line’s move to find', () => {
  const aims = { path: '', moves: ['d4', 'c4'], habit: 'e4' };

  it('takes the moves to find alone, telling the user’s habit apart', () => {
    const practice = practiceState({ books: BOOKS, aims });
    expect(verdictOn('d2d4', practice)).toEqual({ kind: 'ok' });
    expect(verdictOn('c2c4', practice)).toEqual({ kind: 'ok' });
    expect(verdictOn('e2e4', practice)).toEqual({ kind: 'refused', why: 'habit' });
    expect(verdictOn('g1f3', practice)).toEqual({ kind: 'refused', why: 'aim' });
  });
});

/** Practice on a book of its own, from `movetext`. */
const ownBook = (movetext: string) =>
  practiceState({
    books: BOOKS,
    own: { kind: 'study', name: 'Mine', positions: treeBook(parseMovetext(movetext)) },
  });

describe('a book of the line’s own', () => {
  it('takes its own moves alone, however rare the explorer finds them', () => {
    const practice = ownBook('1. a3 (1. h4)');
    expect(verdictOn('a2a3', practice)).toEqual({ kind: 'ok' });
    expect(verdictOn('h2h4', practice)).toEqual({ kind: 'ok' });
    expect(verdictOn('e2e4', practice)).toEqual({ kind: 'refused', why: 'rare' });
  });

  it('takes another mate where it mates', () => {
    const practice = ownBook('1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#');
    const ucis = ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'c4f7'];
    const { ctrl, analysis, paths } = practiceBoard(ucis);
    const last = paths[7] ?? '';
    expect(moveVerdict(practice, analysis, last, () => null)).toEqual({
      kind: 'refused',
      why: 'rare',
    });
    // The fake board writes no marks: this one says the bishop mates.
    ctrl.node.san = 'Bxf7#';
    expect(moveVerdict(practice, analysis, last, () => null)).toEqual({ kind: 'ok' });
  });
});

describe('the user’s repertoire', () => {
  beforeEach(() => {
    keepRepertoire([entry({ moves: [], answers: ['d4', 'c4'] })]);
  });

  it('asks for the user’s own move, another good one offering to make it theirs', () => {
    const practice = practiceState({ books: BOOKS });
    expect(verdictOn('d2d4', practice)).toEqual({ kind: 'ok' });
    expect(verdictOn('e2e4', practice)).toEqual({ kind: 'deviated', pick: 'd4' });
    expect(verdictOn('c2c4', practice, 10)).toEqual({ kind: 'deviated', pick: 'd4' });
    expect(verdictOn('b2b3', practice)).toEqual({ kind: 'refused', why: 'rare' });
  });

  it('takes any move the user found, when their own isn’t asked for', () => {
    const practice = practiceState({ books: BOOKS, settings: { moves: 'any' } });
    expect(verdictOn('e2e4', practice)).toEqual({ kind: 'ok' });
    expect(verdictOn('c2c4', practice, 10)).toEqual({ kind: 'ok' });
    expect(verdictOn('b2b3', practice)).toEqual({ kind: 'refused', why: 'rare' });
  });
});

describe('targetAt', () => {
  const { analysis } = practiceBoard([]);

  it('is the book’s main move, or none where there’s no book', () => {
    expect(targetAt(practiceState({ books: BOOKS }), analysis, '')).toEqual({
      san: 'e4',
      uci: 'e2e4',
    });
    expect(targetAt(practiceState(), analysis, '')).toBeNull();
  });

  it('is the line’s move to find, else the user’s own', () => {
    keepRepertoire([entry({ moves: [], answers: ['d4'] })]);
    expect(targetAt(practiceState({ books: BOOKS }), analysis, '')).toEqual({
      san: 'd4',
      uci: 'd2d4',
    });
    const aims = { path: '', moves: ['Nf3'], habit: 'e4' };
    expect(targetAt(practiceState({ books: BOOKS, aims }), analysis, '')).toEqual({
      san: 'Nf3',
      uci: 'g1f3',
    });
    const own = {
      kind: 'study',
      name: 'Mine',
      positions: treeBook(parseMovetext('1. c4')),
    } as const;
    expect(targetAt(practiceState({ books: BOOKS, own }), analysis, '')?.san).toBe('c4');
  });

  it('falls back on the book’s move when the one wanted can’t be played', () => {
    keepRepertoire([entry({ moves: [], answers: ['Ke5'] })]);
    expect(targetAt(practiceState({ books: BOOKS }), analysis, '')?.san).toBe('e4');
  });
});
