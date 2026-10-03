import type { Analysis } from '#page/lichess/analysis.ts';
import { GOOD, isError } from '#page/review/classes/classes.ts';
import { engineFor } from '#page/review/engine-pool.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';

// Explain's lines: the engine's line from the move that was best and, for an
// error, the line that punishes it. The cache keeps only each position's best
// move, so the engine plays a line out when Explain first asks for it,
// searching from that move alone so the line matches the verdict.

/** The best line's plies Explain writes and plays on the board. */
export const BEST_PLIES = 4;
/** The punishing line's plies Explain writes. */
export const PUNISHMENT_PLIES = 3;

export interface LineRequest {
  readonly fen: string;
  /** The line's first move, a record's best, in the engine's notation. */
  readonly first: string;
}

const keyOf = ({ fen, first }: LineRequest): string => `${fen} ${first}`;

/** For a move that wasn't the best, the line from its position before, starting with the best. */
export const bestRequest = (move: JudgedMove): LineRequest | null =>
  move.best && !GOOD.has(move.moveClass)
    ? { fen: move.previousPosition.fen, first: move.best }
    : null;

/** The line after an error, starting with the engine's best reply. */
export const punishmentRequest = (move: JudgedMove): LineRequest | null =>
  isError(move.moveClass) && move.after.best
    ? { fen: move.position.fen, first: move.after.best }
    : null;

/** The line asked for, once the engine has played it out. */
export const foundLine = (
  session: Session,
  request: LineRequest | null,
): readonly string[] | null => (request && session.lines.found.get(keyOf(request))) ?? null;

export interface ExplainLines {
  readonly best: readonly string[];
  readonly punishment: readonly string[] | null;
}

/**
 * The lines Explain shows of a move that wasn't best, once the engine has
 * played out every one: they come in together, so the comment is typed once.
 */
export function explainLines(session: Session, move: JudgedMove): ExplainLines | null {
  const best = foundLine(session, bestRequest(move));
  const request = punishmentRequest(move);
  const punishment = foundLine(session, request);
  return best && (punishment || !request) ? { best, punishment } : null;
}

async function lookUp(session: Session, analysis: Analysis, request: LineRequest): Promise<void> {
  const { lines } = session;
  lines.busy = true;
  // No line (the game is over, or the engine failed): the move alone.
  let line: readonly string[] = [request.first];
  try {
    const engine = await engineFor(session, analysis);
    const result = await engine.analyse(
      { position: `fen ${request.fen}`, searchMoves: [request.first] },
      { urgent: true },
    );
    const pv = result.lines[0]?.pv ?? [];
    if (pv[0] === request.first) line = pv;
  } catch (error) {
    console.error('[LichessReimagined] engine failed', error);
  }
  lines.found.set(keyOf(request), line);
  lines.busy = false;
  session.redraw();
}

/** Asks the engine for the next line Explain shows of `move`, one search at a time. */
export function pumpLines(session: Session, analysis: Analysis, move: JudgedMove): void {
  const { lines } = session;
  if (lines.busy) return;
  const request = [bestRequest(move), punishmentRequest(move)].find(
    candidate => candidate !== null && !lines.found.has(keyOf(candidate)),
  );
  if (request) void lookUp(session, analysis, request);
}
