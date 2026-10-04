import { fenTurn, winPercent } from '#shared/chess/index.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import type { EngineLine, EngineResult } from './uci.ts';

type WhiteScore =
  | { readonly cp: number; readonly whiteWinChance: number }
  | { readonly mate: number; readonly whiteWinChance: number };

function whiteScore(line: EngineLine, whiteToMove: boolean): WhiteScore {
  const sign = whiteToMove ? 1 : -1;
  if ('mate' in line) {
    // Mate 0: the side to move is mated.
    if (line.mate === 0) return { mate: 0, whiteWinChance: whiteToMove ? 0 : 100 };
    const mate = line.mate * sign;
    return { mate, whiteWinChance: mate > 0 ? 100 : 0 };
  }
  const cp = line.cp * sign;
  return { cp, whiteWinChance: winPercent(cp) };
}

/** One position's engine result, turned into a record from White's view. */
export function toRecord(fen: string, result: EngineResult): PositionRecord {
  const whiteToMove = fenTurn(fen) === 'white';
  const [first, second] = result.lines;
  const head = first?.pv[0];
  const best = head === undefined || head === '' ? null : head;
  const secondLineWinChance = second ? whiteScore(second, whiteToMove).whiteWinChance : null;
  // No line at all: stalemate, or no legal move.
  const score = first ? whiteScore(first, whiteToMove) : { cp: 0, whiteWinChance: 50 };
  const { whiteWinChance } = score;
  return 'mate' in score
    ? { mate: score.mate, whiteWinChance, secondLineWinChance, best }
    : { cp: score.cp, whiteWinChance, secondLineWinChance, best };
}
