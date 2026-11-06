import { describe, expect, it } from 'vitest';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { en } from '#page/review/i18n/en.ts';
import { judge } from '#page/review/judge/judge.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { bestGainFact, gainFact, lossFact, mateLine } from './line-facts.ts';

// The moves' chips play their line on the board; the sentences are read without.
const PLAY = /@[ab]:[^\]]*/g;
const text = (fact: { text: string } | null): string | null => fact && fact.text.replace(PLAY, '');

interface Scored {
  readonly cp?: number;
  readonly mate?: number;
  readonly whiteWinChance: number;
  readonly line: string;
}

const record = ({ cp, mate, whiteWinChance, line }: Scored): PositionRecord => {
  const moves = line.split(' ');
  const fields = { whiteWinChance, secondLineWinChance: null, best: moves[0] ?? null, line: moves };
  return mate === undefined ? { cp: cp ?? 0, ...fields } : { mate, ...fields };
};

interface Played {
  readonly from: string;
  readonly uci: string;
  readonly san: string;
  readonly to: string;
  readonly before: Scored;
  readonly after: Scored;
  /** The move that led to `from`, its SAN and UCI. */
  readonly last?: { readonly san: string; readonly uci: string };
  /** The opponent's move that led to `from`, judged. */
  readonly previousMove?: MoveVerdict;
}

function verdict({ from, uci, san, to, before, after, last, previousMove }: Played): MoveVerdict {
  return judge({
    previousPosition: { ply: 59, fen: from, ...last },
    previousMove,
    position: { ply: 60, fen: to, uci, san },
    before: record(before),
    after: record(after),
    book: false,
    chess960: false,
  });
}

const input = (move: MoveVerdict) => ({
  move,
  facts: en.facts,
  me: move.color,
  them: move.color === 'white' ? ('black' as const) : ('white' as const),
});

// White's king walks into a knight's fork of it and the rook.
const INTO_FORK: Played = {
  from: '7k/8/8/8/3n4/8/5K1P/R7 w - - 0 30',
  uci: 'f2e1',
  san: 'Ke1',
  to: '7k/8/8/8/3n4/8/7P/R3K3 b - - 1 30',
  before: { cp: 500, whiteWinChance: 85, line: 'f2g3 h8g8 h2h4 g8f7' },
  after: { cp: 0, whiteWinChance: 50, line: 'd4c2 e1d2 c2a1 h2h3 h8g8' },
};

describe('lossFact', () => {
  it('plays out what the error lets the opponent win, and the tactic', () => {
    const move = verdict(INTO_FORK);
    expect(move.moveClass).toBe('blunder');
    const fact = lossFact(input(move));
    expect(text(fact)).toBe('[[m:b:Nc2+]] is a fork of the [[p:wk]]king and the [[p:wr]]rook.');
    expect(fact?.detail?.replace(PLAY, '')).toBe(
      'That costs a [[p:wr]]rook in two moves: [[m:b:Nc2+]] [[m:w:Kd2]] [[m:b:Nxa1]].',
    );
    expect(fact?.theme).toBe('fork');
  });

  it('says nothing the engine’s score doesn’t show', () => {
    const move = verdict({ ...INTO_FORK, after: { ...INTO_FORK.after, cp: 400 } });
    expect(lossFact(input(move))).toBeNull();
  });
});

// Black's knight has just taken one on d4, and White plays h3 instead of Rxd4.
const NOT_RETAKEN: Played = {
  from: '7k/8/8/8/3n4/8/7P/3R2K1 w - - 0 30',
  uci: 'h2h3',
  san: 'h3',
  to: '7k/8/8/8/3n4/7P/8/3R2K1 b - - 0 30',
  before: { cp: 900, whiteWinChance: 99, line: 'd1d4 h8g8 g1f2 g8f7' },
  after: { cp: 500, whiteWinChance: 97, line: 'd4e2 g1f2 e2f4 d1d7' },
  last: { san: 'Nxd4', uci: 'c6d4' },
};

describe('mid-trade', () => {
  it('says nothing where taking back would count as a win', () => {
    expect(bestGainFact(input(verdict(NOT_RETAKEN)))).toBeNull();
  });

  it('counts what is taken on the square once the trade there is over', () => {
    // 3...dxe5 4.dxe5: Qxd1+ instead of Qa5+, which wins the e5 pawn back.
    const retake = verdict({
      from: 'rnbqkbnr/pp2pppp/2p5/4p3/3P4/8/PPP2PPP/RNBQKBNR w KQkq - 0 4',
      uci: 'd4e5',
      san: 'dxe5',
      to: 'rnbqkbnr/pp2pppp/2p5/4P3/8/8/PPP2PPP/RNBQKBNR b KQkq - 0 4',
      before: { cp: -60, whiteWinChance: 44, line: 'd4e5 d8a5' },
      after: { cp: -67, whiteWinChance: 44, line: 'd8a5 b1d2 a5e5 g1f3' },
      last: { san: 'dxe5', uci: 'd6e5' },
    });
    const move = verdict({
      from: retake.position.fen,
      uci: 'd8d1',
      san: 'Qxd1+',
      to: 'rnb1kbnr/pp2pppp/2p5/4P3/8/8/PPP2PPP/RNBqKBNR w KQkq - 0 5',
      before: { cp: -67, whiteWinChance: 44, line: 'd8a5 b1d2 a5e5 g1f3' },
      after: { cp: 1, whiteWinChance: 50, line: 'e1d1 c8f5 g1f3 b8d7' },
      last: { san: 'dxe5', uci: 'd4e5' },
      previousMove: retake,
    });
    expect(text(bestGainFact(input(move)))).toMatch(/win the \[\[s:e5\]\] \[\[p:wp\]\]pawn/);
  });

  it('counts a line that wins elsewhere, after a capture taken back already', () => {
    // A capture on a8 that neither line takes back: no trade to wait for.
    const move = verdict({ ...INTO_FORK, last: { san: 'Rxa8', uci: 'a1a8' } });
    expect(text(lossFact(input(move)))).toBe(
      '[[m:b:Nc2+]] is a fork of the [[p:wk]]king and the [[p:wr]]rook.',
    );
  });
});

