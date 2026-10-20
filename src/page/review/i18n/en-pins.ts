import { pieceOnToken } from '#page/review/comment/tokens.ts';
import { capitalize, definiteOn } from './en-grammar.ts';
import type { FactSentences, Named, Viewer } from './types.ts';

// A pin that keeps a piece from taking, said plainly first (a defender that
// can't take back, a sacrifice that can't be taken), then square by square,
// its pieces named on them, "♟d5", as the board draws them.

type PinSentences = Pick<FactSentences, 'offeredPinned' | 'pinnedGuard' | 'pinLine'>;

export function pinsEn(viewer: Viewer): PinSentences {
  const the = (piece: Named): string => definiteOn(viewer, piece);
  return {
    pinnedGuard: (lost, pinned) => [
      `${capitalize(the(lost))} isn’t really defended: ${the(pinned)} guarding it is pinned.`,
      `${capitalize(the(pinned))} can’t defend ${the(lost)}: it’s pinned.`,
    ],
    offeredPinned: (piece, pinned) => [
      `${capitalize(the(piece))} only looks hanging: ${the(pinned)} that could take it is pinned.`,
      `${capitalize(the(piece))} can’t really be taken: ${the(pinned)} is pinned.`,
    ],
    pinLine: ({ pinned, pinner, behind, squares, take, punish }) => {
      const [held, by, lost] = [
        pieceOnToken(pinned, squares.pinned),
        pieceOnToken(pinner, squares.pinner),
        pieceOnToken(behind, squares.behind),
      ];
      return [
        `${by} pins ${held} to ${lost}: if ${take}, then ${punish}.`,
        `${held} is pinned to ${lost} by ${by}: after ${take}, ${punish} takes it.`,
      ];
    },
  };
}
