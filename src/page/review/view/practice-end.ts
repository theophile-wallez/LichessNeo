import type { Analysis } from '#page/lichess/analysis.ts';
import { chapterOf } from '#page/review/practice/chapters.ts';
import { keepDepth } from '#page/review/practice/progress.ts';
import { AUTO_LENGTH } from '#page/review/practice/settings.ts';
import { deeper, type PracticeState } from '#page/review/practice/state.ts';
import type { PracticeStatus } from '#page/review/practice/status.ts';
import type { Session } from '#page/review/session.ts';
import { writeSync } from './openings-sync.ts';
import { cardEnded } from './practice-rounds.ts';

// A line's end, handled once: what changed is written to the studies, an
// opening played without a slip goes deeper next time, and a round of cards
// goes on to its next.

/** The line went without a miss, a hint or an answer asked for. */
const clean = (practice: PracticeState): boolean =>
  practice.misses === 0 && practice.hinted.size === 0 && practice.revealed.size === 0;

/** A line as deep as it grew, played clean: the opening's next lines go deeper. */
function grow(practice: PracticeState, reason: 'book' | 'length'): void {
  const auto = practice.length === null && practice.settings.length === AUTO_LENGTH;
  if (!auto || reason !== 'length' || !clean(practice)) return;
  const next = deeper(practice.depth);
  if (next === null) return;
  practice.grew = next;
  keepDepth(chapterOf(practice.opening), next);
}

export function lineEnded(
  session: Session,
  analysis: Analysis,
  status: Extract<PracticeStatus, { kind: 'end' }>,
): void {
  const { practice } = session.view;
  if (!practice || practice.ended === analysis.path) return;
  practice.ended = analysis.path;
  writeSync();
  grow(practice, status.reason);
  cardEnded(session, analysis, clean(practice));
}
