import type { Color, Piece } from '#shared/chess/index.ts';
import {
  agreement,
  capitalize,
  conjugate,
  indefinite,
  indefiniteOn,
  owned,
  partyOf,
} from './fr-grammar.ts';
import type { FactSentences, Viewer } from './types.ts';

// What a capture does: take back, win material, maybe only for a while, trade.
// The piece taken goes by its square when it was one of several, « le [pion] c6 ».
type CaptureSentences = Pick<
  FactSentences,
  'takesBack' | 'winsForFree' | 'winsMaterial' | 'givenBack' | 'compensation' | 'trades'
>;

export function capturesFr(viewer: Viewer): CaptureSentences {
  const the = (piece: Piece): string => owned(viewer, piece);
  return {
    takesBack: square => [
      `Une reprise en ${square}.`,
      `On reprend en ${square}, comme prévu.`,
      `La reprise naturelle en ${square}.`,
    ],
    winsForFree: (piece, square) => [
      `${capitalize(indefiniteOn(piece, square))}${square === null ? '' : ','} gratuit${agreement(piece)}.`,
      `De quoi gagner ${indefiniteOn(piece, square)} sans contrepartie.`,
      `Du matériel offert : ${indefiniteOn(piece, square)}, sans rien en échange.`,
      `${capitalize(indefiniteOn(piece, square))} pris${agreement(piece)} sans rien payer.`,
    ],
    winsMaterial: (won, given, square) => [
      `De quoi gagner ${indefiniteOn(won, square)} contre ${indefinite(given)}.`,
      `${capitalize(indefiniteOn(won, square))} contre ${indefinite(given)} : un bon échange.`,
      `Donner ${indefinite(given)} pour ${indefiniteOn(won, square)} : une bonne affaire.`,
    ],
    givenBack: (piece, square, color: Color) => {
      const taker = partyOf(viewer, color);
      const wins = `${taker.subject} ${conjugate(taker, 'regagnes', 'regagne', 'regagnent')}`;
      return [
        `${capitalize(indefiniteOn(piece, square))} tombe, mais ${wins} le matériel.`,
        `Prendre ${indefiniteOn(piece, square)} ne rapporte rien au bout du compte : ${wins} le matériel.`,
      ];
    },
    compensation: (piece, square, color: Color) => {
      const taker = partyOf(viewer, color);
      return [
        `${capitalize(indefiniteOn(piece, square))} est gagné${agreement(piece)}, mais ${taker.subject} ${conjugate(taker, 'as', 'a', 'ont')} du jeu en compensation.`,
        `${capitalize(indefiniteOn(piece, square))} tombe, mais ça se paie : ${taker.subject} ${conjugate(taker, 'obtiens', 'obtient', 'obtiennent')} de l’activité en échange.`,
      ];
    },
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
