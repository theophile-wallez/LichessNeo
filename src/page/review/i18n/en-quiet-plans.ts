import type { Piece, Square } from '#shared/chess/index.ts';
import { isSquarePlan } from '#page/review/coach/idea.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import { capitalize, pieceName } from './en-grammar.ts';
import type { QuietPlanSentences, QuietWhy } from './plan-types.ts';
import { squarePlansEn, squareWhyEn } from './en-square-plans.ts';

// A king's walk in an ending, a line opened, a piece backed up, a pinned one
// piled up on, the queens' trade.

const on = (piece: Piece, square: Square): string =>
  `${pieceName(piece)} on ${squareToken(square)}`;

const target = (the: (piece: Piece) => string, piece: Piece, square: string | null): string =>
  square === null ? the(piece) : `${the(piece)} on ${square}`;

export function quietPlansEn(the: (piece: Piece) => string): QuietPlanSentences {
  return {
    ...squarePlansEn(the),
    escorts: (pawn, square) => [
      `The king comes to escort the passed ${on(pawn, square)}.`,
      `King and passed pawn together: the ${on(pawn, square)} has an escort now.`,
      `The king walks beside the passed ${on(pawn, square)}, clearing its way.`,
    ],
    stopsPasser: (pawn, square) => [
      `The king comes to stop the passed ${on(pawn, square)}.`,
      `The passed ${on(pawn, square)} won’t run free: the king is there.`,
      `The king stands in the way of the passed ${on(pawn, square)}.`,
    ],
    opensLine: (slider, line) => [
      `That opens the ${line} for ${the(slider)}.`,
      `${capitalize(the(slider))} gets a clear ${line} now.`,
      `The way is clear: ${the(slider)} sees down the ${line}.`,
    ],
    backs: (piece, square) => [
      `The pawn backs up ${target(the, piece, square)}.`,
      `${capitalize(target(the, piece, square))} has a pawn behind it now.`,
      `${capitalize(target(the, piece, square))} is under attack, and a pawn has its back.`,
    ],
    hitsPinned: (piece, square) => [
      `Piling up on the pinned ${on(piece, square)}.`,
      `The pinned ${on(piece, square)} is attacked once more: one attacker too many.`,
      `The pinned ${on(piece, square)} now has more attackers than defenders.`,
    ],
    queenTrade: declined =>
      declined
        ? [
            'The queen steps out of the trade: when behind, keep the queens on.',
            'No queen trade: behind in material, the queen keeps the fight going.',
          ]
        : [
            'Offering the queen trade: when ahead, every trade helps.',
            'Ahead in material? Trade the queens!',
            'The queen offers a trade: fewer pieces, an easier win.',
          ],
  };
}

/** Why a move was played, after its name: "Better was Kf5, escorting the passed pawn on f4." */
export function quietWhyEn(the: (piece: Piece) => string): QuietWhy {
  const square = squareWhyEn(the);
  return reason => {
    if (isSquarePlan(reason)) return square(reason);
    if (reason.kind === 'escorts') return `escorting the passed ${on(reason.pawn, reason.square)}`;
    if (reason.kind === 'stopsPasser')
      return `stopping the passed ${on(reason.pawn, reason.square)}`;
    if (reason.kind === 'opensLine') return `opening the ${reason.line} for ${the(reason.slider)}`;
    if (reason.kind === 'backs')
      return `backing up ${target(the, reason.piece, reason.square ?? null)} with a pawn`;
    if (reason.kind === 'hitsPinned')
      return `piling up on the pinned ${on(reason.piece, reason.square)}`;
    return reason.declined ? 'keeping the queens on' : 'offering the queen trade';
  };
}
