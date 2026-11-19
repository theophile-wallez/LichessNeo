import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { takeTestTheory } from '#page/review/fixtures/theory.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { commentOn } from './verdict.ts';

beforeAll(takeTestTheory);

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

describe('a move whose theory the coach explains', () => {
  const { session } = judgedGame('opera');
  const e4 = session.view.review?.moves[0];
  if (e4?.san !== 'e4') throw new Error('the game doesn’t open with 1. e4');
  const comment = (hint: readonly { text: string; droppable: boolean }[] = []) =>
    commentOn(session, { move: e4, gameId: 'opera', hint, timing: null, turning: false });

  it('draws the theory’s own shapes, and tags no tactic', () => {
    const { parts, drawing, themes } = comment();
    expect(parts.map(part => part.text)).toContain("The king's pawn.");
    expect(drawing).toEqual({
      topic: 'plans',
      marks: [{ kind: 'ring', square: 'd5', tone: 'defense' }],
    });
    expect(themes).toEqual([]);
  });

  it('draws nothing under Explain’s sentences', () => {
    expect(comment([{ text: 'Sicilian Defense', droppable: false }]).drawing).toBeNull();
  });
});
