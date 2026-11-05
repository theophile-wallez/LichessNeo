import { conjugate, indefinite, partyOf, putting } from './fr-grammar.ts';
import type { FactSentences, Viewer } from './types.ts';

// The routine moves, in French: a promotion, castling, a check.

type RoutineSentences = Pick<
  FactSentences,
  'castles' | 'castlesOpposite' | 'promotes' | 'checkForces'
>;

export function routinesFr(viewer: Viewer): RoutineSentences {
  return {
    promotes: (piece, check) => {
      if (piece.role !== 'queen' && check)
        return [
          `Sous-promotion : ${indefinite(piece)}, et avec échec ! Une dame n’aurait pas fait mieux.`,
        ];
      if (piece.role !== 'queen')
        return [`Sous-promotion : ${indefinite(piece)} plutôt qu’une dame, et c’est le bon choix.`];
      return [
        `Le pion devient ${indefinite(piece)}.`,
        `Le pion atteint la dernière rangée et devient ${indefinite(piece)}.`,
        `Promotion : le pion se transforme en ${indefinite(piece)}.`,
      ];
    },
    castlesOpposite: [
      'Roque du côté opposé : place à la course, chacun lance ses pions sur l’autre roi.',
      'Rois sur des ailes opposées : les attaques de pions arrivent, et la vitesse compte avant tout.',
    ],
    castles: [
      'Le roi est à l’abri, et la tour entre en jeu.',
      'Le roque met le roi à l’abri et prépare la tour à l’action.',
      'Le roi se met à l’abri, et la tour entre en jeu.',
      'Roque : un roi en sécurité, une tour prête à jouer.',
    ],
    checkForces: color => {
      const checked = partyOf(viewer, color);
      return [
        `L’échec ${putting(checked, 'force')} à réagir.`,
        `Échec : il ${putting(checked, 'oblige')} à répondre.`,
        `Échec, et ${checked.subject} ${conjugate(checked, 'dois', 'doit', 'doivent')} d’abord parer.`,
      ];
    },
  };
}
