import type { Color, Piece, Role } from '#shared/chess/index.ts';
import { pieceToken } from '#page/review/comment/tokens.ts';
import { materialPhrase } from './material.ts';
import type { Material, Viewer } from './types.ts';

// French grammar for the coach's sentences: a piece's gender picks its
// articles and agreements, and the reader's side its persons: "tu" and
// "l’adversaire" when the reader played the game, "les Blancs" and "les
// Noirs" when they watch it.

const ROLE_NAMES: Readonly<Record<Role, string>> = {
  pawn: 'pion',
  knight: 'cavalier',
  bishop: 'fou',
  rook: 'tour',
  queen: 'dame',
  king: 'roi',
};

const isFeminine = ({ role }: Piece): boolean => role === 'rook' || role === 'queen';

const pieceName = (piece: Piece): string => pieceToken(piece) + ROLE_NAMES[piece.role];

/** "la [dame]", "le [fou]". */
const definite = (piece: Piece): string => `${isFeminine(piece) ? 'la' : 'le'} ${pieceName(piece)}`;

/** "la [dame]", or whose it is when the reader played: "ta [dame]", "la [dame] adverse". */
export function owned(viewer: Viewer, piece: Piece): string {
  if (viewer === null) return definite(piece);
  if (viewer === piece.color) return `${isFeminine(piece) ? 'ta' : 'ton'} ${pieceName(piece)}`;
  return `${definite(piece)} adverse`;
}

/** "le [fou] et la [dame]", or "les deux [cavalier]cavaliers" when they're alike: a fork's pieces. */
export function pairOf(viewer: Viewer, first: Piece, second: Piece): string {
  if (first.role !== second.role) return `${owned(viewer, first)} et ${owned(viewer, second)}`;
  const plural = `deux ${pieceName(first)}s`;
  if (viewer === null) return `les ${plural}`;
  return viewer === first.color ? `tes ${plural}` : `les ${plural} adverses`;
}

/** "une [tour]", "un [cavalier]". */
export const indefinite = (piece: Piece): string =>
  `${isFeminine(piece) ? 'une' : 'un'} ${pieceName(piece)}`;

/** The object pronoun standing for the piece: "la", "le". */
export const pronoun = (piece: Piece): string => (isFeminine(piece) ? 'la' : 'le');

/** The subject pronoun standing for the piece: "elle", "il". */
export const subjectPronoun = (piece: Piece): string => (isFeminine(piece) ? 'elle' : 'il');

/** A past participle's agreement: "défendue", "défendu". */
export const agreement = (piece: Piece): string => (isFeminine(piece) ? 'e' : '');

export const capitalize = (text: string): string =>
  text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);

/** "un net avantage" → "d’un net avantage". */
export const withDe = (text: string): string => text.replace(/^un(e?) /, 'd’un$1 ');

/** French puts a space before ! ? : ;, which mustn't wrap away from its word. */
export const typography = (text: string): string => text.replace(/ ([!?:;])/g, '\u00a0$1');

/** A side, as the coach names it to the reader. */
export interface Party {
  /** "tu", "l’adversaire", "les Blancs". */
  readonly subject: string;
  /** "l’adversaire", "les Blancs"; null for the reader, whom a pronoun stands for ("te"). */
  readonly object: string | null;
  /** "de l’adversaire", "des Blancs": an owner; null for the reader ("ton …"). */
  readonly of: string | null;
  /** "à l’adversaire", "aux Blancs". */
  readonly to: string | null;
  readonly person: 'tu' | 'il' | 'ils';
}

/** The side of `color`. The reader's opponent always goes by "l’adversaire": by its color too, a comment would seem to name two. */
export function partyOf(viewer: Viewer, color: Color): Party {
  if (viewer === color) return { subject: 'tu', object: null, of: null, to: null, person: 'tu' };
  if (viewer !== null)
    return {
      subject: 'l’adversaire',
      object: 'l’adversaire',
      of: 'de l’adversaire',
      to: 'à l’adversaire',
      person: 'il',
    };
  const name = color === 'white' ? 'Blancs' : 'Noirs';
  return {
    subject: `les ${name}`,
    object: `les ${name}`,
    of: `des ${name}`,
    to: `aux ${name}`,
    person: 'ils',
  };
}

/** The verb in the party's person: `conjugate(party, 'as', 'a', 'ont')`. */
export function conjugate(party: Party, tu: string, il: string, ils: string): string {
  if (party.person === 'tu') return tu;
  return party.person === 'il' ? il : ils;
}

/** "ton dernier coup", "le dernier coup des Blancs": `mine` for the reader, else `theirs` and its owner. */
export const ownedBy = (party: Party, mine: string, theirs: string): string =>
  party.of === null ? mine : `${theirs} ${party.of}`;

const COUNTS: readonly string[] = ['', '', 'deux', 'trois', 'quatre'];

/** « au coup suivant », « en deux coups » : how soon a line gets there. */
export const within = (moves: number): string =>
  moves <= 1 ? 'au coup suivant' : `en ${COUNTS[moves] ?? moves} coups`;

/** « tout de suite », « en deux coups » : how soon a line that starts now gets there. */
export const soon = (moves: number): string => (moves <= 1 ? 'tout de suite' : within(moves));

/** "un [cavalier] contre un [pion]", "deux [pion]pions", "la qualité": what a side wins. */
export const materialFr = (material: Material): string | null =>
  materialPhrase(material, {
    one: indefinite,
    many: (piece, count) => {
      const number = COUNTS[count];
      return number === undefined ? null : `${number} ${pieceName(piece)}s`;
    },
    and: 'et',
    for: 'contre',
    exchange: 'la qualité',
  });

/** "Tu as", "L’adversaire a", "Les Blancs ont": a side and its verb, at the start of a sentence. */
export const says = (party: Party, tu: string, il: string, ils: string): string =>
  `${capitalize(party.subject)} ${conjugate(party, tu, il, ils)}`;

/** "tu as", "l’adversaire a". */
export const has = (party: Party): string =>
  `${party.subject} ${conjugate(party, 'as', 'a', 'ont')}`;

/** "Tu avais", "L’adversaire avait". */
export const had = (party: Party): string => says(party, 'avais', 'avait', 'avaient');

/** "te met", "met l’adversaire": a verb with the party as its object. */
export const putting = (party: Party, verb: string): string =>
  party.object === null ? `te ${verb}` : `${verb} ${party.object}`;
