import type { Analysis } from '#page/lichess/analysis.ts';
import type { ExplorerSource } from '#page/lichess/explorer.ts';
import { parentPath } from '#page/lichess/tree.ts';
import { judgeAt } from '#page/review/live/judging.ts';
import { type BookMove, bookPosition, pickReply, replies } from '#page/review/practice/book.ts';
import { bookDb, moveKey, positionKey } from '#page/review/practice/state.ts';
import { type PracticeStatus, practiceStatus } from '#page/review/practice/status.ts';
import type { Session } from '#page/review/session.ts';
import { goTo } from './navigation.ts';
import { lossesOf, stopPractice } from './practice.ts';
import { applyLevel } from './practice-level.ts';
import { lineEnded } from './practice-end.ts';
import { noteFound, noteMiss } from './practice-progress.ts';
import { blitzMissed } from './practice-rounds.ts';
import { MISS_MS } from './retry.ts';

// Practice following the board: what the explorer finds is kept, the book's
// replies are played, and moves practice doesn't take are taken back.

/** The reply waits this long after the user's move, as an opponent would. */
const REPLY_MS = 600;
/** And for the engine's verdict on that move, at most this long, so the coach can say it first. */
const VERDICT_WAIT_MS = 4000;

const sameSource = (one: ExplorerSource | null, other: ExplorerSource | null): boolean =>
  one?.db === other?.db && one?.player === other?.player && one?.color === other?.color;

/** A refused move is taken back after a moment, once, for another try. */
function refuse(session: Session, analysis: Analysis, status: PracticeStatus): void {
  const { practice } = session.view;
  if (!practice) return;
  if (status.kind !== 'refused') {
    practice.refused = null;
    return;
  }
  const { path } = analysis;
  if (practice.refused === path) return;
  practice.refused = path;
  practice.misses++;
  const from = parentPath(path);
  noteMiss(session, analysis, from);
  if (blitzMissed(session, analysis)) return;
  const again = practice.miss && parentPath(practice.miss.played.path) === from;
  const tries = again ? (practice.miss?.tries ?? 0) + 1 : 1;
  practice.miss = { played: status.played, tries, why: status.why };
  setTimeout(() => {
    if (session.view.practice !== practice || analysis.path !== path) return;
    goTo(analysis, from);
    session.redraw(true);
  }, MISS_MS);
}

/** The user's move has waited for its reply: a moment, and the engine's verdict on it. */
function waitedEnough(session: Session, analysis: Analysis, unplayed: boolean): boolean {
  const { view, live } = session;
  const { practice } = view;
  if (!practice) return false;
  const { path } = analysis;
  const now = Date.now();
  if (practice.waiting?.path !== path) practice.waiting = { path, since: now };
  const waited = now - practice.waiting.since;
  // A book of the line's own takes no engine's word.
  const judged =
    unplayed ||
    practice.own !== null ||
    live.error !== null ||
    judgeAt(live, analysis, path) !== null;
  return waited >= REPLY_MS && (judged || waited >= VERDICT_WAIT_MS);
}

/** Plays the book's reply once the user's move has waited for it, and for its verdict. */
function reply(session: Session, analysis: Analysis, status: PracticeStatus): void {
  const { practice } = session.view;
  if (!practice) return;
  // Stepping back onto a move of the user's waits for them; playing it again, the
  // book replies, the same or another, even where the tree already has a reply.
  if (status.kind !== 'replying' || !status.book || !practice.forward) {
    practice.waiting = null;
    return;
  }
  if (!waitedEnough(session, analysis, status.played === null)) return;
  practice.waiting = null;
  const key = positionKey(analysis.node.fen);
  const met = (each: BookMove): boolean => practice.met.has(moveKey(key, each.san));
  const lines = practice.own ? 'all' : practice.settings.lines;
  const move = pickReply(replies(status.book, bookDb(practice), lines), Math.random(), met);
  if (!move) return;
  practice.met.add(moveKey(key, move.san));
  analysis.playUci(move.uci);
  analysis.redraw();
}

/** Keeps what the explorer found for the board's position, in the games it reads now. */
function keepBook(session: Session, analysis: Analysis): void {
  const { practice } = session.view;
  const { explorer } = analysis;
  if (!practice || !explorer || practice.own) return;
  // It looks positions up only while it's open.
  if (!explorer.enabled) analysis.toggleExplorer();
  const { source } = explorer;
  if (applyLevel(session, analysis) || !sameSource(source, practice.source)) {
    practice.source = source;
    practice.books.clear();
  }
  const found = explorer.current();
  if (found) practice.books.set(positionKey(analysis.node.fen), bookPosition(found));
}

/**
 * Follows the board: keeps what the explorer finds, plays the book's replies
 * and takes refused moves back. Practice ends once the board goes back past
 * where it started.
 */
export function followPractice(session: Session, analysis: Analysis): void {
  const { practice, round } = session.view;
  if (!practice || round?.over) return;
  if (!analysis.explorer || !analysis.path.startsWith(practice.start)) {
    stopPractice(session, analysis);
    return;
  }
  if (analysis.path !== practice.at) {
    practice.forward = parentPath(analysis.path) === practice.at;
    practice.at = analysis.path;
  }
  keepBook(session, analysis);
  const status = practiceStatus(practice, analysis, lossesOf(session, analysis));
  refuse(session, analysis, status);
  practice.deviated = status.kind === 'deviated' ? analysis.path : null;
  // Not while the reply waits: the engine's verdict may still refuse the move.
  if ((status.kind === 'yours' || status.kind === 'end') && status.played)
    noteFound(session, analysis, status.played);
  if (status.kind === 'end') lineEnded(session, analysis, status);
  reply(session, analysis, status);
}
