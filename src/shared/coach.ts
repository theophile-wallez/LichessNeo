import { z } from 'zod/mini';
import {
  readStored,
  readStoredJson,
  removeStored,
  StorageKey,
  writeStored,
  writeStoredJson,
} from './storage.ts';

/** The Game Review's coaches: the 3D mascots of content/coach/mascot, a still of each in
 * public/img/coaches. An id kept from the four human coaches is one of the first four. The
 * seven animals come first, then the computer's robot, then the coaches of other shapes. */
export const COACH_COUNT = 26;

/** The robot's number as a coach, and the Stockfish level whose colors it wears: blue, as its
 * stills are wherever no level is known. */
export const ROBOT_COACH = 8;
export const ROBOT_COACH_LEVEL = 3;

export const CoachIdSchema = z.coerce.number().check(z.int(), z.minimum(1), z.maximum(COACH_COUNT));

/** The coach's expressions: the review sets one by a move's verdict (see its move classes);
 * a click may make it shy. */
export const CoachMoodSchema = z.enum([
  'neutral',
  'happy',
  'delight',
  'doubt',
  'worry',
  'shock',
  'surprise',
  'sad',
  'angry',
  'proud',
  'thinking',
  'shy',
]);
export type CoachMood = z.infer<typeof CoachMoodSchema>;
export const COACH_MOODS: readonly CoachMood[] = CoachMoodSchema.options;

/** Stockfish's levels, and the computer's robot's colors: one for each two levels. */
export const AI_LEVELS = 8;
export const ROBOT_TIERS = 4;

/** The robot's colors for Stockfish's `level`, 1 to 8: green, blue, purple or red, 1 to 4. */
export const robotTier = (level: number): number =>
  Math.min(ROBOT_TIERS, Math.max(1, Math.ceil(level / 2)));

/** The settings' picks that aren't a coach: none at all, or one at random on each page. */
export const NO_COACH = 'none';
export const RANDOM_COACH = 'random';

export const CoachPickSchema = z.union([z.enum([NO_COACH, RANDOM_COACH]), CoachIdSchema]);
export type CoachPick = z.infer<typeof CoachPickSchema>;

/**
 * The pick kept in storage, or a coach picked at random and kept the first time.
 * The review and the practice drills read the same key, so both show the same coach.
 */
export function coachPick(): CoachPick {
  const stored = readStored(StorageKey.coach, CoachPickSchema);
  if (stored !== null) return stored;
  const coach = 1 + Math.floor(Math.random() * COACH_COUNT);
  keepCoach(coach);
  return coach;
}

/** Keeps `pick` for every page that shows a coach, as the settings or the review pick it. */
export function keepCoach(pick: CoachPick): void {
  writeStored(StorageKey.coach, pick);
}

// Drawn from when the page started, which both worlds see alike: they show the same coach.
const pageRandomCoach = (): number => 1 + (Math.floor(performance.timeOrigin) % COACH_COUNT);

/** The coach `pick` shows on this page, or null for none. */
export function coachOf(pick: CoachPick): number | null {
  if (pick === NO_COACH) return null;
  return pick === RANDOM_COACH ? pageRandomCoach() : pick;
}

/**
 * The coach this page shows, or null for none: the one the content script put on <html> as
 * the page started (content/bootstrap/coach-choice.ts), else the pick's.
 */
export function shownCoach(): number | null {
  const marked = document.documentElement.dataset.lnExtCoach;
  if (marked === NO_COACH) return null;
  const coach = CoachIdSchema.safeParse(marked);
  return coach.success ? coach.data : coachOf(coachPick());
}

/**
 * The coach whose way a place words what it says: the one shown, or the first with none, whose
 * avatar the stylesheet then hides (styles/coach-avatar.css).
 */
export const speakingCoach = (): number => shownCoach() ?? 1;

/** The home hero's own pick, or null while it follows the one every other page shows. */
export function homeCoachChoice(): CoachPick | null {
  return readStored(StorageKey.homeCoach, CoachPickSchema);
}

/** Keeps the home hero's own pick, null putting it back to following the pages'. */
export function chooseHomeCoach(pick: CoachPick | null): void {
  if (pick === null) removeStored(StorageKey.homeCoach);
  else writeStored(StorageKey.homeCoach, pick);
}

/** The coach the home's hero shows, or null for none: its own pick if it was given one. */
export function homeCoach(): number | null {
  const choice = homeCoachChoice();
  return choice === null ? shownCoach() : coachOf(choice);
}

const CoachOptionsSchema = z.object({
  /** The coaches play as 3D mascots, or stay their still images. */
  motion: z.boolean(),
  /** The coach judges each move on the free analysis board. */
  analysis: z.boolean(),
  /** The coach draws what it explains on the board. Kept before it was a switch: on. */
  board: z.prefault(z.boolean(), true),
});
export type CoachOptions = z.infer<typeof CoachOptionsSchema>;

const ALL_ON: CoachOptions = { motion: true, analysis: true, board: true };

/** The settings' coach switches as last kept, for the page world and before the settings are read. */
export function coachOptions(): CoachOptions {
  return readStoredJson(StorageKey.coachOptions, CoachOptionsSchema) ?? ALL_ON;
}

/** Keeps the coach switches the settings say, for `coachOptions`. */
export function keepCoachOptions(options: CoachOptions): void {
  writeStoredJson(StorageKey.coachOptions, options);
}
