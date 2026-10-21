// The settings' pages and their address: an account page's with a hash, so
// the section opens from any of them and comes back on reload. Each page adds
// its name.

export const SETTINGS_PAGES = [
  'personalization',
  'profile',
  'board',
  'packs',
  'pairing',
  'interface',
  'experimental',
  'backup',
] as const;

export type SettingsPage = (typeof SETTINGS_PAGES)[number];

/** Each page's name, its menu link's and its title's. */
export const PAGE_NAMES: Readonly<Record<SettingsPage, string>> = {
  personalization: 'settingsPagePersonalization',
  profile: 'settingsPageProfile',
  board: 'settingsPageBoard',
  packs: 'settingsPagePacks',
  pairing: 'settingsPagePairing',
  interface: 'settingsPageInterface',
  experimental: 'settingsPageExperimental',
  backup: 'settingsPageBackup',
};

const SETTINGS_HASH = '#ln-ext-extension';

/** The hash of `page`; the first page's is the section's own. */
export const settingsHash = (page: SettingsPage = 'personalization'): string =>
  page === 'personalization' ? SETTINGS_HASH : `${SETTINGS_HASH}/${page}`;

/** The link to `page` from anywhere on Lichess. */
export const settingsUrl = (page?: SettingsPage): string => `/account/profile${settingsHash(page)}`;

/** The page `hash` opens, or null when it isn't the settings'. An unknown page is the first. */
export function settingsPageOf(hash: string): SettingsPage | null {
  if (hash === SETTINGS_HASH) return 'personalization';
  if (!hash.startsWith(`${SETTINGS_HASH}/`)) return null;
  const name = hash.slice(SETTINGS_HASH.length + 1);
  return SETTINGS_PAGES.find(page => page === name) ?? 'personalization';
}
