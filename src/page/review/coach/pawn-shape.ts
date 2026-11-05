import {
  attackers,
  type Board,
  type Color,
  opposite,
  type Role,
  type Square,
} from '#shared/chess/index.ts';
import { minorityAttackOf, stormOf } from './attack-plans.ts';
import { majorityOf } from './endgame-plans.ts';
import type { Plan } from './idea.ts';
import { openedLineOf } from './open-line.ts';
import { pawnBreakOf } from './pawn-break.ts';
import type { Play } from './plan.ts';
import { preventedOf } from './prophylaxis.ts';
import { retreatOf } from './retreat.ts';
import { makesLuft, pawnBacks, pawnGuards } from './safety.ts';
import { isEndgame, OPENING_PLIES, ownRank } from './structure.ts';

// What a pawn's push does for the position, past attacking a piece: it
// guards, backs up or frees a piece, airs the king, storms or breaks, gains
// space, opens a line.

const HEAVY: ReadonlySet<Role> = new Set<Role>(['rook', 'queen']);

// A back rank a rook or queen of the other side's could mate on: none of the
// side's own guards it, or only one that a rook or queen of theirs can trade off.
function weakBackRank(board: Board, color: Color): boolean {
  const heavy = [...board].filter(([, piece]) => HEAVY.has(piece.role));
  const guarded = heavy.some(
    ([square, piece]) =>
      piece.color === color &&
      ownRank(square, color) === 0 &&
      !attackers(board, square, opposite(color)).some(role => HEAVY.has(role)),
  );
  return !guarded && heavy.some(([, piece]) => piece.color !== color);
}

// A pawn's push at the other side's camp: a storm on the king, a minority
// attack, or, before the endgame, a break against a pawn chain.
function pawnAssault(after: Board, [from, to]: [Square, Square], color: Color): Plan | null {
  const storm = stormOf(after, [from, to], color) ?? minorityAttackOf(after, [from, to], color);
  if (storm || isEndgame(after)) return storm;
  return pawnBreakOf(after, to, color);
}

/**
 * What a pawn's move does once it attacks no piece: a piece or pawn of its own
 * defended; a hole for the king, past the opening and on a weak back rank; a
 * piece under attack backed up, or a bishop given a square to step back to; a
 * storm or a break; a pawn on the fifth rank that cramps the other side; a
 * line opened behind it.
 */
export function pawnShape(
  { before, after, color, ply }: Play,
  from: Square,
  to: Square,
): Plan | null {
  const guards =
    pawnGuards(before, after, to) ??
    preventedOf(before, after, [from, to], color) ??
    majorityOf(after, [from, to], color);
  if (guards) return guards;
  const weak = ply > OPENING_PLIES && weakBackRank(after, color);
  if (weak && makesLuft(before, [from, to], color)) return { kind: 'luft' };
  const backs = pawnBacks(before, after, to) ?? retreatOf(before, after, [from, to], color);
  if (backs) return backs;
  const assault = pawnAssault(after, [from, to], color);
  if (assault) return assault;
  if (ownRank(to, color) === 4 && !isEndgame(after)) return { kind: 'space' };
  return openedLineOf(before, after, [from, to]);
}
