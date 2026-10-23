import { z } from 'zod/mini';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';

// How the user practices: how many of their moves a line goes to, or a length
// that grows as they learn each opening; whether it keeps to the book's main
// lines (the replies most played, the user's moves the engine finds best);
// whether their own repertoire's move is the one to play; whose level
// Lichess's players are; and the moves a day to aim for. Kept for their next
// visit.

/** The length that grows by itself, from its first lines' to the book's end. */
export const AUTO_LENGTH = -1;

/** The lengths offered, in the user's moves; 0 goes on to the book's end. */
export const LENGTHS = [AUTO_LENGTH, 5, 10, 15, 0] as const;

/** The daily goals offered, in moves. */
export const GOALS = [10, 20, 40] as const;

export const LinesSchema = z.enum(['main', 'all']);
export type Lines = z.infer<typeof LinesSchema>;

/** Whether the user's own move is asked for where their repertoire has one, or any good one. */
export const MovesSchema = z.enum(['mine', 'any']);
export type Moves = z.infer<typeof MovesSchema>;

/** Lichess's players of every level, or of the user's own. */
export const LevelSchema = z.enum(['all', 'mine']);
export type Level = z.infer<typeof LevelSchema>;

const SettingsSchema = z.object({
  length: z.number(),
  lines: LinesSchema,
  moves: MovesSchema,
  level: LevelSchema,
  goal: z.number(),
});

export type PracticeSettings = z.infer<typeof SettingsSchema>;

/** A first visit learns the main lines, deeper as it goes, its own moves asked for. */
const DEFAULTS: PracticeSettings = {
  length: AUTO_LENGTH,
  lines: 'main',
  moves: 'mine',
  level: 'mine',
  goal: 20,
};

export const isLength = (value: number): boolean => LENGTHS.some(length => length === value);
export const isGoal = (value: number): boolean => GOALS.some(goal => goal === value);

export function readSettings(): PracticeSettings {
  try {
    const stored = readStoredJson(StorageKey.practiceSettings, SettingsSchema);
    return stored && isLength(stored.length) && isGoal(stored.goal) ? stored : { ...DEFAULTS };
  } catch {
    // A blocked storage, or the settings of an older version: the defaults.
    return { ...DEFAULTS };
  }
}

export const keepSettings = (settings: PracticeSettings): void =>
  writeStoredJson(StorageKey.practiceSettings, settings);
