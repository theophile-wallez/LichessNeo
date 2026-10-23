// The settings' pages and their address: an account page's with a hash, so
// the section opens from any of them and comes back on reload. Each page adds
// its name.

export const SETTINGS_PAGES = [
  'appearance',
  'board',
  'profile',
  'play',
  'experimental',
  'backup',
] as const;

export type SettingsPage = (typeof SETTINGS_PAGES)[number];

/** Each page's name, its menu link's and its title's. */
export const PAGE_NAMES: Readonly<Record<SettingsPage, string>> = {
  appearance: 'settingsPageAppearance',
  board: 'settingsPageBoard',
  profile: 'settingsPageProfile',
  play: 'settingsPagePlay',
  experimental: 'settingsPageExperimental',
  backup: 'settingsPageBackup',
};

const SETTINGS_HASH = '#ln-ext-extension';

/** The Packs card's own hash, on the board's page, where it scrolls to. */
export const PACKS_HASH = `${SETTINGS_HASH}/packs`;

// Pages since merged into another: their links, saved or shared, open where their cards went.
const MOVED: Readonly<Record<string, SettingsPage>> = {
  personalization: 'appearance',
  interface: 'appearance',
  packs: 'board',
  pairing: 'play',
};

/** The hash of `page`; the first page's is the section's own. */
export const settingsHash = (page: SettingsPage = 'appearance'): string =>
  page === 'appearance' ? SETTINGS_HASH : `${SETTINGS_HASH}/${page}`;

/** The link to `page` from anywhere on Lichess. */
export const settingsUrl = (page?: SettingsPage): string => `/account/profile${settingsHash(page)}`;

/** The link to the Packs card from anywhere on Lichess. */
export const packsUrl = (): string => `/account/profile${PACKS_HASH}`;

/** The page `hash` opens, or null when it isn't the settings'. An unknown page is the first. */
export function settingsPageOf(hash: string): SettingsPage | null {
  if (hash === SETTINGS_HASH) return 'appearance';
  if (!hash.startsWith(`${SETTINGS_HASH}/`)) return null;
  const name = hash.slice(SETTINGS_HASH.length + 1);
  return SETTINGS_PAGES.find(page => page === name) ?? MOVED[name] ?? 'appearance';
}
