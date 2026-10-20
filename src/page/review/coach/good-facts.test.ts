import { describe, expect, it } from 'vitest';
import { type Analysed, playedBetween } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { toRecord } from '#page/review/engine/record.ts';
import { findings } from './fact.ts';
import { passedFen } from './threat.ts';

// What a good move is said to do, read off real games' positions and the
// engine's lines there: the tactic before the error it punishes, a mate under
// way, a sacrifice that takes something first.

const PLAY = /@[ab]:[^\]]*/g;

const textOf = (move: MoveVerdict): string => findings(move, en).fact?.text.replace(PLAY, '') ?? '';

describe('a move that punishes an error', () => {
  // 12...Nf6?, and 13.Nf7+ forks the king and the queen.
  const before: Analysed = {
    fen: 'r2qnr1k/ppp1p1bp/2npQ1p1/6N1/3P4/2P5/PP3PPP/RNB2RK1 b - - 2 12',
    lines: [{ cp: -72, pv: ['d8c8', 'e6e2', 'e7e5'] }],
  };
  const mistake: Analysed = {
    fen: 'r2q1r1k/ppp1p1bp/2npQnp1/6N1/3P4/2P5/PP3PPP/RNB2RK1 w - - 3 13',
    lines: [
      { cp: 204, pv: ['g5f7', 'f8f7', 'e6f7', 'e7e5'] },
      { cp: 89, pv: ['f1e1', 'd8c8'] },
    ],
  };
  const fork: Analysed = {
    fen: 'r2q1r1k/ppp1pNbp/2npQnp1/8/3P4/2P5/PP3PPP/RNB2RK1 b - - 4 13',
    lines: [
      { cp: -238, pv: ['f8f7', 'e6f7', 'd8d7'] },
      { cp: -581, pv: ['h8g8', 'f7d8'] },
    ],
  };

  it('says the tactic it plays, not that it punishes', () => {
    const error = playedBetween([23, before, mistake], 'e8f6');
    const move = playedBetween([24, mistake, fork], 'g5f7', error);
    expect(findings(move, en).fact?.theme).toBe('fork');
    expect(en.facts.punishesAtOnce('black')).not.toContain(textOf(move));
  });
});

describe('an answer to a check', () => {
  // 17...Qe3+?, and 18.Kh1 is forced: no punishment, whatever it costs Black.
  const before: Analysed = {
    fen: '1r3rk1/pp2qNpp/2p5/b6n/2BP4/1QP5/PP1N2PP/5RK1 b - - 0 17',
    lines: [{ cp: 97, pv: ['g7g6', 'd2e4', 'b7b5', 'c4e6', 'a5c7'] }],
  };
  const check: Analysed = {
    fen: '1r3rk1/pp3Npp/2p5/b6n/2BP4/1QP1q3/PP1N2PP/5RK1 w - - 1 18',
    lines: [{ cp: 130, pv: ['g1h1', 'h5f6', 'd2e4', 'b7b5', 'c4e6'] }],
  };
  const fled: Analysed = {
    fen: '1r3rk1/pp3Npp/2p5/b6n/2BP4/1QP1q3/PP1N2PP/5R1K b - - 2 18',
    lines: [{ cp: -90, pv: ['h5f6', 'd2e4', 'a5c7', 'e4f6', 'g7f6'] }],
  };

  it('isn’t said to punish the check', () => {
    const error = playedBetween([34, before, check], 'e7e3');
    expect(textOf(playedBetween([35, check, fled], 'g1h1', error))).toBe('');
  });
});

describe('a sacrifice', () => {
  // 16.Rxh5!: the rook takes the bishop, and taking it back loses.
  const before: Analysed = {
    fen: '1r3rk1/pp2qppp/2p2n2/b3NR1b/2BP4/1QP5/PP1N2PP/5RK1 w - - 0 16',
    lines: [
      { cp: 295, pv: ['f5h5', 'f6h5', 'f1f7', 'f8f7', 'c4f7'] },
      { cp: 259, pv: ['d2e4', 'f6e4'] },
    ],
  };
  const after: Analysed = {
    fen: '1r3rk1/pp2qppp/2p2n2/b3N2R/2BP4/1QP5/PP1N2PP/5RK1 b - - 0 16',
    lines: [
      { cp: -310, pv: ['f6h5', 'f1f7', 'f8f7', 'c4f7'] },
      { cp: -409, pv: ['a5c7', 'h5f5'] },
    ],
  };

  it('says what it takes before it’s taken', () => {
    const move = playedBetween([31, before, after], 'f5h5');
    expect(move.moveClass).toBe('brilliant');
    const rook = { role: 'rook', color: 'white' } as const;
    const bishop = { role: 'bishop', color: 'black' } as const;
    expect(en.facts.offeredFor(rook, bishop, 'black')).toContain(findings(move, en).fact?.text);
  });
});

describe('a mate under way', () => {
  // 28...Bd4+, and Black mates next: Kh1 Re1# or Kf1 Nd2#.
  const before: Analysed = {
    fen: '4r2k/pR4b1/2R4p/8/2n5/2N5/PP4PP/6K1 b - - 0 28',
    lines: [{ mate: 2, pv: ['g7d4', 'g1f1', 'c4d2'] }],
  };
  const check: Analysed = {
    fen: '4r2k/pR6/2R4p/8/2nb4/2N5/PP4PP/6K1 w - - 1 29',
    lines: [{ mate: -1, pv: ['g1h1', 'e8e1'] }],
  };
  const fled: Analysed = {
    fen: '4r2k/pR6/2R4p/8/2nb4/2N5/PP4PP/5K2 b - - 2 29',
    lines: [{ mate: 1, pv: ['c4d2'] }],
  };

  it('is played out for the side that mates', () => {
    const move = playedBetween([56, before, check], 'g7d4');
    expect(textOf(move)).toBe('Mate follows by force: [[m:w:Kh1]] [[m:b:Re1#]].');
  });

  it('is played out for the side mated, whose move can’t stop it', () => {
    const answer = playedBetween([57, check, fled], 'g1f1');
    expect(en.facts.mateUnstoppable('[[m:b:Nd2#]]')).toContain(textOf(answer));
  });
});

describe('a piece attacked that steps away', () => {
  // 17.a4 attacks the bishop on b5, which goes to a6: it's chased, not won.
  const before: Analysed = {
    fen: 'r2q1rk1/3n1pbp/2p1p1p1/pbNp4/3P4/4B1P1/PP2PPBP/2RQR1K1 w - - 10 17',
    lines: [{ cp: 21, pv: ['a2a4', 'b5a6', 'c5a6', 'a8a6', 'e3f4'] }],
  };
  const after: Analysed = {
    fen: 'r2q1rk1/3n1pbp/2p1p1p1/pbNp4/P2P4/4B1P1/1P2PPBP/2RQR1K1 b - - 0 17',
    lines: [{ cp: -13, pv: ['b5a6', 'c5a6', 'a8a6', 'e3f4', 'd8b6'] }],
  };
  const passed = passedFen(after.fen) ?? '';
  const threat = {
    fen: passed,
    record: toRecord(passed, { lines: [{ cp: 250, pv: ['a4b5', 'c6b5', 'e3f4'] }] }),
  };

  it('is said to be chased, not threatened', () => {
    const move = playedBetween([33, before, after], 'a2a4');
    const said = findings(move, en, { before: null, after: threat }).fact?.text;
    expect(said).toBe('The [[p:bb]]bishop on [[s:b5]] has to move: that gains a tempo.');
  });
});
