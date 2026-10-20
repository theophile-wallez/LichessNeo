import { fenTurn } from '#shared/chess/index.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { menaceOf, passedFen, type Threat } from '#page/review/coach/threat.ts';
import type { Threats } from '#page/review/coach/threat-facts.ts';
import { toRecord } from '#page/review/engine/record.ts';
import { QUICK_SEARCH } from '#page/review/engine/settings.ts';
import { engineFor } from '#page/review/engine-pool.ts';
import { type CachedThreat, cacheThreats, readCachedThreats } from '#page/review/game/cache.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';

// The threats around the moves (coach/threat.ts): the engine searches the
// positions before and after a move with the other side to move, the move
// shown first, then the next moves', which the player is likely to step to,
// then, once the game is analysed, all the others. The coach reads a threat
// against the line after the move, so a move without one (a cache written
// before lines were kept) is never searched. One search at a time, a quick
// one, kept with the game's records: a comment says the same every time.

/** The moves past the one shown whose threats are searched ahead. */
export const THREATS_AHEAD = 2;

// Every move's are looked for on every pass, once the game is analysed.
const passedOf = new Map<string, string | null>();
function passed(fen: string): string | null {
  let found = passedOf.get(fen);
  if (found === undefined) {
    found = passedFen(fen);
    passedOf.set(fen, found);
  }
  return found;
}

/** The positions to search around `move`, passed: before it, then after it. */
function passedAround(move: JudgedMove): [string | null, string | null] {
  if (move.moveClass === 'book' || !move.after.line) return [null, null];
  return [passed(move.previousPosition.fen), passed(move.position.fen)];
}

/** The threats around `move`, each null when there's none to search or it isn't searched yet. */
export function threatsAround(session: Session, move: JudgedMove): Threats {
  const found = (fen: string | null): Threat | null =>
    fen === null ? null : (session.threats.found.get(fen) ?? null);
  const [before, after] = passedAround(move);
  return { before: found(before), after: found(after) };
}

/** Whether the threats around `move` are all searched: its comment then says all it will. */
export const threatsReady = (session: Session, move: JudgedMove): boolean =>
  passedAround(move).every(fen => fen === null || session.threats.found.has(fen));

/** Takes in the threats kept with the game's records. */
export function seedThreats(session: Session, gameId: string): void {
  const { nodes } = session.work;
  for (const [i, entry] of readCachedThreats(gameId, nodes.length).entries()) {
    const fen = passed(nodes[i]?.fen ?? '');
    if (fen === null || entry === null) continue;
    session.threats.found.set(fen, entry === false ? null : { fen, record: entry });
  }
}

// Whether a threat has anything for the coach to say, worked out once.
const telling = new WeakMap<Threat, boolean>();
function tells(threat: Threat): boolean {
  let found = telling.get(threat);
  if (found === undefined) {
    found = menaceOf(threat, fenTurn(threat.fen)) !== null;
    telling.set(threat, found);
  }
  return found;
}

// By position of the game: what's worth keeping of its threat. A threat with
// nothing to say is kept as none, which saves the room of its record.
function keptThreats(session: Session): CachedThreat[] {
  const { found } = session.threats;
  return session.work.nodes.map(node => {
    const fen = passed(node.fen);
    if (fen === null) return false;
    if (!found.has(fen)) return null;
    const threat = found.get(fen);
    return threat && tells(threat) ? threat.record : false;
  });
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
  if (analysis.gameId) cacheThreats(analysis.gameId, keptThreats(session));
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
    .find(position => position !== null && !threats.found.has(position));
  if (fen) void lookUp(session, analysis, fen);
}
