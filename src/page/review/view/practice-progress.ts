import type { Analysis } from '#page/lichess/analysis.ts';
import { parentPath } from '#page/lichess/tree.ts';
import { chapterOf } from '#page/review/practice/chapters.ts';
import { MASTERIES, openingMastery } from '#page/review/practice/mastery.ts';
import { dayStreak, noteDay } from '#page/review/practice/progress.ts';
import {
  type Entry,
  type FoundGrade,
  keepRepertoire,
  type Met,
  storedRepertoire,
  withFound,
  withMiss,
  withPick,
} from '#page/review/practice/repertoire.ts';
import { movesTo, type Played, type PracticeState } from '#page/review/practice/state.ts';
import { openingAt } from '#page/review/practice/status.ts';
import { noteChanged } from '#page/review/practice/sync.ts';
import type { Session } from '#page/review/session.ts';
import { rainConfetti } from './practice-cheer.ts';

// What practice keeps of the user's moves: their streak of moves found at the
// first try, the moves of the day, and each position's record in the
// repertoire, to review (practice/repertoire.ts). A position counts once a
// round: missed, or found. A trap's or the challenge's positions aren't the
// user's openings: they count for the day alone.

/** The position at `path`, as the repertoire keeps it: none off a line from the start. */
function metAt(practice: PracticeState, analysis: Analysis, path: string): Met | null {
  const keeps = practice.own?.kind !== 'trap' && practice.own?.kind !== 'card';
  const moves = keeps ? movesTo(analysis, path) : null;
  if (!moves) return null;
  return {
    side: practice.side,
    moves,
    name: openingAt(practice, analysis, path) || practice.opening,
  };
}

/** The repertoire with `change` made: kept, its opening's chapter to write, and a cheer if it's known better. */
function keepChange(
  session: Session,
  met: Met,
  { change, path }: { change: (entries: readonly Entry[]) => Entry[]; path: string },
): void {
  const { practice } = session.view;
  const before = openingMastery(storedRepertoire(), met.side, met.name).mastery;
  keepRepertoire(change(storedRepertoire()));
  noteChanged(met.side, met.name);
  const after = openingMastery(storedRepertoire(), met.side, met.name).mastery;
  if (practice && met.name && MASTERIES.indexOf(after) > MASTERIES.indexOf(before)) {
    practice.cheers.set(path, { kind: 'mastery', name: chapterOf(met.name), mastery: after });
    rainConfetti();
  }
}

/** A move practiced: the day's count goes up, and the coach cheers the goal once it's met. */
function countDay(session: Session, path: string): void {
  const { practice, openings } = session.view;
  const now = Date.now();
  const { goal } = openings.settings;
  if (noteDay(now) !== goal || !practice) return;
  practice.cheers.set(path, { kind: 'goal', days: dayStreak(goal, now) });
  rainConfetti();
}

/** A move missed, or given away, from `path`: the streak ends, and the position is to review. */
export function noteMiss(session: Session, analysis: Analysis, path: string): void {
  const { practice } = session.view;
  if (!practice) return;
  practice.streak = 0;
  if (practice.missedAt.has(path)) return;
  practice.missedAt.add(path);
  countDay(session, path);
  const met = metAt(practice, analysis, path);
  const now = Date.now();
  if (met) keepChange(session, met, { change: entries => withMiss(entries, met, now), path });
}

/** A move found: once, and at the first try without hints, it carries the streak on. */
export function noteFound(session: Session, analysis: Analysis, played: Played): void {
  const { practice } = session.view;
  if (!practice || practice.scored.has(played.path)) return;
  practice.scored.add(played.path);
  const from = parentPath(played.path);
  if (practice.missedAt.has(from)) return;
  const hinted = practice.hinted.has(from);
  if (!hinted) {
    practice.streak++;
    practice.bestStreak = Math.max(practice.bestStreak, practice.streak);
  }
  countDay(session, played.path);
  const met = metAt(practice, analysis, from);
  const now = Date.now();
  const grade: FoundGrade = hinted ? 'hard' : 'good';
  const found = { answer: played.san, grade, now };
  if (met)
    keepChange(session, met, {
      change: entries => withFound(entries, met, found),
      path: played.path,
    });
}

/** The user's move to `path` is their repertoire's from now on: learned anew. */
export function adoptMove(session: Session, analysis: Analysis, path: string): void {
  const { practice } = session.view;
  if (!practice) return;
  practice.scored.add(path);
  const met = metAt(practice, analysis, parentPath(path));
  const pick = { answer: analysis.nodeAtPath(path).san ?? '', now: Date.now() };
  if (met) keepChange(session, met, { change: entries => withPick(entries, met, pick), path });
}
