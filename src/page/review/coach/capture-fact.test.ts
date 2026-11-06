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

/** The engine's Nxg3 from `fen`. */
const knightTakes = (fen: string): MoveVerdict =>
  played({ fen, uci: 'e4g3', before: record(60, ['e4g3']), after: record(70) });

describe('a capture', () => {
  it('names the piece by its square, and the other side’s play the score shows', () => {
    const move = takes(PLAY_ON);
    expect(move.moveClass).toBe('good');
    const { fact, followUp } = findings(move, en);
    expect(en.facts.compensation(black, '[[s:c6]]', 'black', false)).toContain(fact?.text);
    expect(plain(followUp?.text)).toMatch(
      /\[\[m:w:Bf4\]\].*gaining a tempo on the \[\[p:br\]\]rook on \[\[s:b8\]\]/,
    );
  });

  it('says it’s won back, plainly, and the line below', () => {
    const { fact } = findings(takes(WON_BACK), en);
    expect(en.facts.givenBack(black, '[[s:c6]]', 'black')).toContain(fact?.text);
    // Shown up to the pawn won back, not the rooks' trade after it.
    expect(plain(fact?.detail)).toMatch(/\[\[m:b:Bc4\]\] … \[\[m:b:Rxb2\]\]/);
  });

  it('wins a piece in a trade the other side can’t take back without losing more', () => {
    // Nxg3: ...Rxg3 hxg3 would cost the rook; with no h2 pawn, it's a fair trade.
    const knight = { role: 'knight', color: 'black' } as const;
    const rook = { role: 'rook', color: 'black' } as const;
    const guarded = findings(knightTakes('6k1/6r1/8/8/4N3/6n1/7P/2K5 w - - 0 1'), en).fact;
    expect(en.facts.retakeCosts(knight, null, rook)).toContain(guarded?.text);
    expect(en.facts.retakeCosts(knight, null, rook)).toContain(
      'That wins a [[p:bn]]knight: taking back would cost the [[p:br]]rook.',
    );
    const open = findings(knightTakes('6k1/6r1/8/8/4N3/6n1/8/2K5 w - - 0 1'), en).fact;
    expect(en.facts.trades(knight, false)).toContain(open?.text);
  });

  it('wins back what the side was behind, in a run of captures', () => {
    // The Opera game's 5…dxe5, after 4.dxe5 Bxf3 5.Qxf3: the pawn comes back.
    const recapture = played({
      fen: 'rn1qkbnr/ppp2ppp/3p4/4P3/4P3/5b2/PPP2PPP/RNBQKB1R w KQkq - 0 5',
      uci: 'd1f3',
      ply: 9,
      before: record(60, ['d1f3']),
      after: record(60, ['d6e5']),
    });
    const fen = 'rn1qkbnr/ppp2ppp/3p4/4P3/4P3/5Q2/PPP2PPP/RNB1KB1R b KQkq - 0 5';
    const pawnBack = (previousMove?: MoveVerdict) =>
      findings(
        played({
          fen,
          uci: 'd6e5',
          ply: 10,
          before: record(60, ['d6e5']),
          after: record(60),
          ...(previousMove ? { previousMove } : {}),
        }),
        en,
      ).fact?.text;
    const white = { role: 'pawn', color: 'white' } as const;
    expect(en.facts.winsBack(white, '[[s:e5]]', true)).toContain(pawnBack(recapture));
    expect(en.facts.winsForFree(white, '[[s:e5]]')).toContain(pawnBack());
  });

  it('isn’t faulted when it’s the engine’s own move', () => {
    const { fact, followUp } = findings(takes(WON_BACK, 'c5c6'), en);
    expect(en.facts.winsForFree(black, '[[s:c6]]')).toContain(fact?.text);
    expect(followUp).toBeNull();
  });
});
