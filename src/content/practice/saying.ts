import { queryAll, queryOne } from '#shared/dom.ts';
import type { Saying } from '#content/coach/card.ts';

// What a practice drill's coach says, read from Lichess's panels: the
// exercise's goal, or how it ended (lila's ui/analyse/src/study/practice).

export interface Exercise {
  /** The chapter's id, which tells two exercises with the same goal apart. */
  readonly id: string;
  /** "3 / 18 · Hook Mate #1": where it stands in the lesson, and its name. */
  readonly label: string;
}

const textOf = (element: Element | null): string =>
  element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

/** The exercise on show, from the lesson's chapter list `side`. */
export function readExercise(side: Element): Exercise | null {
  const chapters = queryAll(side, '.ps__chapter', HTMLAnchorElement);
  const index = chapters.findIndex(chapter => chapter.classList.contains('active'));
  const active = chapters[index];
  if (!active) return null;
  const name = textOf(queryOne(active, 'h3', HTMLElement));
  const place = `${index + 1} / ${chapters.length}`;
  return { id: active.dataset['id'] ?? '', label: name ? `${place} · ${name}` : place };
}

export interface SayingContext {
  readonly exercise: string;
  /** The coach's own words for a missed exercise: Lichess has only its retry button's. */
  readonly missed: string;
}

/** The coach's words for the drill's goal card `underboard`, or null while it shows none. */
export function readSaying(
  underboard: Element,
  { exercise, missed }: SayingContext,
): Saying | null {
  const feedback = queryOne(underboard, '.feedback', HTMLElement);
  if (!feedback) return null;
  if (feedback.classList.contains('fail')) {
    return { key: `fail ${exercise}`, text: missed, mood: 'worry' };
  }
  if (feedback.classList.contains('win')) {
    const text = textOf(queryOne(feedback, 'span', HTMLElement));
    return text ? { key: `win ${exercise}`, text, mood: 'delight' } : null;
  }
  const text = textOf(queryOne(feedback, '.goal', HTMLElement));
  return text ? { key: `goal ${exercise} ${text}`, text, mood: 'neutral' } : null;
}
