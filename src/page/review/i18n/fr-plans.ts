import type { Piece } from '#shared/chess/index.ts';
import { isPlain, type PlainReason, type Reason } from '#page/review/coach/idea.ts';
import { agreement, capitalize, owned, pairOf, pronoun, subjectPronoun } from './fr-grammar.ts';
import type { PlanSentences, Viewer } from './types.ts';

// The piece a pin holds is its own side's: named once whose they are, not twice.
const bare = (piece: Piece): string => owned(null, piece);

// Each reason as the better move's, in the past, and as a move still to come.
const PLAIN_REASONS: Readonly<Record<PlainReason, readonly [string, string]>> = {
  doublesRooks: ['doublait les tours', 'double les tours'],
  seventhRank: ['mettait la tour en septième rangée', 'met la tour en septième rangée'],
  connectsRooks: ['reliait les tours', 'relie les tours'],
  centralKing: ['centralisait le roi', 'centralise le roi'],
  center: ['prenait le centre', 'prend le centre'],
  fightsCenter: ['disputait le centre', 'dispute le centre'],
  supportsCenter: ['soutenait le centre', 'soutient le centre'],
  castles: ['mettait le roi à l’abri', 'met le roi à l’abri'],
  behindPasser: ['plaçait la tour derrière le pion passé', 'place la tour derrière le pion passé'],
  luft: ['donnait de l’air au roi', 'donne de l’air au roi'],
  space: ['gagnait de l’espace', 'gagne de l’espace'],
  opposition: ['prenait l’opposition', 'prend l’opposition'],
  checks: ['donnait échec', 'donne échec'],
};

type PieceReason = Extract<Reason, { readonly piece: Piece }>;
type Tense = (past: string, present: string) => string;

function pieceWhy(reason: PieceReason, the: (piece: Piece) => string, tense: Tense): string {
  const piece = the(reason.piece);
  if (reason.kind === 'develops') return `${tense('sortait', 'sort')} ${piece}`;
  if (reason.kind === 'outpost')
    return `${tense('installait', 'installe')} ${piece} sur un avant-poste`;
  if (reason.kind === 'chases') return `${tense('attaquait', 'attaque')} ${piece}`;
  if (reason.kind === 'pins')
    return `${tense('clouait', 'cloue')} ${piece} sur ${bare(reason.behind)}`;
  if (reason.kind === 'saves') return `${tense('mettait', 'met')} ${piece} à l’abri`;
  if (reason.kind === 'guards') return `${tense('protégeait', 'protège')} ${piece}`;
  if (reason.kind === 'centralizes') return `${tense('centralisait', 'centralise')} ${piece}`;
  if (reason.kind === 'takesWith') return `${tense('prenait', 'prend')} plutôt avec ${piece}`;
  return `${tense('prenait', 'prend')} ${piece}`;
}

type TacticReason = Extract<Reason, { readonly kind: 'discovery' | 'doubleThreat' | 'fork' }>;

function tacticWhy(reason: TacticReason, viewer: Viewer, tense: Tense): string {
  const the = (piece: Piece): string => owned(viewer, piece);
  if (reason.kind === 'fork')
    return `${tense('faisait', 'fait')} une fourchette sur ${pairOf(viewer, reason.first, reason.second)}`;
  if (reason.kind === 'doubleThreat')
    return `${tense('menaçait', 'menace')} à la fois le mat et ${the(reason.target)}, et un seul des deux ${tense('pouvait', 'peut')} être paré`;
  return reason.target.role === 'king'
    ? `${tense('préparait', 'prépare')} un échec à la découverte`
    : `${tense('préparait', 'prépare')} une attaque à la découverte sur ${the(reason.target)}`;
}

// What a move did, after « qui » : « Mieux valait Cf6, qui sortait ton cavalier » ;
// or does, for a move still to come : « Ça permet Fe2, qui attaque ton cavalier ».
function whyFr(viewer: Viewer): (reason: Reason, now?: boolean) => string {
  const the = (piece: Piece): string => owned(viewer, piece);
  const why = (reason: Reason, now = false): string => {
    const tense: Tense = (past, present) => (now ? present : past);
    if (isPlain(reason)) return tense(...PLAIN_REASONS[reason.kind]);
    if (reason.kind === 'both') return `${why(reason.first, now)} et ${why(reason.second, now)}`;
    if (reason.kind === 'discovery' || reason.kind === 'doubleThreat' || reason.kind === 'fork')
      return tacticWhy(reason, viewer, tense);
    if ('piece' in reason) return pieceWhy(reason, the, tense);
    if (reason.kind === 'openFile')
      return `${tense('prenait', 'prend')} la colonne ${reason.halfOpen ? 'semi-ouverte' : 'ouverte'}`;
    if (reason.kind === 'passedPawn')
      return reason.made
        ? tense('créait un pion passé', 'crée un pion passé')
        : tense('poussait le pion passé', 'pousse le pion passé');
    if (reason.kind === 'attacksKing')
      return `${tense('lançait', 'lance')} l’attaque contre ${the(reason.king)}`;
    if (reason.kind === 'outruns')
      return `${tense('filait', 'file')} à la promotion : ${the(reason.king)} ${tense('ne pouvait', 'ne peut')} plus le rattraper`;
    if (reason.kind === 'entersSquare')
      return `${tense('faisait', 'fait')} entrer ${the(reason.king)} dans le carré du pion`;
    return `${tense('gagnait', 'gagne')} ${reason.material}`;
  };
  return why;
}

// What a rook's, a pawn's or the king's move does, whoever's it is.
type PiecePlans =
  | 'develops'
  | 'outpost'
  | 'chases'
  | 'pins'
  | 'saves'
  | 'guards'
  | 'centralizes'
  | 'outruns'
  | 'entersSquare'
  | 'discovery';

const BOARD_PLANS: Omit<PlanSentences, PiecePlans | 'why'> = {
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

// What a move sets up against the other side's pieces.
function tacticPlansFr(
  the: (piece: Piece) => string,
): Pick<PlanSentences, 'chases' | 'pins' | 'discovery'> {
  return {
    chases: piece => [
      `${capitalize(the(piece))} est attaqué${agreement(piece)} et doit bouger.`,
      `Ça attaque ${the(piece)}, avec gain de temps.`,
      `${capitalize(the(piece))} doit bouger : du temps de gagné.`,
    ],
    pins: (piece, behind) => [
      `${capitalize(the(piece))} est cloué${agreement(piece)} sur ${bare(behind)}.`,
      `Un clouage : ${the(piece)} ne peut plus bouger sans exposer ${bare(behind)}.`,
      `${capitalize(the(piece))} est coincé${agreement(piece)} devant ${bare(behind)}.`,
    ],
    discovery: (slider, screen, target) => {
      const blow = target.role === 'king' ? 'échec à la découverte' : 'une attaque à la découverte';
      return [
        `${capitalize(the(slider))} se place derrière ${the(screen)}, braqué${agreement(slider)} sur ${the(target)} : dès qu’${subjectPronoun(screen)} bougera, ce sera ${blow}.`,
        `Une batterie se forme : ${the(slider)} derrière ${the(screen)}, sur ${the(target)}.`,
        `${capitalize(the(screen))} n’a plus qu’à bouger pour découvrir ${the(slider)} sur ${the(target)}.`,
      ];
    },
  };
}

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
    guards: piece => [
      `Ça protège ${the(piece)}.`,
      `${capitalize(the(piece))} est maintenant défendu${agreement(piece)}.`,
      `${capitalize(the(piece))} reçoit du renfort.`,
    ],
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
