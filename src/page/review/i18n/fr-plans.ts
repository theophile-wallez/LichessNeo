import type { Piece } from '#shared/chess/index.ts';
import { agreement, capitalize, owned, pronoun } from './fr-grammar.ts';
import { tacticPlansFr } from './fr-tactic-plans.ts';
import { whyFr } from './fr-why.ts';
import type { PlanSentences, Viewer } from './types.ts';

// What a rook's, a pawn's or the king's move does, whoever's it is.
type PiecePlans =
  | 'develops'
  | 'outpost'
  | 'chases'
  | 'attacksPawn'
  | 'pins'
  | 'saves'
  | 'guards'
  | 'centralizes'
  | 'outruns'
  | 'entersSquare'
  | 'discovery'
  | 'fileBattery'
  | 'diagonalBattery';

const BOARD_PLANS: Omit<PlanSentences, PiecePlans | 'why'> = {
  openFile: (halfOpen, contested) => {
    const file = `la colonne ${halfOpen ? 'semi-ouverte' : 'ouverte'}`;
    if (contested)
      return [
        `Ça conteste ${file}.`,
        `Ça vient disputer ${file} à l’autre camp.`,
        `${capitalize(file)} est contestée : l’autre camp ne l’aura pas seul.`,
      ];
    return [
      `La tour prend ${file}, sa place idéale.`,
      `La tour prend ${file}.`,
      `La tour s’empare de ${file} : c’est là qu’une tour s’épanouit.`,
      `La tour se poste sur ${file}, prête à frapper.`,
    ];
  },
  doublesRooks: [
    'Les tours se doublent : deux fois plus de pression sur la colonne.',
    'Deux tours sur la même colonne : une batterie redoutable.',
    'Les tours s’alignent sur la colonne.',
  ],
  seventhRank: [
    'La tour atteint la septième rangée, là où elle fait le plus de dégâts.',
    'Une tour en septième : pions et roi sous le feu.',
    'La tour envahit la septième rangée.',
  ],
  connectsRooks: [
    'Les tours sont maintenant reliées.',
    'La première rangée est dégagée : les tours se protègent.',
    'Les tours se défendent maintenant l’une l’autre.',
  ],
  passedPawn: made =>
    made
      ? [
          'Un pion passé est né.',
          'Voilà un pion passé, un atout pour la finale.',
          'Un nouveau pion passé : un atout à long terme.',
        ]
      : [
          'Le pion passé avance.',
          'Le pion passé poursuit sa route.',
          'Un pion passé doit avancer, et celui-ci est en route.',
          'Le pion passé se rapproche de la promotion.',
        ],
  centralKing: [
    'Le roi rejoint le centre, où il compte en finale.',
    'En finale, le roi est une pièce de combat : il rejoint le centre.',
    'Le roi monte au front : en finale, sa place est au centre.',
  ],
  behindPasser: [
    'La tour se place derrière le pion passé, pour le pousser.',
    'Derrière le pion passé : la meilleure place pour une tour.',
    'La tour soutient le pion passé par derrière.',
  ],
  fightsCenter: [
    'Le pion dispute le centre.',
    'Un pion de côté qui vise le centre.',
    'Le pion conteste le centre par le côté.',
  ],
  supportsCenter: [
    'Le pion soutient le centre.',
    'Un pion pour épauler le centre.',
    'Le pion central est maintenant soutenu par un pion.',
  ],
  luft: [
    'Le roi gagne une case de fuite : plus de mat du couloir.',
    'Un peu d’air pour le roi, contre le mat du couloir.',
    'Le roi a maintenant une case de fuite.',
  ],
  space: [
    'Le pion gagne de l’espace.',
    'Un pion en cinquième rangée, qui étouffe l’adversaire.',
    'Plus d’espace : le pion avance.',
  ],
  opposition: [
    'Le roi prend l’opposition : face à face, c’est à l’autre roi de céder du terrain.',
    'Opposition : les rois se font face, une case entre eux, et l’autre doit s’écarter.',
    'Le roi se place face à l’autre roi : l’opposition, la clé des finales de pions.',
  ],
  center: [
    'Le pion prend le centre.',
    'Un pion au centre, qui contrôle des cases clés.',
    'Un pion central : plus d’espace, plus de contrôle.',
  ],
};

// What a quiet move does for the position.
export function plansFr(viewer: Viewer): PlanSentences {
  const the = (piece: Piece): string => owned(viewer, piece);
  return {
    develops: piece => [
      `Développement : ${the(piece)} sort.`,
      `${capitalize(the(piece))} entre en jeu.`,
      `${capitalize(the(piece))} entre dans la partie, au bon moment.`,
      `${capitalize(the(piece))} quitte sa case de départ.`,
    ],
    outpost: piece => [
      `${capitalize(the(piece))} s’installe sur un avant-poste : aucun pion ne peut ${pronoun(piece)} chasser.`,
      `${capitalize(the(piece))} trouve un bel avant-poste, hors de portée des pions.`,
      `${capitalize(the(piece))} prend un solide avant-poste.`,
    ],
    saves: piece => [
      `${capitalize(the(piece))} se met à l’abri.`,
      `${capitalize(the(piece))} échappe à la menace.`,
      `${capitalize(the(piece))} se replie en lieu sûr.`,
    ],
    guards: (piece, square) => {
      const target = square === null ? the(piece) : `${the(piece)} en ${square}`;
      return [
        `Ça protège ${target}.`,
        `${capitalize(target)} est maintenant défendu${agreement(piece)}.`,
        `${capitalize(target)} reçoit du renfort.`,
      ];
    },
    centralizes: piece => [
      `${capitalize(the(piece))} se centralise.`,
      `${capitalize(the(piece))} prend une case centrale.`,
      `${capitalize(the(piece))} rejoint le centre, où il contrôle le plus de cases.`,
    ],
    outruns: king => [
      `${capitalize(the(king))} est hors du carré du pion : il ne le rattrapera plus.`,
      `Règle du carré : ${the(king)} est trop loin, le pion file à la promotion.`,
      `Le pion file à la promotion : hors de son carré, ${the(king)} ne peut plus l’arrêter.`,
    ],
    entersSquare: king => [
      `${capitalize(the(king))} entre dans le carré du pion : il le rattrapera.`,
      `Règle du carré : ${the(king)} y entre juste à temps, le pion ne passera pas.`,
      `${capitalize(the(king))} se rapproche juste à temps : le voilà dans le carré du pion.`,
    ],
    ...tacticPlansFr(the),
    why: whyFr(viewer),
    ...BOARD_PLANS,
  };
}
