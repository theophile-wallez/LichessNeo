import type { BacklitReach } from '#shared/backlit.ts';
import { squareCoords } from '#shared/chess/squares.ts';
import type { Square } from '#shared/chess/types.ts';

// Each light on the board as a function of time. A wave starts on the square
// a move lands on and spreads out, each key lighting up a beat after the
// nearer ones, dimmer, and fading slower; a quiet move lights its own key
// only. A check pulses twice on the king.

const REACHES: Readonly<Record<BacklitReach, number>> = { short: 2.2, medium: 3.4, wide: 5.5 };
/** A capture's or a promotion's wave goes further and burns brighter. */
const STRONG_REACH = 1.45;
const STRONG_GAIN = 1.6;
/** A key on its own, for a quiet move. */
const KEY_REACH = 0.8;
const STEP_DELAY_MS = 55;
const FADE_MS = 650;
const FADE_STEP_MS = 90;
/** The share of a key's light spent rising. */
const RISE = 0.12;
/** The check's pulse: its levels, evenly spaced over its time, after a short wait. */
const PULSE = [0, 0.95, 0.25, 0.85, 0];
const PULSE_DELAY_MS = 120;
const PULSE_MS = 1100;

export type Spread = 'key' | 'wave' | 'strong';

export interface Wave {
  readonly square: Square;
  readonly start: number;
  readonly spread: Spread;
  /** How far it reaches, in squares. */
  readonly reach: number;
}

export function waveReach(spread: Spread, reach: BacklitReach): number {
  if (spread === 'key') return KEY_REACH;
  return REACHES[reach] * (spread === 'strong' ? STRONG_REACH : 1);
}

export function distance(from: Square, to: Square): number {
  const [fromFile, fromRank] = squareCoords(from);
  const [toFile, toRank] = squareCoords(to);
  return Math.hypot(toFile - fromFile, toRank - fromRank);
}

/** A key's light, 0 to 1, `distance` squares from the wave's start, `elapsed` ms in. */
export function waveLevel(wave: Wave, keyDistance: number, elapsed: number): number {
  if (keyDistance > wave.reach) return 0;
  const local = elapsed - keyDistance * STEP_DELAY_MS;
  const duration = FADE_MS + keyDistance * FADE_STEP_MS;
  if (local <= 0 || local >= duration) return 0;
  const gain = wave.spread === 'strong' ? STRONG_GAIN : 1;
  const peak = Math.min(1, (1 - keyDistance / wave.reach) ** 1.4 * gain);
  const progress = local / duration;
  if (progress < RISE) return (peak * progress) / RISE;
  return peak * (1 - (progress - RISE) / (1 - RISE)) ** 2;
}

/** How long a wave lasts, to its farthest key. */
export const waveMs = (wave: Wave): number =>
  wave.reach * STEP_DELAY_MS + FADE_MS + wave.reach * FADE_STEP_MS;

export function pulseLevel(elapsed: number): number {
  const progress = (elapsed - PULSE_DELAY_MS) / PULSE_MS;
  if (progress <= 0 || progress >= 1) return 0;
  const position = progress * (PULSE.length - 1);
  const index = Math.floor(position);
  const from = PULSE[index] ?? 0;
  const to = PULSE[index + 1] ?? 0;
  return from + (to - from) * (position - index);
}

export const PULSE_END_MS = PULSE_DELAY_MS + PULSE_MS;
