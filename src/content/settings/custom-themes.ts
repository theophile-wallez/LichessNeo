import { DEFAULT_THEME, SCHEMES, type CustomTheme } from '#content/colors/themes.ts';
import { MAX_CUSTOM_THEMES, type Settings } from './settings.ts';

// The changes the theme editor makes to the settings, as functions of them.

export const newThemeId = (): string => `custom-${crypto.randomUUID().slice(0, 8)}`;

export const canAddTheme = (settings: Settings): boolean =>
  settings.customThemes.length < MAX_CUSTOM_THEMES;

/** The settings with this theme kept, in place of the one of its id; picked for both schemes if asked. */
export function withTheme(settings: Settings, theme: CustomTheme, pick: boolean): Settings {
  const exists = settings.customThemes.some(kept => kept.id === theme.id);
  const customThemes = exists
    ? settings.customThemes.map(kept => (kept.id === theme.id ? theme : kept))
    : [...settings.customThemes, theme];
  const colorThemes = pick ? { light: theme.id, dark: theme.id } : settings.colorThemes;
  return { ...settings, customThemes, colorThemes };
}

/** The settings without this theme: a scheme it was picked for gets the default. */
export function withoutTheme(settings: Settings, id: string): Settings {
  const colorThemes = { ...settings.colorThemes };
  for (const scheme of SCHEMES) if (colorThemes[scheme] === id) colorThemes[scheme] = DEFAULT_THEME;
  return {
    ...settings,
    customThemes: settings.customThemes.filter(theme => theme.id !== id),
    colorThemes,
  };
}
