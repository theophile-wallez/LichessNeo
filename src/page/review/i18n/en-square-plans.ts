import type { Piece } from '#shared/chess/index.ts';
import type { SquarePlan, SquareReason } from '#page/review/coach/idea.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import { capitalize } from './en-grammar.ts';
import type { QuietPlanSentences } from './plan-types.ts';

// A square taken from a piece, a wing's majority pushed, a king cut off, a
// zugzwang, a fianchetto, a bishop's retreat, a blockade, a storm, a break.

const COUNTS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const count = (pawns: number): string => COUNTS[pawns] ?? String(pawns);
const wing = (queenside: boolean): string => (queenside ? 'queenside' : 'kingside');

export function squarePlansEn(the: (piece: Piece) => string): Pick<QuietPlanSentences, SquarePlan> {
  return {
    prevents: (piece, square, target, pin) => {
      const kept = `${the(piece)} off ${squareToken(square)}`;
      return pin
        ? [
            `That keeps ${kept}, where it would pin ${the(target)}.`,
            `No pin on ${the(target)}: ${the(piece)} can’t come to ${squareToken(square)} anymore.`,
            `Prophylaxis: that keeps ${kept}, and ${the(target)} free.`,
          ]
        : [
            `That keeps ${kept}, where it would hit ${the(target)}.`,
            `Prophylaxis: no ${squareToken(square)} for ${the(piece)}, and ${the(target)} is left in peace.`,
          ];
    },
    majority: (queenside, mine, theirs) => [
      `The ${wing(queenside)} majority rolls: ${count(mine)} pawns against ${count(theirs)}, a passed pawn in the making.`,
      `${capitalize(count(mine))} against ${count(theirs)} on the ${wing(queenside)}: that majority can make a passed pawn.`,
    ],
    cutsOff: file => [
      `The rook cuts the king off along the ${file}-file.`,
      `The king is cut off: it can’t cross the ${file}-file.`,
      `A rook on the ${file}-file, and the king is shut out.`,
    ],
    zugzwang: [
      'Zugzwang: any move now gives something away.',
      'Zugzwang! Whatever comes next gives something up.',
      'Passing would hold, but there’s no passing in chess: zugzwang.',
    ],
    fianchetto: fianchettoWays(the),
    pawnBreak: (square, base, king) => {
      if (king)
        return [
          `The center breaks open with the king still on ${squareToken(king)}: lines open against it.`,
          `A break in the center while the king is still on ${squareToken(king)}: time to open lines.`,
        ];
      return base
        ? [
            `A pawn break: it strikes at ${squareToken(square)}, the base of the chain.`,
            `The chain is hit at its base, on ${squareToken(square)}.`,
          ]
        : [
            `A pawn break: it challenges the pawn on ${squareToken(square)}.`,
            `A lever against ${squareToken(square)}: the pawn chain is under fire.`,
          ];
    },
    storm: file => [
      `The pawn storm is on: the ${file}-pawn marches on the king.`,
      `Kings on opposite wings: the ${file}-pawn storms ahead.`,
    ],
    blockades: (piece, pawn) => [
      `${capitalize(the(piece))} blockades the ${squareToken(pawn)} pawn: the pawn is stuck, and no pawn can chase the knight.`,
      `The best blockader: ${the(piece)} sits right in front of the ${squareToken(pawn)} pawn.`,
    ],
    makesRetreat: (piece, square) => [
      `That frees ${squareToken(square)} for ${the(piece)}: if it’s chased, it can drop back there.`,
      `${capitalize(the(piece))} gets a way back: ${squareToken(square)} is free now.`,
    ],
  };
}

// A fianchetto, by what its bishop meets down the long diagonal.
function fianchettoWays(the: (piece: Piece) => string): QuietPlanSentences['fianchetto'] {
  return (piece, aim) => {
    if (aim?.kind === 'target') {
      const aimed =
        aim.target.role === 'pawn'
          ? squareToken(aim.square)
          : `${the(aim.target)} on ${squareToken(aim.square)}`;
      return [
        `A fianchetto, and ${the(piece)} already eyes ${aimed}.`,
        `${capitalize(the(piece))} takes the long diagonal and hits ${aimed} from afar.`,
      ];
    }
    if (aim?.kind === 'held' && aim.lever)
      return [
        `A fianchetto against ${squareToken(aim.square)}, solid for now: a push to ${squareToken(aim.lever)} will challenge it.`,
        `${capitalize(the(piece))} eyes ${squareToken(aim.square)}: well held today, until a pawn comes to ${squareToken(aim.lever)}.`,
      ];
    if (aim?.kind === 'held')
      return [
        `A fianchetto, but ${the(piece)} bites on granite: ${squareToken(aim.square)} is solidly held.`,
        `The pawn on ${squareToken(aim.square)} is well held: the diagonal stays shut for ${the(piece)}.`,
      ];
    if (aim?.kind === 'behind')
      return [
        `A fianchetto behind the ${squareToken(aim.square)} pawn: ${the(piece)} waits for the diagonal to open.`,
      ];
    return [
      `A fianchetto: ${the(piece)} on the long diagonal.`,
      `${capitalize(the(piece))} is fianchettoed, aiming down the long diagonal.`,
    ];
  };
}

/** Why a move was played, for these plans: "Better was h3, keeping the bishop off g4." */
export function squareWhyEn(the: (piece: Piece) => string): (reason: SquareReason) => string {
  return reason => {
    if (reason.kind === 'prevents')
      return `keeping ${the(reason.piece)} off ${squareToken(reason.square)}`;
    if (reason.kind === 'majority') return `pushing the ${wing(reason.queenside)} majority`;
    if (reason.kind === 'cutsOff') return `cutting the king off along the ${reason.file}-file`;
    if (reason.kind === 'zugzwang') return 'putting the opponent in zugzwang';
    if (reason.kind === 'pawnBreak')
      return reason.king
        ? `opening the center while the king is still on ${squareToken(reason.king)}`
        : `striking at ${squareToken(reason.square)} with a pawn`;
    if (reason.kind === 'storm') return `storming with the ${reason.file}-pawn`;
    if (reason.kind === 'blockades')
      return `blockading the ${squareToken(reason.pawn)} pawn with ${the(reason.piece)}`;
    if (reason.kind === 'makesRetreat')
      return `freeing ${squareToken(reason.square)} for ${the(reason.piece)}`;
    return `fianchettoing ${the(reason.piece)}`;
  };
}
