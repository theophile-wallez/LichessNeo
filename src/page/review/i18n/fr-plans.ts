import type { Piece } from '#shared/chess/index.ts';
import { isPlain, type PlainReason, type Reason } from '#page/review/coach/idea.ts';
import { agreement, capitalize, owned, pronoun } from './fr-grammar.ts';
import type { PlanSentences, Viewer } from './types.ts';

const PLAIN_REASONS: Readonly<Record<PlainReason, string>> = {
  doublesRooks: 'doublait les tours',
  seventhRank: 'mettait la tour en septième rangée',
  connectsRooks: 'reliait les tours',
  centralKing: 'centralisait le roi',
  center: 'prenait le centre',
  castles: 'mettait le roi à l’abri',
};

// What the better move did, after « qui » : « Mieux valait Cf6, qui sortait ton cavalier. »
function whyFr(viewer: Viewer): (reason: Reason) => string {
  const the = (piece: Piece): string => owned(viewer, piece);
  return reason => {
    if (isPlain(reason)) return PLAIN_REASONS[reason.kind];
    if (reason.kind === 'develops') return `sortait ${the(reason.piece)}`;
    if (reason.kind === 'outpost') return `installait ${the(reason.piece)} sur un avant-poste`;
    if (reason.kind === 'openFile')
      return `prenait la colonne ${reason.halfOpen ? 'semi-ouverte' : 'ouverte'}`;
    if (reason.kind === 'passedPawn')
      return reason.made ? 'créait un pion passé' : 'poussait le pion passé';
    if (reason.kind === 'chases') return `attaquait ${the(reason.piece)}`;
    if (reason.kind === 'pins') return `clouait ${the(reason.piece)} sur ${the(reason.behind)}`;
    if (reason.kind === 'fork')
      return `faisait une fourchette sur ${the(reason.first)} et ${the(reason.second)}`;
    if (reason.kind === 'takes') return `prenait ${the(reason.piece)}`;
    return `gagnait ${reason.material}`;
  };
}

// What a rook's, a pawn's or the king's move does, whoever's it is.
const BOARD_PLANS: Omit<PlanSentences, 'develops' | 'outpost' | 'chases' | 'pins' | 'why'> = {
  openFile: halfOpen => {
    const file = `la colonne ${halfOpen ? 'semi-ouverte' : 'ouverte'}`;
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
    chases: piece => [
      `${capitalize(the(piece))} est attaqué${agreement(piece)} et doit bouger.`,
      `Ça attaque ${the(piece)}, avec gain de temps.`,
      `${capitalize(the(piece))} doit bouger : du temps de gagné.`,
    ],
    pins: (piece, behind) => [
      `${capitalize(the(piece))} est cloué${agreement(piece)} sur ${the(behind)}.`,
      `Un clouage : ${the(piece)} ne peut plus bouger sans exposer ${the(behind)}.`,
      `${capitalize(the(piece))} est coincé${agreement(piece)} devant ${the(behind)}.`,
    ],
    why: whyFr(viewer),
    ...BOARD_PLANS,
  };
}
