import type { Piece } from '#shared/chess/index.ts';
import { countPieces } from '#page/review/coach/swing.ts';
import type { Material } from './types.ts';

// What a side wins, in words: "a knight for a pawn", "two pawns", "the
// exchange", each language giving its own.

export interface MaterialWords {
  /** "a [knight]". */
  readonly one: (piece: Piece) => string;
  /** "two [pawn]pawns"; null past what the language counts. */
  readonly many: (piece: Piece, count: number) => string | null;
  readonly and: string;
  readonly for: string;
  /** A rook won for a knight or a bishop. */
  readonly exchange: string;
}

/** Pieces of up to two kinds: "a [rook] and two [pawn]pawns". */
function piecesNamed(pieces: readonly Piece[], words: MaterialWords): string | null {
  const counts = countPieces(pieces);
  if (counts.length === 0 || counts.length > 2) return null;
  const names = counts.map(({ piece, count }) =>
    count === 1 ? words.one(piece) : words.many(piece, count),
  );
  return names.every(name => name !== null) ? names.join(` ${words.and} `) : null;
}

const isMinor = (piece: Piece | undefined): boolean =>
  piece?.role === 'knight' || piece?.role === 'bishop';

/** What a side wins, null when it's too much to say in a few words. */
export function materialPhrase({ won, lost }: Material, words: MaterialWords): string | null {
  if (won.length === 1 && won[0]?.role === 'rook' && lost.length === 1 && isMinor(lost[0]))
    return words.exchange;
  const gained = piecesNamed(won, words);
  if (gained === null || lost.length === 0) return gained;
  const given = piecesNamed(lost, words);
  return given === null ? null : `${gained} ${words.for} ${given}`;
}
