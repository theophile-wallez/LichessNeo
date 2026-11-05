import {
  attackedSquares,
  type Board,
  type Color,
  parseSquare,
  type Role,
  squareCoords,
} from '#shared/chess/index.ts';
import { sanOf } from '#page/review/chess/notation.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import type { FactInput } from './fact.ts';
import { type Fact, oneOf, said } from './said.ts';
import { ownRank } from './structure.ts';
import { evaluationLevel } from './trajectory.ts';

// The Greek gift: the bishop takes the pawn in front of the castled king with
// check, for the knight and the queen to come after the king. Named when the
// engine says it works, of the move and of the error that lets it in.

const GIFT_SQUARE: Record<Color, string> = { white: 'h7', black: 'h2' };
// Where the knight and the queen come in after the king takes.
const KNIGHT_SQUARE: Record<Color, string> = { white: 'g5', black: 'g4' };
const QUEEN_SQUARE: Record<Color, string> = { white: 'h5', black: 'h4' };

// Whether a piece of `color`'s, of `role`, reaches `square` in one move.
const reaches = (board: Board, role: Role, color: Color, square: string): boolean =>
  [...board].some(
    ([from, piece]) =>
      piece.role === role &&
      piece.color === color &&
      attackedSquares(board, from).some(seen => seen === parseSquare(square)),
  );
const KING_FILE = 6;

// The knight on f3 stands in the queen's way to h5 until it jumps to g5.
const withoutKnights = (board: Board, color: Color): Board =>
  new Map([...board].filter(([, piece]) => piece.role !== 'knight' || piece.color !== color));

// The bishop taking on h7 with check, the king on g8, a knight to come to g5
// and the queen to h5.
interface Sacrifice {
  readonly san: string;
  readonly uci: string;
  readonly me: Color;
  readonly them: Color;
  /** The board before it. */
  readonly before: Board;
}

function isGift({ san, uci, me, them, before }: Sacrifice): boolean {
  if (!san.startsWith('Bx') || !san.includes('+') || uci.slice(2, 4) !== GIFT_SQUARE[me])
    return false;
  const to = parseSquare(uci.slice(2, 4));
  const king = [...before].find(([, piece]) => piece.role === 'king' && piece.color === them);
  return (
    to !== null &&
    before.get(to)?.role === 'pawn' &&
    king !== undefined &&
    ownRank(king[0], them) === 0 &&
    squareCoords(king[0])[0] === KING_FILE &&
    reaches(before, 'knight', me, KNIGHT_SQUARE[me]) &&
    reaches(withoutKnights(before, me), 'queen', me, QUEEN_SQUARE[me])
  );
}

// Whether the record after the sacrifice is good for the side whose `sign` it is.
const works = (record: PositionRecord, sign: number): boolean =>
  'mate' in record ? record.mate * sign > 0 : evaluationLevel(record) * sign >= 1;

/**
 * The Greek gift, when the move is one and the engine says it works, a mate
 * it leads to said after it; else `then`, what the coach says otherwise.
 */
export function withGift(input: FactInput, then: Fact | null): Fact | null {
  const { move, facts, sign } = input;
  const { san, uci } = move;
  if (
    !works(move.after, sign) ||
    !isGift({ san, uci, me: input.me, them: input.them, before: input.before })
  )
    return then;
  const gift = oneOf(facts.greekGift(GIFT_SQUARE[input.me]), move);
  const text = then?.theme === 'mate' ? `${gift} ${then.text}` : gift;
  return said(text, 'sacrifice', then?.theme === 'mate' ? (then.drawing ?? null) : null);
}

/** After an error, the Greek gift its reply plays, which the engine says works. */
export function giftLetFact(input: FactInput): Fact | null {
  const { move, facts, me, them, after, reply, sign } = input;
  const uci = move.after.best;
  if (!uci || !reply || !works(move.after, -sign)) return null;
  const san = sanOf(move.position.fen, uci);
  if (!isGift({ san, uci, me: them, them: me, before: after })) return null;
  return said(oneOf(facts.letsGreekGift(reply), move), 'sacrifice');
}
