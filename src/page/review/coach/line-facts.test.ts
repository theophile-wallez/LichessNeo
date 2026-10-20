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
  /** The move that led to `from`, its SAN. */
  readonly last?: string;
}

function verdict({ from, uci, san, to, before, after, last }: Played): MoveVerdict {
  return judge({
    previousPosition: { ply: 59, fen: from, ...(last ? { san: last } : {}) },
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
    expect(text(lossFact(input(move)))).toBe(
      'That costs a [[p:wr]]rook in two moves: [[m:b:Nc2+]] [[m:w:Kd2]] [[m:b:Nxa1]]. [[m:b:Nc2+]] is a fork, on the [[p:wk]]king and the [[p:wr]]rook.',
    );
    expect(lossFact(input(move))?.theme).toBe('fork');
  });

  it('says nothing the engine’s score doesn’t show', () => {
    const move = verdict({ ...INTO_FORK, after: { ...INTO_FORK.after, cp: 400 } });
    expect(lossFact(input(move))).toBeNull();
  });

  it('says nothing mid-trade, where a recapture would count as a win', () => {
    expect(lossFact(input(verdict({ ...INTO_FORK, last: 'Rxa8' })))).toBeNull();
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
  it('plays out what the best move would have won', () => {
    expect(text(bestGainFact(input(verdict(MISSED_FORK))))).toBe(
      'Better was to win a [[p:wr]]rook in two moves: [[m:b:Nc2+]] [[m:w:Kd2]] [[m:b:Nxa1]]. [[m:b:Nc2+]] is a fork, on the [[p:wk]]king and the [[p:wr]]rook.',
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
    expect(text(gainFact(input(verdict(FORK))))).toBe(
      'That nets a [[p:br]]rook in two moves: [[m:w:Nc7+]] [[m:b:Kd7]] [[m:w:Nxa8]]. [[m:w:Nc7+]] forks the [[p:bk]]king and the [[p:br]]rook.',
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

  it('says nothing of a mate too long to be sure of, or a line short of it', () => {
    const shuffles = 'g8f8 g1f1 f8g8 f1g1 g8f8 g1f1 f8g8 f1g1 g8f8 g1f1 a8a1';
    const long = record({ mate: -6, whiteWinChance: 0, line: shuffles });
    expect(mateLine(long, BACK_RANK, null)).toBeNull();
    const short = record({ mate: -2, whiteWinChance: 0, line: 'a8a1' });
    expect(mateLine(short, BACK_RANK, null)).toBeNull();
  });
});
