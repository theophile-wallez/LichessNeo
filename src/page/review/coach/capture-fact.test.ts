import { describe, expect, it } from 'vitest';
import { played, record } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { findings } from './fact.ts';

// What a capture is said to win: the piece by its square, and only for a while
// when the engine's line wins it back, or the other side gets play for it.

const PLAY = /@[ab]:[^\]]*/g;
const plain = (text: string | undefined): string | undefined => text?.replace(PLAY, '');

// Before 20.Qxc6: the c6 pawn hangs, but the engine's move is Bf4, at the b8 rook.
const BEFORE = '1r1q1rk1/5pbp/b1p1p1p1/p1Qp4/P2P4/4B1P1/1P2PPBP/2R1R1K1 w - - 1 20';
const PLAY_ON = 'a6c4 c1c2 c4b3 c2c3 b8b4 e1a1 h7h5 h2h4 d8a8 c6c7 b3c4 g2f3';
const WON_BACK = 'a6c4 c1c2 d8b6 c6b6 b8b6 e3d2 g7d4 d2a5 b6b2 c2b2 d4b2 a5b6';

const takes = (line: string, best = 'e3f4'): MoveVerdict =>
  played({
    fen: BEFORE,
    uci: 'c5c6',
    before: record(51, [best, 'b8b2']),
    after: record(best === 'c5c6' ? 51 : 49, line.split(' ')),
  });

const black = { role: 'pawn', color: 'black' } as const;

describe('a capture', () => {
  it('names the piece by its square, and the other side’s play the score shows', () => {
    const move = takes(PLAY_ON);
    expect(move.moveClass).toBe('good');
    const { fact, followUp } = findings(move, en);
    expect(en.facts.compensation(black, '[[s:c6]]', 'black')).toContain(fact?.text);
    expect(plain(followUp?.text)).toMatch(
      /\[\[m:w:Bf4\]\].*attacking the \[\[p:br\]\]rook on \[\[s:b8\]\]/,
    );
  });

  it('says it’s won back, plainly, and the line below', () => {
    const { fact } = findings(takes(WON_BACK), en);
    expect(en.facts.givenBack(black, '[[s:c6]]', 'black')).toContain(fact?.text);
    expect(plain(fact?.detail)).toMatch(/\[\[m:b:Bc4\]\] … \[\[m:b:Bxb2\]\]/);
  });

  it('isn’t faulted when it’s the engine’s own move', () => {
    const { fact, followUp } = findings(takes(WON_BACK, 'c5c6'), en);
    expect(en.facts.winsForFree(black, '[[s:c6]]')).toContain(fact?.text);
    expect(followUp).toBeNull();
  });
});
