import type { Analysis } from '#page/lichess/analysis.ts';
import { engineFor } from '#page/review/engine-pool.ts';
import type { GameWork, Mode, Session } from '#page/review/session.ts';
import { analyseRecords } from './analyse-records.ts';
import { fetchExport } from './export.ts';
import { whenFree } from './wait.ts';
import { refresh, seeDeep, seedBooks } from './work.ts';

// The game's analysis on its analysis page, the move on the board first so
// the review can start at once.

/**
 * The positions the move on the board is judged from (its position, the one
 * before, the one before that for a miss) and the next move's, in the
 * move-by-move review.
 */
export function urgentPositions(work: GameWork, mode: Mode, analysis: Analysis): number[] {
  if (mode !== 'moves') return [];
  const urgent = analysis.nodeList
    .slice(-3)
    // A node's ply is its index in the game (the review's own convention).
    .filter(node => work.nodes[node.ply] === node)
    .map(node => node.ply)
    .toReversed();
  if (analysis.onMainline) urgent.push(analysis.node.ply + 1);
  return urgent;
}

async function applyExport(session: Session, analysis: Analysis): Promise<void> {
  const { work, view } = session;
  try {
    const found = await fetchExport(analysis.gameId, work.nodes.length);
    if (!found) return;
    work.bookPly = found.bookPly;
    view.openingName = found.openingName;
    view.openingEco = found.openingEco;
    for (const [i, record] of found.rough.entries()) if (record) work.rough[i] = record;
  } catch {
    // Offline, or no such game: the engine does it all.
  }
}

function engineFailed(session: Session, what: string, error: unknown): void {
  console.error(`[LichessReimagined] ${what}`, error);
  session.view.error = session.language.ui.engineError;
  session.redraw(true);
}

export async function analyseGame(session: Session, analysis: Analysis): Promise<void> {
  const { work } = session;
  work.nodes = analysis.mainline;
  await applyExport(session, analysis);
  seedBooks(session, analysis);
  const engine = await analyseRecords({
    gameId: analysis.gameId,
    chess960: analysis.chess960,
    work,
    engines: () => engineFor(session, analysis),
    whenFree: () => whenFree(analysis),
    draft: true,
    urgent: () => urgentPositions(work, session.view.mode, analysis),
    onDeep: (index, record) => seeDeep(session, index, record),
    onChange: () => refresh(session, analysis),
    onFailure: (what, error) => engineFailed(session, what, error),
  });
  // Only the moves played on the board and Explain need an engine from now on.
  engine?.keep(1);
}
