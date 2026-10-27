import type { Feature } from '#shared/features.ts';
import { onColorScheme, type ColorScheme } from '#shared/protocol.ts';
import { savePref } from '#page/lichess/prefs.ts';

// The color scheme picked in the extension's settings is Lichess's own: set
// here as its Theme menu sets it (lila's ui/dasher/src/theme.ts), on the page
// at once and in the user's preferences. A background picture the user has
// (`transp …`) stays theirs, as the menu keeps it: the extension only leaves it
// out of sight (styles/theme/base.css).

/** Lichess's value for `scheme`, its background picture kept. */
function backgroundOf(scheme: ColorScheme): string {
  const transparent = document.body.dataset.theme?.includes('transp') === true;
  return transparent ? `transp ${scheme}` : scheme;
}

function showScheme(scheme: ColorScheme, background: string): void {
  document.body.dataset.theme = background;
  const light =
    scheme === 'system' ? matchMedia('(prefers-color-scheme: light)').matches : scheme === 'light';
  // Lichess rewrites <html>'s class to these; toggled here so nothing else on it is lost.
  const root = document.documentElement.classList;
  root.toggle('light', light);
  root.toggle('dark', !light);
}

export const colorScheme: Feature = {
  name: 'color scheme',
  start: () => {
    onColorScheme(scheme => {
      const background = backgroundOf(scheme);
      showScheme(scheme, background);
      void savePref('bg', background);
    });
  },
};
