import type { Piece } from '#shared/chess/index.ts';
import { capitalize, definite, indefinite } from './en-grammar.ts';
import type { FactSentences, Viewer } from './types.ts';

// What a capture does: take back, win material, trade.
type CaptureSentences = Pick<
  FactSentences,
  'takesBack' | 'winsForFree' | 'winsMaterial' | 'trades'
>;

export function capturesEn(viewer: Viewer): CaptureSentences {
  const the = (piece: Piece): string => definite(viewer, piece);
  return {
    takesBack: square => [
      `A recapture on ${square}.`,
      `Taking back on ${square}, as expected.`,
      `The natural recapture on ${square}.`,
    ],
    winsForFree: piece => [
      `${capitalize(indefinite(piece))} for free.`,
      `That wins ${indefinite(piece)} for free.`,
      `Free material: ${indefinite(piece)} with nothing in return.`,
      `${capitalize(indefinite(piece))} taken, and nothing to pay.`,
    ],
    winsMaterial: (won, given) => [
      `That wins ${indefinite(won)} for ${indefinite(given)}.`,
      `${capitalize(indefinite(won))} won for ${indefinite(given)}: a good trade.`,
      `Giving ${indefinite(given)} for ${indefinite(won)}: a good deal.`,
    ],
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
