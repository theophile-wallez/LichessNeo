import { describe, expect, it } from 'vitest';
import { moveToken } from '#page/review/comment/tokens.ts';
import { played, record } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import { factInput } from '#page/review/fixtures/fact-input.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { FactInput } from './fact.ts';
import { nextFact } from './next-fact.ts';
import { freshTold } from './told.ts';

const inputOf = (move: MoveVerdict, told = freshTold()): FactInput => factInput(move, { told });

// The b-file is open for White's rook once the e-pawn has moved.
const FEN = '4k3/p3p3/8/8/8/8/P3P3/R3K3 w - - 0 1';

const quiet = (line: readonly string[], before = record(60, ['e2e3'])): MoveVerdict =>
  played({ fen: FEN, uci: 'e2e3', before, after: record(60, line) });

describe('nextFact', () => {
  it('says the idea of the next move along the engine’s line', () => {
    const next = moveToken('Rb1', 'white', { base: 'a', ucis: ['e8d8', 'a1b1'] });
    const text = nextFact(inputOf(quiet(['e8d8', 'a1b1'])))?.text;
    expect(en.facts.nextUp(next, 'taking the open file')).toContain(text);
  });

  it('says it once over the moves around it', () => {
    const told = freshTold(new Set(['openFile:a1b1']));
    expect(nextFact(inputOf(quiet(['e8d8', 'a1b1']), told))).toBeNull();
  });

  it('isn’t said of a capture to come', () => {
    expect(nextFact(inputOf(quiet(['e8d8', 'a1a7'])))).toBeNull();
  });

  it('isn’t said of an error, whose line the engine didn’t mean', () => {
    const error = quiet(['e8d8', 'a1b1'], record(90, ['a2a4']));
    expect(error.moveClass).not.toBe('best');
    expect(nextFact(inputOf(error))).toBeNull();
  });
});
