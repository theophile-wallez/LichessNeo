import { describe, expect, it } from 'vitest';
import { type Analysed, playedBetween } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import { findings } from './fact.ts';

// A pin said plainly first, the moves that show it below: on hssrEEJj, where
// 28...Bd2? leaves the c4 bishop to a pawn pinned to the a8 rook, and 29.Rxc4
// takes it.

const PLAY = /@[ab]:[^\]]*/g;
const plain = (text: string | undefined): string | undefined => text?.replace(PLAY, '');

const BEFORE: Analysed = {
  fen: 'r5k1/5p1p/1B2p1p1/P2p4/2b5/2b3P1/4PPBP/2R3K1 b - - 2 28',
  lines: [
    { cp: -47, pv: ['c3a5', 'c1a1', 'a5b6', 'a1a8', 'g8g7', 'e2e3'] },
    { cp: -264, pv: ['a8a5', 'c1c3', 'a5a1', 'g2f1', 'a1b1', 'b6d4'] },
  ],
};
const BLUNDER: Analysed = {
  fen: 'r5k1/5p1p/1B2p1p1/P2p4/2b5/6P1/3bPPBP/2R3K1 w - - 3 29',
  lines: [
    { cp: 432, pv: ['c1c4', 'f7f6', 'c4a4', 'd2f4', 'a4a1', 'f4e5'] },
    { cp: 83, pv: ['c1d1', 'd2a5', 'd1a1', 'a5b6', 'a1a8', 'g8g7'] },
  ],
};
const TAKEN: Analysed = {
  fen: 'r5k1/5p1p/1B2p1p1/P2p4/2R5/6P1/3bPPBP/6K1 b - - 0 29',
  lines: [
    { cp: -462, pv: ['d2a5', 'c4a4', 'a5b6', 'a4a8', 'g8g7', 'a8a1'] },
    { cp: -481, pv: ['a8a5', 'c4c8', 'g8g7', 'b6a5', 'd2a5', 'g2f1'] },
  ],
};

const pawn = { piece: { role: 'pawn', color: 'black' }, square: '[[s:d5]]' } as const;

describe('a pin', () => {
  const blunder = playedBetween([56, BEFORE, BLUNDER], 'c3d2');

  it('says the defender pinned, by their squares, and the line below', () => {
    const { fact } = findings(blunder, en);
    const bishop = { piece: { role: 'bishop', color: 'black' }, square: '[[s:c4]]' } as const;
    expect(en.facts.pinnedGuard(bishop, pawn)).toContain(fact?.text);
    expect(fact?.theme).toBe('pin');
    expect(fact?.drawing?.length).toBeGreaterThan(0);
    expect(plain(fact?.detail)).toMatch(/\[\[m:w:Rxc4\]\]/);
  });

  it('says a piece offered can’t be taken, its taker pinned', () => {
    const offer = playedBetween([57, BLUNDER, TAKEN], 'c1c4', blunder);
    expect(offer.moveClass).toBe('brilliant');
    const { fact } = findings(offer, en);
    const rook = { piece: { role: 'rook', color: 'white' }, square: null } as const;
    expect(en.facts.offeredPinned(rook, pawn)).toContain(fact?.text);
    expect(plain(fact?.detail)).toMatch(/\[\[m:b:dxc4\]\].*\[\[m:w:Bxa8\]\]/);
  });
});
