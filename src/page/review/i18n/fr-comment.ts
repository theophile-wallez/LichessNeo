import type { Color, Piece } from '#shared/chess/index.ts';
import {
  agreement,
  capitalize,
  conjugate,
  indefinite,
  materialFr,
  owned,
  ownedBy,
  partyOf,
  type Party,
  pronoun,
  withDe,
  soon,
  within,
} from './fr-grammar.ts';
import { motifFr } from './fr-motifs.ts';
import { plansFr } from './fr-plans.ts';
import type { FactSentences, LineFacts, TrajectorySentences, Viewer } from './types.ts';

/** "Tu as", "L’adversaire a", "Les Blancs ont": a side and its verb, at the start of a sentence. */
const says = (party: Party, tu: string, il: string, ils: string): string =>
  `${capitalize(party.subject)} ${conjugate(party, tu, il, ils)}`;

const has = (party: Party): string => `${party.subject} ${conjugate(party, 'as', 'a', 'ont')}`;
const had = (party: Party): string => says(party, 'avais', 'avait', 'avaient');

export function trajectoryFr(viewer: Viewer): TrajectorySentences {
  const party = (color: Color, ...seed: readonly string[]): Party =>
    partyOf(viewer, color, seed.join('|'));
  return {
    advantages: [
      '',
      'un léger avantage',
      'un net avantage',
      'une position gagnante',
      'un mat forcé',
    ],
    mateIn: moves => `un mat en ${moves}`,
    stillBalanced: [
      'La partie reste équilibrée.',
      'L’équilibre tient toujours.',
      'Les chances restent égales.',
    ],
    stillAhead: ({ side, advantage }) => [
      `${says(party(side, advantage), 'as', 'a', 'ont')} toujours ${advantage}.`,
      `${says(party(side, 'keeps', advantage), 'gardes', 'garde', 'gardent')} ${advantage}.`,
    ],
    wasBalanced: (after, forMover) => {
      const ahead = `${has(party(after.side, 'balanced', after.advantage))} ${after.advantage}`;
      return [
        `La partie était équilibrée, ${forMover ? 'et' : 'mais'} maintenant ${ahead}.`,
        `L’équilibre est rompu : maintenant ${ahead}.`,
      ];
    },
    nowBalanced: before => [
      `${had(party(before.side, 'now', before.advantage))} ${before.advantage}, mais la partie est maintenant équilibrée.`,
      'La partie redevient équilibrée.',
    ],
    grows: (color, from, to) => {
      const ahead = party(color, from, to);
      return [
        `${says(ahead, 'passes', 'passe', 'passent')} ${withDe(from)} à ${to}.`,
        `${says(ahead, 'creuses', 'creuse', 'creusent')} l’écart : maintenant ${has(ahead)} ${to}.`,
      ];
    },
    shrinks: (color, from, to) => {
      const ahead = party(color, to, from);
      return [
        `${had(ahead)} ${from}, il ne ${conjugate(ahead, 'te', 'lui', 'leur')} reste qu’${to}.`,
        ahead.of === null
          ? `Ton avantage fond : il ne te reste qu’${to}.`
          : `L’avantage ${ahead.of} fond : il ne ${conjugate(ahead, 'te', 'lui', 'leur')} reste qu’${to}.`,
      ];
    },
    swings: (before, after) => {
      const ahead = `${has(party(after.side, 'swings', after.advantage))} ${after.advantage}`;
      return [
        `${had(party(before.side, 'swung', before.advantage))} ${before.advantage}, mais maintenant ${ahead}.`,
        `La partie bascule : maintenant ${ahead}.`,
      ];
    },
  };
}

/** "te met", "met l’adversaire": a verb with the party as its object. */
const putting = (party: Party, verb: string): string =>
  party.object === null ? `te ${verb}` : `${verb} ${party.object}`;

