import { createElement, isParsing, queryOne, setData } from '#shared/dom.ts';
import { oncePerFrame } from '#shared/frame.ts';
import type { Feature } from '#shared/features.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { packLibrary } from '#content/packs/index.ts';
import { SETTINGS_HASH, SETTINGS_URL } from './address.ts';
import { buildSection } from './section.ts';
import { showScheme } from './appearance.ts';

// The extension's settings as a section of Lichess's account pages: a link in
// their menu, over Display, shows it in place of the page's content
// (styles/pages/extension-settings.css).

const DISPLAY = "a[href$='/preferences/display']";
// Lichess's own link that was active, given back its look once the section closes.
const WAS_ACTIVE = 'lrExtWasActive';

let link: HTMLAnchorElement | null = null;
let section: HTMLElement | null = null;
let wasOpen = false;

function addLink(menu: HTMLElement): HTMLAnchorElement {
  const added = createElement('a', {
    className: 'lr-ext-settings-link',
    text: message('settingsLink'),
    attrs: { href: SETTINGS_URL },
  });
  // The links sit in the menu's inner nav. Lichess separates the profile from the
  // preferences: ours gets its own group, over Display.
  const display = queryOne(menu, DISPLAY, HTMLElement);
  const links = display?.parentElement ?? queryOne(menu, '.subnav__inner', HTMLElement) ?? menu;
  links.insertBefore(added, display);
  links.insertBefore(createElement('div', { className: 'sep lr-ext-settings-sep' }), display);
  return added;
}

function showOpen(main: HTMLElement, menu: HTMLElement, open: boolean): void {
  setData(main, 'lrExtSettings', open ? '' : null);
  link?.classList.toggle('active', open);
  for (const other of menu.querySelectorAll('a:not(.lr-ext-settings-link)')) {
    if (!(other instanceof HTMLElement)) continue;
    if (open && other.classList.contains('active')) {
      other.classList.toggle('active', false);
      setData(other, WAS_ACTIVE, '');
    } else if (!open && other.dataset[WAS_ACTIVE] !== undefined) {
      other.classList.toggle('active', true);
      setData(other, WAS_ACTIVE, null);
    }
  }
}

export function syncSettings(): void {
  const main = queryOne(document, 'main.account', HTMLElement);
  const menu = main && queryOne(main, '.subnav', HTMLElement);
  if (!main || !menu) return;
  // While the page parses, the link waits for Display, which it goes over.
  if (!link?.isConnected && (queryOne(menu, DISPLAY, HTMLElement) || !isParsing()))
    link = addLink(menu);
  if (!section?.isConnected && queryOne(main, ':scope > .page-menu__content', HTMLElement)) {
    section = buildSection();
    main.append(section);
  }
  const open = location.hash === SETTINGS_HASH;
  // The packs are read as the section opens: again only if that failed.
  if (open && !wasOpen) void packLibrary().loadAll();
  wasOpen = open;
  showOpen(main, menu, open);
  if (open && section) showScheme(section);
}

// As the menu comes in, so it never shows without the link: once a frame, before it's drawn.
function syncWhileParsing(): void {
  const parsing = new MutationObserver(oncePerFrame(syncSettings));
  parsing.observe(document, { childList: true, subtree: true });
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      parsing.disconnect();
      syncSettings();
    },
    { once: true },
  );
}

export const extensionSettings: Feature = {
  name: 'extension settings',
  start: () => {
    if (isParsing()) syncWhileParsing();
    else syncSettings();
    onEveryTick('extension settings', syncSettings);
    window.addEventListener('hashchange', syncSettings);
  },
};
