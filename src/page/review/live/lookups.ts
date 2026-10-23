import type { Analysis } from '#page/lichess/analysis.ts';
import { toRecord } from '#page/review/engine/record.ts';
import type { EngineResult } from '#page/review/engine/uci.ts';
import { engineFor } from '#page/review/engine-pool.ts';
import type { Session } from '#page/review/session.ts';
import { BOOK_GAMES } from './judging.ts';

// The two lookups a move played on the board waits for: the engine's
// analysis of its position, and whether the masters play it.

/** A lookup that hangs gives up, or the moves waiting on it would never be judged. */
const BOOK_TIMEOUT_MS = 8000;

function changed(session: Session): void {
  session.live.judged.clear();
  session.redraw();
}

export async function analyseLive(
  session: Session,
  analysis: Analysis,
  fen: string,
): Promise<void> {
  const { live } = session;
  live.busy = true;
  const search = async (): Promise<EngineResult> =>
    (await engineFor(session, analysis)).analyse({ position: `fen ${fen}` }, { urgent: true });
  try {
    // Once more, should the last engine have been lost on the way: engineFor boots another.
    live.evals.set(fen, toRecord(fen, await search().catch(search)));
  } catch (error) {
    console.error('[LichessNeo] engine failed', error);
    live.error = session.language.ui.engineError;
  }
  live.busy = false;
  changed(session);
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  let timer = 0;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), milliseconds);
  });
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}

// Lichess's opening explorer, as its analysis board uses it. Its masters
// database needs an account: signed out, no move is book.
export async function lookUpBook(session: Session, analysis: Analysis, fen: string): Promise<void> {
  const { live } = session;
  live.bookBusy = true;
  try {
    const found = await withTimeout(analysis.fetchMasterOpening(fen), BOOK_TIMEOUT_MS);
    live.books.set(fen, {
      book: found.white + found.draws + found.black >= BOOK_GAMES,
      name: found.opening?.name ?? '',
      eco: found.opening?.eco ?? '',
    });
  } catch {
    // Signed in, a lookup that timed out or was refused leaves out this
    // position only, not the book for the rest of the page.
    if (analysis.explorerSignedIn()) live.books.set(fen, { book: false, name: '', eco: '' });
    else live.noBook = true;
  }
  live.bookBusy = false;
  changed(session);
}
