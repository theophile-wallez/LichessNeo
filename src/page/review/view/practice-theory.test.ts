import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  answer,
  coachWords,
  keyAfter,
  type PracticeBoard,
  playMoves,
  practicing,
  step,
} from '#page/review/fixtures/fake-practice.ts';
import { keepRepertoire } from '#page/review/practice/repertoire.ts';
import { takeTheory } from '#page/review/theory/book.ts';
import { namedMoves } from './practice-theory.ts';
import { MISS_MS } from './retry.ts';

// What the coach's opening theory adds to practice: why a known mistake is
// one, and what the line's last position is about, the move to find unnamed.

const THEORY = `[Event "First moves"]

1. e4 { The king's pawn, aimed at d5. } ( 1. a4? { Slow: the centre is left alone. } 1... e5 )
( 1. h4? { Weak: play [e4] instead. } 1... e5 ) *`;

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 9, 23, 12) });
  keepRepertoire([]);
  takeTheory('practicetheory', THEORY);
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  Reflect.deleteProperty(window, 'site');
});

/** `move` played and refused, then taken back for another try. */
function missed(move: string): PracticeBoard {
  const board = practicing();
  board.explorer.books.set(
    keyAfter([]),
    answer([
      ['e4', 'e2e4', 600],
      [move, move === 'a4' ? 'a2a4' : 'h2h4', 1],
    ]),
  );
  playMoves(board, [move]);
  step(board);
  vi.advanceTimersByTime(MISS_MS);
  step(board);
  return board;
}

describe('practice, with the opening’s theory', () => {
  it('says why a refused move is a known mistake', () => {
    expect(coachWords(missed('a4').session)).toContain('Slow: the centre is left alone.');
  });

  it('keeps quiet a mistake’s word that names the move to find', () => {
    const words = coachWords(missed('h4').session);
    expect(words).not.toContain('Weak');
    expect(words).not.toMatch(/e4/);
  });

  it('explains the last position of a line at the book’s end', () => {
    const board = practicing();
    board.explorer.books.set(keyAfter(['e4']), answer([]));
    playMoves(board, ['e4']);
    step(board);
    expect(coachWords(board.session)).toContain("The king's pawn, aimed at d5.");
  });
});

describe('namedMoves', () => {
  it('reads the moves of the coach’s chips, numbered or not, bare', () => {
    expect(namedMoves('[[m:w:Nf3@a:g1f3]], [[n:3.:w:Qh5+]] and [[s:e5]] [[m:b:O-O]]')).toEqual(
      new Set(['Nf3', 'Qh5', 'O-O']),
    );
  });
});
