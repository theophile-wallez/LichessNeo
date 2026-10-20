import { describe, expect, it } from 'vitest';
import { fixtureGames, legacyColor, replay } from '#page/review/fixtures/replay.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { nearlyObject } from '#shared/testing/numbers.ts';
import { mateVerdict, SURE_MATE } from './mate.ts';
import { judge } from './judge.ts';
import {
  type ClassTarget,
  classCounts,
  type FoundMove,
  nextOfClass,
  playerAccuracy,
} from './summary.ts';
import { isPlayed, type MoveVerdict } from './types.ts';
// What the original script judged on the fixture games, and its mate verdicts.
import legacy from './fixtures/legacy.json' with { type: 'json' };
import legacyMates from './fixtures/legacy-mate.json' with { type: 'json' };

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

const record = (
  whiteWinChance: number,
  best: string | null = 'e2e4',
  secondLineWinChance: number | null = null,
): PositionRecord => ({
  cp: 0,
  whiteWinChance,
  secondLineWinChance,
  best,
});

// White's e4 from `cp`, letting in a mate in one; the win probabilities are the formula's for these scores.
const letIn = (cp: number, whiteWinChance: number, best = 'd2d4'): MoveVerdict =>
  judge({
    previousPosition: { ply: 0, fen: START },
    position: { ply: 1, fen: AFTER_E4, uci: 'e2e4', san: 'e4' },
    before: { cp, whiteWinChance, ...NO_LINE, best },
    after: { mate: -1, whiteWinChance: 0, ...NO_LINE },
    book: false,
    chess960: false,
  });

describe('judge', () => {
  it('judges every fixture move as the original did', () => {
    for (const [index, game] of fixtureGames().entries()) {
      const expected = legacy[index]?.moves ?? [];
      const moves = replay(game);
      expect(moves).toHaveLength(expected.length);
      for (const [i, move] of moves.entries()) {
        const { color, cls, ...rest } = expected[i] ?? { color: '', cls: '' };
        expect({ ...move, color: legacyColor(move.color) }).toMatchObject(
          nearlyObject({ ...rest, moveClass: cls, color }),
        );
      }
    }
  });

  it('covers every class', () => {
    const classes = new Set(
      fixtureGames().flatMap(game => replay(game).map(move => move.moveClass)),
    );
    expect(classes.size).toBe(10);
  });

  it('keeps the positions and the previous move for the coach', () => {
    const [game] = fixtureGames();
    if (!game) throw new Error('no fixture game');
    const [first, second] = replay(game);
    expect(first?.previousMove).toBeNull();
    expect(second?.previousMove).toBe(first);
    expect(second?.position).toEqual(game.nodes[2]);
  });

  it('matches castling in Lichess notation to the engine’s', () => {
    const before = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const after = 'r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1';
    const move = (chess960: boolean) =>
      judge({
        previousPosition: { ply: 0, fen: before },
        position: { ply: 1, fen: after, uci: 'e1h1', san: 'O-O' },
        before: record(60, 'e1g1'),
        after: record(59),
        book: false,
        chess960,
      });
    expect(move(false).moveClass).toBe('best');
    expect(move(true).moveClass).toBe('excellent');
    expect(move(false).bestSan).toBe('O-O');
  });

  it('calls another way to a long mate excellent, not best', () => {
    expect(longMateMove({ uci: 'e2e4', san: 'e4' }).moveClass).toBe('excellent');
    expect(longMateMove({ uci: 'd2d4', san: 'd4' }).moveClass).toBe('best');
    // A quicker mate than the engine's, or a server analysis with no engine move to compare.
    expect(longMateMove({ uci: 'e2e4', san: 'e4', after: SURE_MATE + 1 }).moveClass).toBe('best');
    expect(longMateMove({ uci: 'e2e4', san: 'e4', best: null }).moveClass).toBe('best');
  });

  it('calls an only move great, but never taking back', () => {
    const exd5 = 'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2';
    const only = (uci: string, san: string): MoveVerdict =>
      judge({
        previousPosition: { ply: 3, fen: exd5, uci: 'e4d5', san: 'exd5' },
        position: { ply: 4, fen: START, uci, san },
        before: record(50, uci, 75),
        after: record(50),
        book: false,
        chess960: false,
      });
    expect(only('g8f6', 'Nf6').moveClass).toBe('great');
    expect(only('d8d5', 'Qxd5').moveClass).toBe('best');
  });

  it('calls a mate let in a blunder from a game still on, as Lichess does', () => {
    expect(letIn(-600, 9.9).moveClass).toBe('blunder');
    expect(letIn(-900, 3.5).moveClass).toBe('mistake');
    expect(letIn(-1200, 1.2).moveClass).toBe('inaccuracy');
    expect(letIn(-600, 9.9).slower).toBe(false);
    expect(letIn(-600, 9.9, 'e2e4').moveClass).not.toBe('blunder');
  });

  it('calls a book move book, at full accuracy', () => {
    const move = judge({
      previousPosition: { ply: 0, fen: START },
      position: { ply: 1, fen: AFTER_E4, uci: 'e2e4', san: 'e4' },
      before: record(60, 'd2d4'),
      after: record(20),
      book: true,
      chess960: false,
    });
    expect(move).toMatchObject({ moveClass: 'book', accuracy: 100, color: 'white', bestSan: 'd4' });
    expect(move.loss).toBe(40);
  });
});

