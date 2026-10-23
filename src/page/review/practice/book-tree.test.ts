import { describe, expect, it } from 'vitest';
import { START_PLACEMENT } from '#shared/chess/fen.ts';
import { treeBook } from './book-tree.ts';
import { rateMove, replies } from './book.ts';
import { parseMovetext } from './pgn-tree.ts';

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b';
const AFTER_E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w';

describe('treeBook', () => {
  it('keys each position by its pieces and the side to move, the main move most played', () => {
    const book = treeBook(parseMovetext('1. e4 e5 (1... c5) (1... e6) 2. Nf3 *'));
    const start = book.get(`${START_PLACEMENT} w`);
    expect(start?.moves.map(move => [move.san, move.uci, move.games])).toEqual([['e4', 'e2e4', 1]]);
    const afterE4 = book.get(AFTER_E4);
    expect(afterE4?.moves.map(move => [move.san, move.games])).toEqual([
      ['e5', 2],
      ['c5', 1],
      ['e6', 1],
    ]);
    expect(afterE4?.games).toBe(4);
    expect(rateMove(afterE4 ?? { games: 0, moves: [], opening: '' }, 'e5').kind).toBe('main');
    expect(book.get(AFTER_E4_E5)?.moves.map(move => move.uci)).toEqual(['g1f3']);
  });

  it('ends its lines with positions that have no moves', () => {
    const book = treeBook(parseMovetext('1. e4 e5'));
    const end = book.get(AFTER_E4_E5);
    expect(end).toEqual({ games: 0, moves: [], opening: '' });
    expect(end && replies(end, 'own')).toEqual([]);
  });

  it('meets both ways’ moves where two lines transpose', () => {
    const book = treeBook(
      parseMovetext('1. Nf3 (1. d4 Nf6 2. Nf3 d5 (2... g6)) 1... Nf6 2. d4 d5 (2... e6)'),
    );
    const transposed = book.get('rnbqkb1r/pppppppp/5n2/8/3P4/5N2/PPP1PPPP/RNBQKB1R b');
    expect(transposed?.moves.map(move => move.san)).toEqual(['d5', 'e6', 'g6']);
  });

  it('skips a move that can’t be played, and the line after it', () => {
    const book = treeBook(parseMovetext('1. e4 Ke3 (1... e5 2. Nf3) *'));
    expect(book.get(AFTER_E4)?.moves.map(move => move.san)).toEqual(['e5']);
    expect(book.get(AFTER_E4_E5)?.moves.map(move => move.san)).toEqual(['Nf3']);
    expect(book.size).toBe(4);
  });
});
