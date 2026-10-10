import type { Feature } from '#shared/features.ts';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';
import { onSettings } from '#content/settings/settings.ts';
import { showPalettes } from './apply.ts';
import { palettesOf, PalettesSchema, type Palettes } from './themes.ts';

// The color themes picked in the settings, on every page. The settings come
// from chrome.storage.sync a moment after the page starts: their palettes are
// kept in localStorage too, shown from document_start so no page starts in
// the default theme's colors.

function storedPalettes(): Palettes | null {
  try {
    return readStoredJson(StorageKey.palettes, PalettesSchema);
  } catch {
    return null;
  }
}

export const colorThemes: Feature = {
  name: 'color themes',
  start: () => {
    const stored = storedPalettes();
    if (stored) showPalettes(stored);
    onSettings(settings => {
      const palettes = palettesOf(settings.colorThemes, settings.customThemes);
      showPalettes(palettes);
      if (JSON.stringify(palettes) !== JSON.stringify(storedPalettes()))
        writeStoredJson(StorageKey.palettes, palettes);
    });
  },
};
