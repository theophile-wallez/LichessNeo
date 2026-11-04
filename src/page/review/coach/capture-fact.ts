import { attackers, parseSquare, type Piece, type Square } from '#shared/chess/index.ts';
import { attackerSquares, exchangeGain, PIECE_VALUES } from '#page/review/chess/material.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import type { FactInput } from './fact.ts';
import { wonBack } from './line-facts.ts';
import { whichOne } from './which-one.ts';
import { type Fact, oneOf, said, withDetail } from './said.ts';
import { materialBalance } from './swing.ts';

// What a good capture does: take back, win back what the side was behind, win
// a piece for free or for less, or where taking back costs more, or trade,
// which a side ahead in material is glad to, pieces rather than pawns.
// What it wins may only be for a while: the engine's line wins it back.

// Two pawns' worth ahead: enough for trades to help.
const AHEAD = 2;

interface Gain {
  readonly victim: Piece;
  readonly by: Piece;
  /** The victim's square, when the side had more than one like it. */
  readonly on: string | null;
  /** Nothing takes back. */
  readonly free: boolean;
}

// A quarter of a pawn of score per pawn ahead: short of that, the other side has play for it.
const SCORE_PER_PAWN = 25;

/** Whether the mover is material ahead after the move, and the engine's score doesn't show it. */
function compensated({ move, me, after }: FactInput): boolean {
  const ahead = materialBalance(after, me);
  if (!('cp' in move.after) || ahead < 1) return false;
  return move.after.cp * (me === 'white' ? 1 : -1) < SCORE_PER_PAWN * Math.min(ahead, 5);
}

// Material won; or only for a while, when the engine's line wins it back, said
// plainly then, the line below; or for the other side's play, which the score shows.
function gainedFact(input: FactInput, { victim, by, on, free }: Gain): Fact {
  const { move, facts, me, them } = input;
  const [taken, given] = [PIECE_VALUES[victim.role], PIECE_VALUES[by.role]];
  // A best move's capture isn't faulted for what comes after it.
  const doubtful = move.moveClass === 'good' || move.moveClass === 'excellent';
  const back = doubtful ? wonBack(input, free ? taken : taken - given) : null;
  if (back)
    return withDetail(
      said(oneOf(facts.givenBack(victim, on, them), move)),
      oneOf(facts.losesMaterial(them, back, false), move),
    );
  if (doubtful && compensated(input))
    return said(oneOf(facts.compensation(victim, on, them), move));
  if (free) return said(oneOf(facts.winsForFree(victim, on), move), 'hanging');
  return said(oneOf(facts.winsMaterial(victim, { role: by.role, color: me }, on), move));
}

// A capture in a run of them, by a side behind, only wins back what it lacked:
// no piece for free, though the piece taken took nothing on its square.
function wonBackFact(
  { move, facts, me, before, after }: FactInput,
  victim: Piece,
  on: string | null,
): Fact | null {
  const now = materialBalance(after, me);
  const trading = move.previousPosition.san?.includes('x') === true;
  if (!trading || materialBalance(before, me) >= 0 || now > 0) return null;
  return said(oneOf(facts.winsBack(victim, on, now === 0), move));
}

// An even capture: won where taking back would lose more, or a trade.
function evenFact(input: FactInput, square: Square, victim: Piece, on: string | null): Fact {
  const { move, facts, me, them, before, after } = input;
  // Taking back would lose more than it wins back.
  const [from] = attackerSquares(after, square, them);
  const taker = from && after.get(from);
  if (taker && exchangeGain(after, square, them) === 0)
    return (
      wonBackFact(input, victim, on) ??
      said(oneOf(facts.retakeCosts(victim, on, taker), move), 'hanging')
    );
  // Ahead, trade pieces, not pawns.
  const ahead = victim.role !== 'pawn' && materialBalance(before, me) >= AHEAD;
  return said(oneOf(facts.trades(victim, ahead), move));
}

export function captureFact(input: FactInput, moved: Piece, dest: string): Fact | null {
  const { move, facts, them, before } = input;
  const square = parseSquare(dest);
  if (!square) return null;
  // Nothing on the square: en passant.
  const victim: Piece = { role: before.get(square)?.role ?? 'pawn', color: them };
  const previous = move.previousPosition;
  if (previous.san?.includes('x') && previous.uci?.slice(2, 4) === dest)
    return said(oneOf(facts.takesBack(squareToken(dest)), move));
  const on = whichOne(before, dest, victim);
  const free = attackers(before, square, them).length === 0;
  const [taken, given] = [PIECE_VALUES[victim.role], PIECE_VALUES[moved.role]];
  if (free || taken > given)
    return wonBackFact(input, victim, on) ?? gainedFact(input, { victim, by: moved, on, free });
  return taken < given ? null : evenFact(input, square, victim, on);
}
