import { describe, expect, it } from 'vitest';
import type { CustomTheme } from '#content/colors/themes.ts';
import { canAddTheme, newThemeId, withoutTheme, withTheme } from './custom-themes.ts';
import { MAX_CUSTOM_THEMES, parseSettings } from './settings.ts';

const theme = (id: string, name = 'Mine'): CustomTheme => ({
  id,
  name,
  light: { hue: 10, chroma: 0.01, accent: '#d22f4c' },
  dark: { hue: 10, chroma: 0.02, accent: '#e04a63' },
});

describe('the user’s themes', () => {
  it('adds a new theme and picks it for both schemes, if asked', () => {
    const settings = withTheme(parseSettings({}), theme('custom-a'), true);
    expect(settings.customThemes.map(kept => kept.id)).toEqual(['custom-a']);
    expect(settings.colorThemes).toEqual({ light: 'custom-a', dark: 'custom-a' });
  });

  it('changes a theme in place, keeping the picks', () => {
    const before = parseSettings({
      customThemes: [theme('custom-a'), theme('custom-b')],
      colorThemes: { light: 'ocean', dark: 'custom-b' },
    });
    const after = withTheme(before, theme('custom-a', 'Renamed'), false);
    expect(after.customThemes.map(kept => kept.name)).toEqual(['Renamed', 'Mine']);
    expect(after.colorThemes).toEqual(before.colorThemes);
  });

  it('gives a scheme the default once its theme is deleted', () => {
    const before = parseSettings({
      customThemes: [theme('custom-a')],
      colorThemes: { light: 'custom-a', dark: 'iris' },
    });
    const after = withoutTheme(before, 'custom-a');
    expect(after.customThemes).toEqual([]);
    expect(after.colorThemes).toEqual({ light: 'reimagined', dark: 'iris' });
  });

  it('drops unreadable themes without losing the other settings', () => {
    const settings = parseSettings({ uiSounds: false, customThemes: [{ id: 'nope' }] });
    expect(settings.uiSounds).toBe(false);
    expect(settings.customThemes).toEqual([]);
  });

  it('stops at the most themes the synced storage keeps', () => {
    const full = Array.from({ length: MAX_CUSTOM_THEMES }, (_, i) => theme(`custom-${i}`));
    expect(canAddTheme(parseSettings({ customThemes: full }))).toBe(false);
    expect(canAddTheme(parseSettings({ customThemes: full.slice(1) }))).toBe(true);
    expect(newThemeId()).toMatch(/^custom-[0-9a-f]{8}$/);
  });
});
