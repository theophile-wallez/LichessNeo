import { createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { message } from '#content/platform/runtime.ts';
import {
  PAGE_NAMES,
  SETTINGS_PAGES,
  settingsHash,
  settingsUrl,
  type SettingsPage,
} from './address.ts';

// The settings' links in the account menu (styles/pages/settings-menu.css):
// ours over Display, and under it a link for each of its pages, shown on every
// account page.

const DISPLAY = "a[href$='/preferences/display']";
const LINK = 'ln-ext-settings-link';
const SUB = 'ln-ext-settings-sub';
// Lichess's own link that was active, given back its look once the section closes.
const WAS_ACTIVE = 'lnExtWasActive';

const pageLink = (page: SettingsPage): HTMLAnchorElement =>
  createElement('a', {
    className: 'ln-ext-settings-sublink',
    text: message(PAGE_NAMES[page]),
    // The hash alone: from any account page, the section opens there without a reload.
    attrs: { href: settingsHash(page), 'data-ln-ext-page': page },
  });

/** Whether the menu is ready for our links: Display is in, which they go over. */
export const menuReady = (menu: HTMLElement, parsing: boolean): boolean =>
  !parsing || queryOne(menu, DISPLAY, HTMLElement) !== null;

/** Our links, in their own group over Display; the link the section shows. */
export function addLinks(menu: HTMLElement): HTMLAnchorElement {
  const link = createElement('a', {
    className: LINK,
    text: message('settingsLink'),
    attrs: { href: settingsUrl() },
  });
  const sub = createElement('div', { className: SUB });
  const inner = createElement('div', { className: `${SUB}__links` });
  inner.append(...SETTINGS_PAGES.map(pageLink));
  sub.append(inner);
  // The links sit in the menu's inner nav. Lichess separates the profile from the
  // preferences: ours get their own group.
  const display = queryOne(menu, DISPLAY, HTMLElement);
  const links = display?.parentElement ?? queryOne(menu, '.subnav__inner', HTMLElement) ?? menu;
  for (const added of [link, sub, createElement('div', { className: 'sep ln-ext-settings-sep' })])
    links.insertBefore(added, display);
  return link;
}

function showLichessLinks(menu: HTMLElement, open: boolean): void {
  for (const other of queryAll(
    menu,
    `a:not(.${LINK}):not(.ln-ext-settings-sublink)`,
    HTMLElement,
  )) {
    if (open && other.classList.contains('active')) {
      other.classList.toggle('active', false);
      setData(other, WAS_ACTIVE, '');
    } else if (!open && other.dataset[WAS_ACTIVE] !== undefined) {
      other.classList.toggle('active', true);
      setData(other, WAS_ACTIVE, null);
    }
  }
}

/** Marks `page` in the menu, or Lichess's own page again for null. */
export function showMenu(menu: HTMLElement, page: SettingsPage | null): void {
  const open = page !== null;
  const link = queryOne(menu, `.${LINK}`, HTMLElement);
  if (link) setData(link, 'lnExtOpen', open ? '' : null);
  for (const pageLink of queryAll(menu, `.${SUB} a`, HTMLElement))
    pageLink.classList.toggle('active', pageLink.dataset.lnExtPage === page);
  showLichessLinks(menu, open);
}
