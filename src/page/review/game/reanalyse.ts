import { covers } from '#shared/review-engine/options.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { reviewEngine } from '#page/review/engine/review-engine.ts';
import type { Session } from '#page/review/session.ts';
import { analyseGame } from './analyse-game.ts';
import { cacheProgress, dropCachedRecords } from './cache.ts';

// The game analysed again, at the settings picked since: the run going on
// stops, its engines end (they may have another network or table), and the
// review is built again as the records come back. Records as fine as the new
// settings ask are kept, so a run switched to lower ones goes on from there;
// the others go.

/** Keeps the records found so far for the next run, or drops them: whether they're kept. */
function keepOrDrop({ work }: Session, gameId: string): boolean {
  const positions = work.nodes.length;
  const { depth, engine } = reviewEngine();
  const { aim } = work;
  const kept = aim !== null && covers(aim, { depth, engine });
  if (kept) cacheProgress({ gameId, positions, records: [...work.deep], analysed: aim });
  else dropCachedRecords(gameId, positions);
  return kept;
}

function forget(session: Session, kept: boolean): void {
  const { work, view, live, lines } = session;
  // The records kept come back from the cache, which doesn't say which were the cloud's.
  if (!kept) work.cloud.clear();
  work.runs++;
  work.deep.length = 0;
  work.rough.length = 0;
  work.moves.length = 0;
  work.pending.clear();
  work.searched = 0;
  work.analysed = null;
  work.cloudAt = Infinity;
  view.review = null;
  view.progress = 0;
  view.error = null;
  view.version++;
  live.evals.clear();
  live.judged.clear();
  lines.found.clear();
}

export async function reanalyse(session: Session, analysis: Analysis): Promise<void> {
  const engines = session.engine;
  session.engine = null;
  forget(session, keepOrDrop(session, analysis.gameId));
  session.redraw(true);
  try {
    (await engines)?.end();
  } catch {
    // A pool that failed to boot has nothing to end.
  }
  await analyseGame(session, analysis);
}
