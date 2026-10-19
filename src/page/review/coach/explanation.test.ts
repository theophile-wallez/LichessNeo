import { describe, expect, it } from 'vitest';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { en } from '#page/review/i18n/en.ts';
import { judge } from '#page/review/judge/judge.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { explanation } from './explanation.ts';
import { NO_THREATS } from './threat-facts.ts';

// When the comment says how the game changed.

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const AFTER_F6 = 'rnbqkbnr/ppppp1pp/5p2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const AFTER_D4 = 'rnbqkbnr/ppppp1pp/5p2/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2';

const record = (whiteWinChance: number, best: string | null): PositionRecord => ({
  cp: Math.round((whiteWinChance - 50) * 20),
  whiteWinChance,
  secondLineWinChance: null,
  best,
});

const CONTEXT = { gameId: 'abcdefgh', coach: 1, language: en };
const said = (move: MoveVerdict) =>
  explanation(move, CONTEXT, { opening: '', threats: NO_THREATS });

/** White's 1. e4, from a position worth `before` to one worth `after`. */
function e4(before: PositionRecord, after: PositionRecord): MoveVerdict {
  return judge({
    previousPosition: { ply: 0, fen: START },
    position: { ply: 1, fen: AFTER_E4, uci: 'e2e4', san: 'e4' },
    before,
    after,
    book: false,
    chess960: false,
  });
}

describe('the comment', () => {
  it('says nothing of the game’s course when the advantage stays as it was', () => {
    const parts = said(e4(record(52, 'e2e4'), record(53, 'e7e5')));
    expect(parts).toHaveLength(1);
    expect(parts[0]?.droppable).toBe(false);
  });

  it('says how the game changed when the advantage does', () => {
    const parts = said(e4(record(52, 'e2e4'), record(75, 'e7e5')));
    expect(parts.map(part => part.droppable)).toEqual([false, true]);
    expect(
      en.trajectory.wasBalanced({ side: 'white', advantage: 'a clear advantage' }, true),
    ).toContain(parts[1]?.text);
  });

  it('keeps an error’s fact without the course that didn’t change', () => {
    const parts = said(e4(record(80, 'd2d4'), record(72, 'e7e5')));
    expect(parts.map(part => part.text).join(' ')).not.toMatch(/clear advantage/);
  });

  it('tells an error with nothing else to say that the advantage is still there', () => {
    const parts = said(e4(record(80, null), record(72, 'e7e5')));
    expect(en.trajectory.stillAhead({ side: 'white', advantage: 'a clear advantage' })).toContain(
      parts[0]?.text,
    );
  });

  it('tells a move that punishes an error from before the error', () => {
    const blunder = judge({
      previousPosition: { ply: 1, fen: AFTER_E4, uci: 'e2e4', san: 'e4' },
      position: { ply: 2, fen: AFTER_F6, uci: 'f7f6', san: 'f6' },
      before: record(25, 'e7e5'),
      after: record(85, 'd2d4'),
      book: false,
      chess960: false,
    });
    const punisher = judge({
      previousPosition: { ply: 2, fen: AFTER_F6, uci: 'f7f6', san: 'f6' },
      position: { ply: 3, fen: AFTER_D4, uci: 'd2d4', san: 'd4' },
      before: record(85, 'd2d4'),
      after: record(85, 'e7e5'),
      book: false,
      chess960: false,
      previousMove: blunder,
    });
    expect([blunder.moveClass, punisher.moveClass]).toEqual(['blunder', 'best']);
    const course = said(punisher).find(part => part.droppable)?.text;
    const black = { side: 'black', advantage: 'a clear advantage' } as const;
    const white = { side: 'white', advantage: 'a clear advantage' } as const;
    expect(en.trajectory.swings(black, white)).toContain(course);
  });
});
