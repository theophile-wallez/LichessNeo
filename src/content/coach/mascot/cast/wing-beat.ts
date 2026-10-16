import type { CoachMood } from '#shared/coach.ts';
import { between } from '#content/coach/mascot/motion.ts';
import type { PartMotion } from './character.ts';

// Wings that rest, which would distract if they never stopped: a burst of beats
// when the mood turns lively, a short flutter now and then, a slow breath between.

/** Moods that set the wings beating. */
const THRILLS: ReadonlySet<CoachMood> = new Set(['happy', 'delight', 'surprise', 'shock']);

/** A run of beats that dies away. */
export interface Flap {
  readonly seconds: number;
  readonly beats: number;
  /** How far the wings beat from rest, in radians. */
  readonly lift: number;
}

export interface WingBeat extends PartMotion {
  /** How far from rest the wings are now, in radians. */
  readonly lift: () => number;
}

/** How far from rest `flap`, started at `start`, holds the wings at `time`. */
function raised(flap: Flap, start: number, time: number): number {
  const along = (time - start) / flap.seconds;
  if (along < 0 || along >= 1) return 0;
  return flap.lift * (0.5 - 0.5 * Math.cos(along * flap.beats * 2 * Math.PI)) * (1 - along);
}

export function wingBeat(burst: Flap, flutter: Flap): WingBeat {
  let flap = burst;
  let start = -Infinity;
  let nextFlutter = between(5, 9);
  let shown: CoachMood = 'neutral';
  let lift = 0;
  return {
    update: (time, mood) => {
      if (mood !== shown) {
        shown = mood;
        if (THRILLS.has(mood)) [flap, start] = [burst, time];
      }
      if (time >= nextFlutter) {
        if (raised(flap, start, time) === 0) [flap, start] = [flutter, time];
        nextFlutter = time + between(6, 11);
      }
      lift = raised(flap, start, time) + 0.025 * Math.sin(time * 1.6);
    },
    lift: () => lift,
  };
}
