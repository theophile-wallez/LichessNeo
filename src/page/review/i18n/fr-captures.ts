import type { Piece } from '#shared/chess/index.ts';
import { agreement, capitalize, indefinite, owned } from './fr-grammar.ts';
import type { FactSentences, Viewer } from './types.ts';

// What a capture does: take back, win material, trade.
type CaptureSentences = Pick<
  FactSentences,
  'takesBack' | 'winsForFree' | 'winsMaterial' | 'trades'
>;

export function capturesFr(viewer: Viewer): CaptureSentences {
  const the = (piece: Piece): string => owned(viewer, piece);
  return {
    takesBack: square => [
      `Une reprise en ${square}.`,
      `On reprend en ${square}, comme prévu.`,
      `La reprise naturelle en ${square}.`,
    ],
    winsForFree: piece => [
      `${capitalize(indefinite(piece))} gratuit${agreement(piece)}.`,
      `De quoi gagner ${indefinite(piece)} sans contrepartie.`,
      `Du matériel offert : ${indefinite(piece)}, sans rien en échange.`,
      `${capitalize(indefinite(piece))} pris${agreement(piece)} sans rien payer.`,
    ],
    winsMaterial: (won, given) => [
      `De quoi gagner ${indefinite(won)} contre ${indefinite(given)}.`,
      `${capitalize(indefinite(won))} contre ${indefinite(given)} : un bon échange.`,
      `Donner ${indefinite(given)} pour ${indefinite(won)} : une bonne affaire.`,
    ],
    trades: (taken, ahead) => {
      if (ahead)
        return [
          'Avec du matériel en plus, chaque échange rapproche la victoire.',
          'Un échange : moins il reste de pièces, plus l’avance matérielle pèse.',
          'Simplifier quand on mène : exactement ce qu’il faut.',
        ];
      if (taken.role === 'queen')
        return [
          'Les dames disparaissent.',
          'Échange des dames.',
          'Sans les dames, la partie se calme.',
        ];
      return [
        `Un échange équitable : ${the(taken)} disparaît.`,
        `${capitalize(the(taken))} s’échange.`,
        `${capitalize(the(taken))} disparaît, dans un échange égal.`,
      ];
    },
  };
}
