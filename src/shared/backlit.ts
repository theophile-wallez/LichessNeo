import { z } from 'zod/mini';

// The extension's backlit boards: keys that light up around a move, as a
// keyboard's backlight does under a keystroke. Picked in the Board panel,
// under one tile, with the settings they share (content/packs/options.ts):
// the light's, and the keys' shape, which their keys (content/packs/backlit-keys.ts)
// and their light are drawn in. Lit in the page (page/backlit), which reads
// those from `data-lr-ext-backlit` on <html>, set only while one of them is shown.

/** The family's name, which each of its boards' ids starts with (styles/board/backlit.css). */
export const BACKLIT = 'backlit';

/** The boards, each in its colors: the first, the family's first, kept its old id. */
export const BACKLIT_BOARDS = [
  { id: BACKLIT, name: 'Slate' },
  { id: 'backlit-midnight', name: 'Midnight' },
  { id: 'backlit-forest', name: 'Forest' },
  { id: 'backlit-walnut', name: 'Walnut' },
  { id: 'backlit-amethyst', name: 'Amethyst' },
  { id: 'backlit-panda', name: 'Panda' },
] as const;

export type BacklitBoardId = (typeof BACKLIT_BOARDS)[number]['id'];

export const isBacklitBoard = (id: string): id is BacklitBoardId =>
  BACKLIT_BOARDS.some(board => board.id === id);

/**
 * The light's color: the theme's accent, the board's own, every hue around
 * the square, or one per side.
 */
export const BacklitLightSchema = z.enum(['accent', 'board', 'rainbow', 'sides']);
/** How far a wave reaches. */
export const BacklitReachSchema = z.enum(['short', 'medium', 'wide']);
/** Which moves send a wave: captures and promotions, or every one. */
export const BacklitWavesSchema = z.enum(['captures', 'always']);

export type BacklitLight = z.infer<typeof BacklitLightSchema>;
export type BacklitReach = z.infer<typeof BacklitReachSchema>;
export type BacklitWaves = z.infer<typeof BacklitWavesSchema>;

/** The gap between two keys, in hundredths of a square. */
export const KEY_GAP_MAX = 16;
export const KeyGapSchema = z.number().check(z.gte(0), z.lte(KEY_GAP_MAX));
/** A key's corners' radius, in hundredths of a square: at most half the key, a round one. */
export const KEY_RADIUS_MAX = 50;
export const KeyRadiusSchema = z.number().check(z.gte(0), z.lte(KEY_RADIUS_MAX));

export interface KeyShape {
  readonly gap: number;
  readonly radius: number;
}

export const DEFAULT_KEY_SHAPE: KeyShape = { gap: 5.5, radius: 9.6 };

/** A key in its square, in fractions of the square: its inset on each side, its side, its corners. */
export interface KeyBox {
  readonly inset: number;
  readonly size: number;
  readonly radius: number;
}

export function keyBox({ gap, radius }: KeyShape): KeyBox {
  const inset = gap / 200;
  const size = 1 - 2 * inset;
  return { inset, size, radius: Math.min(radius / 100, size / 2) };
}

export interface BacklitSettings {
  readonly light: BacklitLight;
  readonly reach: BacklitReach;
  readonly waves: BacklitWaves;
  readonly shape: KeyShape;
}

/** The attribute's value: the settings, in that order, the key's gap and radius last. */
export const backlitWords = ({ light, reach, waves, shape }: BacklitSettings): string =>
  `${light} ${reach} ${waves} ${shape.gap} ${shape.radius}`;

export function readBacklitWords(text: string | undefined): BacklitSettings | null {
  const [light, reach, waves, gap, radius] = (text ?? '').split(' ');
  const parsed = {
    light: BacklitLightSchema.safeParse(light),
    reach: BacklitReachSchema.safeParse(reach),
    waves: BacklitWavesSchema.safeParse(waves),
    gap: KeyGapSchema.safeParse(Number(gap)),
    radius: KeyRadiusSchema.safeParse(Number(radius)),
  };
  if (!parsed.light.success || !parsed.reach.success || !parsed.waves.success) return null;
  if (!parsed.gap.success || !parsed.radius.success) return null;
  return {
    light: parsed.light.data,
    reach: parsed.reach.data,
    waves: parsed.waves.data,
    shape: { gap: parsed.gap.data, radius: parsed.radius.data },
  };
}
