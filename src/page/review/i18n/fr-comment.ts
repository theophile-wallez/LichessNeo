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
  withDe,
} from './fr-grammar.ts';
import type { FactSentences, TrajectorySentences, Viewer } from './types.ts';

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
    wasBalanced: (after, forMover) =>
      `La partie était équilibrée, ${forMover ? 'et' : 'mais'} maintenant ${has(party(after.side, 'balanced', after.advantage))} ${after.advantage}.`,
    nowBalanced: before =>
      `${had(party(before.side, 'now', before.advantage))} ${before.advantage}, mais la partie est maintenant équilibrée.`,
    grows: (color, from, to) =>
      `${says(party(color, from, to), 'passes', 'passe', 'passent')} ${withDe(from)} à ${to}.`,
    shrinks: (color, from, to) => {
      const ahead = party(color, to, from);
      return `${had(ahead)} ${from}, il ne ${conjugate(ahead, 'te', 'lui', 'leur')} reste qu’${to}.`;
    },
    swings: (before, after) =>
      `${had(party(before.side, 'swung', before.advantage))} ${before.advantage}, mais maintenant ${has(party(after.side, 'swings', after.advantage))} ${after.advantage}.`,
  };
}

/** "te met", "met l’adversaire": a verb with the party as its object. */
const putting = (party: Party, verb: string): string =>
  party.object === null ? `te ${verb}` : `${verb} ${party.object}`;

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
    morePrecise: best => `${best} était plus précis.`,
    betterMove: best => `Il fallait jouer ${best}.`,
    punishesAtOnce: color =>
      `Il punit aussitôt ${ownedBy(party(color, 'punishes'), 'ton erreur', 'l’erreur')}.`,
    offered: (piece, color) => {
      const taker = party(color, piece.role);
      return `${capitalize(the(piece))} est offert${agreement(piece)}, et ${taker.subject} ne ${conjugate(taker, 'peux', 'peut', 'peuvent')} pas ${pronoun(piece)} prendre sans risque.`;
    },
    keepsAdvantage: 'Tout autre coup laissait filer l’avantage.',
    holdsPosition: color =>
      `Tout autre coup ${putting(party(color, 'holds'), 'mettait')} en difficulté.`,
    promotes: piece => `Le pion devient ${indefinite(piece)}.`,
    castles: 'Le roi est à l’abri, et la tour entre en jeu.',
    takesBack: square => `Il reprend en ${square}.`,
    winsForFree: piece => `Il gagne ${indefinite(piece)} sans contrepartie.`,
    winsMaterial: (won, given) => `Il gagne ${indefinite(won)} contre ${indefinite(given)}.`,
    checkForces: color => `L’échec ${putting(party(color, 'check'), 'force')} à réagir.`,
    littleMorePrecise: best => `${best} était un peu plus précis.`,
    forks: (first, second) => `Une fourchette : il attaque à la fois ${both(first, second)}.`,
    missedFork: (best, first, second) =>
      `${best} faisait une fourchette sur ${both(first, second)}.`,
    allowsFork: (reply, first, second) =>
      `Il permet ${reply}, une fourchette sur ${both(first, second)}.`,
    canPlay: (color, reply) => {
      const player = party(color, reply);
      return player.to === null
        ? `Il te permet de jouer ${reply}.`
        : `Il permet ${player.to} de jouer ${reply}.`;
    },
  };
}