// The sentences read off the engine's lines.
function lineFactsFr(viewer: Viewer): LineFacts {
  const party = (color: Color, ...seed: readonly string[]): Party =>
    partyOf(viewer, color, seed.join('|'));
  const the = (piece: Piece): string => owned(viewer, piece);
  return {
    motif: motifFr(viewer),
    material: materialFr,
    forcesMate: (color, line) =>
      `${says(party(color, line), 'peux', 'peut', 'peuvent')} maintenant forcer le mat : ${line}.`,
    losesMaterial: (color, { material, line, moves }, threatened) => {
      const winner = party(color, material, line);
      const wins = `${winner.subject} ${conjugate(winner, 'gagnes', 'gagne', 'gagnent')} ${material} ${within(moves)}`;
      if (threatened) return [`La menace reste entière, et ${wins} : ${line}.`];
      return [`${capitalize(wins)} : ${line}.`, `${line} : ${wins}.`];
    },
    wouldHaveWon: (color, { material, line, moves }) => [
      `Le mieux était de gagner ${material} ${soon(moves)} : ${line}.`,
      `${says(party(color, 'won', line), 'pouvais', 'pouvait', 'pouvaient')} gagner ${material} ${soon(moves)} : ${line}.`,
    ],
    winsAlong: ({ material, line, moves }) => [
      `De quoi gagner ${material} ${soon(moves)} : ${line}.`,
      `${capitalize(material)} à la clé ${soon(moves)} : ${line}.`,
      `Le coup rapporte ${material} ${soon(moves)} : ${line}.`,
    ],
    stopsThreat: (threat, material) => [
      `Ça empêche ${threat}, qui aurait gagné ${material}.`,
      `Plus de ${threat}, qui aurait gagné ${material}.`,
      `La menace ${threat} est écartée : elle aurait gagné ${material}.`,
    ],
    stopsMate: line => `Le mat est paré : ${line}.`,
    stopsLongMate: (moves, first) => `Ça pare un mat en ${moves}, qui commence par ${first}.`,
    escapes: (piece, threat) => [
      `${capitalize(the(piece))} se met à l’abri de ${threat}.`,
      `${capitalize(the(piece))} échappe à ${threat}.`,
    ],
    threatens: (threat, material) => [
      `La menace : ${threat} au coup suivant, qui gagnerait ${material}.`,
      `Au coup suivant, ${threat} gagnerait ${material}.`,
    ],
    threatensMate: (threat, moves) =>
      moves <= 1
        ? `Menace de mat au coup suivant : ${threat}.`
        : `Menace de mat ${within(moves)}, à commencer par ${threat}.`,
  };
}

// What a good move does: the error it punishes, the material it wins, the check.
type GoodMoveSentences = Pick<
  FactSentences,
  | 'punishesAtOnce'
  | 'offered'
  | 'keepsAdvantage'
  | 'holdsPosition'
  | 'promotes'
  | 'castles'
  | 'takesBack'
  | 'winsForFree'
  | 'winsMaterial'
  | 'checkForces'
  | 'littleMorePrecise'
>;

function goodMovesFr(viewer: Viewer): GoodMoveSentences {
  const party = (color: Color, ...seed: readonly string[]): Party =>
    partyOf(viewer, color, seed.join('|'));
  const the = (piece: Piece): string => owned(viewer, piece);
  return {
    punishesAtOnce: color => {
      const mistake = ownedBy(party(color, 'punishes'), 'ton erreur', 'l’erreur');
      return [
        `${capitalize(mistake)} est punie aussitôt.`,
        `De quoi faire payer tout de suite ${mistake}.`,
        `Droit au but : ${mistake} ne reste pas impunie.`,
      ];
    },
    offered: (piece, color) => {
      const taker = party(color, piece.role);
      return `${capitalize(the(piece))} est offert${agreement(piece)}, et ${taker.subject} ne ${conjugate(taker, 'peux', 'peut', 'peuvent')} pas ${pronoun(piece)} prendre sans risque.`;
    },
    keepsAdvantage: [
      'Tout autre coup laissait filer l’avantage.',
      'C’était le seul moyen de garder l’avantage, et il a été trouvé.',
    ],
    holdsPosition: color => {
      const holder = party(color, 'holds');
      return [
        `Tout autre coup ${putting(holder, 'mettait')} en difficulté.`,
        holder.object === null
          ? 'C’était le seul coup qui ne te mettait pas en difficulté.'
          : `C’était le seul coup qui ne mettait pas ${holder.object} en difficulté.`,
      ];
    },
    promotes: piece => `Le pion devient ${indefinite(piece)}.`,
    castles: [
      'Le roi est à l’abri, et la tour entre en jeu.',
      'Le roque met le roi à l’abri et prépare la tour à l’action.',
    ],
    takesBack: square => [`Une reprise en ${square}.`, `On reprend en ${square}, comme prévu.`],
    winsForFree: piece => [
      `${capitalize(indefinite(piece))} gratuit${agreement(piece)}.`,
      `De quoi gagner ${indefinite(piece)} sans contrepartie.`,
      `Du matériel offert : ${indefinite(piece)}, sans rien en échange.`,
    ],
    winsMaterial: (won, given) => [
      `De quoi gagner ${indefinite(won)} contre ${indefinite(given)}.`,
      `${capitalize(indefinite(won))} contre ${indefinite(given)} : un bon échange.`,
    ],
    checkForces: color => {
      const checked = party(color, 'check');
      return [
        `L’échec ${putting(checked, 'force')} à réagir.`,
        `Échec : il ${putting(checked, 'oblige')} à répondre.`,
      ];
    },
    littleMorePrecise: best => [
      `${best} était un peu plus précis.`,
      `${best} était légèrement meilleur.`,
      `${best} était un poil plus juste.`,
    ],
  };
}

