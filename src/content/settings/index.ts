import { isParsing, queryOne, setData } from '#shared/dom.ts';
import { syncWhileParsing } from '#shared/frame.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { packLibrary } from '#content/packs/index.ts';
import { settingsPageOf, type SettingsPage } from './address.ts';
import { addLinks, menuReady, showMenu } from './menu.ts';
import { buildSection, type SettingsSection } from './section.ts';

// The extension's settings as a section of Lichess's account pages: a link in
// their menu, with a link under it for each of its pages, shows it in place of
// the page's content (styles/pages/extension-settings.css).

let link: HTMLAnchorElement | null = null;
let section: SettingsSection | null = null;
let wasOpen = false;
let shown: SettingsPage | null = null;

// A page of ours opens at its top, as Lichess's pages do: only the hash changes, and the
// browser keeps the scroll. On desktop the page scrolls in #main-wrap, below 1020px the window.
function scrollToTop(): void {
  document.getElementById('main-wrap')?.scrollTo({ top: 0 });
  window.scrollTo({ top: 0 });
}

export function syncSettings(): void {
  // Not on the DGT board's pages, which Lichess also draws as account pages.
  const main = queryOne(document, 'main.account:not(.dgt)', HTMLElement);
  const menu = main && queryOne(main, '.subnav', HTMLElement);
  if (!main || !menu) return;
  if (!link?.isConnected && menuReady(menu, isParsing())) link = addLinks(menu);
  if (
    !section?.element.isConnected &&
    queryOne(main, ':scope > .page-menu__content', HTMLElement)
  ) {
    section = buildSection();
    main.append(section.element);
  }
  showPage(main, menu, settingsPageOf(location.hash));
}

function showPage(main: HTMLElement, menu: HTMLElement, page: SettingsPage | null): void {
  const open = page !== null;
  // The packs are read as the section opens: again only if that failed.
  if (open && !wasOpen) void packLibrary().loadAll();
  wasOpen = open;
  setData(main, 'lnExtSettings', open ? '' : null);
  showMenu(menu, page);
  section?.show(page);
  if (page !== shown && open) scrollToTop();
  shown = page;
}

export const extensionSettings: Feature = {
  name: 'extension settings',
  start: () => {
    // As the menu comes in, so it never shows without the link.
    syncWhileParsing(syncSettings);
    onEveryTick('extension settings', syncSettings);
    window.addEventListener('hashchange', syncSettings);
  },
};
