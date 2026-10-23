import { z } from 'zod/mini';
import { setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { readStored, StorageKey, writeStored } from '#shared/storage.ts';
import { NavigationSchema, onSettings, type Settings } from '#content/settings/settings.ts';

// What Lichess's header turns into from 1020px: the sidebar, folded to its icons
// or not (collapse.ts), or a header across the top, as the settings pick
// (styles/sidebar/header). Both choices are kept in the page's storage and read
// at document_start, so a page never shows another shape first.

type Navigation = Settings['navigation'];

export const isCollapsed = (): boolean =>
  readStored(StorageKey.sidebarCollapsed, z.literal('1')) !== null;

const storedNavigation = (): Navigation =>
  readStored(StorageKey.navigation, NavigationSchema) ?? 'sidebar';

function shape(): 'header' | 'collapsed' | null {
  if (storedNavigation() === 'header') return 'header';
  return isCollapsed() ? 'collapsed' : null;
}

/** Marks <html> with the shape to show, in `data-ln-ext-sidebar`. */
export function showNavigation(): void {
  setData(document.documentElement, 'lnExtSidebar', shape());
}

function followSettings(settings: Settings): void {
  if (settings.navigation === storedNavigation()) return;
  writeStored(StorageKey.navigation, settings.navigation);
  showNavigation();
  // The board moved: chessground keeps its old bounds until a scroll clears them.
  document.dispatchEvent(new Event('scroll'));
}

export const navigation: Feature = {
  name: 'navigation',
  start: () => {
    showNavigation();
    onSettings(followSettings);
  },
};
