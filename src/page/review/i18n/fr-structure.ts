import type { Piece } from '#shared/chess/index.ts';
import type { ConceptSentences } from './concept-types.ts';
import { capitalize, conjugate, partyOf } from './fr-grammar.ts';
import type { Viewer } from './types.ts';

// The pawns' weaknesses and the pieces' activity, in French.

type StructureConcepts = Pick<
  ConceptSentences,
  | 'isolatedPawn'
  | 'backwardPawn'
  | 'behindInDevelopment'
  | 'passiveRook'
  | 'fianchettoHoles'
  | 'hole'
  | 'fianchettoBishopGone'
>;

const PIECES = [
  'aucune pièce',
  'une pièce',
  'deux pièces',
  'trois pièces',
  'quatre pièces',
  'cinq pièces',
];

export function structureFr(viewer: Viewer): StructureConcepts {
  const party = (color: Piece['color']) => partyOf(viewer, color);
  return {
    isolatedPawn: (side, square) => {
      const owner = party(side);
      return [
        `${owner.to === null ? 'Ça te laisse' : `Ça laisse ${owner.to}`} un pion isolé en ${square} : aucun pion à côté pour l’aider.`,
        `Le pion ${square} est isolé : une cible pour le reste de la partie.`,
      ];
    },
    backwardPawn: square => [
      `Ça laisse le pion ${square} en arrière : il ne peut plus rejoindre ses voisins.`,
      `Le pion ${square} est arriéré, et la case devant lui appartient à l’adversaire.`,
    ],
    behindInDevelopment: (side, pieces) => {
      const owner = party(side);
      const count = PIECES[pieces] ?? `${pieces} pièces`;
      return [
        `${capitalize(owner.subject)} ${conjugate(owner, 'as', 'a', 'ont')} ${count} de retard dans le développement : il faut d’abord sortir les pièces.`,
        `Le développement d’abord : ${owner.subject} ${conjugate(owner, 'as', 'a', 'ont')} ${count} de retard.`,
      ];
    },
    fianchettoHoles: (pawn, [left, right]) => [
      `Sans fou à mettre en fianchetto, ${pawn} laisse des trous en ${left} et ${right}, à côté du roi.`,
      `Des trous en ${left} et ${right} : plus aucun fou pour les couvrir.`,
    ],
    fianchettoBishopGone: (side, [left, right]) => {
      const owner = party(side);
      return [
        `${owner.of === null ? 'Ton fou du fianchetto' : `Le fou du fianchetto ${owner.of}`} disparaît : ${left} et ${right} deviennent des trous autour du roi.`,
        `Sans le fou du fianchetto, le roi garde des trous en ${left} et ${right}.`,
      ];
    },
    hole: square => [
      `Ça laisse un trou en ${square} : un cavalier s’y installerait, et plus aucun pion ne pourrait le chasser.`,
      `La case ${square} devient un trou : plus aucun pion ne pourra la contrôler.`,
    ],
    passiveRook: square => [
      `La tour devient passive : elle ne fait plus que garder le pion ${square}.`,
      `Une tour passive, attachée au pion ${square} : une tour veut attaquer.`,
    ],
  };
}