// Black has the fork, and plays a king move instead.
const MISSED_FORK: Played = {
  from: '7k/8/8/8/3n4/8/7P/R3K3 b - - 1 30',
  uci: 'h8g8',
  san: 'Kg8',
  to: '6k1/8/8/8/3n4/8/7P/R3K3 w - - 2 31',
  before: { cp: -500, whiteWinChance: 15, line: 'd4c2 e1d2 c2a1 h2h3 h8g8' },
  after: { cp: 0, whiteWinChance: 50, line: 'e1d1 g8f7 h2h4 f7e6' },
};

describe('bestGainFact', () => {
  it('goes four moves deep for a piece, and plays out the start and the capture', () => {
    // The rook comes round to the knight on h4, which never moves.
    const slow: Played = {
      from: '1k6/8/8/8/7n/8/8/R5K1 w - - 0 30',
      uci: 'g1f2',
      san: 'Kf2',
      to: '1k6/8/8/8/7n/8/5K2/R7 b - - 1 30',
      before: { cp: 400, whiteWinChance: 85, line: 'a1e1 b8a8 e1e2 a8b8 e2h2 b8a8 h2h4 a8b8' },
      after: { cp: 0, whiteWinChance: 50, line: 'h4f5 a1a5 f5d6 a5d5' },
    };
    expect(text(bestGainFact(input(verdict(slow))))).toMatch(
      /win a \[\[p:bn\]\]knight in four moves: \[\[m:w:Re1\]\] … \[\[m:w:Rxh4\]\]\./,
    );
  });

  it('plays out what the best move would have won', () => {
    expect(text(bestGainFact(input(verdict(MISSED_FORK))))).toBe(
      'Better was to win a [[p:wr]]rook in two moves: [[m:b:Nc2+]] [[m:w:Kd2]] [[m:b:Nxa1]]. [[m:b:Nc2+]] is a fork of the [[p:wk]]king and the [[p:wr]]rook.',
    );
  });
});

// White's knight forks the king and the rook.
const FORK: Played = {
  from: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 30',
  uci: 'd5c7',
  san: 'Nc7+',
  to: 'r3k3/2N5/8/8/8/8/8/4K3 b - - 1 30',
  before: { cp: 300, whiteWinChance: 75, line: 'd5c7 e8d7 c7a8 d7c8 e1e2' },
  after: { cp: 300, whiteWinChance: 75, line: 'e8d7 c7a8 d7c8 e1e2' },
};

describe('gainFact', () => {
  it('plays out what a good move wins, and the tactic', () => {
    const fact = gainFact(input(verdict(FORK)));
    expect(text(fact)).toBe('[[m:w:Nc7+]] forks the [[p:bk]]king and the [[p:br]]rook.');
    expect(fact?.detail?.replace(PLAY, '')).toBe(
      'That nets a [[p:br]]rook in two moves: [[m:w:Nc7+]] [[m:b:Kd7]] [[m:w:Nxa8]].',
    );
  });

  it('wants the score to show the gain on top of the board’s count', () => {
    const level = { ...FORK.after, cp: -100 };
    expect(gainFact(input(verdict({ ...FORK, after: level })))).toBeNull();
  });
});

describe('mateLine', () => {
  const BACK_RANK = 'r5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 30';

  it('writes a sure mate move by move, its last marked', () => {
    const mate = record({ mate: -1, whiteWinChance: 0, line: 'a8a1' });
    expect(mateLine(mate, BACK_RANK, null)).toBe('[[m:b:Ra1#]]');
  });

  it('writes it from the side mated too, a move longer, and short as its first and last', () => {
    const toMove = 'r5k1/5ppp/8/8/8/8/1P3PPP/6K1 w - - 0 30';
    const mate = record({ mate: -1, whiteWinChance: 0, line: 'b2b3 a8a1' });
    expect(mateLine(mate, toMove, null)).toBe('[[m:w:b3]] [[m:b:Ra1#]]');
    const longer = record({ mate: -3, whiteWinChance: 0, line: 'b2b3 h7h6 b3b4 h6h5 b4b5 a8a1' });
    expect(mateLine(longer, toMove, 'a', { short: true })).toMatch(
      /^\[\[m:w:b3@a:b2b3\]\] … \[\[m:b:Ra1#@a:[^\]]*\]\]$/,
    );
  });

  it('says nothing of a mate too long to be sure of, or a line short of it', () => {
    const shuffles = 'g8f8 g1f1 f8g8 f1g1 g8f8 g1f1 f8g8 f1g1 g8f8 g1f1 a8a1';
    const long = record({ mate: -6, whiteWinChance: 0, line: shuffles });
    expect(mateLine(long, BACK_RANK, null)).toBeNull();
    const short = record({ mate: -2, whiteWinChance: 0, line: 'a8a1' });
    expect(mateLine(short, BACK_RANK, null)).toBeNull();
  });
});
