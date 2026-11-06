import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { oppositionMarks, takesOpposition } from './opposition.ts';

const board = (fen: string) => parseFen(fen).board;

// White's king steps from d3 to e3, facing Black's on e5.
const BEFORE = board('8/8/8/4k3/8/3K4/3P4/8 w - - 0 1');
const AFTER = board('8/8/8/4k3/8/4K3/3P4/8 b - - 0 1');
// White's king steps from d1 to e1, three squares below Black's.
const DISTANT_BEFORE = board('8/8/8/4k3/8/8/P7/3K4 w - - 0 1');
const DISTANT_AFTER = board('8/8/8/4k3/8/8/P7/4K3 b - - 0 1');

describe('takesOpposition', () => {
  it('sees the king step into the opposition, a pawn on the board', () => {
    expect(takesOpposition(BEFORE, AFTER, 'white')).toBe('opposition');
  });

  it('needs an ending of kings and pawns, and kings that weren’t opposed yet', () => {
    const knight = board('8/8/8/4k3/8/4K3/3P4/7N b - - 0 1');
    expect(takesOpposition(BEFORE, knight, 'white')).toBeNull();
    expect(takesOpposition(AFTER, AFTER, 'white')).toBeNull();
  });

  it('sees the opposition taken from afar, three squares between the kings', () => {
    expect(takesOpposition(DISTANT_BEFORE, DISTANT_AFTER, 'white')).toBe('distantOpposition');
  });

  it('leaves it unsaid while the other side has a pawn move to spare', () => {
    const spare = board('8/7p/8/4k3/8/8/P7/4K3 b - - 0 1');
    expect(takesOpposition(DISTANT_BEFORE, spare, 'white')).toBeNull();
  });

  it('takes kings on a diagonal, or two squares apart sideways, as no opposition', () => {
    expect(takesOpposition(BEFORE, board('8/8/8/4k3/8/2K5/3P4/8 b - - 0 1'), 'white')).toBeNull();
    expect(takesOpposition(BEFORE, board('8/8/8/4k3/8/3K4/3P4/8 b - - 0 1'), 'white')).toBeNull();
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

  it('marks the three squares between kings opposed from afar', () => {
    expect(oppositionMarks(DISTANT_AFTER)).toEqual([
      { kind: 'cells', squares: ['e2', 'e3', 'e4'], tone: 'plan' },
      { kind: 'ring', square: 'e1', tone: 'plan' },
      { kind: 'ring', square: 'e5', tone: 'plan' },
    ]);
  });

  it('draws nothing when the kings aren’t opposed', () => {
    expect(oppositionMarks(BEFORE)).toBeNull();
  });
});
