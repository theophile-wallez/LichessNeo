import type { ConceptSentences } from './concept-types.ts';
import { capitalize, owned } from './fr-grammar.ts';
import type { Viewer } from './types.ts';

// The bad habits, in French: the queen out early or grabbing a pawn, a piece
// moved twice, the king walked out, a trade when behind in material.

type HabitConcepts = Pick<
  ConceptSentences,
  'earlyQueen' | 'queenTooEarly' | 'kingWalk' | 'tradesWhenBehind' | 'pawnGrab' | 'pieceTwice'
>;

export function habitsFr(viewer: Viewer): HabitConcepts {
  return {
    earlyQueen: reply => [
      `Sortie trop tôt, la dame se fait chasser : ${reply} arrive avec gain de temps.`,
      `La dame est sortie trop vite : ${reply} l’attaque, et l’adversaire se développe gratuitement.`,
    ],
    queenTooEarly: [
      'La dame sort trop tôt : elle va servir de cible pendant que les autres pièces restent à la maison.',
      'La dame d’abord, les pièces ensuite ? C’est l’inverse : cavaliers et fous sortent en premier.',
    ],
    tradesWhenBehind: [
      'Avec du matériel en moins, chaque échange aide l’adversaire.',
      'Échanger quand on est derrière : moins il reste de pièces, plus le matériel en plus pèse.',
    ],
    kingWalk: castling =>
      castling
        ? [
            'Le roi bouge et renonce au roque : le voilà coincé au centre.',
            'Plus de roque possible : le roi aura du mal à se mettre à l’abri.',
          ]
        : [
            'Le roi sort alors que les dames sont encore là : il risque de devenir une cible.',
            'Une promenade du roi en milieu de partie : sa place est encore derrière ses pions.',
          ],
    pawnGrab: square => [
      `La dame part à la chasse au pion en ${square} : du temps perdu, et la voilà loin de chez elle.`,
      `Une prise de pion en ${square} : la dame s’éloigne, et l’adversaire se développe avec gain de temps.`,
    ],
    pieceTwice: piece => [
      `${capitalize(owned(viewer, piece))} joue une deuxième fois alors que les autres pièces dorment encore : du temps perdu.`,
      'Deux fois la même pièce si tôt : il faut d’abord sortir les autres.',
    ],
  };
}
