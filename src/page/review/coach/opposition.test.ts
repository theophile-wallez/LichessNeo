import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { oppositionMarks, takesOpposition } from './opposition.ts';

const board = (fen: string) => parseFen(fen).board;

// White's king steps from d3 to e3, facing Black's on e5.
const BEFORE = board('8/8/8/4k3/8/3K4/3P4/8 w - - 0 1');
const AFTER = board('8/8/8/4k3/8/4K3/3P4/8 b - - 0 1');

describe('takesOpposition', () => {
  it('sees the king step into the opposition, with a pawn to push through', () => {
    expect(takesOpposition(BEFORE, AFTER, 'white')).toBe(true);
    expect(takesOpposition(BEFORE, AFTER, 'black')).toBe(false);
  });

  it('needs an ending of kings and pawns, and kings that weren’t opposed yet', () => {
    const knight = board('8/8/8/4k3/8/4K3/3P4/7N b - - 0 1');
    expect(takesOpposition(BEFORE, knight, 'white')).toBe(false);
    expect(takesOpposition(AFTER, AFTER, 'white')).toBe(false);
  });

  it('takes kings on a diagonal, or two squares apart sideways, as no opposition', () => {
    expect(takesOpposition(BEFORE, board('8/8/8/4k3/8/2K5/3P4/8 b - - 0 1'), 'white')).toBe(false);
    expect(takesOpposition(BEFORE, board('8/8/8/4k3/8/3K4/3P4/8 b - - 0 1'), 'white')).toBe(false);
  });
});

describe('oppositionMarks', () => {
  it('rings the kings and marks the square between them, on a file or a rank', () => {
    expect(oppositionMarks(AFTER)).toEqual([
      { kind: 'cells', squares: ['e4'], tone: 'plan' },
      { kind: 'ring', square: 'e3', tone: 'plan' },
      { kind: 'ring', square: 'e5', tone: 'plan' },
    ]);
    expect(oppositionMarks(board('8/8/8/8/2K1k3/8/8/8 w - - 0 1'))?.[0]).toEqual({
      kind: 'cells',
      squares: ['d4'],
      tone: 'plan',
    });
  });

  it('draws nothing when the kings aren’t opposed', () => {
    expect(oppositionMarks(BEFORE)).toBeNull();
  });
});