const NO_LINE = { secondLineWinChance: null, best: null };

interface LongMate {
  readonly uci: string;
  readonly san: string;
  /** The engine's move, d4 unless given. */
  readonly best?: string | null;
  /** White's mate after the move, a move slower than the engine's unless given. */
  readonly after?: number;
}

/** A move from the start where White mates in a few more moves than SURE_MATE. */
const longMateMove = ({ uci, san, best = 'd2d4', after = SURE_MATE + 4 }: LongMate): MoveVerdict =>
  judge({
    previousPosition: { ply: 0, fen: START },
    position: { ply: 1, fen: AFTER_E4, uci, san },
    before: winning(SURE_MATE + 3, best),
    after: winning(after, null),
    book: false,
    chess960: false,
  });

/** White mates in `moves`. */
const winning = (moves: number, best: string | null): PositionRecord => ({
  mate: moves,
  whiteWinChance: 100,
  secondLineWinChance: null,
  best,
});

const mate = (moves: number | null): PositionRecord =>
  moves === null ? record(50, null) : { mate: moves, whiteWinChance: 0, ...NO_LINE };

describe('mateVerdict', () => {
  it('gives the original’s verdict for every pair of mate distances', () => {
    for (const [before, after, color, verdict] of legacyMates) {
      const ownColor = color === 'w' ? 'white' : 'black';
      const recordBefore =
        before === null ? { cp: 100, whiteWinChance: 60, ...NO_LINE } : mate(Number(before));
      const recordAfter =
        after === null ? { cp: -50, whiteWinChance: 45, ...NO_LINE } : mate(Number(after));
      expect(mateVerdict(recordBefore, recordAfter, ownColor)).toBe(verdict);
    }
  });

  it('only trusts short mates', () => {
    expect(mateVerdict(mate(SURE_MATE), mate(SURE_MATE + 3), 'white')).toBe('good');
    expect(mateVerdict(mate(SURE_MATE + 1), mate(SURE_MATE + 9), 'white')).toBeNull();
    expect(mateVerdict(mate(2), mate(null), 'white')).toBe('inaccuracy');
  });
});

describe('isPlayed', () => {
  it('tells a position reached by a move from the start', () => {
    expect(isPlayed({ ply: 0, fen: START })).toBe(false);
    expect(isPlayed({ ply: 1, fen: AFTER_E4, uci: 'e2e4', san: 'e4' })).toBe(true);
    expect(isPlayed({ ply: 1, fen: AFTER_E4, uci: 'e2e4' })).toBe(false);
  });
});

describe('summary', () => {
  it('averages the arithmetic and harmonic means', () => {
    const moves: Parameters<typeof classCounts>[0] = [
      { color: 'white', moveClass: 'best', accuracy: 100 },
      { color: 'white', moveClass: 'blunder', accuracy: 0 },
      { color: 'black', moveClass: 'good', accuracy: 80 },
    ];
    expect(playerAccuracy(moves, 'white')).toBeCloseTo((50 + 2 / (1 / 100 + 1)) / 2);
    expect(playerAccuracy(moves, 'black')).toBe(80);
    expect(playerAccuracy([], 'white')).toBeNull();
    expect(classCounts(moves)).toEqual({ white: { best: 1, blunder: 1 }, black: { good: 1 } });
  });
});

describe('nextOfClass', () => {
  const moves: readonly (FoundMove | undefined)[] = [
    { ply: 1, color: 'white', moveClass: 'best' },
    { ply: 2, color: 'black', moveClass: 'blunder' },
    undefined,
    { ply: 4, color: 'black', moveClass: 'mistake' },
    { ply: 5, color: 'white', moveClass: 'blunder' },
    { ply: 6, color: 'black', moveClass: 'blunder' },
  ];
  const blackBlunders: ClassTarget = { color: 'black', moveClass: 'blunder' };

  it('finds the player’s first move of the class from the start', () => {
    expect(nextOfClass(moves, blackBlunders, 0)?.ply).toBe(2);
  });

  it('goes to the next one after any ply, skipping the other player’s', () => {
    expect(nextOfClass(moves, blackBlunders, 2)?.ply).toBe(6);
    expect(nextOfClass(moves, blackBlunders, 3)?.ply).toBe(6);
    expect(nextOfClass(moves, blackBlunders, 4)?.ply).toBe(6);
  });

  it('starts over from the first past the last one', () => {
    expect(nextOfClass(moves, blackBlunders, 6)?.ply).toBe(2);
    expect(nextOfClass(moves, { color: 'white', moveClass: 'blunder' }, 5)?.ply).toBe(5);
  });

  it('finds nothing when the player made no such move', () => {
    expect(nextOfClass(moves, { color: 'white', moveClass: 'mistake' }, 0)).toBeUndefined();
    expect(nextOfClass([], blackBlunders, 0)).toBeUndefined();
  });
});
