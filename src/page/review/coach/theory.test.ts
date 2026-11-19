import { beforeAll, describe, expect, it } from 'vitest';
import { START_FEN } from '#shared/chess/fen.ts';
import { isError } from '#page/review/classes/classes.ts';
import { AFTER_E4, AFTER_E5, takeTestTheory, theoryMove } from '#page/review/fixtures/theory.ts';
import { en } from '#page/review/i18n/en.ts';
import { hasTheory, leftTheory, shownTheory, theoryComment } from './theory.ts';

beforeAll(takeTestTheory);

const texts = (parts: readonly { readonly text: string }[] | null): string[] =>
  (parts ?? []).map(part => part.text);

describe('hasTheory', () => {
  it('explains a book move whose position the theory has', () => {
    expect(hasTheory(theoryMove({ fen: START_FEN, uci: 'e2e4', ply: 1, book: true }))).toBe(true);
  });

  it('explains a move that’s no error, book or not', () => {
    expect(hasTheory(theoryMove({ fen: AFTER_E4, uci: 'e7e5', ply: 2 }))).toBe(true);
  });

  it('explains a mistake the theory knows, whatever the engine makes of it', () => {
    const move = theoryMove({ fen: AFTER_E4, uci: 'f7f6', ply: 2, loss: 0 });
    expect(shownTheory(move)?.mistake).toBe(true);
  });

  it('explains a move theory goes on with that the engine calls an error, a gambit', () => {
    const move = theoryMove({ fen: AFTER_E4, uci: 'c7c5', ply: 2, loss: 30 });
    expect(isError(move.moveClass)).toBe(true);
    expect(hasTheory(move)).toBe(true);
  });

  it('keeps quiet on an error that only lands in theory’s position', () => {
    // The start has no theory that goes on with 1. e4.
    const move = theoryMove({ fen: START_FEN, uci: 'e2e4', ply: 1, loss: 30 });
    expect(isError(move.moveClass)).toBe(true);
    expect(hasTheory(move)).toBe(false);
  });

  it('has nothing where the theory has no position', () => {
    expect(hasTheory(theoryMove({ fen: START_FEN, uci: 'd2d4', ply: 1, book: true }))).toBe(false);
  });
});

describe('theoryComment', () => {
  it('names the opening, explains the position, then theory’s first three moves', () => {
    const move = theoryMove({ fen: AFTER_E4, uci: 'e7e5', ply: 2, book: true });
    const parts = theoryComment(move, en, 'Open Game');
    expect(texts(parts)).toEqual([
      expect.stringContaining('Open Game'),
      'The open game, [[m:w:Nf3@a:g1f3]] first.',
      'Theory goes on with [[m:w:Nf3@a:g1f3]], [[m:w:Bc4@a:f1c4]], or [[m:w:Nc3@a:b1c3]].',
    ]);
    expect(parts?.[0]?.droppable).toBe(true);
    expect(parts?.[2]).toMatchObject({ detail: true });
  });

  it('says why a mistake is one, then how it’s punished', () => {
    const move = theoryMove({ fen: AFTER_E4, uci: 'f7f6', ply: 2, loss: 20 });
    expect(texts(theoryComment(move, en, 'Barnes Defense'))).toEqual([
      'It weakens the king: [[m:w:Qh5+@a:d1h5]].',
      expect.stringMatching(/\[\[m:w:Qh5\+@a:d1h5\]\]/),
    ]);
  });

  it('has none where the coach explains no theory', () => {
    const move = theoryMove({ fen: START_FEN, uci: 'e2e4', ply: 1, loss: 30 });
    expect(theoryComment(move, en, '')).toBeNull();
  });
});

describe('leftTheory', () => {
  it('says what theory plays where a move leaves it', () => {
    const move = theoryMove({ fen: AFTER_E5, uci: 'd1h5', ply: 3 });
    expect(leftTheory(move, en)).toMatch(
      /\[\[m:w:Nf3@b:g1f3\]\].*\[\[m:w:Bc4@b:f1c4\]\].*\[\[m:w:Nc3@b:b1c3\]\]/,
    );
  });

  it('says nothing of a book move the theory lacks, nor of one of its moves', () => {
    expect(leftTheory(theoryMove({ fen: AFTER_E5, uci: 'd2d4', ply: 3, book: true }), en)).toBe(
      null,
    );
    expect(leftTheory(theoryMove({ fen: AFTER_E5, uci: 'f2f4', ply: 3, loss: 10 }), en)).toBe(null);
  });

  it('says nothing where the move lands in another position theory explains', () => {
    expect(leftTheory(theoryMove({ fen: AFTER_E4, uci: 'f7f6', ply: 2, loss: 20 }), en)).toBe(null);
  });
});
