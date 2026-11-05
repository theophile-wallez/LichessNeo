import type { Piece } from '#shared/chess/index.ts';
import type { MatePattern } from '#page/review/coach/mate-pattern.ts';
import type { ConceptSentences } from './concept-types.ts';
import { capitalize, conjugate, partyOf } from './fr-grammar.ts';
import type { Viewer } from './types.ts';

const MATES_FR: Readonly<Record<MatePattern, string>> = {
  backRank: 'Un mat du couloir : les pions du roi l’enferment.',
  smothered: 'Un mat à l’étouffée : le roi est enseveli sous ses propres pièces.',
  arabian: 'Le mat arabe : la tour à côté du roi dans le coin, tenue par le cavalier.',
  epaulette: 'Un mat des épaulettes : les pièces du roi, de chaque côté, lui barrent la route.',
};

// The attack and its last resorts, in French: a perpetual check, stalemate, a
// named mate, a pawn ending.

type AttackConcepts = PerpetualConcepts &
  Pick<ConceptSentences, 'stalemate' | 'matePattern' | 'wonPawnEnding' | 'lostPawnEnding'>;

type PerpetualConcepts = Pick<
  ConceptSentences,
  'perpetual' | 'checksOn' | 'noEscape' | 'repetition' | 'letsPerpetual'
>;

// A perpetual check: begun, kept up, or let in, and the draw by repetition it ends in.
function perpetualFr(viewer: Viewer): PerpetualConcepts {
  const party = (color: Piece['color']) => partyOf(viewer, color);
  return {
    perpetual: () => [
      'Échec perpétuel : le roi n’échappe pas aux échecs, c’est nulle.',
      'Échec après échec : c’est un échec perpétuel, donc nulle.',
    ],
    checksOn: (side, mate) => {
      const checker = party(side);
      if (mate === null)
        return [
          'Encore échec : l’échec perpétuel continue.',
          'Toujours des échecs, et la nulle tient.',
        ];
      return [
        `${capitalize(checker.subject)} ${conjugate(checker, 'dois', 'doit', 'doivent')} continuer les échecs : dès qu’ils s’arrêtent, ${mate} est mat.`,
        `Encore échec, et pas le choix : sinon, ${mate} est mat.`,
        `Un échec de plus : tout autre coup, et ${mate} est mat.`,
      ];
    },
    noEscape: (side, mate) => {
      const checker = party(side);
      if (mate === null)
        return [
          'Pas moyen d’échapper aux échecs : la partie file vers la nulle par répétition.',
          'Le roi n’échappe pas aux échecs : la nulle par répétition approche.',
        ];
      return [
        `${capitalize(checker.subject)} ne ${conjugate(checker, 'peux', 'peut', 'peuvent')} plus arrêter les échecs, sinon ${mate} est mat : la partie file vers la nulle par répétition.`,
        `Les échecs continuent, et ils le doivent : ${mate} serait mat. La nulle par répétition approche.`,
        `${mate} serait mat, donc les échecs ne peuvent pas s’arrêter : la nulle par répétition approche.`,
      ];
    },
    repetition: mate =>
      mate === null
        ? [
            'La même position pour la troisième fois : nulle par répétition.',
            'Triple répétition : la partie est nulle.',
          ]
        : [
            `La même position pour la troisième fois : nulle par répétition, et ${mate} n’arrive jamais.`,
            `Triple répétition : la partie est nulle, et ${mate} ne sera jamais joué.`,
          ],
    letsPerpetual: (side, reply) => {
      const owner = party(side);
      const lets = owner.to === null ? 'Ça te permet' : `Ça permet ${owner.to}`;
      return [
        `${lets} de s’en tirer : ${reply} lance un échec perpétuel.`,
        `${reply}, et les échecs ne s’arrêtent plus : échec perpétuel.`,
        `${capitalize(owner.subject)} ${conjugate(owner, 'peux', 'peut', 'peuvent')} faire nulle, en donnant échec sans fin à partir de ${reply}.`,
      ];
    },
  };
}

export function attackFr(viewer: Viewer): AttackConcepts {
  return {
    wonPawnEnding: [
      'Vers une finale de pions gagnée : tout échanger, c’est le plus simple.',
      'Les pièces disparaissent, et la finale de pions est gagnée.',
    ],
    lostPawnEnding: lost =>
      lost
        ? [
            'Cet échange mène à une finale de pions perdue.',
            'La finale de pions qui suit est perdue.',
          ]
        : [
            'La finale de pions qui suit n’est plus gagnée.',
            'Une finale de pions, mais pas gagnante : le gain s’envole.',
          ],
    stalemate: thrown =>
      thrown
        ? [
            'Pat ! L’adversaire n’a plus aucun coup, et une partie gagnée finit nulle.',
            'Attention : sans coup légal pour l’adversaire, c’est pat, et la victoire s’envole.',
          ]
        : [
            'Pat : l’adversaire n’a plus aucun coup, et la partie est nulle. Quel sauvetage !',
            'Plus aucun coup légal pour l’adversaire : pat, et la nulle depuis une position perdue.',
          ],
    matePattern: pattern => [MATES_FR[pattern]],
    ...perpetualFr(viewer),
  };
}
