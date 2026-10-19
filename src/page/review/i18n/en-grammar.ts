import type { Color, Piece, Role } from '#shared/chess/index.ts';
import { hash } from '#page/review/coach/hash.ts';
import { pieceToken } from '#page/review/comment/tokens.ts';
import type { Viewer } from './types.ts';

// English grammar for the coach's sentences, from the reader's side: "you"
// and "the opponent" (or their color, for a change) when the reader played
// the game, "White" and "Black" when they watch it.

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

/**
 * The side of `color`. The reader's opponent goes by "the opponent", or now and then by
 * their color, picked from `seed`, so a sentence reads the same on every redraw.
 */
export function partyOf(viewer: Viewer, color: Color, seed = ''): Party {
  if (viewer === color) return { name: 'you', possessive: 'your', you: true };
  if (viewer !== null && hash(seed) % 3 !== 0)
    return { name: 'the opponent', possessive: 'the opponent’s', you: false };
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
  return `${partyOf(viewer, piece.color, piece.role).possessive} ${pieceName(piece)}`;
}
