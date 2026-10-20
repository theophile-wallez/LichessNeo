import { describe, expect, it } from 'vitest';
import { type Analysed, playedBetween } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import { findings } from './fact.ts';

// What an error is said to have done, on real games' positions and the
// engine's lines there: a trade is no piece lost, a recapture no threat, and
// the reply that says why comes first.

const PLAY = /@[ab]:[^\]]*/g;
const plain = (text: string | undefined): string | undefined => text?.replace(PLAY, '');

describe('an error that trades', () => {
  // 24.Bxf6+?: the king takes back, and the d4 pawn falls after Rad1 Rxd4.
  const before: Analysed = {
    fen: 'r1br4/pp3pk1/2p1pbp1/4B2p/2PP1P2/3B4/PP4PP/R4RK1 w - - 0 24',
    lines: [
      { cp: 15, pv: ['a1d1', 'f6e5', 'd4e5', 'd8d4', 'b2b3'] },
      { cp: 3, pv: ['d3e4', 'f6e5', 'd4e5', 'd8d4'] },
    ],
  };
  const after: Analysed = {
    fen: 'r1br4/pp3pk1/2p1pBp1/7p/2PP1P2/3B4/PP4PP/R4RK1 b - - 0 24',
    lines: [
      { cp: 115, pv: ['g7f6', 'a1d1', 'd8d4', 'd3e2', 'd4d7'] },
      { cp: -618, pv: ['g7g8', 'f6d8'] },
    ],
  };
  const { fact, followUp } = findings(playedBetween([47, before, after], 'e5f6'), en);

  it('says the pawn it loses, by its square, not the bishop taken back', () => {
    expect(plain(fact?.text)).toBe(
      'Black wins the [[s:d4]] [[p:wp]]pawn in two moves: [[m:b:Kxf6]] [[m:w:Rad1]] [[m:b:Rxd4]].',
    );
  });

  it('names the better move after it', () => {
    expect(plain(followUp?.text)).toBe('[[m:w:Rad1]] was the better move.');
  });
});

describe('an error the reply punishes', () => {
  // 20.Ng4?: f5 chases the knight, where 20.Rfd1 kept the balance.
  const before: Analysed = {
    fen: 'r1b2r2/pp1nbpkp/2p1p1p1/4N3/2PP4/3B2B1/PP3PPP/R4RK1 w - - 0 20',
    lines: [
      { cp: 35, pv: ['f1d1', 'd7e5', 'd4e5', 'f8d8'] },
      { cp: 30, pv: ['a1d1', 'd7e5', 'd4e5', 'f8d8'] },
    ],
  };
  const after: Analysed = {
    fen: 'r1b2r2/pp1nbpkp/2p1p1p1/8/2PP2N1/3B2B1/PP3PPP/R4RK1 b - - 1 20',
    lines: [
      { cp: 147, pv: ['f7f5', 'g3e5', 'd7e5', 'g4e5', 'f8d8'] },
      { cp: 7, pv: ['h7h5', 'g4e5'] },
    ],
  };

  it('says what the reply does first, then the better move', () => {
    const { fact, followUp } = findings(playedBetween([39, before, after], 'e5g4'), en);
    expect(plain(fact?.text)).toBe(
      'That allows [[m:b:f5]], gaining a tempo on the [[p:wn]]knight.',
    );
    expect(plain(followUp?.text)).toBe('[[m:w:Rfd1]] was the better move.');
  });
});

describe('a reply that only answers the move', () => {
  it('isn’t told when it takes back', () => {
    // 9...fxe6?: Bxe6+ takes back, and 9...d5 was the move.
    const before: Analysed = {
      fen: 'r2qnrk1/ppp1ppbp/2npP1p1/8/2BP2b1/2P2N2/PP2QPPP/RNB2RK1 b - - 0 9',
      lines: [
        { cp: 38, pv: ['d6d5', 'c4b5', 'g4e6', 'b5c6', 'b7c6'] },
        { cp: -30, pv: ['f7f5', 'h2h3', 'g4f3', 'e2f3', 'e8f6'] },
      ],
    };
    const after: Analysed = {
      fen: 'r2qnrk1/ppp1p1bp/2npp1p1/8/2BP2b1/2P2N2/PP2QPPP/RNB2RK1 w - - 0 10',
      lines: [
        { cp: 217, pv: ['c4e6', 'g4e6', 'e2e6', 'g8h8', 'f3g5'] },
        { cp: 82, pv: ['b1d2', 'd6d5', 'c4b5', 'd8d6', 'h2h3'] },
      ],
    };
    expect(findings(playedBetween([18, before, after], 'f7e6'), en).followUp).toBeNull();
  });

  it('isn’t told when it only gets out of check', () => {
    // 17...Qe3+?: Kh1, and 17...g6 was the move.
    const before: Analysed = {
      fen: '1r3rk1/pp2qNpp/2p5/b6n/2BP4/1QP5/PP1N2PP/5RK1 b - - 0 17',
      lines: [
        { cp: 97, pv: ['g7g6', 'd2e4', 'b7b5', 'c4e6', 'a5c7'] },
        { cp: 0, pv: ['b7b5', 'c4e6', 'b8e8', 'f7d8', 'g8h8'] },
      ],
    };
    const after: Analysed = {
      fen: '1r3rk1/pp3Npp/2p5/b6n/2BP4/1QP1q3/PP1N2PP/5RK1 w - - 1 18',
      lines: [
        { cp: 130, pv: ['g1h1', 'h5f6', 'd2e4', 'b7b5', 'c4e6'] },
        { cp: 41, pv: ['f1f2', 'b7b5', 'c4e2', 'h5f6', 'f7e5'] },
      ],
    };
    expect(findings(playedBetween([34, before, after], 'e7e3'), en).followUp).toBeNull();
  });
});

describe('a reply that checks', () => {
  it('says the check it uncovers', () => {
    // 18...Qxd2?: Nd8+ uncovers the c4 bishop's check.
    const before: Analysed = {
      fen: '1r3rk1/pp3Npp/2p5/b6n/2BP4/1QP1q3/PP1N2PP/5R1K b - - 2 18',
      lines: [
        { cp: -90, pv: ['h5f6', 'd2e4', 'a5c7', 'e4f6', 'g7f6'] },
        { cp: -111, pv: ['e3e7', 'f7e5', 'g8h8', 'd2f3', 'h5f4'] },
      ],
    };
    const after: Analysed = {
      fen: '1r3rk1/pp3Npp/2p5/b6n/2BP4/1QP5/PP1q2PP/5R1K w - - 0 19',
      lines: [
        { cp: 452, pv: ['f7d8', 'f8f7', 'f1f7', 'b8d8', 'f7f2'] },
        { cp: 289, pv: ['b3a3', 'h5g3', 'h2g3', 'f8f7', 'c4f7'] },
      ],
    };
    const { fact } = findings(playedBetween([36, before, after], 'e3d2'), en);
    expect(plain(fact?.text)).toBe('That allows [[m:w:Nd8+]], with a discovered check.');
  });
});
