import { describe, expect, it } from 'vitest';
import { played, record } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import { findings } from './fact.ts';

// What the better move is said to have done, against the move played: the
// other piece to take with, not the danger both moves left, a pawn taken as
// a pawn once the kings are out.

const PLAY = /@[ab]:[^\]]*/g;

/** The fact on `uci` from `fen`, played for `best`, which kept `kept` of White's chances. */
function factOf(fen: string, [uci, best]: [string, string], [kept, left]: [number, number]) {
  const move = played({ fen, uci, before: record(kept, [best]), after: record(left, ['e8d8']) });
  return findings(move, en).fact?.text.replace(PLAY, '');
}

describe('the better move', () => {
  it('takes with the other piece, by its square', () => {
    const fen = '4k3/8/8/R2n4/8/8/8/3R2K1 w - - 0 1';
    const text = factOf(fen, ['a5d5', 'd1d5'], [80, 60]);
    expect(text).toMatch(
      /\[\[m:w:Rdxd5\]\], taking with the \[\[p:wr\]\]rook on \[\[s:d1\]\] instead/,
    );
  });

  it('isn’t said to save the piece the move played saved too', () => {
    const fen = '4k3/8/8/4p3/3N4/8/8/4K3 w - - 0 1';
    expect(factOf(fen, ['d4f5', 'd4b3'], [60, 55])).not.toMatch(/danger|harm/);
    expect(factOf(fen, ['e1d2', 'd4b3'], [60, 55])).toMatch(/out of danger/);
  });

  it('takes a pawn by the king as a pawn in an endgame', () => {
    const endgame = '6k1/8/7p/8/8/8/7R/6K1 w - - 0 1';
    expect(factOf(endgame, ['g1f1', 'h2h6'], [80, 60])).toMatch(/taking the \[\[p:bp\]\]pawn/);
    const middlegame = 'q5k1/8/7p/8/8/8/7R/Q5K1 w - - 0 1';
    expect(factOf(middlegame, ['g1f1', 'h2h6'], [80, 60])).toMatch(/king/);
  });
});
