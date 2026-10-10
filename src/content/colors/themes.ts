import { z } from 'zod/mini';
import { BUILT_IN_THEMES, REIMAGINED } from './built-in.ts';

// The color themes: each a palette for Lichess's light scheme and one for its
// dark scheme, picked apart. A palette is what styles/theme/palette.css builds
// every color from: the hue and strength of the neutrals' tint, and the accent.
// The built-in themes (built-in.ts) are data like the ones a user makes, kept
// in the settings: both are palettes the same schema checks.

const HexColorSchema = z.string().check(z.regex(/^#[0-9a-f]{6}$/i));

export const PaletteSchema = z.object({
  /** The neutrals' tint, an OKLCH hue in degrees. */
  hue: z.number().check(z.gte(0), z.lte(360)),
  /** How strong the tint is, in OKLCH chroma: 0 is grey. */
  chroma: z.number().check(z.gte(0), z.lte(0.08)),
  /** Links, picks and primary buttons, under white text. */
  accent: HexColorSchema,
});

export type Palette = z.infer<typeof PaletteSchema>;

export const SCHEMES = ['light', 'dark'] as const;

export type Scheme = (typeof SCHEMES)[number];

export type Palettes = Readonly<Record<Scheme, Palette>>;

export interface BuiltInTheme extends Palettes {
  readonly id: string;
  /** The name of its message (public/_locales). */
  readonly message: string;
}

export const MAX_NAME = 32;

/** A theme a user made, named by them. */
export const CustomThemeSchema = z.object({
  id: z.string().check(z.startsWith('custom-')),
  name: z.string().check(z.minLength(1), z.maxLength(MAX_NAME)),
  light: PaletteSchema,
  dark: PaletteSchema,
});

export type CustomTheme = z.infer<typeof CustomThemeSchema>;

export type ColorTheme = BuiltInTheme | CustomTheme;

export const isCustom = (theme: ColorTheme): theme is CustomTheme => 'name' in theme;

export const DEFAULT_THEME = REIMAGINED.id;

/** Every theme to pick from: the built-in ones, then the user's. */
export const allThemes = (custom: readonly CustomTheme[]): readonly ColorTheme[] => [
  ...BUILT_IN_THEMES,
  ...custom,
];

/** The theme of this id, or the default for an unknown one (a theme since removed). */
export function themeById(id: string, custom: readonly CustomTheme[]): ColorTheme {
  return allThemes(custom).find(theme => theme.id === id) ?? REIMAGINED;
}

export const ThemePicksSchema = z.object({ light: z.string(), dark: z.string() });

/** The theme picked for each scheme, by id. */
export type ThemePicks = z.infer<typeof ThemePicksSchema>;

export const PalettesSchema = z.object({ light: PaletteSchema, dark: PaletteSchema });

export const palettesOf = (picks: ThemePicks, custom: readonly CustomTheme[]): Palettes => ({
  light: themeById(picks.light, custom).light,
  dark: themeById(picks.dark, custom).dark,
});
