import { type Color, fenTurn, isInCheck, parseFen } from '#shared/chess/index.ts';
import { playLine, type Ply } from '#page/review/chess/played-line.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { SURE_MATE } from '#page/review/judge/mate.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { securedSwing, type Swing, worthSaying } from './swing.ts';

// What the opponent threatens before a move: what it would play if the mover
// passed, the engine's search of the position with the other side to move (a
// null move, explain/threats.ts). A good quiet move is good for what it stops.

export interface Threat {
  /** The position before the move, the other side to move. */
  readonly fen: string;
  /** The engine's record of it. */
  readonly record: PositionRecord;
}

/** `fen` with the other side to move, or null when the side to move is in check: it can't pass. */
export function passedFen(fen: string): string | null {
  const turn = fenTurn(fen);
  if (isInCheck(parseFen(fen).board, turn)) return null;
  const [placement = '', , castling = '-', , halfmoves = '0', moves = '1'] = fen.split(' ');
  // En passant is gone, the double step no longer the last move; Black passing
  // ends its move, so White's comes with the next number.
  const number = turn === 'black' ? Number(moves) + 1 : Number(moves);
  return [placement, turn === 'white' ? 'b' : 'w', castling, '-', halfmoves, number].join(' ');
}

// How soon a threat must win what it wins: its move, the reply, and the take.
const THREAT_WITHIN = 3;

/** What a threat would do: a sure mate, or material won soon and kept. */
export interface Menace {
  /** Its line, from the passed position. */
  readonly plies: readonly Ply[];
  /** The moves to mate, for a mate. */
  readonly mate: number | null;
  readonly won: Swing | null;
}

/**
 * What `them` threatens, if anything the coach can be sure of: a threat starts
 * with a capture or a check, else it's a plan.
 */
export function menaceOf({ fen, record }: Threat, them: Color): Menace | null {
  const plies = playLine(fen, record.line ?? (record.best ? [record.best] : []));
  const [first] = plies;
  if (!first || (!first.captured && !first.check)) return null;
  const mate = 'mate' in record ? record.mate * (them === 'white' ? 1 : -1) : 0;
  if (mate > 0) return mate <= SURE_MATE ? { plies, mate, won: null } : null;
  const won = securedSwing(plies, them);
  return won && worthSaying(won) && won.plies <= THREAT_WITHIN ? { plies, mate: null, won } : null;
}

/** Whether `them` still mates after the move, or wins as much as the threat did. */
export function stillThreatens(move: MoveVerdict, menace: Menace, them: Color): boolean {
  const { after, position } = move;
  const sign = them === 'white' ? 1 : -1;
  if ('mate' in after && after.mate * sign > 0) return true;
  // Without the line after the move, what a material threat still wins is unknown.
  if (menace.mate !== null) return false;
  if (!after.line) return true;
  const kept = securedSwing(playLine(position.fen, after.line), them)?.net ?? 0;
  return kept >= (menace.won?.net ?? 0);
}
