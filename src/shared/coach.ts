import { z } from 'zod/mini';
import { readStored, StorageKey, writeStored } from './storage.ts';

/** The Game Review's coaches: the 3D mascots of content/coach/mascot, a still of each in
 * public/img/coaches. An id kept from the four human coaches is one of the first four. The
 * seven animals come first, then the computer's robot, then the coaches of other shapes. */
export const COACH_COUNT = 26;
/** The animals, the coaches users' avatars are drawn from. */
export const ANIMAL_COACHES = 7;

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

/**
 * The coach kept in storage, or one picked at random and kept the first time.
 * The review and the practice drills read the same key, so both show the same coach.
 */
export function pickCoach(): number {
  const stored = readStored(StorageKey.coach, CoachIdSchema);
  if (stored !== null) return stored;
  const coach = 1 + Math.floor(Math.random() * COACH_COUNT);
  keepCoach(coach);
  return coach;
}

/** Keeps `coach` for every page that shows one, as the settings or the review pick it. */
export function keepCoach(coach: number): void {
  writeStored(StorageKey.coach, coach);
}
