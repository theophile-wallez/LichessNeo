import { z } from 'zod/mini';
import { readStored, StorageKey, writeStored } from './storage.ts';

/** The Game Review's coaches: the 3D mascots of content/coach/mascot, a still of each in
 * public/img/coaches. An id kept from the four human coaches is one of the first four. */
export const COACH_COUNT = 7;

export const CoachIdSchema = z.coerce.number().check(z.int(), z.minimum(1), z.maximum(COACH_COUNT));

/** The coach's expression for a move, set by its verdict (see the review's move classes). */
export const CoachMoodSchema = z.enum(['neutral', 'happy', 'delight', 'doubt', 'worry', 'shock']);
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
  writeStored(StorageKey.coach, coach);
  return coach;
}
