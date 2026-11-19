import { describe, expect, it } from 'vitest';
import { positionKey, studyPositions } from '#page/review/theory/study.ts';
import { positionGame, theorySnapshot } from './theory-snapshot.ts';

const STUDY = `[Event "First moves"]

1. e4 { The king's pawn. [%csl Gd5][%cal Re2e4] } 1... e5 { The open game. } ( 1... c5 ) ( 1... f6 $2 { Weak. } 2. Qh5+ ) 2. Nf3 *`;

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const AFTER_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const AFTER_F6 = 'rnbqkbnr/ppppp1pp/5p2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

describe('theorySnapshot', () => {
  it('keeps the positions of the game the study comments, read back as they were', () => {
    const positions = studyPositions(STUDY);
    const snapshot = studyPositions(theorySnapshot(positions, [START, AFTER_E4, AFTER_E5]));
    expect([...snapshot.keys()]).toEqual([positionKey(AFTER_E4), positionKey(AFTER_E5)]);
    for (const [key, position] of snapshot) expect(position).toEqual(positions.get(key));
  });

  it('marks a mistake as the study does', () => {
    const positions = studyPositions(STUDY);
    const snapshot = studyPositions(theorySnapshot(positions, [AFTER_F6]));
    expect(snapshot.get(positionKey(AFTER_F6))).toEqual(positions.get(positionKey(AFTER_F6)));
    expect(snapshot.get(positionKey(AFTER_F6))?.mistake).toBe(true);
  });
});

describe('positionGame', () => {
  it('writes the line bare, then the comment with its shapes, then theory’s moves', () => {
    const position = studyPositions(STUDY).get(positionKey(AFTER_E4));
    if (!position) throw new Error('no 1. e4');
    expect(positionGame(position)).toBe(
      `[Event "e4"]\n\n1. e4 { The king's pawn. [%csl Gd5][%cal Re2e4] } 1... e5 ( 1... c5 ) *`,
    );
  });
});
