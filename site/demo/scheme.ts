import { closestTo, queryAll, queryOne } from '#shared/dom.ts';
import { isLight, showTheme, THEMES } from './looks.ts';
import { revealFrom } from './motion/reveal.ts';

// The page's scheme, dark or light, as Lichess's own Theme menu has: the nav's
// switch turns it over, Personalize's Mode picks one (pickers.ts). It's kept for
// the next visit: index.html's head puts the light one on before the page
// paints. Each color theme has a palette per scheme.

const KEY = 'lichess-neo-site-scheme';

function showPickedTheme(): void {
  const picked = queryOne(document, '[data-theme][aria-pressed=true]', HTMLElement);
  const theme = THEMES.find(entry => entry.id === picked?.dataset.theme) ?? THEMES[0];
  if (theme) showTheme(theme);
}

function keep(light: boolean): void {
  try {
    if (light) localStorage.setItem(KEY, 'light');
    else localStorage.removeItem(KEY);
  } catch {
    // Storage off: the scheme lasts the visit.
  }
}

function pressScheme(): void {
  const scheme = isLight() ? 'light' : 'dark';
  for (const button of queryAll(document, '[data-scheme-pick]', HTMLElement))
    button.setAttribute('aria-pressed', String(button.dataset.schemePick === scheme));
}

/** Turns the page `light` or dark, the change spreading from `from`; done when it has. */
export function showScheme(from: HTMLElement, light: boolean): Promise<void> {
  if (light === isLight()) return Promise.resolve();
  return revealFrom(from, () => {
    if (light) document.documentElement.dataset.scheme = 'light';
    else delete document.documentElement.dataset.scheme;
    keep(light);
    pressScheme();
    showPickedTheme();
  });
}

export function startScheme(): void {
  if (isLight()) showPickedTheme();
  pressScheme();
  document.addEventListener('click', event => {
    const button = closestTo(event.target, '.scheme-switch', HTMLButtonElement);
    if (button) void showScheme(button, !isLight());
  });
}
