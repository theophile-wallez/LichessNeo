import type { PositionRecord } from '#page/review/evaluation/score.ts';
import type { GamePosition } from '#page/review/judge/types.ts';

// A game that ends drawn by rule. The engine never scores the position it's
// given as a draw by repetition, nor counts the fifty moves, so it reads the
// last position as if play went on: a drawing move would cost a won game.

const REPETITIONS = 3;
// Fifty moves each, in plies without a capture or a pawn move.
const FIFTY_MOVES = 100;

/** A FEN's position, without its move counters: what a repetition compares. */
const placement = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

/** Whether the game's last position is a draw by threefold repetition or the fifty-move rule. */
export function drawnByRule(nodes: readonly GamePosition[]): boolean {
  const last = nodes.at(-1);
  if (!last) return false;
  if (Number(last.fen.split(' ')[4]) >= FIFTY_MOVES) return true;
  const position = placement(last.fen);
  return nodes.filter(node => placement(node.fen) === position).length >= REPETITIONS;
}

const DRAWN: PositionRecord = {
  cp: 0,
  whiteWinChance: 50,
  secondLineWinChance: null,
  best: null,
  line: [],
};

/** The records, the last one a draw when the game ends drawn by rule. */
export function settleDraw(
  nodes: readonly GamePosition[],
  records: readonly (PositionRecord | undefined)[],
): readonly (PositionRecord | undefined)[] {
  const last = nodes.length - 1;
  if (records[last] === undefined || !drawnByRule(nodes)) return records;
  return records.map((record, i) => (i === last ? DRAWN : record));
}
