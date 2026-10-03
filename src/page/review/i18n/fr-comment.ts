import type { FactSentences, TrajectorySentences } from './types.ts';
import {
  agreement,
  capitalize,
  definite,
  indefinite,
  pronoun,
  side,
  sides,
  withDe,
} from './fr-grammar.ts';

export const trajectoryFr: TrajectorySentences = {
  advantages: ['', 'un léger avantage', 'un net avantage', 'une position gagnante', 'un mat forcé'],
  mateIn: moves => `un mat en ${moves}`,
  stillBalanced: [
    'La partie reste équilibrée.',
    'L’équilibre tient toujours.',
    'Les chances restent égales.',
  ],
  stillAhead: ({ side: color, advantage }) => [
    `${capitalize(side(color))} ont toujours ${advantage}.`,
    `${capitalize(side(color))} gardent ${advantage}.`,
  ],
  wasBalanced: (after, forMover) =>
    `La partie était équilibrée, ${forMover ? 'et' : 'mais'} maintenant ${side(after.side)} ont ${after.advantage}.`,
  nowBalanced: before =>
    `${capitalize(side(before.side))} avaient ${before.advantage}, mais la partie est maintenant équilibrée.`,
  grows: (color, from, to) => `${capitalize(side(color))} passent ${withDe(from)} à ${to}.`,
  shrinks: (color, from, to) =>
    `${capitalize(side(color))} avaient ${from}, il ne leur reste qu’${to}.`,
  swings: (before, after) =>
    `${capitalize(side(before.side))} avaient ${before.advantage}, mais maintenant ${side(after.side)} ont ${after.advantage}.`,
};

// Two sentences carry their no-break space already, as the original did.
export const factsFr: FactSentences = {
  checkmate: king =>
    `Échec et mat\u00a0: le roi ${king === 'white' ? 'blanc' : 'noir'} n’a plus aucune case.`,
  matedIn: (best, moves) => `${best} matait en ${moves}.`,
  heldOutLonger: best => `${best} tenait plus longtemps.`,
  canForceMate: (color, reply) =>
    `${capitalize(side(color))} peuvent maintenant forcer le mat, à commencer par ${reply}.`,
  wouldForceMate: (best, moves) => `${best} forçait le mat en ${moves}.`,
  missedPunishment: (color, best) =>
    `Le dernier coup ${sides(color)} était une erreur, et ${best} l’aurait puni.`,
  unfinishedPunishment: (color, best) =>
    `L’erreur précédente ${sides(color)} restait à punir\u00a0: ${best} aurait conclu.`,
  leftUndefended: ({ piece, square, reply }) =>
    `${capitalize(definite(piece))} en ${square} n’est plus défendu${agreement(piece)}\u00a0: ${reply} ${pronoun(piece)} gagne.`,
  answersAndWins: (color, { piece, square, reply }) =>
    `${capitalize(side(color))} répondent ${reply} et gagnent ${definite(piece)} en ${square}.`,
  strongerCapture: (best, piece) => `${best}, qui prend ${definite(piece)}, était plus fort.`,
  morePrecise: best => `${best} était plus précis.`,
  betterMove: best => `Il fallait jouer ${best}.`,
  punishesAtOnce: color => `Il punit aussitôt l’erreur ${sides(color)}.`,
  offered: (piece, color) =>
    `${capitalize(definite(piece))} est offert${agreement(piece)}, et ${side(color)} ne peuvent pas ${pronoun(piece)} prendre sans risque.`,
  keepsAdvantage: 'Tout autre coup laissait filer l’avantage.',
  holdsPosition: color => `Tout autre coup mettait ${side(color)} en difficulté.`,
  promotes: piece => `Le pion devient ${indefinite(piece)}.`,
  castles: 'Le roi est à l’abri, et la tour entre en jeu.',
  takesBack: square => `Il reprend en ${square}.`,
  winsForFree: piece => `Il gagne ${indefinite(piece)} sans contrepartie.`,
  winsMaterial: (won, given) => `Il gagne ${indefinite(won)} contre ${indefinite(given)}.`,
  checkForces: color => `L’échec force ${side(color)} à réagir.`,
  littleMorePrecise: best => `${best} était un peu plus précis.`,
};
