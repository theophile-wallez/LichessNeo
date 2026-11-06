import {
  type Board,
  type Color,
  kingSquare,
  opposite,
  type Square,
  squareCoords,
} from '#shared/chess/index.ts';
import { between } from '#page/review/chess/rays.ts';
import { onlyPieces, type Step } from './endgame-rules.ts';
import type { Plan } from './idea.ts';
import { ownRank } from './structure.ts';

// The rules of rook and pawn against rook, as a rook's move meets them: the
// Lucena position's bridge, the Vancura defense.

// The Lucena position, the pawn on its seventh rank, no rook pawn, its king
// in front of it, the other king cut off by the rook's file: the rook comes to
// its fourth rank, to block the checks once the king steps out.
function bridgeOf({ after, color, from, to }: Step): Plan | null {
  const ours = onlyPieces(after, color, ['rook', 'pawn']);
  const pawn = ours?.find(square => after.get(square)?.role === 'pawn');
  const king = kingSquare(after, color);
  const other = kingSquare(after, opposite(color));
  if (!pawn || !king || !other || !onlyPieces(after, opposite(color), ['rook'])) return null;
  const [pawnFile] = squareCoords(pawn);
  const [rookFile] = squareCoords(to);
  const [otherFile] = squareCoords(other);
  const shielding = squareCoords(king)[0] === pawnFile && ownRank(king, color) === 7;
  const cut = Math.min(pawnFile, otherFile) < rookFile && rookFile < Math.max(pawnFile, otherFile);
  const lifted = ownRank(to, color) === 3 && ownRank(from, color) !== 3;
  const lucena = ownRank(pawn, color) === 6 && pawnFile !== 0 && pawnFile !== 7;
  return lucena && shielding && cut && lifted ? { kind: 'bridge' } : null;
}

// The rook comes beside the pawn on its rank, three files off at least, nothing between.
function sideways(after: Board, to: Square, pawn: Square): boolean {
  const [file, rank] = squareCoords(to);
  const [pawnFile, pawnRank] = squareCoords(pawn);
  const clear = between(to, pawn).every(square => !after.has(square));
  return rank === pawnRank && Math.abs(file - pawnFile) >= 3 && clear;
}

// Rook and rook pawn, up to its sixth rank, the rook in front of it: the pawn's square.
function rookPawnBehind(after: Board, color: Color): Square | null {
  const theirs = onlyPieces(after, color, ['rook', 'pawn']);
  const pawn = theirs?.find(square => after.get(square)?.role === 'pawn');
  const rook = theirs?.find(square => after.get(square)?.role === 'rook');
  if (!pawn || !rook) return null;
  const [pawnFile] = squareCoords(pawn);
  const rank = ownRank(pawn, color);
  const edge = (pawnFile === 0 || pawnFile === 7) && rank >= 3 && rank <= 5;
  const inFront = squareCoords(rook)[0] === pawnFile && ownRank(rook, color) > rank;
  return edge && inFront ? pawn : null;
}

// Against it, the rook attacks the pawn from the side, from three files off at
// least, its king on its second rank on the far side, out of the rook's checks.
function vancuraOf({ after, color, to }: Step): Plan | null {
  const pawn = rookPawnBehind(after, opposite(color));
  const king = kingSquare(after, color);
  if (!pawn || !king || !onlyPieces(after, color, ['rook'])) return null;
  const far = Math.abs(squareCoords(king)[0] - squareCoords(pawn)[0]) >= 6;
  const farSide = far && ownRank(king, color) === 1;
  return farSide && sideways(after, to, pawn) ? { kind: 'vancura' } : null;
}

/** What a rook's move does by an ending's rules: the Lucena's bridge, the Vancura defense. */
export const rookRuleOf = (move: Step): Plan | null => bridgeOf(move) ?? vancuraOf(move);
