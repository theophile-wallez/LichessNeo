import type { Color, Piece } from '#shared/chess/index.ts';
import { agree, capitalize, definite, indefinite, indefiniteOn, partyOf } from './en-grammar.ts';
import type { FactSentences, Viewer } from './types.ts';

// What a capture does: take back, win material, maybe only for a while, trade.
// The piece taken goes by its square when it was one of several, "the c6 [pawn]".
type CaptureSentences = Pick<
  FactSentences,
  'takesBack' | 'winsForFree' | 'winsMaterial' | 'givenBack' | 'compensation' | 'trades'
>;

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
      `${capitalize(indefiniteOn(piece, square))} taken, and nothing to pay.`,
    ],
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
    compensation: (piece, square, color: Color) => {
      const taker = partyOf(viewer, color);
      return [
        `${capitalize(indefiniteOn(piece, square))} is won, but ${taker.name} ${agree(taker, 'gets', 'get')} enough play for it.`,
        `${capitalize(indefiniteOn(piece, square))} falls, at a price: ${taker.name} ${agree(taker, 'has', 'have')} activity in return.`,
      ];
    },
    trades: (taken, ahead) => {
      if (ahead)
        return [
          'Ahead in material, trading pieces brings the win closer.',
          'A trade, and with fewer pieces left, the extra material counts more.',
          'Simplifying while ahead: exactly right.',
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
