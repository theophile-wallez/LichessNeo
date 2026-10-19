import type { Feature } from '#shared/features.ts';
import { onColorScheme, type ColorScheme } from '#shared/protocol.ts';

// The color scheme picked in the extension's settings is Lichess's own: set
// here as its Theme menu sets it (lila's ui/dasher/src/theme.ts), on the page
// at once and in the user's preferences. Lichess's background picture, if on,
// stays on.

/** Lichess's `bg` preference for the scheme: `transp` keeps the background picture. */
function backgroundOf(scheme: ColorScheme, current: string): string {
  return current.includes('transp') ? `transp ${scheme}` : scheme;
}

function showScheme(scheme: ColorScheme, background: string): void {
  document.body.dataset.theme = background;
  const light =
    scheme === 'system' ? matchMedia('(prefers-color-scheme: light)').matches : scheme === 'light';
  // Lichess rewrites <html>'s class to these; toggled here so nothing else on it is lost.
  document.documentElement.classList.toggle('light', light);
  document.documentElement.classList.toggle('dark', !light);
}

async function saveScheme(background: string): Promise<void> {
  try {
    const response = await fetch('/pref/bg', {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: new URLSearchParams({ bg: background }),
    });
    if (!response.ok) console.warn('[LichessNeo] color scheme unsaved', response.status);
  } catch (error) {
    console.warn('[LichessNeo] color scheme unsaved', error);
  }
}

export const colorScheme: Feature = {
  name: 'color scheme',
  start: () => {
    onColorScheme(scheme => {
      const background = backgroundOf(scheme, document.body.dataset.theme ?? '');
      showScheme(scheme, background);
      void saveScheme(background);
    });
  },
};
