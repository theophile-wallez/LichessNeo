import { describe, expect, it } from 'vitest';
import { paletteRules } from './apply.ts';
import { contrastWithWhite } from './contrast.ts';
import { themeCode, themeFromCode } from './share.ts';
import { DEFAULT_THEME, palettesOf, themeById, type CustomTheme } from './themes.ts';

const mine: CustomTheme = {
  id: 'custom-abc',
  name: 'Lagon été',
  light: { hue: 190, chroma: 0.012, accent: '#0a7fd4' },
  dark: { hue: 200, chroma: 0.03, accent: '#1b8fb5' },
};

describe('color themes', () => {
  it('finds the user’s themes beside the built-in ones, and the default for a removed one', () => {
    expect(themeById('custom-abc', [mine])).toBe(mine);
    expect(themeById('custom-gone', [mine]).id).toBe(DEFAULT_THEME);
    expect(palettesOf({ light: 'ocean', dark: 'custom-abc' }, [mine]).dark).toBe(mine.dark);
  });

  it('writes the dark palette on :root and the light one on :root.light', () => {
    expect(paletteRules({ light: mine.light, dark: mine.dark })).toBe(
      ':root{--lr-ext-tint-hue:200;--lr-ext-tint-chroma:0.03;--lr-ext-accent:#1b8fb5}\n' +
        ':root.light{--lr-ext-tint-hue:190;--lr-ext-tint-chroma:0.012;--lr-ext-accent:#0a7fd4}',
    );
  });

  it('shares a theme as a code that gives it back, any name included', () => {
    const shared = themeFromCode(`  ${themeCode(mine)}\n`);
    expect(shared).toEqual({ name: mine.name, light: mine.light, dark: mine.dark });
  });

  it('turns down what isn’t a theme’s code', () => {
    expect(themeFromCode('nonsense')).toBeNull();
    expect(themeFromCode('lrtheme1:bm90IGpzb24=')).toBeNull();
    const tooStrong = { ...mine, dark: { ...mine.dark, chroma: 1 } };
    expect(themeFromCode(themeCode(tooStrong))).toBeNull();
  });

  it('measures how white text reads on an accent', () => {
    expect(contrastWithWhite('#000000')).toBeCloseTo(21, 5);
    expect(contrastWithWhite('#ffffff')).toBeCloseTo(1, 5);
    expect(contrastWithWhite('#7fe0ff')).toBeLessThan(3);
    expect(contrastWithWhite('#5e6ad2')).toBeGreaterThan(3);
  });
});
