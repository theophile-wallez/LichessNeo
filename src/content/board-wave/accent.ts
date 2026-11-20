import { parseHex, type Rgb } from './wave/color.ts';

/** The color theme's accent, as the page shows it; null where it isn't a plain `#rrggbb`. */
export const themeAccent = (): Rgb | null =>
  parseHex(getComputedStyle(document.documentElement).getPropertyValue('--ln-ext-accent').trim());
