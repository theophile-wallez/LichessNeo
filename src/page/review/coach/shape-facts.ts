import {
  type Board,
  type Color,
  isLightSquare,
  opposite,
  parseSquare,
  type Square,
  squareCoords,
} from '#shared/chess/index.ts';
import { playLine } from '#page/review/chess/played-line.ts';
import { moveToken, squareToken } from '#page/review/comment/tokens.ts';
import type { FactInput } from './fact.ts';
import { FIANCHETTOS, guardedHoles, holesBeside } from './fianchetto.ts';
import { type Fact, oneOf, said } from './said.ts';
import { isEndgame, ownRank } from './structure.ts';
import { decided } from './trajectory.ts';

// The shape a move leaves: pawns doubled by a recapture, the pawns in front of
// a castled king pushed, the king walked out, a knight sent to the edge.

const FILES = 'abcdefgh';

/** After a trade the engine's reply takes back with a pawn, which doubles its side's pawns. */
export function doubledFact({ move, facts, them }: FactInput): Fact | null {
  const reply = move.after.best;
  if (!reply || reply.slice(2, 4) !== move.uci.slice(2, 4) || decided(move)) return null;
  const [back] = playLine(move.position.fen, [reply]);
  if (!back || back.piece.role !== 'pawn' || !back.captured) return null;
  const file = reply.charAt(2);
  const onFile = (board: Board): number =>
    [...board].filter(
      ([square, piece]) => piece.role === 'pawn' && piece.color === them && square.startsWith(file),
    ).length;
  if (onFile(back.before) !== 1 || onFile(back.after) < 2) return null;
  const token = moveToken(back.san, them, { base: 'a', ucis: [reply] });
  return said(oneOf(facts.doubledPawns(them, token, file), move));
}

// The files of a castled king's pawn cover, by the king's file.
const COVER: Readonly<Record<string, string>> = {
  g: 'fgh',
  h: 'fgh',
  b: 'abc',
  c: 'abc',
  a: 'abc',
};

/** An error that pushes a pawn from in front of the mover's castled king. */
export function loosensKingFact(input: FactInput): Fact | null {
  const { move, facts, me, before } = input;
  const from = parseSquare(move.uci.slice(0, 2));
  const king = [...before].find(([, piece]) => piece.role === 'king' && piece.color === me)?.[0];
  // A capture's point is what it takes, a recapture's often forced.
  if (!from || !king || before.get(from)?.role !== 'pawn' || move.san.includes('x')) return null;
  const home = me === 'white' ? 0 : 7;
  const [kingFile, kingRank] = squareCoords(king);
  const [file, rank] = squareCoords(from);
  const cover = COVER[FILES.charAt(kingFile)] ?? '';
  const shields = rank === (me === 'white' ? 1 : 6) && cover.includes(FILES.charAt(file));
  const queens = [...before.values()].some(({ role, color }) => role === 'queen' && color !== me);
  if (kingRank !== home || !shields || !queens) return null;
  return holesFact(input, from) ?? said(oneOf(facts.loosensKing, move));
}

// Whether the FEN's castling field leaves `color` a right to castle.
function canCastle(fen: string, color: Color): boolean {
  const rights = fen.split(' ')[2] ?? '';
  return color === 'white' ? /[KQ]/.test(rights) : /[kq]/.test(rights);
}

/**
 * An error that walks the king up the board, or off its square while it can
 * still castle, with the other side's queen on, in a middlegame, unforced:
 * no check to answer, nothing taken, no castling.
 */
export function kingWalkFact({ move, facts, me, before }: FactInput): Fact | null {
  const [from, to] = [parseSquare(move.uci.slice(0, 2)), parseSquare(move.uci.slice(2, 4))];
  const forced = move.previousPosition.san?.includes('+') === true || /x|O-O/.test(move.san);
  if (!from || !to || before.get(from)?.role !== 'king' || forced || isEndgame(before)) return null;
  const queens = [...before.values()].some(({ role, color }) => role === 'queen' && color !== me);
  if (!queens) return null;
  const castling = canCastle(move.previousPosition.fen, me);
  const walks = ownRank(from, me) <= 1 && ownRank(to, me) >= 2;
  return castling || walks ? said(oneOf(facts.kingWalk(castling), move)) : null;
}

// A fianchetto's pawn pushed one square with no bishop left of its bishop
// square's color: the squares beside the pawn have no guard.
function holesFact({ move, facts, me, after }: FactInput, from: Square): Fact | null {
  const to = parseSquare(move.uci.slice(2, 4));
  const bishopSquare = Object.entries(FIANCHETTOS).find(([, pawn]) => pawn === to)?.[0];
  const home = parseSquare(bishopSquare ?? '');
  if (!to || !home || squareCoords(from)[0] !== squareCoords(to)[0]) return null;
  if (hasBishopOn(after, me, isLightSquare(home))) return null;
  const holes = holesBeside(to);
  if (!holes) return null;
  return said(oneOf(facts.fianchettoHoles(squareToken(to), holeTokens(holes)), move));
}

const hasBishopOn = (board: Board, color: Color, light: boolean): boolean =>
  [...board].some(
    ([square, piece]) =>
      piece.role === 'bishop' && piece.color === color && isLightSquare(square) === light,
  );

/** An error that sends a knight to the edge, where it does little. */
export function knightOnRimFact({ move, facts, after }: FactInput): Fact | null {
  const to = parseSquare(move.uci.slice(2, 4));
  if (!to || after.get(to)?.role !== 'knight' || move.san.includes('x')) return null;
  const [file] = squareCoords(to);
  if (file !== 0 && file !== 7) return null;
  return said(oneOf(facts.knightOnRim(squareToken(move.uci.slice(2, 4))), move));
}

const holeTokens = ([left, right]: readonly [Square, Square]): readonly [string, string] => [
  squareToken(left),
  squareToken(right),
];

/**
 * A trade, taken back, that takes a fianchetto bishop from in front of its
 * castled king (`given`: the mover's), the other side keeping a queen or a
 * bishop of its color to use the holes.
 */
export function fianchettoGoneFact(input: FactInput, settled: Board, given: boolean): Fact | null {
  const { move, facts, me, them, before } = input;
  const side = given ? me : them;
  const square = parseSquare(given ? move.uci.slice(0, 2) : move.uci.slice(2, 4));
  const holes = square && guardedHoles(before, square, side);
  if (!square || !holes || hasBishopOn(settled, side, isLightSquare(square))) return null;
  const other = opposite(side);
  const queen = [...settled.values()].some(
    ({ role, color }) => role === 'queen' && color === other,
  );
  if (!queen && !hasBishopOn(settled, other, isLightSquare(square))) return null;
  return said(oneOf(facts.fianchettoBishopGone(side, holeTokens(holes)), move));
}
