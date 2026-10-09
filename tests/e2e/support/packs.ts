import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type BrowserContext, type Page } from '@playwright/test';
import { closeMenu, openPicker, pickerTab, type PickerKind } from './dasher.ts';

// The example pack (packs/example), imported through the user menu as a user
// would, from GitHub as the browser sees it: served from this checkout, so
// the test runs on the files of the change under test.

export const EXAMPLE_LINK =
  'https://github.com/theophile-wallez/LichessReimagined/tree/main/packs/example';
export const EXAMPLE_ID = 'theophile-wallez/lichessreimagined/main/packs/example/';

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..');
const RAW = 'https://raw.githubusercontent.com/theophile-wallez/LichessReimagined/main/';

/** Answers for GitHub's raw host with this checkout's files. */
export async function serveRepository(context: BrowserContext): Promise<void> {
  await context.route(`${RAW}**`, async route => {
    const file = path.join(ROOT, decodeURIComponent(route.request().url().slice(RAW.length)));
    const headers = { 'access-control-allow-origin': '*', 'content-type': 'text/plain' };
    if (!file.startsWith(ROOT) || !existsSync(file))
      return route.fulfill({ status: 404, headers, body: '404: Not Found' });
    return route.fulfill({ status: 200, headers, body: readFileSync(file) });
  });
}

/** Imports the example pack from a panel's Imported tab, which picks each part it has, and closes the menu. */
export async function importExamplePack(page: Page, kind: PickerKind = 'board'): Promise<void> {
  const panel = await openPicker(page, kind);
  await pickerTab(panel, 'packs').click();
  await panel.locator('.lr-ext-src-import input[type="url"]').fill(EXAMPLE_LINK);
  await panel.locator('.lr-ext-src-import button').click();
  await expect(panel.locator('.lr-ext-src-status')).toHaveText('Imported “Warm wood”.');
  await closeMenu(page);
}
