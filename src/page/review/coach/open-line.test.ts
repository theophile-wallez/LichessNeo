import { describe, expect, it } from 'vitest';
import { parseFen, type Square } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { openedLineOf } from './open-line.ts';

// A move that clears a line for a slider behind it, when the line runs on
// into the other side's half.

/** The line White's move from `from` to `to` opens, from `fen`. */
function openedBy(fen: string, from: Square, to: Square) {
  const before = parseFen(fen).board;
  return openedLineOf(before, boardAfter(before, `${from}${to}`), [from, to]);
}

describe('openedLineOf', () => {
  it('sees a knight step off the long diagonal for the bishop behind', () => {
    expect(openedBy('4k3/8/8/8/3N4/8/1B6/4K3 w - - 0 1', 'd4', 'b5')).toEqual({
      kind: 'opensLine',
      slider: { role: 'bishop', color: 'white' },
      from: 'b2',
      line: 'diagonal',
    });
  });

  it('says nothing of a line that only opens at home', () => {
    expect(openedBy('4k3/8/8/8/8/8/8/RN2K3 w - - 0 1', 'b1', 'c3')).toBeNull();
  });

  it('says nothing of a battery’s front leaving the line it shared', () => {
    expect(openedBy('4k3/8/8/8/8/2Q5/1B6/4K3 w - - 0 1', 'c3', 'c5')).toBeNull();
  });
});
