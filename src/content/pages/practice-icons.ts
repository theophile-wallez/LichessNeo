import { queryAll, queryOne, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Lichess gives each practice study's icon as `---icon-bg-image:
// url(../hashed/…)`, relative to its own stylesheet: read from ours, the URL
// would point into the extension. Each icon gets it absolute, in
// `--ln-ext-practice-icon`, for styles/practice.css to paint as a mask.

const ICONS = '.practice-app .study icon, .practice__side__title icon';
const VARIABLE = '--ln-ext-practice-icon';

/** `url(../hashed/x.svg)`, made absolute from the stylesheet that wrote it; null if it isn't one. */
export function absoluteIconUrl(value: string, sheet: string): string | null {
  const match = /^url\((['"]?)(.+)\1\)$/.exec(value.trim());
  if (!match?.[2]) return null;
  try {
    return `url("${new URL(match[2], sheet).href}")`;
  } catch {
    return null;
  }
}

export function syncPracticeIcons(): void {
  const icons = queryAll(document, ICONS, HTMLElement).filter(
    icon => icon.style.getPropertyValue(VARIABLE) === '',
  );
  if (icons.length === 0) return;
  // Lichess's stylesheets all come from its assets' css folder.
  const sheet = queryOne(document, "link[href*='/css/']", HTMLLinkElement)?.href;
  if (!sheet) return;
  for (const icon of icons) {
    const url = absoluteIconUrl(getComputedStyle(icon).getPropertyValue('---icon-bg-image'), sheet);
    if (url) setStyleProperty(icon, VARIABLE, url);
  }
}

export const practiceIcons: Feature = {
  name: 'practice icons',
  start: () => onEveryTick('practice icons', syncPracticeIcons),
};
