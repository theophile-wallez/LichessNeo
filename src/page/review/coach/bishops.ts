import {
  type Board,
  type Color,
  isLightSquare,
  parseSquare,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { pieceOn } from '#page/review/chess/material.ts';
import type { FactInput } from './fact.ts';
import { type Fact, oneOf, said } from './said.ts';
import { pawnEndingFact } from './pawn-ending.ts';
import { fianchettoGoneFact } from './shape-facts.ts';
import { materialBalance } from './swing.ts';

// What an even trade, taken back, leaves: a pawn ending (pawn-ending.ts), or
// of the bishops: bishops of opposite colors alone with the pawns, a
// fianchetto's bishop gone, a bad bishop gone, the bishop pair.

const bishopsOf = (board: Board, color: Color): Square[] =>
  [...board].flatMap(([square, piece]) =>
    piece.role === 'bishop' && piece.color === color ? [square] : [],
  );

/** Whether `color` has a bishop on each color of square. */
const hasPair = (board: Board, color: Color): boolean =>
  new Set(bishopsOf(board, color).map(isLightSquare)).size === 2;

/** Kings, pawns and a bishop each, on squares of opposite colors. */
function oppositeBishops(board: Board): boolean {
  const others = [...board.values()].filter(({ role }) => role !== 'king' && role !== 'pawn');
  const [white] = bishopsOf(board, 'white');
  const [black] = bishopsOf(board, 'black');
  if (others.length !== 2 || !white || !black) return false;
  return isLightSquare(white) !== isLightSquare(black);
}

// A bad bishop: three of its side's pawns on its color, two of them fixed by
// an enemy pawn in front, one at least in the center.
const BAD_PAWNS = 3;
const BAD_FIXED = 2;
const CENTER_FILES: ReadonlySet<number> = new Set([2, 3, 4, 5]);

export function isBadBishop(board: Board, square: Square, color: Color): boolean {
  const light = isLightSquare(square);
  const ahead = color === 'white' ? 1 : -1;
  const pawns = [...board].filter(
    ([at, piece]) => piece.role === 'pawn' && piece.color === color && isLightSquare(at) === light,
  );
  const fixed = pawns.filter(([at]) => {
    const [file, rank] = squareCoords(at);
    const front = squareAt(file, rank + ahead);
    const blocker = front && board.get(front);
    return blocker?.role === 'pawn' && blocker.color !== color;
  });
  const central = fixed.some(([at]) => CENTER_FILES.has(squareCoords(at)[0]));
  return pawns.length >= BAD_PAWNS && fixed.length >= BAD_FIXED && central;
}

/**
 * The trade's idea, once the engine's reply takes back: about the bishops.
 * After an error, only what the trade costs.
 */
export function tradeFact(input: FactInput, error = false): Fact | null {
  const { move, facts, me, after } = input;
  const reply = move.after.best;
  const from = parseSquare(move.uci.slice(0, 2));
  if (!reply || !from || reply.slice(2, 4) !== move.uci.slice(2, 4)) return null;
  const settled = boardAfter(after, reply);
  const ending = pawnEndingFact(input, settled, error);
  if (ending) return ending;
  const ahead = materialBalance(settled, me) >= 1;
  if (oppositeBishops(settled) && (ahead || !error))
    return said(oneOf(facts.oppositeBishops(ahead), move));
  if (error)
    return (
      fianchettoGoneFact(input, settled, true) ??
      givenPair(input, settled) ??
      behindTrade(input, settled)
    );
  return fianchettoGoneFact(input, settled, false) ?? goodTrade(input, settled, from);
}

// Two pawns' worth behind: enough for trades to help the other side.
const BEHIND = 2;

// A piece traded off by a side behind in material, which only the other side wants.
function behindTrade({ move, facts, me, before }: FactInput, settled: Board): Fact | null {
  const taken = pieceOn(before, move.uci.slice(2, 4));
  if (!taken || taken.role === 'pawn' || materialBalance(settled, me) > -BEHIND) return null;
  return said(oneOf(facts.tradesWhenBehind, move));
}

// A bad bishop traded off, the bishop pair won, or given.
function goodTrade(input: FactInput, settled: Board, from: Square): Fact | null {
  const { move, facts, me, them, before } = input;
  if (before.get(from)?.role === 'bishop' && isBadBishop(before, from, me))
    return said(oneOf(facts.badBishopOff, move));
  const won = hasPair(before, them) && hasPair(settled, me) && !hasPair(settled, them);
  return won ? said(oneOf(facts.winsBishopPair(me), move)) : givenPair(input, settled);
}

// The bishop pair handed over: both sides had it before the trade.
function givenPair({ move, facts, me, them, before }: FactInput, settled: Board): Fact | null {
  const given = hasPair(before, me) && hasPair(settled, them) && !hasPair(settled, me);
  return given ? said(oneOf(facts.givesBishopPair(them), move)) : null;
}

/** An error, a pawn's move, after which one of the mover's bishops is hemmed in by its pawns. */
export function badBishopMade({ move, facts, me, before, after }: FactInput): Fact | null {
  const from = parseSquare(move.uci.slice(0, 2));
  if (!from || before.get(from)?.role !== 'pawn') return null;
  const made = bishopsOf(after, me).some(
    square => isBadBishop(after, square, me) && !isBadBishop(before, square, me),
  );
  return made ? said(oneOf(facts.makesBadBishop, move)) : null;
}
