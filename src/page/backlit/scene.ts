import type { BacklitReach } from '#shared/backlit.ts';
import { squareAt, squareCoords } from '#shared/chess/squares.ts';
import type { Square } from '#shared/chess/types.ts';
import {
  PULSE_END_MS,
  pulseLevel,
  type Spread,
  type Wave,
  waveLevel,
  waveMs,
  waveReach,
} from './effects.ts';

// What is lit on the board at a given time: the waves and pulses under way
// and the key under the pointer, as a list of keys, each with its level and
// color. No DOM: the layer draws it (layer.ts).

/** A wave's color: one for every key, or every hue around its square. */
export type Paint = { readonly color: string } | 'rainbow';

export interface Light {
  readonly square: Square;
  readonly level: number;
  readonly color: string;
}

interface PaintedWave extends Wave {
  readonly paint: Paint;
}

interface Pulse {
  readonly square: Square;
  readonly start: number;
  readonly color: string;
}

interface Hover {
  readonly from: number;
  readonly at: number;
  readonly target: 0 | 1;
  readonly color: string;
}

export interface WaveStart {
  readonly square: Square;
  readonly spread: Spread;
  readonly reach: BacklitReach;
  readonly paint: Paint;
}

export interface Scene {
  readonly wave: (start: WaveStart, now: number) => void;
  readonly pulse: (square: Square, color: string, now: number) => void;
  /** The key under the pointer, or null once it leaves the board. */
  readonly hover: (square: Square | null, color: string, now: number) => void;
  readonly lights: (now: number) => Light[];
  /** Whether anything is still changing: the layer draws again only then. */
  readonly busy: (now: number) => boolean;
}

const MIN_LEVEL = 0.01;
const HOVER_LEVEL = 0.28;
const HOVER_IN_MS = 80;
const HOVER_OUT_MS = 400;
/** The rainbow's hues turn as it spreads, in degrees a millisecond, by steps a sprite each. */
const HUE_SPEED = 1 / 12;
const HUE_STEP = 15;
/** Waves past this many are dropped, the oldest first, when moves come fast (a held arrow key). */
const MAX_WAVES = 6;

interface Key {
  readonly square: Square;
  readonly file: number;
  readonly rank: number;
}

const KEYS: readonly Key[] = Array.from({ length: 64 }, (_, index) => {
  const file = index % 8;
  const rank = Math.floor(index / 8);
  const square = squareAt(file, rank);
  return square ? [{ square, file, rank }] : [];
}).flat();

function rainbowColor(origin: Square, key: Key, now: number): string {
  const [file, rank] = squareCoords(origin);
  const angle = (Math.atan2(key.rank - rank, key.file - file) * 180) / Math.PI;
  const hue = (((angle + now * HUE_SPEED) % 360) + 360) % 360;
  return `hsl(${Math.round(hue / HUE_STEP) * HUE_STEP} 95% 62%)`;
}

function hoverLevel({ from, at, target }: Hover, now: number): number {
  const elapsed = now - at;
  return target === 1
    ? Math.min(1, from + elapsed / HOVER_IN_MS)
    : Math.max(0, from - elapsed / HOVER_OUT_MS);
}

function waveLights(wave: PaintedWave, now: number): Light[] {
  const lights: Light[] = [];
  const [file, rank] = squareCoords(wave.square);
  for (const key of KEYS) {
    const level = waveLevel(wave, Math.hypot(key.file - file, key.rank - rank), now - wave.start);
    if (level < MIN_LEVEL) continue;
    const color = wave.paint === 'rainbow' ? rainbowColor(wave.square, key, now) : wave.paint.color;
    lights.push({ square: key.square, level, color });
  }
  return lights;
}

export function createScene(): Scene {
  let waves: PaintedWave[] = [];
  let pulses: Pulse[] = [];
  const hovers = new Map<Square, Hover>();
  let hovered: Square | null = null;

  const prune = (now: number): void => {
    waves = waves.filter(wave => now - wave.start < waveMs(wave));
    pulses = pulses.filter(pulse => now - pulse.start < PULSE_END_MS);
    for (const [square, hover] of hovers)
      if (hover.target === 0 && hoverLevel(hover, now) === 0) hovers.delete(square);
  };

  const setHover = (square: Square, target: 0 | 1, color: string, now: number): void => {
    const current = hovers.get(square);
    const from = current ? hoverLevel(current, now) : 0;
    hovers.set(square, { from, at: now, target, color: current?.color ?? color });
  };

  return {
    wave({ square, spread, reach, paint }, now) {
      waves = [...waves, { square, spread, reach: waveReach(spread, reach), paint, start: now }];
      if (waves.length > MAX_WAVES) waves = waves.slice(-MAX_WAVES);
    },
    pulse(square, color, now) {
      pulses = [...pulses, { square, color, start: now }];
    },
    hover(square, color, now) {
      if (square === hovered) return;
      if (hovered) setHover(hovered, 0, color, now);
      if (square) setHover(square, 1, color, now);
      hovered = square;
    },
    lights(now) {
      prune(now);
      const lights = waves.flatMap(wave => waveLights(wave, now));
      for (const { square, start, color } of pulses) {
        const level = pulseLevel(now - start);
        if (level >= MIN_LEVEL) lights.push({ square, level, color });
      }
      for (const [square, hover] of hovers) {
        const level = hoverLevel(hover, now) * HOVER_LEVEL;
        if (level >= MIN_LEVEL) lights.push({ square, level, color: hover.color });
      }
      return lights;
    },
    busy(now) {
      prune(now);
      const settling = [...hovers.values()].some(hover => {
        const level = hoverLevel(hover, now);
        return hover.target === 1 ? level < 1 : level > 0;
      });
      return waves.length > 0 || pulses.length > 0 || settling;
    },
  };
}
