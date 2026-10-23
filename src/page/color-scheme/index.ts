import type { Feature } from '#shared/features.ts';
import { onColorScheme, type ColorScheme } from '#shared/protocol.ts';
import { savePref } from '#page/lichess/prefs.ts';

// The color scheme picked in the extension's settings is Lichess's own: set
// here as its Theme menu sets it (lila's ui/dasher/src/theme.ts), on the page
// at once and in the user's preferences. Without Lichess's background picture
// (`transp …`), which the extension leaves out (styles/sidebar/dasher.css).

function showScheme(scheme: ColorScheme): void {
  document.body.dataset.theme = scheme;
  const light =
    scheme === 'system' ? matchMedia('(prefers-color-scheme: light)').matches : scheme === 'light';
  // Lichess rewrites <html>'s class to these; toggled here so nothing else on it is lost.
  const root = document.documentElement.classList;
  root.toggle('light', light);
  root.toggle('dark', !light);
  root.toggle('transp', false);
}

export const colorScheme: Feature = {
  name: 'color scheme',
  start: () => {
    onColorScheme(scheme => {
      showScheme(scheme);
      void savePref('bg', scheme);
    });
  },
};
