import { describe, expect, it } from 'vitest';
import { parsePlacement, START_PLACEMENT, writePlacement } from './fen.ts';
import { playLine, playSan } from './san.ts';

const START = parsePlacement(START_PLACEMENT);

/** The board after `moves` from the start, which must all play. */
function boardAfter(moves: readonly string[]): ReturnType<typeof parsePlacement> {
  const line = playLine(moves);
  if (!line) throw new Error(`The line ${moves.join(' ')} doesn't play`);
  return new Map(line.board);
}

describe('playSan', () => {
  it('pushes a pawn one or two squares, and takes with one', () => {
    expect(playSan(START, 'white', 'e4')?.uci).toBe('e2e4');
    expect(playSan(START, 'white', 'e3')?.uci).toBe('e2e3');
    expect(playSan(boardAfter(['e4']), 'black', 'd5')?.uci).toBe('d7d5');
    const capture = playSan(boardAfter(['e4', 'd5']), 'white', 'exd5');
    expect(capture?.uci).toBe('e4d5');
    expect(capture?.board.get('d5')).toEqual({ color: 'white', role: 'pawn' });
    expect(capture?.board.has('e4')).toBe(false);
  });

  it('takes en passant, the pawn beside going', () => {
    const played = playSan(boardAfter(['e4', 'a6', 'e5', 'd5']), 'white', 'exd6');
    expect(played?.uci).toBe('e5d6');
    expect(played?.board.has('d5')).toBe(false);
    expect(played?.board.get('d6')).toEqual({ color: 'white', role: 'pawn' });
  });

  it('promotes, with or without its equals sign', () => {
    const board = parsePlacement('8/P7/8/8/8/8/8/k6K');
    for (const san of ['a8=Q', 'a8Q', 'a8=N+']) {
      const played = playSan(board, 'white', san);
      expect(played?.uci).toBe(san.includes('N') ? 'a7a8n' : 'a7a8q');
      expect(played?.board.has('a7')).toBe(false);
    }
    expect(playSan(board, 'white', 'a8=Q')?.board.get('a8')).toEqual({
      color: 'white',
      role: 'queen',
    });
  });

  it('castles either way, in letters or in zeros', () => {
    const board = boardAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']);
    for (const san of ['O-O', '0-0']) {
      const played = playSan(board, 'white', san);
      expect(played?.uci).toBe('e1g1');
      expect(played?.board.get('f1')).toEqual({ color: 'white', role: 'rook' });
      expect(played?.board.has('h1')).toBe(false);
    }
    const long = playSan(parsePlacement('r3k3/8/8/8/8/8/8/4K3'), 'black', 'O-O-O+');
    expect(long?.uci).toBe('e8c8');
    expect(long?.board.get('d8')).toEqual({ color: 'black', role: 'rook' });
    expect(playSan(parsePlacement('4k3/8/8/8/8/8/8/4K3'), 'white', 'O-O')).toBeNull();
  });

  it('finds the piece SAN names by its file or its rank', () => {
    const knights = boardAfter(['Nf3', 'e5', 'd3', 'e4']);
    expect(playSan(knights, 'white', 'Nbd2')?.uci).toBe('b1d2');
    expect(playSan(knights, 'white', 'Nfd2')?.uci).toBe('f3d2');
    const rooks = parsePlacement('k7/8/8/R7/8/8/8/R6K');
    expect(playSan(rooks, 'white', 'R1a3')?.uci).toBe('a1a3');
    expect(playSan(rooks, 'white', 'R5a3')?.uci).toBe('a5a3');
  });

  it('leaves out a pinned piece that SAN doesn’t name', () => {
    // The knight on e2 shields its king from the rook on e8.
    const board = parsePlacement('k3r3/8/8/8/8/8/4N3/1N2K3');
    expect(playSan(board, 'white', 'Nc3')?.uci).toBe('b1c3');
  });

  it('reads past check, mate and annotation marks', () => {
    expect(playSan(START, 'white', 'Nf3!?')?.uci).toBe('g1f3');
    expect(playSan(START, 'white', 'e4!')?.uci).toBe('e2e4');
    const mate = boardAfter(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6']);
    expect(playSan(mate, 'white', 'Qxf7#')?.uci).toBe('h5f7');
  });

  it('gives null for a move it can’t read or play', () => {
    for (const san of ['Zz9', 'Nf6', 'e5', 'Bb5', 'xyz', '', 'e9'])
      expect(playSan(START, 'white', san)).toBeNull();
    // A pawn can't jump over a piece in its way.
    expect(playSan(parsePlacement('4k3/8/8/8/8/4n3/4P3/4K3'), 'white', 'e4')).toBeNull();
  });
});

describe('playLine', () => {
  it('plays a line from the start, each move in UCI', () => {
    const line = playLine(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6']);
    expect(line?.ucis).toEqual([
      'e2e4',
      'c7c5',
      'g1f3',
      'd7d6',
      'd2d4',
      'c5d4',
      'f3d4',
      'g8f6',
      'b1c3',
      'a7a6',
    ]);
    expect(line?.lastMove).toBe('a7a6');
    expect(line && writePlacement(line.board)).toBe(
      'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R',
    );
  });

  it('is the start for no moves, and null on a move that fails', () => {
    expect(playLine([])).toEqual({ board: START, lastMove: '', ucis: [] });
    expect(playLine(['e4', 'e4'])).toBeNull();
  });
});
