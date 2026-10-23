import type { BuiltInTheme } from './themes.ts';

// The color themes the extension comes with. Each accent carries white text at
// 3:1 at least, and reads as a link on the page, on its own scheme.

/** Near-neutral greys and our blue: palette.css's own values. */
export const NEO: BuiltInTheme = {
  id: 'neo',
  message: 'themeNeo',
  light: { hue: 286, chroma: 0.006, accent: '#5e6ad2' },
  dark: { hue: 286, chroma: 0.004, accent: '#5e6ad2' },
};

export const BUILT_IN_THEMES: readonly BuiltInTheme[] = [
  NEO,
  {
    id: 'lichess',
    message: 'themeLichess',
    light: { hue: 70, chroma: 0.008, accent: '#d64f00' },
    dark: { hue: 75, chroma: 0.008, accent: '#d64f00' },
  },
  {
    id: 'ocean',
    message: 'themeOcean',
    light: { hue: 225, chroma: 0.012, accent: '#0a7fd4' },
    dark: { hue: 230, chroma: 0.025, accent: '#2f9bea' },
  },
  {
    id: 'grove',
    message: 'themeGrove',
    light: { hue: 150, chroma: 0.011, accent: '#17905c' },
    dark: { hue: 160, chroma: 0.02, accent: '#2a9f6d' },
  },
  {
    id: 'ember',
    message: 'themeEmber',
    light: { hue: 60, chroma: 0.012, accent: '#d9551a' },
    dark: { hue: 45, chroma: 0.02, accent: '#e2622a' },
  },
  {
    id: 'iris',
    message: 'themeIris',
    light: { hue: 300, chroma: 0.014, accent: '#7048e8' },
    dark: { hue: 295, chroma: 0.03, accent: '#8467ec' },
  },
  {
    id: 'blossom',
    message: 'themeBlossom',
    light: { hue: 355, chroma: 0.013, accent: '#d23f7c' },
    dark: { hue: 350, chroma: 0.025, accent: '#dd4c89' },
  },
  {
    id: 'midnight',
    message: 'themeMidnight',
    light: { hue: 255, chroma: 0.014, accent: '#4f63e8' },
    dark: { hue: 265, chroma: 0.045, accent: '#6d7cff' },
  },
  {
    id: 'ruby',
    message: 'themeRuby',
    light: { hue: 15, chroma: 0.012, accent: '#d22f4c' },
    dark: { hue: 12, chroma: 0.022, accent: '#e04a63' },
  },
  {
    id: 'dune',
    message: 'themeDune',
    light: { hue: 80, chroma: 0.016, accent: '#b86e0a' },
    dark: { hue: 75, chroma: 0.018, accent: '#c98326' },
  },
  {
    id: 'matcha',
    message: 'themeMatcha',
    light: { hue: 125, chroma: 0.014, accent: '#5a8a1f' },
    dark: { hue: 130, chroma: 0.02, accent: '#6c9e2c' },
  },
  {
    id: 'aurora',
    message: 'themeAurora',
    light: { hue: 185, chroma: 0.013, accent: '#0d8f85' },
    dark: { hue: 185, chroma: 0.022, accent: '#16a294' },
  },
  {
    id: 'fjord',
    message: 'themeFjord',
    light: { hue: 235, chroma: 0.012, accent: '#4a6fa5' },
    dark: { hue: 240, chroma: 0.018, accent: '#6688bd' },
  },
  {
    id: 'mocha',
    message: 'themeMocha',
    light: { hue: 55, chroma: 0.012, accent: '#8f5b3a' },
    dark: { hue: 50, chroma: 0.016, accent: '#b07a52' },
  },
  {
    id: 'plum',
    message: 'themePlum',
    light: { hue: 330, chroma: 0.014, accent: '#a93b8d' },
    dark: { hue: 325, chroma: 0.028, accent: '#c0509f' },
  },
  {
    id: 'twilight',
    message: 'themeTwilight',
    light: { hue: 295, chroma: 0.018, accent: '#d9582a' },
    dark: { hue: 290, chroma: 0.035, accent: '#e66a33' },
  },
];
