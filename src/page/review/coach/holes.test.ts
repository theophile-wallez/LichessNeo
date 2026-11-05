import { describe, expect, it } from 'vitest';
import { factInput } from '#page/review/fixtures/fact-input.ts';
import { played, record } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import { holeFact } from './holes.ts';

// A push that leaves a square in front of the camp no pawn can guard again,
// with a knight of the other side's near enough to sit there.

/** The error `uci` from `fen`. */
const error = (fen: string, uci: string) =>
  factInput(played({ fen, uci, before: record(55, ['d1d2']), after: record(35, ['b4d3']) }));

describe('holeFact', () => {
  it('sees e4 leave d3 to the knight on b4, the c-pawn already past it', () => {
    const fen = '3qk3/8/8/8/1nP5/8/4P3/3QK3 w - - 0 1';
    expect(en.facts.hole('[[s:d3]]')).toContain(holeFact(error(fen, 'e2e4'))?.text);
  });

  it('says nothing with no knight near the hole', () => {
    const fen = 'n2qk3/8/8/8/2P5/8/4P3/3QK3 w - - 0 1';
    expect(holeFact(error(fen, 'e2e4'))).toBeNull();
  });

  it('says nothing in an endgame, nor of a piece’s move', () => {
    const ending = '4k3/8/8/8/1nP5/8/4P3/4K3 w - - 0 1';
    expect(holeFact(error(ending, 'e2e4'))).toBeNull();
    const fen = '3qk3/8/8/8/1nP5/8/4P3/3QK3 w - - 0 1';
    expect(holeFact(error(fen, 'd1d2'))).toBeNull();
  });
});
