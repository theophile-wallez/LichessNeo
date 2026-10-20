import {
  type Board,
  fenTurn,
  opposite,
  parseFen,
  ROLE_LETTERS,
  squareAt,
} from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/board-after.ts';
import { sanOf } from '#page/review/chess/notation.ts';
import { toRecord } from '#page/review/engine/record.ts';
import type { EngineLine } from '#page/review/engine/uci.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { judge } from '#page/review/judge/judge.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';

// A move judged from its position and the engine's records around it, as the
// review judges one: for the coach's tests, which give a FEN and a move, or
// two positions of a real game and the engine's lines there.

function placementOf(board: Board): string {
  const ranks = Array.from({ length: 8 }, (_, row) => {
    let rank = '';
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const square = squareAt(file, 7 - row);
      const piece = square ? board.get(square) : undefined;
      if (!piece) {
        empty++;
        continue;
      }
      const letter = ROLE_LETTERS[piece.role];
      rank += `${empty > 0 ? empty : ''}${piece.color === 'white' ? letter.toUpperCase() : letter}`;
      empty = 0;
    }
    return `${rank}${empty > 0 ? empty : ''}`;
  });
  return ranks.join('/');
}

/** The FEN after `uci`, castling rights and en passant dropped. */
export function playedFen(fen: string, uci: string): string {
  const turn = fenTurn(fen);
  const number = Number(fen.split(' ')[5]) || 1;
  const placement = placementOf(boardAfter(parseFen(fen).board, uci));
  const side = opposite(turn) === 'white' ? 'w' : 'b';
  return `${placement} ${side} - - 0 ${turn === 'black' ? number + 1 : number}`;
}

/** An engine record from White's win chance and its line, the centipawns to match. */
export const record = (whiteWinChance: number, line: readonly string[] = []): PositionRecord => ({
  cp: Math.round((whiteWinChance - 50) * 20),
  whiteWinChance,
  secondLineWinChance: null,
  best: line[0] ?? null,
  line: [...line],
});

export interface Played {
  readonly fen: string;
  readonly uci: string;
  readonly before: PositionRecord;
  readonly after: PositionRecord;
  readonly ply?: number;
  readonly previousMove?: MoveVerdict;
}

// The position before the move, with the move that led there, as the review's are.
const positionBefore = (fen: string, ply: number, previousMove?: MoveVerdict) => ({
  ply: ply - 1,
  fen,
  ...(previousMove ? { uci: previousMove.uci, san: previousMove.san } : {}),
});

/** The move `uci` from `fen`, judged. */
export function played({ fen, uci, before, after, ply = 30, previousMove }: Played): MoveVerdict {
  return judge({
    previousPosition: positionBefore(fen, ply, previousMove),
    position: { ply, fen: playedFen(fen, uci), uci, san: sanOf(fen, uci) },
    before,
    after,
    book: false,
    chess960: false,
    ...(previousMove ? { previousMove } : {}),
  });
}

/** A position of a game, and the engine's lines there. */
export interface Analysed {
  readonly fen: string;
  readonly lines: readonly EngineLine[];
}

/** The move `uci` at `ply`, from `from` to `to`, judged on the engine's lines at both. */
export function playedBetween(
  [ply, from, to]: [number, Analysed, Analysed],
  uci: string,
  previousMove?: MoveVerdict,
): MoveVerdict {
  return judge({
    previousPosition: positionBefore(from.fen, ply, previousMove),
    position: { ply, fen: to.fen, uci, san: sanOf(from.fen, uci) },
    before: toRecord(from.fen, { lines: from.lines }),
    after: toRecord(to.fen, { lines: to.lines }),
    book: false,
    chess960: false,
    ...(previousMove ? { previousMove } : {}),
  });
}
