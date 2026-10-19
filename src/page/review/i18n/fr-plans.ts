import type { Piece } from '#shared/chess/index.ts';
import { capitalize, owned, pronoun } from './fr-grammar.ts';
import type { PlanSentences, Viewer } from './types.ts';

// What a quiet move does for the position.
export function plansFr(viewer: Viewer): PlanSentences {
  const the = (piece: Piece): string => owned(viewer, piece);
  return {
    develops: piece => [
      `Développement : ${the(piece)} sort.`,
      `${capitalize(the(piece))} entre en jeu.`,
      `${capitalize(the(piece))} entre dans la partie, au bon moment.`,
    ],
    outpost: piece => [
      `${capitalize(the(piece))} s’installe sur un avant-poste : aucun pion ne peut ${pronoun(piece)} chasser.`,
      `${capitalize(the(piece))} trouve un bel avant-poste, hors de portée des pions.`,
    ],
    openFile: halfOpen => {
      const file = `la colonne ${halfOpen ? 'semi-ouverte' : 'ouverte'}`;
      return [
        `La tour prend ${file}, sa place idéale.`,
        `La tour prend ${file}.`,
        `La tour s’empare de ${file} : c’est là qu’une tour s’épanouit.`,
      ];
    },
    passedPawn: made =>
      made
        ? ['Un pion passé est né.', 'Voilà un pion passé, un atout pour la finale.']
        : [
            'Le pion passé avance.',
            'Le pion passé poursuit sa route.',
            'Un pion passé doit avancer, et celui-ci est en route.',
          ],
    centralKing: [
      'Le roi rejoint le centre, où il compte en finale.',
      'En finale, le roi est une pièce de combat : il rejoint le centre.',
    ],
  };
}
