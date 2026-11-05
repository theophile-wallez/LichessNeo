import { describe, expect, it } from 'vitest';
import { parseFen } from '#shared/chess/index.ts';
import { factInput } from '#page/review/fixtures/fact-input.ts';
import { played, playedFen, record } from '#page/review/fixtures/played.ts';
import { en } from '#page/review/i18n/en.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import {
  backwardFact,
  developmentFact,
  isBackward,
  isolatedFact,
  passiveRookFact,
  pawnGrabFact,
  pieceTwiceFact,
  queenOutFact,
} from './structure-facts.ts';

// What a move leaves of the pawns and the pieces: a pawn isolated or held
// back, the pieces left at home, the queen out early, a rook gone passive.

interface Move {
  readonly fen: string;
  readonly uci: string;
  readonly ply?: number;
  /** The engine's reply, and White's chance after the move. */
  readonly reply?: string;
  readonly chance?: number;
  readonly previousMove?: MoveVerdict;
}

const judged = ({ fen, uci, ply = 30, reply, chance = 45, previousMove }: Move): MoveVerdict =>
  played({
    fen,
    uci,
    ply,
    before: record(50, [uci]),
    after: record(chance, reply ? [reply] : []),
    ...(previousMove ? { previousMove } : {}),
  });

const inputOf = (move: Move) => factInput(judged(move));

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('isBackward', () => {
  it('sees a pawn its neighbor left behind, its next square held by a pawn', () => {
    const board = parseFen('4k3/8/3p4/4p3/4P3/8/8/4K3 b - - 0 1').board;
    expect(isBackward(board, 'd6', 'black')).toBe(true);
  });

  it('says it isn’t backward when no pawn holds its next square', () => {
    const board = parseFen('4k3/8/3p4/4p3/8/8/8/4K3 b - - 0 1').board;
    expect(isBackward(board, 'd6', 'black')).toBe(false);
  });
});

describe('isolatedFact', () => {
  // cxd5 exd5 leaves White's d4 pawn with no pawn beside it.
  const fen = 'r2qk2r/pp3ppp/4p3/3p4/2PP4/8/PP3PPP/R2QK2R w KQkq - 0 1';

  it('sees the trade, taken back, isolate a pawn', () => {
    const input = inputOf({ fen, uci: 'c4d5', reply: 'e6d5' });
    expect(en.facts.isolatedPawn('white', '[[s:d4]]')).toContain(
      isolatedFact(input, 'white')?.text,
    );
  });

  it('says nothing in a decided game', () => {
    expect(
      isolatedFact(inputOf({ fen, uci: 'c4d5', reply: 'e6d5', chance: 95 }), 'white'),
    ).toBeNull();
  });
});

describe('backwardFact', () => {
  const fen = '4k3/4p3/3p4/8/4P3/8/8/4K3 b - - 0 1';

  it('sees e5 leave the d6 pawn behind', () => {
    const text = backwardFact(inputOf({ fen, uci: 'e7e5' }))?.text;
    expect(en.facts.backwardPawn('[[s:d6]]')).toContain(text);
  });

  it('says nothing of e6, which keeps the pawns together', () => {
    expect(backwardFact(inputOf({ fen, uci: 'e7e6' }))).toBeNull();
  });
});

describe('developmentFact', () => {
  // Black has three minor pieces out, White none.
  const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 4';

  it('sees a move that brings nothing out, three pieces behind', () => {
    const text = developmentFact(inputOf({ fen, uci: 'a2a3', ply: 7 }))?.text;
    expect(en.facts.behindInDevelopment('white', 3)).toContain(text);
  });

  it('says nothing of a piece developed, nor past the opening', () => {
    expect(developmentFact(inputOf({ fen, uci: 'g1f3', ply: 7 }))).toBeNull();
    expect(developmentFact(inputOf({ fen, uci: 'a2a3', ply: 41 }))).toBeNull();
  });
});

describe('queenOutFact', () => {
  const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

  it('sees the queen out early, its pieces at home', () => {
    expect(en.facts.queenTooEarly).toContain(
      queenOutFact(inputOf({ fen, uci: 'd1h5', ply: 3 }))?.text,
    );
  });

  it('says nothing of a queen kept on its second rank', () => {
    expect(queenOutFact(inputOf({ fen, uci: 'd1e2', ply: 3 }))).toBeNull();
  });
});

describe('pawnGrabFact', () => {
  const fen = 'rnbqkbnr/pppppppp/8/8/8/1Q6/PPPPPPPP/RNB1KBNR w KQkq - 0 1';

  it('sees the queen take the b7 pawn in the opening', () => {
    const text = pawnGrabFact(inputOf({ fen, uci: 'b3b7', ply: 9 }))?.text;
    expect(en.facts.pawnGrab('[[s:b7]]')).toContain(text);
  });

  it('says nothing of it past the opening', () => {
    expect(pawnGrabFact(inputOf({ fen, uci: 'b3b7', ply: 41 }))).toBeNull();
  });
});

describe('pieceTwiceFact', () => {
  // 1.Nf3 e5, then the knight again.
  const knight = judged({ fen: START, uci: 'g1f3', ply: 1 });
  const afterKnight = playedFen(START, 'g1f3');
  const reply = judged({ fen: afterKnight, uci: 'e7e5', ply: 2, previousMove: knight });
  const fen = playedFen(afterKnight, 'e7e5');

  it('sees a knight moved a second time, unattacked, the others at home', () => {
    const text = pieceTwiceFact(inputOf({ fen, uci: 'f3g5', ply: 3, previousMove: reply }))?.text;
    expect(en.facts.pieceTwice({ role: 'knight', color: 'white' })).toContain(text);
  });

  it('says nothing of a piece’s first move', () => {
    expect(pieceTwiceFact(inputOf({ fen, uci: 'b1c3', ply: 3, previousMove: reply }))).toBeNull();
  });
});

describe('passiveRookFact', () => {
  // The a2 pawn under the a8 rook's eye.
  const fen = 'r5k1/5ppp/8/8/8/8/P4PPP/3R2K1 w - - 0 1';

  it('sees the rook go back to guard a pawn', () => {
    expect(en.facts.passiveRook('[[s:a2]]')).toContain(
      passiveRookFact(inputOf({ fen, uci: 'd1a1' }))?.text,
    );
  });

  it('says nothing of a rook that attacks, nor outside a rook ending', () => {
    expect(passiveRookFact(inputOf({ fen, uci: 'd1d7' }))).toBeNull();
    const minor = 'r5k1/5ppp/8/8/8/2n5/P4PPP/3R2K1 w - - 0 1';
    expect(passiveRookFact(inputOf({ fen: minor, uci: 'd1a1' }))).toBeNull();
  });
});
