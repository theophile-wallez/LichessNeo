import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { hangingMarks, mateMarks } from './tactic-marks.ts';

const board = (fen: string) => parseFen(fen).board;

describe('hangingMarks', () => {
  // lichess.org/HazZkamE after 16. Qh3: gxf5 wins the knight, whatever holds it.
  const position = board('rnbq1r1k/p4p1p/1p1p1bp1/4pN2/8/1P1B3Q/PBP2PPP/R4RK1 b - - 1 16');

  it('rings the piece and draws the line of the piece that wins it, not its defenders', () => {
    expect(hangingMarks(position, 'f5', 'g6')).toEqual([
      { kind: 'link', from: 'g6', to: 'f5', tone: 'attack' },
      { kind: 'ring', square: 'f5', tone: 'attack' },
    ]);
  });

  it('draws no line from a piece that can’t take', () => {
    expect(hangingMarks(position, 'f5', 'h7')).toEqual([
      { kind: 'ring', square: 'f5', tone: 'attack' },
    ]);
  });

  it('draws nothing on an empty square', () => {
    expect(hangingMarks(board('6k1/8/8/8/8/8/8/3R2K1 w - - 0 1'), 'd5', 'd1')).toEqual([]);
  });
});

describe('mateMarks', () => {
  it('draws the checker’s line, bars the flight squares, behind the king too, and rings the walls', () => {
    // A back-rank mate: the rook bars f8, and h8 past the king; its pawns wall it in.
    const mated = board('4R1k1/5ppp/8/8/8/8/8/6K1 b - - 0 1');
    expect(mateMarks(mated, 'black')).toEqual([
      { kind: 'link', from: 'e8', to: 'g8', tone: 'attack' },
      { kind: 'barred', square: 'h8', tone: 'attack' },
      { kind: 'barred', square: 'f8', tone: 'attack' },
      { kind: 'ring', square: 'g7', tone: 'plan' },
      { kind: 'ring', square: 'h7', tone: 'plan' },
      { kind: 'ring', square: 'f7', tone: 'plan' },
      { kind: 'ring', square: 'g8', tone: 'attack' },
    ]);
  });

  it('draws what holds a checker right beside the king', () => {
    // Damiano's mate: the queen on h7, held by the pawn on g6.
    const mated = board('6k1/7Q/6P1/8/8/8/8/6K1 b - - 0 1');
    expect(mateMarks(mated, 'black')).toContainEqual({
      kind: 'link',
      from: 'g6',
      to: 'h7',
      tone: 'defense',
    });
  });

  it('rings no wall the mater covers anyway: the square was taken without it', () => {
    // The same mate, the bishop on b3 on f7 too.
    const mated = board('4R1k1/5ppp/8/8/8/1B6/8/6K1 b - - 0 1');
    const walls = mateMarks(mated, 'black').filter(
      mark => mark.kind === 'ring' && mark.tone === 'plan',
    );
    expect(walls.map(mark => (mark.kind === 'ring' ? mark.square : null))).toEqual(['g7', 'h7']);
  });

  it('draws nothing without the king', () => {
    expect(mateMarks(board('4R3/5ppp/8/8/8/8/8/6K1 b - - 0 1'), 'black')).toEqual([]);
  });
});
