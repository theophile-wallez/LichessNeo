import { type Board, type Color, type Piece, type Square } from '#shared/chess/index.ts';
import { rookLiftOf } from './attack-plans.ts';
import { batteryPlan } from './battery.ts';
import { blockadeOf } from './blockade.ts';
import { cutsOffOf } from './endgame-plans.ts';
import { facesKingOf } from './faces-king.ts';
import type { Plan } from './idea.ts';
import { philidorOf } from './philidor.ts';
import { contestsFile, rookPlan } from './pressure.ts';
import { rookRuleOf } from './rook-endings.ts';
import { behindPasser, blocksPasser, centralSquare } from './safety.ts';
import { isOutpost, ownRank } from './structure.ts';

// What a piece's new square does for the position: a knight's blockade,
// outpost or center; a rook's ending rule, passed pawn, lift, file or seventh;
// a slider's battery, contested file, or x-ray alignment with the other king.

function knightSquarePlan(after: Board, [from, to]: [Square, Square], piece: Piece): Plan | null {
  const blockade = blockadeOf(after, to, piece);
  if (blockade) return blockade;
  if (isOutpost(after, to, piece)) return { kind: 'outpost', piece };
  return centralSquare(to) && !centralSquare(from) ? { kind: 'centralizes', piece } : null;
}

function rookSquarePlan(after: Board, [from, to]: [Square, Square], color: Color): Plan | null {
  const found =
    rookRuleOf({ after, color, from, to }) ??
    (behindPasser(after, to, color) ? { kind: 'behindPasser' as const } : null) ??
    philidorOf(after, [from, to], color) ??
    (blocksPasser(after, to, color) ? { kind: 'blocksPasser' as const } : null) ??
    cutsOffOf(after, [from, to], color) ??
    rookLiftOf(after, [from, to], color);
  if (found) return found;
  if (ownRank(from, color) === 6) return null;
  return rookPlan(after, [from, to], color) ?? facesKingOf(after, [from, to], color);
}

/** What a knight, bishop, rook or queen achieves on its new square `to`. */
export function squarePlan(after: Board, [from, to]: [Square, Square], color: Color): Plan | null {
  const piece = after.get(to);
  if (piece?.role === 'knight') return knightSquarePlan(after, [from, to], piece);
  if (piece?.role === 'rook') return rookSquarePlan(after, [from, to], color);
  if (piece?.role === 'queen')
    return (
      batteryPlan(after, [from, to]) ??
      contestsFile(after, [from, to], color) ??
      facesKingOf(after, [from, to], color)
    );
  if (piece?.role === 'bishop')
    return batteryPlan(after, [from, to]) ?? facesKingOf(after, [from, to], color);
  return null;
}
