import { describe, expect, it } from 'vitest';
import { type Color, parseFen, type Square } from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { retreatOf } from './retreat.ts';

// A London: the bishop on f4 can only step back to g3, its own pawn on e3.
const LONDON = 'rn1qkb1r/ppp2ppp/4pn2/3p1b2/3P1B2/4PN2/PPP2PPP/RN1QKB1R w KQkq - 0 5';

function retreatAfter(fen: string, [from, to]: [Square, Square], color: Color = 'white') {
  const before = parseFen(fen).board;
  return retreatOf(before, boardAfter(before, `${from}${to}`), [from, to], color);
}

describe('retreatOf', () => {
  it('sees h3 free h2 for a bishop short of retreats', () => {
    expect(retreatAfter(LONDON, ['h2', 'h3'])).toEqual({
      kind: 'makesRetreat',
      piece: { role: 'bishop', color: 'white' },
      square: 'h2',
    });
  });

  it('sees it for Black too, h6 freeing h7', () => {
    const fen = 'rn1qkb1r/ppp2ppp/4pn2/3p1b2/3P1B2/4PN2/PPP2PPP/RN1QKB1R b KQkq - 0 5';
    expect(retreatAfter(fen, ['h7', 'h6'], 'black')).toEqual({
      kind: 'makesRetreat',
      piece: { role: 'bishop', color: 'black' },
      square: 'h7',
    });
  });

  it('isn’t the point of h4, which goes for more', () => {
    expect(retreatAfter(LONDON, ['h2', 'h4'])).toBeNull();
  });

  it('isn’t needed by a bishop with room to step back', () => {
    // Without the e3 pawn, the bishop has e3, d2 and c1 too.
    const roomy = 'rn1qkb1r/ppp2ppp/4pn2/3p1b2/3P1B2/5N2/PPP2PPP/RN1QKB1R w KQkq - 0 5';
    expect(retreatAfter(roomy, ['h2', 'h3'])).toBeNull();
  });
});
