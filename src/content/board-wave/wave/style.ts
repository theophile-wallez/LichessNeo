import { PALETTES, type Palette } from './color.ts';

// The wave's numbers, after Jakub Antalik's distortion-waves (MIT,
// public/licenses/distortion-waves.md): its tuned defaults for each shape of
// front. Lengths are in points (CSS pixels at the wave's own scale), times in
// seconds. The particles and the lean toward a press are left out.

/** The front's shape: up from the bottom, across from the left, or a ring out from a point. */
export type WaveType = 'vertical' | 'horizontal' | 'center';

export interface WaveStyle {
  readonly type: WaveType;
  // Timing
  readonly anticipation: number;
  readonly travel: number;
  readonly launchGap: number;
  readonly linger: number;
  readonly rimFade: number;
  // Gravity: the pull toward the source before the front leaves it.
  readonly pull: number;
  readonly inhale: number;
  readonly gatherGlow: number;
  // Swell
  readonly amplitude: number;
  readonly lensWidth: number;
  readonly aberration: number;
  readonly swell: number;
  // Progressive blur
  readonly blur: number;
  readonly blurAhead: number;
  readonly blurBehind: number;
  // Colour on the front
  readonly lead: number;
  readonly tail: number;
  readonly strength: number;
  // Colour on the edges
  readonly rimWidth: number;
  readonly rimUnevenness: number;
  readonly rimStrength: number;
  readonly rimSoftness: number;
  readonly cornerRadius: number;
  readonly rimPulse: number;
  readonly hairlineWidth: number;
  readonly hairlineOpacity: number;
  readonly hairlineWhite: number;
  readonly hairlineLinger: number;
  readonly hairlineFade: number;
  readonly palette: Palette;
}

/** The numbers a wave may change, over its type's defaults. */
export type StyleChanges = Partial<Omit<WaveStyle, 'type'>>;

const LINEAR_STYLE: Omit<WaveStyle, 'type'> = {
  anticipation: 0.5,
  travel: 2.28,
  launchGap: 0,
  linger: -0.35,
  rimFade: 3.03,
  pull: 24,
  inhale: 56,
  gatherGlow: 0.33,
  amplitude: 34,
  lensWidth: 150,
  aberration: 0.78,
  swell: 22,
  blur: 18,
  blurAhead: 90,
  blurBehind: 240,
  lead: 130,
  tail: 300,
  strength: 0.92,
  rimWidth: 14,
  rimUnevenness: 1,
  rimStrength: 0.82,
  rimSoftness: 343,
  cornerRadius: 62,
  rimPulse: 0.6,
  hairlineWidth: 1.5,
  hairlineOpacity: 0.9,
  hairlineWhite: 0.95,
  hairlineLinger: 0.47,
  hairlineFade: 3,
  palette: PALETTES.colorful,
};

// A ring is gentler than a front: lower, softer and with no fringe split.
const RING_CHANGES: StyleChanges = {
  anticipation: 0.25,
  travel: 3.43,
  rimFade: 2.51,
  hairlineLinger: 0.96,
  strength: 0.6,
  rimStrength: 0.6,
  aberration: 0,
  gatherGlow: 0,
  palette: PALETTES.green,
  cornerRadius: 48,
  pull: 14.4,
  inhale: 33.6,
  amplitude: 20.4,
  lensWidth: 90,
  swell: 13.2,
  blur: 10.8,
  blurAhead: 54,
  blurBehind: 144,
  lead: 78,
  tail: 180,
  rimSoftness: 205.8,
};

/** The tuned style of `type`, with `changes` over it. */
export function waveStyle(type: WaveType, changes: StyleChanges = {}): WaveStyle {
  return { ...LINEAR_STYLE, ...(type === 'center' ? RING_CHANGES : {}), ...changes, type };
}

/** Seconds for the whole wave: until the swell has settled and the edges have cleared. */
export const waveDuration = (style: WaveStyle): number =>
  style.anticipation +
  Math.max(
    style.travel * 0.6,
    style.linger + style.rimFade,
    style.linger + style.hairlineLinger + style.hairlineFade,
  );
