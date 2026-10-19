import type { Color, Piece } from '#shared/chess/index.ts';
import {
  agreement,
  capitalize,
  conjugate,
  indefinite,
  owned,
  ownedBy,
  partyOf,
  type Party,
  pronoun,
  putting,
  says,
} from './fr-grammar.ts';
import { betterMovesFr } from './fr-better.ts';
import { capturesFr } from './fr-captures.ts';
import { lineFactsFr } from './fr-lines.ts';
import { plansFr } from './fr-plans.ts';
import type { FactSentences, Viewer } from './types.ts';

// A mate given, let in, slowed down or missed.
type MateSentences = Pick<
  FactSentences,
  'checkmate' | 'matedIn' | 'heldOutLonger' | 'canForceMate' | 'wouldForceMate'
>;

function matesFr(viewer: Viewer): MateSentences {
  const king = (color: Color): string => {
    if (viewer === null) return `le roi ${color === 'white' ? 'blanc' : 'noir'}`;
    return viewer === color ? 'ton roi' : 'le roi adverse';
  };
  return {
    checkmate: mated => [
      `Échec et mat : ${king(mated)} n’a plus aucune case.`,
      `Mat ! ${capitalize(king(mated))} est pris au piège.`,
      'Échec et mat, la partie est finie.',
    ],
    matedIn: (best, moves) => [
      `${best} matait en ${moves}.`,
      `${best} donnait un mat en ${moves}.`,
      `Un mat en ${moves} commençait par ${best}.`,
    ],
    heldOutLonger: best => [
      `${best} tenait plus longtemps.`,
      `${best} retardait le mat.`,
      `Avec ${best}, le roi résistait plus longtemps.`,
    ],
    canForceMate: (color, reply) => [
      `${says(partyOf(viewer, color), 'peux', 'peut', 'peuvent')} maintenant forcer le mat, à commencer par ${reply}.`,
      `Ça permet un mat forcé, qui commence par ${reply}.`,
      `${reply} lance maintenant un mat forcé.`,
    ],
    wouldForceMate: (best, moves) => [
      `${best} forçait le mat en ${moves}.`,
      `Un mat en ${moves} était là, à commencer par ${best}.`,
      `${best} menait à un mat forcé en ${moves}.`,
    ],
  };
}

// What an error lets the opponent do: take a piece, fork, play a move.
type LossSentences = Pick<
  FactSentences,
  'leftUndefended' | 'answersAndWins' | 'allowsFork' | 'canPlay'
>;

function lossesFr(viewer: Viewer): LossSentences {
  const party = (color: Color): Party => partyOf(viewer, color);
  const the = (piece: Piece): string => owned(viewer, piece);
  const both = (first: Piece, second: Piece): string => `${the(first)} et ${the(second)}`;
  return {
    leftUndefended: ({ piece, square, reply }) => [
      `${capitalize(the(piece))} en ${square} n’est plus défendu${agreement(piece)} : ${reply} ${pronoun(piece)} gagne.`,
      `Plus rien ne défend ${the(piece)} en ${square} : ${reply} ${pronoun(piece)} prend.`,
      `${capitalize(the(piece))} en ${square} est en prise, et ${reply} ${pronoun(piece)} ramasse.`,
    ],
    answersAndWins: (color, { piece, square, reply }) => {
      const taker = party(color);
      return [
        `${says(taker, 'réponds', 'répond', 'répondent')} ${reply} et ${conjugate(taker, 'gagnes', 'gagne', 'gagnent')} ${the(piece)} en ${square}.`,
        `${reply} suit, et ${the(piece)} en ${square} tombe.`,
        `Après ${reply}, ${the(piece)} en ${square} est perdu${agreement(piece)}.`,
      ];
    },
    allowsFork: (reply, first, second) => [
      `Ça permet ${reply}, une fourchette sur ${both(first, second)}.`,
      `Désormais ${reply} fait une fourchette sur ${both(first, second)}.`,
      `Ça tombe dans ${reply}, une fourchette sur ${both(first, second)}.`,
    ],
    canPlay: (color, reply) => {
      const player = party(color);
      const lets =
        player.to === null
          ? `Ça te permet de jouer ${reply}.`
          : `Ça permet ${player.to} de jouer ${reply}.`;
      return [
        lets,
        `${reply} devient possible.`,
        `Ça ouvre la porte à ${reply}.`,
        `Désormais ${reply} est jouable.`,
      ];
    },
  };
}

