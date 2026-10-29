import { fenTurn, opposite, parseFen, writePlacement, type Board } from '#shared/chess/index.ts';
import { GOOD, isError } from '#page/review/classes/classes.ts';
import { boardAfter, lineMoves } from '#page/review/chess/line.ts';
import type { CommentPart } from '#page/review/comment/markup.ts';
import { lineToken, moveToken } from '#page/review/comment/tokens.ts';
import { BEST_PLIES, bestRequest, PUNISHMENT_PLIES } from '#page/review/explain/lines.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';

// What the card's buttons have to say of a move, as the review's do
// (view/explain-hint.ts, view/nav.ts): Explain's lines, written from the
// records' own, and the positions they and Best put on the board.

/** A line on the board: from the position before the move ('b') or after it ('a'). */
export interface Line {
  readonly base: 'b' | 'a';
  readonly ucis: readonly string[];
}

const say = (text: string, droppable = false): CommentPart => ({ text, droppable });

/** The best line from the position before `move`, as Explain plays it; none when it's one move. */
export function bestLine(move: MoveVerdict): readonly string[] | null {
  const line = move.before.line?.slice(0, BEST_PLIES);
  return line && line.length > 1 && line[0] === move.best ? line : null;
}

/** Explain has something to say: the move wasn't best, and the engine had better. */
export const canExplain = (move: MoveVerdict | null): move is MoveVerdict =>
  move !== null && bestRequest(move) !== null && move.bestSan !== '';

/** Best can play the engine's move in place of this one. */
export const canBest = (move: MoveVerdict | null): move is MoveVerdict =>
  move !== null && move.best !== null && !GOOD.has(move.moveClass);

/** An error can be retried: the engine has a better move. */
export const canRetry = (move: MoveVerdict | null): move is MoveVerdict =>
  move !== null && isError(move.moveClass) && move.best !== null;

/** Explain's sentences: the best line, then the one that punishes an error. */
export function explainParts(move: MoveVerdict, language: ReviewLanguage): CommentPart[] {
  const { ui } = language;
  const best = bestLine(move);
  const fen = move.previousPosition.fen;
  const bestPart = best
    ? ui.lines.best(lineToken(lineMoves(fen, best), { base: 'b', ucis: best }))
    : ui.bestWas(
        moveToken(move.bestSan, move.color, { base: 'b', ucis: move.best ? [move.best] : [] }),
      );
  const punishment = isError(move.moveClass) ? move.after.line?.slice(0, PUNISHMENT_PLIES) : null;
  if (!punishment || punishment.length === 0) return [say(bestPart)];
  const line = lineToken(lineMoves(move.position.fen, punishment), {
    base: 'a',
    ucis: punishment,
  });
  const played = moveToken(move.san, move.color, { base: 'b', ucis: [move.uci] });
  return [say(bestPart), say(ui.lines.allows(played, line), true)];
}

const fenOf = (board: Board, turn: 'white' | 'black'): string =>
  `${writePlacement(board)} ${turn === 'white' ? 'w' : 'b'} - - 0 1`;

/** The position `ucis` lead to from `fen`. */
export function fenAfter(fen: string, ucis: readonly string[]): string {
  let board = parseFen(fen).board;
  let turn = fenTurn(fen);
  for (const uci of ucis) {
    board = boardAfter(board, uci);
    turn = opposite(turn);
  }
  return ucis.length === 0 ? fen : fenOf(board, turn);
}

/** Where `line` starts for `move`: before it or after it. */
export const lineBase = (move: MoveVerdict, line: Line): string =>
  line.base === 'a' ? move.position.fen : move.previousPosition.fen;
