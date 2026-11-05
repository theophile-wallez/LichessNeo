import type { Color, Piece } from '#shared/chess/index.ts';
import {
  agree,
  capitalize,
  definite,
  indefinite,
  indefiniteOn,
  partyOf,
  pieceName,
} from './en-grammar.ts';
import type { FactSentences, Viewer } from './types.ts';

// What a capture does: take back, win material, maybe only for a while, trade.
// The piece taken goes by its square when it was one of several, "the c6 [pawn]".
type CaptureSentences = Pick<
  FactSentences,
  | 'takesBack'
  | 'winsForFree'
  | 'retakeCosts'
  | 'winsBack'
  | 'winsMaterial'
  | 'givenBack'
  | 'compensation'
  | 'trades'
>;

// A piece won where taking back loses more: a king can't take a guarded piece
// back, and a piece like the one taken is a second one lost.
const retakeCostsEn =
  (the: (piece: Piece) => string): FactSentences['retakeCosts'] =>
  (piece, square, defender) => {
    if (defender.role === 'king')
      return [
        `That wins ${indefiniteOn(piece, square)}: the king can’t take back.`,
        `${capitalize(indefiniteOn(piece, square))} won: the king can’t take it back.`,
      ];
    if (defender.role === piece.role)
      return [
        `That wins ${indefiniteOn(piece, square)}: taking back would cost another ${pieceName(defender)}.`,
        `${capitalize(indefiniteOn(piece, square))} won: taking back just loses another ${pieceName(defender)}.`,
      ];
    return [
      `That wins ${indefiniteOn(piece, square)}: taking back would cost ${the(defender)}.`,
      `${capitalize(indefiniteOn(piece, square))} won, as taking back loses ${the(defender)}.`,
    ];
  };

// Material a side behind takes back, level with the other again or not yet.
const winsBackEn: FactSentences['winsBack'] = (piece, square, level) =>
  level
    ? [
        `That wins back ${indefiniteOn(piece, square)}: material is level again.`,
        `Material level again, with ${indefiniteOn(piece, square)} won back.`,
      ]
    : [
        `That wins back ${indefiniteOn(piece, square)}.`,
        `${capitalize(indefiniteOn(piece, square))} won back.`,
      ];

// A piece won for the other side's play, or won with the other side winning anyway.
const compensationEn =
  (viewer: Viewer): FactSentences['compensation'] =>
  (piece, square, color, winning) => {
    const taker = partyOf(viewer, color);
    if (winning)
      return [
        `${capitalize(indefiniteOn(piece, square))} is won, but it changes nothing: ${taker.name} ${agree(taker, 'is', 'are')} still winning.`,
      ];
    return [
      `${capitalize(indefiniteOn(piece, square))} is won, but ${taker.name} ${agree(taker, 'gets', 'get')} enough play for it.`,
      `${capitalize(indefiniteOn(piece, square))} falls, at a price: ${taker.name} ${agree(taker, 'has', 'have')} activity in return.`,
    ];
  };

export function capturesEn(viewer: Viewer): CaptureSentences {
  const the = (piece: Piece): string => definite(viewer, piece);
  return {
    takesBack: square => [
      `A recapture on ${square}.`,
      `Taking back on ${square}, as expected.`,
      `The natural recapture on ${square}.`,
    ],
    winsForFree: (piece, square) => [
      `${capitalize(indefiniteOn(piece, square))} for free.`,
      `That wins ${indefiniteOn(piece, square)} for free.`,
      `Free material: ${indefiniteOn(piece, square)} with nothing in return.`,
      `${capitalize(indefiniteOn(piece, square))} taken, and it costs nothing.`,
    ],
    retakeCosts: retakeCostsEn(the),
    winsBack: winsBackEn,
    winsMaterial: (won, given, square) => [
      `That wins ${indefiniteOn(won, square)} for ${indefinite(given)}.`,
      `${capitalize(indefiniteOn(won, square))} won for ${indefinite(given)}: a good trade.`,
      `Giving ${indefinite(given)} for ${indefiniteOn(won, square)}: a good deal.`,
    ],
    givenBack: (piece, square, color: Color) => {
      const taker = partyOf(viewer, color);
      return [
        `${capitalize(indefiniteOn(piece, square))} falls, but ${taker.name} ${agree(taker, 'wins', 'win')} the material back.`,
        `Taking ${indefiniteOn(piece, square)} wins nothing in the end: ${taker.name} ${agree(taker, 'gets', 'get')} it back.`,
      ];
    },
    compensation: compensationEn(viewer),
    trades: (taken, ahead) => {
      if (ahead)
        return [
          'When ahead in material, every trade brings the win closer.',
          'A trade, and with fewer pieces left, the extra material counts more.',
          'Simplifying while ahead: fewer pieces, fewer worries.',
        ];
      if (taken.role === 'queen')
        return [
          'The queens come off.',
          'Queens off the board.',
          'With the queens gone, the game calms down.',
        ];
      return [
        `A fair trade: ${the(taken)} comes off.`,
        `${capitalize(the(taken))} is traded off.`,
        `${capitalize(the(taken))} goes, in an even exchange.`,
      ];
    },
  };
}
