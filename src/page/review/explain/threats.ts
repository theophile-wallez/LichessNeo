import type { Analysis } from '#page/lichess/analysis.ts';
import { passedFen, type Threat } from '#page/review/coach/threat.ts';
import type { Threats } from '#page/review/coach/threat-facts.ts';
import { toRecord } from '#page/review/engine/record.ts';
import { QUICK_SEARCH } from '#page/review/engine/settings.ts';
import { engineFor } from '#page/review/engine-pool.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';

// The threats around the moves (coach/threat.ts): the engine searches the
// positions before and after a move with the other side to move when the move
// is shown, then the next moves', which the player is likely to step to. The
// coach reads a threat against the line after the move, so a move without one
// (a cache written before lines were kept) is never searched. One search at a
// time, a quick one, kept for the session.

/** The moves past the one shown whose threats are searched ahead. */
export const THREATS_AHEAD = 2;

/** The positions to search around `move`, passed: before it, then after it. */
function passedAround(move: JudgedMove): [string | null, string | null] {
  if (move.moveClass === 'book' || !move.after.line) return [null, null];
  return [passedFen(move.previousPosition.fen), passedFen(move.position.fen)];
}

/** The threats around `move`, each null when there's none to search or it isn't searched yet. */
export function threatsAround(session: Session, move: JudgedMove): Threats {
  const found = (fen: string | null): Threat | null =>
    fen === null ? null : (session.threats.found.get(fen) ?? null);
  const [before, after] = passedAround(move);
  return { before: found(before), after: found(after) };
}

async function lookUp(session: Session, analysis: Analysis, fen: string): Promise<void> {
  const { threats } = session;
  threats.busy = true;
  let threat: Threat | null = null;
  try {
    const engine = await engineFor(session, analysis);
    const result = await engine.analyse(
      { position: `fen ${fen}`, limits: QUICK_SEARCH },
      { urgent: true },
    );
    threat = { fen, record: toRecord(fen, result) };
  } catch (error) {
    console.error('[LichessNeo] engine failed', error);
  }
  threats.found.set(fen, threat);
  threats.busy = false;
  session.redraw();
}

/** Asks the engine for the first threat of `moves` not searched yet, one search at a time. */
export function pumpThreats(
  session: Session,
  analysis: Analysis,
  moves: readonly JudgedMove[],
): void {
  const { threats } = session;
  if (threats.busy) return;
  const fen = moves
    .flatMap(passedAround)
    .find(passed => passed !== null && !threats.found.has(passed));
  if (fen) void lookUp(session, analysis, fen);
}
