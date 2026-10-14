import { z } from 'zod/mini';

// The extension's backlit boards: keys that light up around a move, as a
// keyboard's backlight does under a keystroke. Picked in the Board panel,
// under one tile, with the settings they share (content/packs/options.ts),
// and lit in the page (page/backlit), which reads those from
// `data-lr-ext-backlit` on <html>, set only while one of them is shown.

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

export const isBacklitBoard = (id: string): boolean =>
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

export interface BacklitSettings {
  readonly light: BacklitLight;
  readonly reach: BacklitReach;
  readonly waves: BacklitWaves;
}

/** The attribute's value: the three settings, in that order. */
export const backlitWords = ({ light, reach, waves }: BacklitSettings): string =>
  `${light} ${reach} ${waves}`;

export function readBacklitWords(text: string | undefined): BacklitSettings | null {
  const [light, reach, waves] = (text ?? '').split(' ');
  const parsed = {
    light: BacklitLightSchema.safeParse(light),
    reach: BacklitReachSchema.safeParse(reach),
    waves: BacklitWavesSchema.safeParse(waves),
  };
  if (!parsed.light.success || !parsed.reach.success || !parsed.waves.success) return null;
  return { light: parsed.light.data, reach: parsed.reach.data, waves: parsed.waves.data };
}
