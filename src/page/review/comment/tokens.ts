import type { Color, Piece } from '#shared/chess/index.ts';
import type { LineMove } from '#page/review/chess/line.ts';
import { colorLetter, ROLE_LETTERS } from '#page/review/chess/notation.ts';

// Pieces, moves and squares go into the coach's text as [[…]] tokens, which
// the comment's markup draws as pieces, move chips and bold squares: a
// beginner sees which piece, and whose, without reading the notation.

/** [[p:wn]]: a piece, drawn. */
export const pieceToken = ({ color, role }: Piece): string =>
  `[[p:${colorLetter(color)}${ROLE_LETTERS[role]}]]`;

/**
 * Where a chip's move is played: from the position before the move the coach
 * speaks of ('b', its alternatives) or after it ('a', the replies), along
 * `ucis`, the chip's move last.
 */
export interface ChipPlay {
  readonly base: 'b' | 'a';
  readonly ucis: readonly string[];
}

const playSuffix = (play: ChipPlay | undefined): string =>
  play && play.ucis.length > 0 ? `@${play.base}:${play.ucis.join(',')}` : '';

/** [[m:w:Nf3]]: a move, as a chip with its piece; [[m:w:Nf3@b:g1f3]] when it can be played. */
export const moveToken = (san: string, color: Color, play?: ChipPlay): string =>
  `[[m:${colorLetter(color)}:${san}${playSuffix(play)}]]`;

/** [[s:e4]]: a square, in bold. */
export const squareToken = (square: string): string => `[[s:${square}]]`;

/** [[n:12.:w:Nf3]]: a move with its number, kept on one line. */
export const numberedMoveToken = (
  number: string,
  san: string,
  color: Color,
  play?: ChipPlay,
): string => `[[n:${number}:${colorLetter(color)}:${san}${playSuffix(play)}]]`;

// White's moves carry their number, and so does a line's first move when it's Black's.
function numbered({ san, color, number }: LineMove, first: boolean, play?: ChipPlay): string {
  if (color === 'white') return numberedMoveToken(`${number}.`, san, color, play);
  return first ? numberedMoveToken(`${number}...`, san, color, play) : moveToken(san, color, play);
}

/**
 * "12. Nf3 Qd7 13. O-O" as tokens: a line, numbered as on a score sheet. With
 * `play`, the line's moves in the engine's notation, each chip plays the line
 * up to itself.
 */
export const lineToken = (moves: readonly LineMove[], play?: ChipPlay): string =>
  moves
    .map((move, i) =>
      numbered(move, i === 0, play && { base: play.base, ucis: play.ucis.slice(0, i + 1) }),
    )
    .join(' ');
