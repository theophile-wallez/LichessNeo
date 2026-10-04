import type { CoachMood } from '#shared/coach.ts';

// How the computer's robot takes the level it's set to: easygoing at the low
// levels, sure of itself at the top ones.

/** Its mood as the player picks Stockfish's level, from 1 to 8. */
export function levelMood(level: number): CoachMood {
  if (level <= 3) return 'happy';
  return level <= 5 ? 'neutral' : 'doubt';
}
