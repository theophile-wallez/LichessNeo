import { isInCheck } from '#shared/chess/attacks.ts';
import { playSan } from '#shared/chess/san.ts';
import { type Board, type Color, opposite } from '#shared/chess/types.ts';
import { legalMoves, moved } from '#page/review/chess/moves.ts';
import { moveToken, squareToken } from '#page/review/comment/tokens.ts';
import type { StudyPosition } from './study.ts';

// A study comment as the coach's text: [Nf3] is a move, [Qb3 Qxb3 axb3] moves
// one after the other, [w:Re1] a later move of White, and a square is written
// as it is (e5), since a PGN comment ends at the first }. A move the side to
// move can play is a chip the reader plays; one either side could play after
// one more move of its own (a plan), or one of the line's own, a chip of that
// side. Anyone may edit the study: a move that is none stays plain text.

const MARK = /\[(?:([wb]):)?([^[\]]+)\]|\b([a-h][1-8])\b/g;
const SAN = /^(?:[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|O-O(?:-O)?)[+#]?$/;

const bare = (san: string): string => san.replace(/[+#]$/, '');

/** Whether `side` can play `san` now, or after one more move of its own. */
function planned(board: Board, side: Color, san: string): boolean {
  if (playSan(board, side, san)) return true;
  return legalMoves(board, side).some(([from, to]) => {
    const later = moved(board, from, to);
    return !isInCheck(later, side) && playSan(later, side, san) !== null;
  });
}

function single(position: StudyPosition, san: string): string | null {
  const { board, turn, line } = position;
  const played = playSan(board, turn, san);
  if (played) return moveToken(san, turn, { base: 'a', ucis: [played.uci] });
  const own = line.find(move => bare(move.san) === bare(san));
  if (own) return moveToken(own.san, own.color);
  const side = [opposite(turn), turn].find(each => planned(board, each, san));
  return side ? moveToken(san, side) : null;
}

/** Moves one after the other: from the position, played, or with its side to move passing. */
function sequence(position: StudyPosition, sans: readonly string[]): string | null {
  for (const [first, playable] of [
    [position.turn, true],
    [opposite(position.turn), false],
  ] as const) {
    let board = position.board;
    let side = first;
    const ucis: string[] = [];
    const chips: string[] = [];
    for (const san of sans) {
      const played = playSan(board, side, san);
      if (!played) break;
      ucis.push(played.uci);
      chips.push(moveToken(san, side, playable ? { base: 'a', ucis: [...ucis] } : undefined));
      ({ board } = played);
      side = opposite(side);
    }
    if (chips.length === sans.length) return chips.join(' ');
  }
  return null;
}

function mark(position: StudyPosition, letter: string | undefined, text: string): string | null {
  const sans = text.trim().split(/\s+/);
  if (!sans.every(san => SAN.test(san))) return null;
  if (letter)
    return sans.length === 1 ? moveToken(text.trim(), letter === 'w' ? 'white' : 'black') : null;
  return sans.length === 1 ? single(position, text.trim()) : sequence(position, sans);
}

/** The position's comment, its moves and squares as the coach's tokens. */
export function studyText(position: StudyPosition): string {
  // Brackets doubled would read as tokens of the comment's markup (comment/markup.ts).
  const comment = position.comment.replaceAll(/\[{2,}/g, '[').replaceAll(/\]{2,}/g, ']');
  return comment.replaceAll(
    MARK,
    (whole, letter: string | undefined, text?: string, square?: string) => {
      if (square) return squareToken(square);
      const written = text ? mark(position, letter, text) : null;
      return written ?? whole.slice(1, -1);
    },
  );
}