// What a good move does: the error it punishes, the sacrifice, the only move, the fork.
type GoodMoveSentences = Pick<
  FactSentences,
  'punishesAtOnce' | 'offered' | 'keepsAdvantage' | 'holdsPosition' | 'forks'
>;

function goodMovesFr(viewer: Viewer): GoodMoveSentences {
  const party = (color: Color): Party => partyOf(viewer, color);
  const the = (piece: Piece): string => owned(viewer, piece);
  return {
    punishesAtOnce: color => {
      const mistake = ownedBy(party(color), 'ton erreur', 'l’erreur');
      return [
        `${capitalize(mistake)} est punie aussitôt.`,
        `De quoi faire payer tout de suite ${mistake}.`,
        `Droit au but : ${mistake} ne reste pas impunie.`,
        `Pas de temps perdu : ${mistake} est punie.`,
      ];
    },
    offered: (piece, color) => {
      const taker = party(color);
      return [
        `${capitalize(the(piece))} est offert${agreement(piece)}, et ${taker.subject} ne ${conjugate(taker, 'peux', 'peut', 'peuvent')} pas ${pronoun(piece)} prendre sans risque.`,
        `${capitalize(the(piece))} est laissé${agreement(piece)} en prise exprès : ${pronoun(piece)} prendre coûterait cher.`,
        `Un sacrifice : ${the(piece)} est à prendre, mais pas gratuitement.`,
      ];
    },
    keepsAdvantage: [
      'Tout autre coup laissait filer l’avantage.',
      'C’était le seul moyen de garder l’avantage, et il a été trouvé.',
      'Tout le reste laissait échapper l’avantage.',
      'Le seul coup qui gardait l’avantage.',
    ],
    holdsPosition: color => {
      const holder = party(color);
      return [
        `Tout autre coup ${putting(holder, 'mettait')} en difficulté.`,
        holder.object === null
          ? 'C’était le seul coup qui ne te mettait pas en difficulté.'
          : `C’était le seul coup qui ne mettait pas ${holder.object} en difficulté.`,
        `Tout le reste ${putting(holder, 'mettait')} en danger.`,
        holder.object === null
          ? 'Le seul coup qui te tirait d’affaire.'
          : `Le seul coup qui tirait ${holder.object} d’affaire.`,
      ];
    },
    forks: (first, second) => [
      `Une fourchette : ${the(first)} et ${the(second)} sont attaqué${agreement(first) && agreement(second) ? 'es' : 's'} à la fois.`,
      `Une fourchette, sur ${the(first)} et ${the(second)}.`,
      `Fourchette ! ${capitalize(the(first))} et ${the(second)} sont pris en même temps.`,
    ],
  };
}

// What a routine move does: castle, promote, check.
type RoutineSentences = Pick<FactSentences, 'castles' | 'promotes' | 'checkForces'>;

function routinesFr(viewer: Viewer): RoutineSentences {
  return {
    promotes: piece => [
      `Le pion devient ${indefinite(piece)}.`,
      `Le pion atteint la dernière rangée et devient ${indefinite(piece)}.`,
      `Promotion : le pion se transforme en ${indefinite(piece)}.`,
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

export const factsFr = (viewer: Viewer): FactSentences => ({
  ...matesFr(viewer),
  ...lossesFr(viewer),
  ...goodMovesFr(viewer),
  ...routinesFr(viewer),
  ...capturesFr(viewer),
  ...betterMovesFr(viewer),
  ...lineFactsFr(viewer),
  ...plansFr(viewer),
});
