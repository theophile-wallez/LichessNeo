import Moon02Icon from '@hugeicons/core-free-icons/Moon02Icon';
import PaintBoardIcon from '@hugeicons/core-free-icons/PaintBoardIcon';
import Settings01Icon from '@hugeicons/core-free-icons/Settings01Icon';
import SidebarLeftIcon from '@hugeicons/core-free-icons/SidebarLeftIcon';
import Sun03Icon from '@hugeicons/core-free-icons/Sun03Icon';
import UserIcon from '@hugeicons/core-free-icons/UserIcon';
import { queryAll, queryOne } from '#shared/dom.ts';
import type { HugeIcon } from '#shared/hugeicons.ts';
import { postColorScheme } from '#shared/protocol.ts';
import { ownName } from '#shared/own-name.ts';
import { message } from '#content/platform/runtime.ts';
import { PAGE_NAMES, SETTINGS_PAGES, settingsUrl } from '#content/settings/address.ts';
import { sectionName } from '#content/sidebar/collapse.ts';
import type { Ranked } from './rank.ts';

// What the palette offers besides players: the sidebar's pages, read from Lichess's
// nav as it stands (its labels are localized), and a few actions of ours.

export type EntryIcon =
  | { readonly kind: 'picture'; readonly url: string }
  | { readonly kind: 'icon'; readonly icon: HugeIcon; readonly hue: Hue }
  | { readonly kind: 'avatar'; readonly user: string };

export interface Entry extends Ranked {
  readonly group: 'pages' | 'actions' | 'players';
  readonly icon: EntryIcon;
  /** Said after the label: a page's section. */
  readonly detail?: string;
  /** A player's title (GM, IM…), before their name. */
  readonly title?: string | undefined;
  readonly online?: boolean;
  readonly href?: string;
  readonly run?: () => void;
  /** Left out of the list until something is typed. */
  readonly searchOnly?: boolean;
}

// The sidebar's pictures, set on each link by styles/sidebar/nav.css.
function picture(link: HTMLElement, property: string): string | null {
  const value = getComputedStyle(link).getPropertyValue(property).trim();
  return value.startsWith('url(') ? value : null;
}

const pageEntry = (link: HTMLAnchorElement, section: string, url: string | null): Entry => ({
  group: 'pages',
  label: link.textContent.trim() || section,
  keywords: section,
  detail: section,
  href: link.href,
  icon: url ? { kind: 'picture', url } : { kind: 'icon', icon: SidebarLeftIcon, hue: 'blue' },
});

// Our CSS hides some of Lichess's links (its Donate: ours is under Tools).
const isShown = (link: HTMLElement): boolean => getComputedStyle(link).display !== 'none';

/** The nav's sections and their pages, each once, in the sidebar's order. */
export function pageEntries(): Entry[] {
  const entries = new Map<string, Entry>();
  for (const section of queryAll(document, '#topnav section', HTMLElement)) {
    const head = queryOne(section, ':scope > a', HTMLAnchorElement);
    if (!head) continue;
    const name = sectionName(head);
    const sectionPicture = picture(head, '--ln-ext-nav-icon');
    entries.set(head.href, { ...pageEntry(head, name, sectionPicture), label: name });
    for (const link of queryAll(section, ':scope > div a[href]', HTMLAnchorElement)) {
      if (entries.has(link.href) || !isShown(link)) continue;
      const url = picture(link, '--ln-ext-sub-icon') ?? sectionPicture;
      entries.set(link.href, pageEntry(link, name, url));
    }
  }
  return [...entries.values()];
}

export type Hue = 'blue' | 'cyan' | 'green' | 'purple' | 'yellow';

function action(label: string, icon: HugeIcon, hue: Hue, target: Partial<Entry>): Entry {
  return { group: 'actions', label, icon: { kind: 'icon', icon, hue }, ...target };
}

function settingsEntries(): Entry[] {
  const name = message('settingsLink');
  return SETTINGS_PAGES.map(page =>
    action(message(PAGE_NAMES[page]), PaintBoardIcon, 'purple', {
      href: settingsUrl(page),
      detail: name,
      keywords: name,
      searchOnly: true,
    }),
  );
}

function accountEntries(): Entry[] {
  const user = document.body.dataset.user;
  if (!user || !document.getElementById('user_tag')) return [];
  return [
    action(message('paletteMyProfile'), UserIcon, 'green', {
      href: `/@/${user}`,
      keywords: ownName() ?? user,
    }),
    action(message('preferencesButton'), Settings01Icon, 'cyan', {
      href: '/account/preferences/display',
    }),
  ];
}

function schemeEntry(): Entry {
  const isLight = document.documentElement.classList.contains('light');
  return action(
    message(isLight ? 'schemeToggleToDark' : 'schemeToggleToLight'),
    isLight ? Moon02Icon : Sun03Icon,
    'yellow',
    { run: () => postColorScheme(isLight ? 'dark' : 'light') },
  );
}

// Only where the sidebar can fold: its toggle shows from 1020px, but in the rail and the header.
function foldEntry(): Entry[] {
  const toggle = document.getElementById('ln-ext-sidebar-toggle');
  if (!toggle?.checkVisibility()) return [];
  const folded = document.documentElement.dataset.lnExtSidebar?.split(' ').includes('collapsed');
  return [
    action(message(folded ? 'sidebarExpand' : 'sidebarCollapse'), SidebarLeftIcon, 'blue', {
      run: () => toggle.click(),
    }),
  ];
}

/** Ours: the player's profile and preferences, the scheme, the sidebar's fold, our settings. */
export const actionEntries = (): Entry[] => [
  ...accountEntries(),
  schemeEntry(),
  ...foldEntry(),
  ...settingsEntries(),
];
