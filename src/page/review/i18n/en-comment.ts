import type { Color, Piece, Role } from '#shared/chess/index.ts';
import { pieceToken } from '#page/review/comment/tokens.ts';
import type { FactSentences, TrajectorySentences } from './types.ts';

const ROLE_NAMES: Readonly<Record<Role, string>> = {
  pawn: 'pawn',
  knight: 'knight',
  bishop: 'bishop',
  rook: 'rook',
  queen: 'queen',
  king: 'king',
};

const name = (piece: Piece): string => pieceToken(piece) + ROLE_NAMES[piece.role];
/** "a [knight]". */
const indefinite = (piece: Piece): string => `a ${name(piece)}`;
const side = (color: Color): string => (color === 'white' ? 'White' : 'Black');
/** "White’s": a side as a possessive. */
const possessive = (color: Color): string => (color === 'white' ? 'White’s' : 'Black’s');

export const trajectoryEn: TrajectorySentences = {
  advantages: ['', 'a slight edge', 'a clear advantage', 'a winning position', 'a forced mate'],
  mateIn: moves => `a mate in ${moves}`,
  stillBalanced: ['The game stays balanced.', 'It’s still an even game.', 'The balance holds.'],
  stillAhead: ({ side: color, advantage }) => [
    `${side(color)} still has ${advantage}.`,
    `${side(color)} keeps ${advantage}.`,
  ],
  wasBalanced: (after, forMover) =>
    `The game was balanced, ${forMover ? 'and' : 'but'} now ${side(after.side)} has ${after.advantage}.`,
  nowBalanced: before =>
    `${side(before.side)} had ${before.advantage}, but the game is now balanced.`,
  grows: (color, from, to) => `${side(color)} goes from ${from} to ${to}.`,
  shrinks: (color, from, to) => `${side(color)} had ${from}; now it’s only ${to}.`,
  swings: (before, after) =>
    `${side(before.side)} had ${before.advantage}, but now ${side(after.side)} has ${after.advantage}.`,
};

export const factsEn: FactSentences = {
  checkmate: king => `Checkmate: the ${king} king has nowhere to go.`,
  matedIn: (best, moves) => `${best} mated in ${moves}.`,
  heldOutLonger: best => `${best} held out longer.`,
  canForceMate: (color, reply) => `${side(color)} can now force mate, starting with ${reply}.`,
  wouldForceMate: (best, moves) => `${best} would have forced mate in ${moves}.`,
  missedPunishment: (color, best) =>
    `${possessive(color)} last move was a mistake, and ${best} would have punished it.`,
  unfinishedPunishment: (color, best) =>
    `${possessive(color)} earlier mistake was still there to punish: ${best} would have finished the job.`,
  leftUndefended: ({ piece, square, reply }) =>
    `The ${name(piece)} on ${square} is left undefended: ${reply} wins it.`,
  answersAndWins: (color, { piece, square, reply }) =>
    `${side(color)} answers ${reply} and wins the ${name(piece)} on ${square}.`,
  strongerCapture: (best, piece) => `${best}, taking the ${name(piece)}, was stronger.`,
  morePrecise: best => `${best} was more precise.`,
  betterMove: best => `${best} was the better move.`,
  punishesAtOnce: color => `It punishes ${possessive(color)} mistake right away.`,
  offered: (piece, color) =>
    `The ${name(piece)} is offered, and ${side(color)} can’t safely take it.`,
  keepsAdvantage: 'Every other move would have let the advantage slip.',
  holdsPosition: color => `Every other move would have left ${side(color)} worse off.`,
  promotes: piece => `The pawn promotes to ${indefinite(piece)}.`,
  castles: 'The king is safe, and the rook joins the game.',
  takesBack: square => `It takes back on ${square}.`,
  winsForFree: piece => `It wins ${indefinite(piece)} for free.`,
  winsMaterial: (won, given) => `It wins ${indefinite(won)} for ${indefinite(given)}.`,
  checkForces: color => `The check forces ${side(color)} to respond.`,
  littleMorePrecise: best => `${best} was a little more precise.`,
};
