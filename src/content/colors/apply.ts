import { createElement, setStyleProperty } from '#shared/dom.ts';
import type { Palette, Palettes } from './themes.ts';

// Puts the picked palettes on the page: the variables palette.css builds
// every color from, for Lichess's dark scheme on :root and its light one on
// :root.light. In a stylesheet of ours, which comes after content.css and so
// wins over its defaults.

const STYLE_ID = 'ln-ext-palettes';

const PROPERTIES = {
  hue: '--ln-ext-tint-hue',
  chroma: '--ln-ext-tint-chroma',
  accent: '--ln-ext-accent',
} as const satisfies Record<keyof Palette, string>;

const declarations = (palette: Palette): string =>
  `${PROPERTIES.hue}:${palette.hue};${PROPERTIES.chroma}:${palette.chroma};${PROPERTIES.accent}:${palette.accent}`;

/** The stylesheet that shows these palettes. */
export const paletteRules = ({ light, dark }: Palettes): string =>
  `:root{${declarations(dark)}}\n:root.light{${declarations(light)}}`;

export function showPalettes(palettes: Palettes): void {
  const text = paletteRules(palettes);
  let style = document.getElementById(STYLE_ID);
  if (!(style instanceof HTMLStyleElement)) {
    style = createElement('style', { id: STYLE_ID });
    // From document_start, before there is a <head>.
    (document.head ?? document.documentElement).append(style);
  }
  if (style.textContent !== text) style.textContent = text;
}

/** Gives an element of ours (a `[data-ln-ext-palette]` preview) a palette of its own. */
export function setPalette(element: HTMLElement, palette: Palette): void {
  setStyleProperty(element, PROPERTIES.hue, String(palette.hue));
  setStyleProperty(element, PROPERTIES.chroma, String(palette.chroma));
  setStyleProperty(element, PROPERTIES.accent, palette.accent);
}
