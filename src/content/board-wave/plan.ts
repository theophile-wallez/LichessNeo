import { cellOf } from '#shared/chess/squares.ts';
import type { Color } from '#shared/chess/types.ts';
import type { GameEnd } from '#shared/end-animation.ts';
import { PALETTES, type Palette, type Rgb, singlePalette } from './wave/color.ts';
import type { WavePlan } from './wave/run.ts';
import type { WinColor } from './win-colors.ts';

// Which wave plays when: at a game's end, a ring in the result's colour, out of
// the mated king or the last move's square, or the board's centre for a draw; at its start, a short, quiet front up the board from
// the player's side, in the theme's accent.

/** The loss's colour: a deep red, which the wave lightens ahead of its front and darkens behind. */
const LOSS: Rgb = [179, 58, 76];
/** Ours, where the theme's accent can't be read. */
const ACCENT: Rgb = [58, 111, 216];

const LOSS_PALETTE = singlePalette(LOSS);

/** A win's wave in `color`; the theme's accent is `accent`, if it could be read. */
export function winPalette(color: WinColor, accent: Rgb | null): Palette {
  if (color === 'accent') return singlePalette(accent ?? ACCENT);
  return color === 'rainbow' ? PALETTES.colorful : PALETTES[color];
}

const SQUARE = 1 / 8;
const CENTRE = { x: 3.5 * SQUARE, y: 3.5 * SQUARE, width: SQUARE, height: SQUARE };

/** The wave at a game's end, on a board with `bottom`'s side at the bottom, a win's in `win`. */
export function endPlan(
  { result, square }: GameEnd,
  bottom: Color,
  win: Palette = PALETTES.colorful,
): WavePlan {
  const cell = result !== 'draw' && square ? cellOf(square, bottom) : null;
  return {
    type: 'center',
    source: cell
      ? { x: cell.column * SQUARE, y: cell.row * SQUARE, width: SQUARE, height: SQUARE }
      : CENTRE,
    palette: { win, draw: PALETTES.mono, loss: LOSS_PALETTE }[result],
    // A loss's ring is quieter.
    changes: result === 'loss' ? { strength: 0.5, rimStrength: 0.5 } : {},
  };
}

/** The wave at a game's start, in `accent` (the theme's), from the bottom edge: the player's side. */
export const startPlan = (accent: Rgb | null): WavePlan => ({
  type: 'vertical',
  source: { x: 0.12, y: 0.93, width: 0.76, height: 0.1 },
  palette: singlePalette(accent ?? ACCENT),
  changes: {
    anticipation: 0.2,
    travel: 1.6,
    pull: 10,
    inhale: 20,
    strength: 0.7,
    rimStrength: 0.6,
    // The edges clear with the front, so it's over in a second and a half.
    rimFade: 1.6,
    hairlineLinger: 0.2,
    hairlineFade: 1.4,
  },
});
