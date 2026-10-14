import { squareCoords } from '#shared/chess/squares.ts';
import type { Color, Square } from '#shared/chess/types.ts';
import type { SoundPlace } from '#shared/sounds.ts';

// How high a move sounds and where it comes from. The pitch climbs a major
// pentatonic scale, a note per rank toward the other side (notes in a row
// always sound well together), as the computer's level slider climbs its own.
// In space, the board lies before the listener, their side nearest and a
// little below the ears; Foley's panner is HRTF with an inverse distance
// falloff, so the far squares are lifted back up some, to stay clear.

const SCALE: readonly number[] = [0, 2, 4, 7, 9, 12, 14, 16];
/** Mid-board, where a move keeps the sound's own pitch. */
const MIDDLE = 7;
const SIDE_STEP = 0.3;
const DEPTH_STEP = 0.3;
const NEAREST = 1;
const BELOW_EARS = 0.5;
const STEREO_WIDTH = 0.4;
const FARTHEST = Math.hypot(3.5 * SIDE_STEP, BELOW_EARS, NEAREST + 7 * DEPTH_STEP);

/** A square's rank counted from `color`'s side: 0 at home, 7 at the other end. */
export function rankFrom(square: Square, color: Color): number {
  const rank = squareCoords(square)[1];
  return color === 'white' ? rank : 7 - rank;
}

/** The semitones of a piece of `color` landing on `square`. */
export const pitchFor = (square: Square, color: Color): number =>
  (SCALE[rankFrom(square, color)] ?? MIDDLE) - MIDDLE;

/** Whether a piece of `color` moved toward the other side, or across its rank. */
export const advanced = (from: Square, to: Square, color: Color): boolean =>
  rankFrom(to, color) >= rankFrom(from, color);

export interface Placement {
  readonly pan?: number;
  readonly pos?: [number, number, number];
  /** What the volume is multiplied by. */
  readonly gain: number;
}

/** Where a sound on `square` comes from, for a listener on `orientation`'s side. */
export function placementFor(square: Square, orientation: Color, place: SoundPlace): Placement {
  const [file, rank] = squareCoords(square);
  const across = orientation === 'white' ? file : 7 - file;
  const away = orientation === 'white' ? rank : 7 - rank;
  if (place === 'stereo') return { pan: ((across - 3.5) / 3.5) * STEREO_WIDTH, gain: 1 };
  if (place === 'none') return { gain: 1 };
  const x = (across - 3.5) * SIDE_STEP;
  const depth = NEAREST + away * DEPTH_STEP;
  const distance = Math.hypot(x, BELOW_EARS, depth);
  return { pos: [x, -BELOW_EARS, -depth], gain: Math.sqrt(distance / FARTHEST) };
}
