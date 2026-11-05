import type { Color, Piece } from '#shared/chess/index.ts';
import {
  agreement,
  capitalize,
  conjugate,
  indefinite,
  indefiniteOn,
  owned,
  partyOf,
  pieceName,
} from './fr-grammar.ts';
import type { FactSentences, Viewer } from './types.ts';

// What a capture does: take back, win material, maybe only for a while, trade.
// The piece taken goes by its square when it was one of several, « le [pion] c6 ».
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
const retakeCostsFr =
  (the: (piece: Piece) => string): FactSentences['retakeCosts'] =>
  (piece, square, defender) => {
    if (defender.role === 'king')
      return [
        `De quoi gagner ${indefiniteOn(piece, square)} : le roi ne peut pas reprendre.`,
        `${capitalize(indefiniteOn(piece, square))} gagné${agreement(piece)} : le roi ne peut pas reprendre.`,
      ];
    if (defender.role === piece.role) {
      const another = `un${agreement(defender)} autre ${pieceName(defender)}`;
      return [
        `De quoi gagner ${indefiniteOn(piece, square)} : reprendre coûterait ${another}.`,
        `${capitalize(indefiniteOn(piece, square))} gagné${agreement(piece)} : reprendre ne fait que perdre ${another}.`,
      ];
    }
    return [
      `De quoi gagner ${indefiniteOn(piece, square)} : reprendre coûterait ${the(defender)}.`,
      `${capitalize(indefiniteOn(piece, square))} gagné${agreement(piece)}, car reprendre perd ${the(defender)}.`,
    ];
  };

// Material a side behind takes back, level with the other again or not yet.
const winsBackFr: FactSentences['winsBack'] = (piece, square, level) =>
  level
    ? [
        `De quoi récupérer ${indefiniteOn(piece, square)} : le matériel est de nouveau égal.`,
        `Matériel rétabli, ${indefiniteOn(piece, square)} récupéré${agreement(piece)}.`,
      ]
    : [
        `De quoi récupérer ${indefiniteOn(piece, square)}.`,
        `${capitalize(indefiniteOn(piece, square))} récupéré${agreement(piece)}.`,
      ];

// A piece won for the other side's play, or won with the other side winning anyway.
const compensationFr =
  (viewer: Viewer): FactSentences['compensation'] =>
  (piece, square, color, winning) => {
    const taker = partyOf(viewer, color);
    if (winning)
      return [
        `${capitalize(indefiniteOn(piece, square))} tombe, mais ça ne change rien : ${taker.subject} ${conjugate(taker, 'gagnes', 'gagne', 'gagnent')} toujours.`,
      ];
    return [
      `${capitalize(indefiniteOn(piece, square))} est gagné${agreement(piece)}, mais ${taker.subject} ${conjugate(taker, 'as', 'a', 'ont')} du jeu en compensation.`,
      `${capitalize(indefiniteOn(piece, square))} tombe, mais ça se paie : ${taker.subject} ${conjugate(taker, 'obtiens', 'obtient', 'obtiennent')} de l’activité en échange.`,
    ];
  };

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
    retakeCosts: retakeCostsFr(the),
    winsBack: winsBackFr,
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
    compensation: compensationFr(viewer),
    trades: (taken, ahead) => {
      if (ahead)
        return [
          'Avec du matériel en plus, chaque échange rapproche la victoire.',
          'Un échange : moins il reste de pièces, plus l’avance matérielle pèse.',
          'Simplifier quand on mène : moins de pièces, moins de soucis.',
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
