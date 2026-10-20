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
// The fool's mate: 1. f3 e5, then 2. g4?? lets Qh4 mate.
const AFTER_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2';
const AFTER_G4 = 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2';

const record = (whiteWinChance: number, best: string | null): PositionRecord => ({
  cp: Math.round((whiteWinChance - 50) * 20),
  whiteWinChance,
  secondLineWinChance: null,
  best,
});

const CONTEXT = { gameId: 'abcdefgh', coach: 1, language: en };
const said = (move: MoveVerdict, turning = false) =>
  explanation(move, CONTEXT, { opening: '', threats: NO_THREATS, turning });

/** White's e4 at `ply`, from a position worth `before` to one worth `after`. */
function e4(before: PositionRecord, after: PositionRecord, ply = 1): MoveVerdict {
  return judge({
    previousPosition: { ply: ply - 1, fen: START },
    position: { ply, fen: AFTER_E4, uci: 'e2e4', san: 'e4' },
    before,
    after,
    book: false,
    chess960: false,
  });
}

/** Black's blunder 1… f6, then White's 2. d4 that punishes it, to a position worth `after`. */
function punisher(after: number) {
  const blunder = judge({
    previousPosition: { ply: 1, fen: AFTER_E4, uci: 'e2e4', san: 'e4' },
    position: { ply: 2, fen: AFTER_F6, uci: 'f7f6', san: 'f6' },
    before: record(25, 'e7e5'),
    after: record(85, 'd2d4'),
    book: false,
    chess960: false,
  });
  const move = judge({
    previousPosition: { ply: 2, fen: AFTER_F6, uci: 'f7f6', san: 'f6' },
    position: { ply: 3, fen: AFTER_D4, uci: 'd2d4', san: 'd4' },
    before: record(85, 'd2d4'),
    after: record(after, 'e7e5'),
    book: false,
    chess960: false,
    previousMove: blunder,
  });
  expect([blunder.moveClass, move.moveClass]).toEqual(['blunder', 'best']);
  return said(move);
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

  it('says nothing of the course a move only cashes in from an error', () => {
    const course = punisher(85).find(part => part.droppable);
    expect(course).toBeUndefined();
  });

  it('tells a move that punishes an error past it, from before the error', () => {
    const course = punisher(97).find(part => part.droppable)?.text;
    const black = { side: 'black', advantage: 'a clear advantage' } as const;
    const white = { side: 'white', advantage: 'a winning position' } as const;
    expect(en.trajectory.swings(black, white)).toContain(course);
  });

  it('says the error the game turned on', () => {
    const blunder = e4(record(80, 'd2d4'), record(40, 'e7e5'));
    const turned = said(blunder, true).filter(part => part.droppable);
    expect(turned.some(part => en.trajectory.turningPoint.includes(part.text))).toBe(true);
    const parts = said(blunder);
    expect(parts.some(part => en.trajectory.turningPoint.includes(part.text))).toBe(false);
  });

  it('names the move a little better than a good one, even in a decided game', () => {
    const nitpick = /more precise|slightly better|more accurate/;
    const good = e4(record(52, 'd2d4'), record(49, 'e7e5'), 41);
    expect(good.moveClass).toBe('good');
    expect(said(good)[0]?.text).toMatch(nitpick);
    const won = e4(record(98, 'd2d4'), record(96, 'e7e5'), 41);
    expect(won.moveClass).toBe('good');
    expect(said(won)[0]?.text).toMatch(nitpick);
  });

  it('says a good move’s plan before the nitpick in the opening', () => {
    const good = e4(record(52, 'd2d4'), record(49, 'e7e5'));
    expect(good.moveClass).toBe('good');
    expect(en.facts.center).toContain(said(good)[0]?.text);
  });

  it('leaves the course to a fact that speaks of the mate', () => {
    const blunder = judge({
      previousPosition: { ply: 2, fen: AFTER_E5, uci: 'e7e5', san: 'e5' },
      position: { ply: 3, fen: AFTER_G4, uci: 'g2g4', san: 'g4' },
      before: record(40, 'b1c3'),
      after: { mate: -1, whiteWinChance: 0, secondLineWinChance: null, best: 'd8h4' },
      book: false,
      chess960: false,
    });
    expect(said(blunder)).toEqual([
      { text: 'Nothing stops [[m:b:Qh4@a:d8h4]], and it’s mate.', droppable: false },
    ]);
  });
});
