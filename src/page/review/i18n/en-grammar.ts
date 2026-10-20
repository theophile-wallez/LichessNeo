import type { Color, Piece, Role } from '#shared/chess/index.ts';
import { pieceToken } from '#page/review/comment/tokens.ts';
import { materialPhrase } from './material.ts';
import type { Material, Viewer } from './types.ts';

// English grammar for the coach's sentences, from the reader's side: "you"
// and "the opponent" when the reader played the game, "White" and "Black"
// when they watch it.

const ROLE_NAMES: Readonly<Record<Role, string>> = {
  pawn: 'pawn',
  knight: 'knight',
  bishop: 'bishop',
  rook: 'rook',
  queen: 'queen',
  king: 'king',
};

/** A side, as the coach names it to the reader. */
export interface Party {
  /** "you", "the opponent", "White": a subject or an object. */
  readonly name: string;
  /** "your", "the opponent’s", "White’s". */
  readonly possessive: string;
  /** The reader: verbs take their plural form ("you have"). */
  readonly you: boolean;
}

/** The side of `color`. The reader's opponent always goes by "the opponent": by its color too, a comment would seem to name two. */
export function partyOf(viewer: Viewer, color: Color): Party {
  if (viewer === color) return { name: 'you', possessive: 'your', you: true };
  if (viewer !== null) return { name: 'the opponent', possessive: 'the opponent’s', you: false };
  const name = color === 'white' ? 'White' : 'Black';
  return { name, possessive: `${name}’s`, you: false };
}

/** The verb that agrees with the party: "has", or "have" for the reader. */
export const agree = (party: Party, singular: string, plural: string): string =>
  party.you ? plural : singular;

export const capitalize = (text: string): string =>
  text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);

/** "[knight]", the piece drawn before its name. */
const pieceName = (piece: Piece): string => pieceToken(piece) + ROLE_NAMES[piece.role];

/** "a [knight]". */
export const indefinite = (piece: Piece): string => `a ${pieceName(piece)}`;

/** "the [knight]", or whose it is when the reader played: "your [knight]", "the opponent’s [knight]". */
export function definite(viewer: Viewer, piece: Piece): string {
  if (viewer === null) return `the ${pieceName(piece)}`;
  return `${partyOf(viewer, piece.color).possessive} ${pieceName(piece)}`;
}

/** "the [bishop] and the [queen]", or "both [knight]knights" when they're alike: a fork's pieces. */
export function pairOf(viewer: Viewer, first: Piece, second: Piece): string {
  if (first.role !== second.role)
    return `${definite(viewer, first)} and ${definite(viewer, second)}`;
  const plural = `${pieceName(first)}s`;
  return viewer === null
    ? `both ${plural}`
    : `both ${partyOf(viewer, first.color).possessive} ${plural}`;
}

const COUNTS: readonly string[] = ['', '', 'two', 'three', 'four'];

/** "on the next move", "in two moves": how soon a line gets there. */
export const within = (moves: number): string =>
  moves <= 1 ? 'on the next move' : `in ${COUNTS[moves] ?? moves} moves`;

/** "right away", "in two moves": how soon a line that starts now gets there. */
export const soon = (moves: number): string => (moves <= 1 ? 'right away' : within(moves));

/** "a [knight] for a [pawn]", "two [pawn]pawns", "the exchange": what a side wins. */
export const materialEn = (material: Material): string | null =>
  materialPhrase(material, {
    one: indefinite,
    many: (piece, count) => {
      const number = COUNTS[count];
      return number === undefined ? null : `${number} ${pieceName(piece)}s`;
    },
    and: 'and',
    for: 'for',
    exchange: 'the exchange',
  });