// Two sentences carry their no-break space already, as the original did.
export function factsFr(viewer: Viewer): FactSentences {
  const party = (color: Color, ...seed: readonly string[]): Party =>
    partyOf(viewer, color, seed.join('|'));
  const the = (piece: Piece): string => owned(viewer, piece);
  const both = (first: Piece, second: Piece): string => `${the(first)} et ${the(second)}`;
  const king = (color: Color): string => {
    if (viewer === null) return `le roi ${color === 'white' ? 'blanc' : 'noir'}`;
    return viewer === color ? 'ton roi' : 'le roi adverse';
  };
  return {
    checkmate: mated => `Échec et mat\u00a0: ${king(mated)} n’a plus aucune case.`,
    matedIn: (best, moves) => `${best} matait en ${moves}.`,
    heldOutLonger: best => `${best} tenait plus longtemps.`,
    canForceMate: (color, reply) =>
      `${says(party(color, reply), 'peux', 'peut', 'peuvent')} maintenant forcer le mat, à commencer par ${reply}.`,
    wouldForceMate: (best, moves) => `${best} forçait le mat en ${moves}.`,
    missedPunishment: (color, best) =>
      `${capitalize(ownedBy(party(color, best), 'ton dernier coup', 'le dernier coup'))} était une erreur, et ${best} l’aurait puni.`,
    unfinishedPunishment: (color, best) =>
      `${capitalize(ownedBy(party(color, 'earlier', best), 'ton erreur précédente', 'l’erreur précédente'))} restait à punir\u00a0: ${best} aurait conclu.`,
    leftUndefended: ({ piece, square, reply }) =>
      `${capitalize(the(piece))} en ${square} n’est plus défendu${agreement(piece)}\u00a0: ${reply} ${pronoun(piece)} gagne.`,
    answersAndWins: (color, { piece, square, reply }) => {
      const taker = party(color, reply, square);
      return `${says(taker, 'réponds', 'répond', 'répondent')} ${reply} et ${conjugate(taker, 'gagnes', 'gagne', 'gagnent')} ${the(piece)} en ${square}.`;
    },
    strongerCapture: (best, piece) => `${best}, qui prend ${the(piece)}, était plus fort.`,
    morePrecise: best => [`${best} était plus précis.`, `${best} était mieux ici.`],
    betterMove: best => [`Il fallait jouer ${best}.`, `${best} s’imposait.`],
    ...goodMovesFr(viewer),
    forks: (first, second) => `Une fourchette : il attaque à la fois ${both(first, second)}.`,
    missedFork: (best, first, second) =>
      `${best} faisait une fourchette sur ${both(first, second)}.`,
    allowsFork: (reply, first, second) => [
      `Ça permet ${reply}, une fourchette sur ${both(first, second)}.`,
      `Désormais ${reply} fait une fourchette sur ${both(first, second)}.`,
    ],
    canPlay: (color, reply) => {
      const player = party(color, reply);
      const lets =
        player.to === null
          ? `Ça te permet de jouer ${reply}.`
          : `Ça permet ${player.to} de jouer ${reply}.`;
      return [lets, `${reply} devient possible.`];
    },
    ...lineFactsFr(viewer),
    ...plansFr(viewer),
  };
}
