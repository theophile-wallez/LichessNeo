import { pieceOnToken } from '#page/review/comment/tokens.ts';
import { agreement, capitalize, ownedOn, pronoun, subjectPronoun } from './fr-grammar.ts';
import type { FactSentences, Named, Viewer } from './types.ts';

// A pin that keeps a piece from taking, said plainly first (a defender that
// can't take back, a sacrifice that can't be taken), then square by square,
// its pieces named on them, « ♟d5 », as the board draws them.

type PinSentences = Pick<FactSentences, 'offeredPinned' | 'pinnedGuard' | 'pinLine'>;

export function pinsFr(viewer: Viewer): PinSentences {
  const the = (named: Named): string => ownedOn(viewer, named);
  return {
    pinnedGuard: (lost, pinned) => [
      `${capitalize(the(lost))} n’est pas vraiment défendu${agreement(lost.piece)} : ${the(pinned)}, qui ${pronoun(lost.piece)} protège, est cloué${agreement(pinned.piece)}.`,
      `${capitalize(the(pinned))} ne peut pas défendre ${the(lost)} : ${subjectPronoun(pinned.piece)} est cloué${agreement(pinned.piece)}.`,
    ],
    offeredPinned: (piece, pinned) => [
      `${capitalize(the(piece))} n’est en prise qu’en apparence : ${the(pinned)}, qui pourrait ${pronoun(piece.piece)} prendre, est cloué${agreement(pinned.piece)}.`,
      `${capitalize(the(piece))} ne peut pas vraiment être pris${agreement(piece.piece)} : ${the(pinned)} est cloué${agreement(pinned.piece)}.`,
    ],
    pinLine: ({ pinned, pinner, behind, squares, take, punish }) => {
      const [held, by, lost] = [
        pieceOnToken(pinned, squares.pinned),
        pieceOnToken(pinner, squares.pinner),
        pieceOnToken(behind, squares.behind),
      ];
      return [
        `${by} cloue ${held} à ${lost} : si ${take}, alors ${punish}.`,
        `${held} est cloué${agreement(pinned)} à ${lost} par ${by} : après ${take}, ${punish} ${pronoun(behind)} prend.`,
      ];
    },
  };
}
