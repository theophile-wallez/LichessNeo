import { describe, expect, it } from 'vitest';
import { colorLetter, parseFen, parseSquare, ROLE_LETTERS } from '#shared/chess/index.ts';
import { lineToken } from '#page/review/comment/tokens.ts';
import { boardAfter, lineMoves } from './line.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** The pieces on `squares` after `line`, as "wr" (a white rook) or "" for an empty square. */
function piecesAfter(fen: string, line: readonly string[], squares: readonly string[]): string[] {
  let board = parseFen(fen).board;
  for (const uci of line) board = boardAfter(board, uci);
  return squares.map(name => {
    const square = parseSquare(name);
    const piece = square ? board.get(square) : undefined;
    return piece ? colorLetter(piece.color) + ROLE_LETTERS[piece.role] : '';
  });
}

describe('lineMoves', () => {
  it('numbers the moves from the position', () => {
    expect(lineMoves(START, ['e2e4', 'e7e5', 'g1f3'])).toEqual([
      { san: 'e4', color: 'white', number: 1 },
      { san: 'e5', color: 'black', number: 1 },
      { san: 'Nf3', color: 'white', number: 2 },
    ]);
    const blackToMove = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 12';
    expect(lineMoves(blackToMove, ['e7e5', 'g1f3']).map(move => move.number)).toEqual([12, 13]);
  });

  it('plays each move on the board the next one is written from', () => {
    const fen = 'r3k2r/pppq1ppp/8/8/8/8/PPPQ1PPP/R3K2R w KQkq - 0 9';
    // The rook reaches d1 from f1, where the castle put it.
    const moves = lineMoves(fen, ['e1g1', 'd7d2', 'f1d1']);
    expect(moves.map(move => move.san)).toEqual(['O-O', 'Qxd2', 'Rfd1']);
  });
});

describe('boardAfter', () => {
  it('moves the rook with the king, both ways of writing a castle', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const squares = ['e1', 'f1', 'g1', 'h1'];
    expect(piecesAfter(fen, ['e1g1'], squares)).toEqual(['', 'wr', 'wk', '']);
    expect(piecesAfter(fen, ['e1h1'], squares)).toEqual(['', 'wr', 'wk', '']);
    expect(piecesAfter(fen, ['e1a1'], ['a1', 'c1', 'd1', 'e1'])).toEqual(['', 'wk', 'wr', '']);
  });

  it('takes en passant, and promotes', () => {
    const fen = '8/1P6/8/3pP3/8/8/8/k6K w - d6 0 1';
    expect(piecesAfter(fen, ['e5d6'], ['d5', 'd6', 'e5'])).toEqual(['', 'wp', '']);
    expect(piecesAfter(fen, ['b7b8n'], ['b7', 'b8'])).toEqual(['', 'wn']);
  });
});

describe('lineToken', () => {
  it('numbers White’s moves, and a line’s first move when it’s Black’s', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 12';
    expect(lineToken(lineMoves(fen, ['e7e5', 'g1f3', 'b8c6']))).toBe(
      '[[n:12...:b:e5]] [[n:13.:w:Nf3]] [[m:b:Nc6]]',
    );
    expect(lineToken(lineMoves(START, ['e2e4', 'e7e5']))).toBe('[[n:1.:w:e4]] [[m:b:e5]]');
  });
});
